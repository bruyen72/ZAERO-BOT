import '../settings.js'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import qrcode from 'qrcode'
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
  jidDecode,
  delay
} from '@whiskeysockets/baileys'
import pino from 'pino'
import db from '../lib/system/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const DEFAULT_PORT = 3000
const rawPort = process.env.PORT
const parsedPort = Number.parseInt(rawPort || `${DEFAULT_PORT}`, 10)
const PORT = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort
const HOST = '0.0.0.0'

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')))

// Estado global
let qrCodeData = null
let pairingCode = null
let pairingCodeTimer = null
let connectionStatus = 'disconnected'
let client = null
let mainHandler = null
let eventsHandler = null
let smsgHandler = null
let isInitialConnection = true // ✅ FIX: Previne reconexão antes de autenticar
let lastSessionClear = 0 // ✅ FIX: Previne limpeza excessiva de sessão

async function loadBotHandlers() {
  if (mainHandler && eventsHandler && smsgHandler) return

  const [mainModule, eventsModule, messageModule] = await Promise.all([
    import('../main.js'),
    import('../commands/events.js'),
    import('../lib/message.js')
  ])

  mainHandler = mainModule.default
  eventsHandler = eventsModule.default
  smsgHandler = messageModule.smsg
}

// Função para limpar sessão
function clearSession() {
  const sessionPath = path.join(__dirname, '..', 'Sessions', 'Owner')
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true })
      console.log('✅ Sessão limpa automaticamente')
      return true
    } catch (err) {
      console.error('❌ Erro ao limpar sessão:', err)
      return false
    }
  }
  return true
}

function normalizePhoneNumber(input = '') {
  let digits = String(input).replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('00')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')

  // Common BR formatting issue: 55 + 0 + DDD + number.
  if (digits.startsWith('550')) {
    digits = `55${digits.slice(3)}`
  }

  // Fallback for local BR numbers without country code.
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }

  return digits
}

function isValidPhoneForPairing(phone = '') {
  return phone.length >= 12 && phone.length <= 15
}

// Função para expirar código de pareamento após 2 minutos
function startPairingCodeTimer() {
  if (pairingCodeTimer) clearTimeout(pairingCodeTimer)

  pairingCodeTimer = setTimeout(() => {
    if (connectionStatus === 'code_ready' || connectionStatus === 'waiting_for_pairing') {
      console.log('⏱️ Código expirado após 2 minutos')
      pairingCode = null
      connectionStatus = 'disconnected'
    }
  }, 120000) // 2 minutos
}

// Iniciar bot
async function startBot(usePairingCode = false, phoneNumber = '', isReconnect = false) {
  try {
    // ⚠️ CRÍTICO: Só limpa sessão em NOVA conexão, não em reconexão!
    const timeSinceLastClear = Date.now() - lastSessionClear
    const shouldClearSession = !isReconnect && timeSinceLastClear > 30000 // 30 segundos

    if (shouldClearSession) {
      console.log('🆕 Nova conexão - limpando sessão antiga')
      clearSession()
      lastSessionClear = Date.now()
      isInitialConnection = true // ✅ Reset flag para nova conexão
    } else if (!isReconnect && timeSinceLastClear <= 30000) {
      console.log('⚠️ Sessão limpa recentemente, pulando limpeza (evita loop)')
    } else {
      console.log('🔄 Reconexão - mantendo sessão existente')
    }

    await loadBotHandlers()

    const sessionPath = path.join(__dirname, '..', 'Sessions', 'Owner')
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    client = makeWASocket({
      version,
      logger: pino({ level: 'fatal' }),
      printQRInTerminal: !usePairingCode,
      browser: usePairingCode ? Browsers.macOS('Desktop') : Browsers.ubuntu('Chrome'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
      },
      defaultQueryTimeoutMs: undefined,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      getMessage: async () => ""
    })

    // ⚡ Adiciona função decodeJid ao client
    client.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return ((decode.user && decode.server && decode.user + "@" + decode.server) || jid)
      } else return jid
    }

    // ⚡ Define modo público (bot responde a todos)
    client.public = true

    // ⚡ Registra event listeners de boas-vindas, despedidas, etc
    try {
      await eventsHandler(client, {})
    } catch (err) {
      console.error('⚠️ Erro ao registrar eventos:', err.message)
    }

    client.ev.on('creds.update', saveCreds)

    client.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // Gerar QR Code
      if (qr && !usePairingCode) {
        qrCodeData = await qrcode.toDataURL(qr)
        connectionStatus = 'qr_ready'
        console.log('✅ QR Code pronto')
      }

      // Gerar código de pareamento
      if (qr && usePairingCode && phoneNumber && !pairingCode) {
        if (!client.authState.creds.registered) {
          // ✅ FIX: Reduz delay de 5s → 1s (conexão fechava antes)
          setTimeout(async () => {
            try {
              // ✅ Verifica se ainda está conectado
              if (!client || connectionStatus === 'disconnected') {
                console.error('❌ Cliente desconectado, não pode gerar código')
                return
              }

              const cleanNumber = normalizePhoneNumber(phoneNumber)
              if (!isValidPhoneForPairing(cleanNumber)) {
                throw new Error('Numero invalido para pareamento. Use DDI + DDD + numero (ex: 5511912345678)')
              }

              console.log('📞 Solicitando código de pareamento...')
              const code = await client.requestPairingCode(cleanNumber)
              pairingCode = code?.match(/.{1,4}/g)?.join('-') || code
              connectionStatus = 'waiting_for_pairing'
              console.log('✅ Código gerado:', pairingCode)
              console.log('📱 Digite este código no WhatsApp em até 2 minutos')
              console.log('⚠️ IMPORTANTE: Digite RÁPIDO! O código pode expirar!')

              // Inicia timer de 2 minutos para expirar o código
              startPairingCodeTimer()
            } catch (err) {
              console.error('❌ Erro ao gerar código:', err.message)
              if (err.message.includes('Connection Closed') || err.message.includes('closed')) {
                console.error('⚠️ Conexão fechou antes de gerar código!')
                console.error('💡 SOLUÇÃO: Use QR Code (mais rápido e confiável)')
              } else if (err.message.includes('429') || err.message.includes('rate')) {
                console.error('⚠️ Rate limit do WhatsApp! Aguarde alguns minutos e tente novamente.')
                console.error('💡 Dica: Use QR Code ao invés de código de pareamento (mais confiável)')
              }
              connectionStatus = 'error'
              pairingCode = null
            }
          }, 1000) // ✅ FIX: 5000ms → 1000ms
        }
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = reason !== DisconnectReason.loggedOut

        // Se há código de pareamento ativo, mantém o status
        const hasActivePairingCode = pairingCode && connectionStatus === 'waiting_for_pairing'
        const hasActiveQR = qrCodeData && connectionStatus === 'qr_ready'

        // ✅ FIX: Não reconecta se está aguardando QR/código do usuário
        if (isInitialConnection && !client?.authState?.creds?.registered) {
          if (hasActivePairingCode || hasActiveQR) {
            console.log('⏳ Aguardando usuário escanear QR ou digitar código...')
            console.log('⚠️ NÃO reconectando para não cancelar autenticação!')
            isInitialConnection = false
            return
          } else {
            console.log('🔄 Conexão inicial fechada - tentando reconectar em 3s...')
            isInitialConnection = false
            setTimeout(() => startBot(usePairingCode, phoneNumber, true), 3000)
            return
          }
        }

        if (shouldReconnect) {
          // Mantém código/QR se estiver ativo
          if (!hasActivePairingCode && !hasActiveQR) {
            qrCodeData = null
            console.log('🔄 Reconectando em 3s...')
            setTimeout(() => startBot(false, '', true), 3000) // ✅ isReconnect = true
          } else {
            console.log('⏳ QR/Código ATIVO - aguardando usuário...')
            console.log('⚠️ Reconexão adiada para não cancelar autenticação')
            // Aguarda 2 minutos antes de reconectar
            setTimeout(() => {
              if (connectionStatus === 'waiting_for_pairing' || connectionStatus === 'qr_ready') {
                console.log('⏱️ Timeout de autenticação, reconectando...')
                startBot(false, '', true)
              }
            }, 120000)
          }
        } else {
          console.log('❌ Desconectado')
          if (!hasActivePairingCode) {
            connectionStatus = 'disconnected'
            qrCodeData = null
            pairingCode = null
            if (pairingCodeTimer) clearTimeout(pairingCodeTimer)
          }
        }
      }

      if (connection === 'open') {
        isInitialConnection = false // ✅ Marca como autenticado
        connectionStatus = 'connected'
        pairingCode = null
        qrCodeData = null
        if (pairingCodeTimer) clearTimeout(pairingCodeTimer)
        console.log('✅ WhatsApp conectado com sucesso!')
      }
    })

    // ⚡ ADICIONA HANDLER DE MENSAGENS
    client.ev.on('messages.upsert', async ({ messages }) => {
      try {
        let m = messages[0]
        if (!m.message) return
        m.message = Object.keys(m.message)[0] === 'ephemeralMessage'
          ? m.message.ephemeralMessage.message
          : m.message
        if (m.key && m.key.remoteJid === 'status@broadcast') return
        if (!client.public && !m.key.fromMe && messages.type === 'notify') return
        if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return

        console.log('📨 Mensagem recebida, processando com smsg...')
        m = await smsgHandler(client, m)
        console.log('✅ smsg processado com sucesso')

        // ⚡ Processa mensagem via main.js (com otimizações)
        console.log('🔄 Enviando para main.js...')
        mainHandler(client, m, messages)
        console.log('✅ main.js processado')
      } catch (err) {
        if (err.message && err.message.includes('decrypt')) return
        if (err.name && err.name.includes('MessageCounterError')) return
        console.error('❌ Erro ao processar mensagem:', err.message)
        console.error('Stack:', err.stack)
      }
    })

    // Define cliente global para acesso de outros módulos
    global.client = client

    return client
  } catch (err) {
    console.error('❌ Erro ao iniciar bot:', err)
    connectionStatus = 'error'
    throw err
  }
}

// Rotas da API
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  } catch (err) {
    console.error('Erro ao servir index.html:', err)
    res.status(500).send('Erro ao carregar página')
  }
})

// Health check para Render/Fly.io
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: qrCodeData,
    code: pairingCode,
    timestamp: new Date().toISOString()
  })
})

app.post('/api/connect/qr', async (req, res) => {
  try {
    connectionStatus = 'connecting'
    qrCodeData = null
    pairingCode = null
    if (pairingCodeTimer) clearTimeout(pairingCodeTimer)

    await startBot(false, '', false) // ✅ Nova conexão - limpa sessão

    res.json({
      success: true,
      message: 'Conectando via QR Code...',
      session_cleared: true
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

app.post('/api/connect/code', async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de telefone é obrigatório'
      })
    }

    // Limpar e normalizar número
    const cleanNumber = normalizePhoneNumber(phoneNumber)
    if (!isValidPhoneForPairing(cleanNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Numero invalido. Use DDI + DDD + numero, sem + e sem espacos. Exemplo: 5511912345678'
      })
    }

    connectionStatus = 'connecting'
    qrCodeData = null
    pairingCode = null
    if (pairingCodeTimer) clearTimeout(pairingCodeTimer)

    await startBot(true, cleanNumber, false) // ✅ Nova conexão - limpa sessão

    res.json({
      success: true,
      message: 'Gerando código de pareamento...',
      session_cleared: true
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

app.post('/api/disconnect', async (req, res) => {
  try {
    if (client) {
      await client.logout()
    }
    clearSession()
    connectionStatus = 'disconnected'
    qrCodeData = null
    pairingCode = null

    res.json({
      success: true,
      message: 'Bot desconectado e sessão limpa'
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ⚡ Carrega database antes de iniciar servidor
global.loadDatabase = () => {
  if (!global.db) global.db = { data: {} }
  if (!global.db.data) global.db.data = {}
  if (!global.db.data.users) global.db.data.users = {}
  if (!global.db.data.chats) global.db.data.chats = {}
  if (!global.db.data.settings) global.db.data.settings = {}
}

global.loadDatabase()
console.log('✅ Database carregado')

// Escuta em 0.0.0.0 para aceitar conexões externas (Render, Fly.io, etc)
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`🌐 Acesse: http://localhost:${PORT}`)
  console.log(`✅ Pronto para receber conexões externas`)
})

server.on('error', (err) => {
  console.error('âŒ Falha ao abrir porta HTTP:', err)
  process.exit(1)
})

export default app
