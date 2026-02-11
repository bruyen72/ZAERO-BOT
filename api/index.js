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
  jidDecode
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
let connectionStatus = 'disconnected'
let client = null
let mainHandler = null
let eventsHandler = null
let smsgHandler = null

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

// Iniciar bot
async function startBot(usePairingCode = false, phoneNumber = '') {
  try {
    // Limpar sessão antiga automaticamente
    clearSession()

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
      browser: ['Windows', 'Chrome', '114.0.5735.198'],
      auth: state,
      defaultQueryTimeoutMs: undefined,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
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
          setTimeout(async () => {
            try {
              const cleanNumber = normalizePhoneNumber(phoneNumber)
              if (!isValidPhoneForPairing(cleanNumber)) {
                throw new Error('Numero invalido para pareamento. Use DDI + DDD + numero (ex: 5511912345678)')
              }
              const code = await client.requestPairingCode(cleanNumber)
              pairingCode = code?.match(/.{1,4}/g)?.join('-') || code
              connectionStatus = 'code_ready'
              console.log('✅ Código gerado:', pairingCode)
              console.log('📱 Digite este código no WhatsApp')
            } catch (err) {
              console.error('❌ Erro:', err.message)
              connectionStatus = 'error'
            }
          }, 2000)
        }
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = reason !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log('🔄 Finalizando conexão, iniciando sessão...')
          qrCodeData = null
          // Não limpar pairingCode para manter visível na interface
          setTimeout(() => startBot(false, ''), 3000) // Reconecta sem limpar sessão
        } else {
          console.log('❌ Desconectado')
          connectionStatus = 'disconnected'
          qrCodeData = null
          pairingCode = null
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected'
        console.log('✅ WhatsApp conectado!')
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

    await startBot(false)

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

    await startBot(true, cleanNumber)

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
