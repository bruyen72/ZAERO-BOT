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
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino from 'pino'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')))

// Estado global
let qrCodeData = null
let pairingCode = null
let connectionStatus = 'disconnected'
let client = null
let startPromise = null
let reconnectTimer = null
let pairingTimer = null

const activeConnectionStatuses = new Set(['connecting', 'qr_ready', 'code_ready', 'connected'])
const disconnectReasonByCode = Object.entries(DisconnectReason).reduce((acc, [reasonName, code]) => {
  if (typeof code === 'number') {
    acc[code] = reasonName
  }
  return acc
}, {})

function getSessionPath() {
  return path.join(__dirname, '..', 'Sessions', 'Owner')
}

function nowIso() {
  return new Date().toISOString()
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDisconnectInfo(lastDisconnect) {
  const statusCode = lastDisconnect?.error?.output?.statusCode ?? null
  const payload = lastDisconnect?.error?.output?.payload ?? null
  const reason = statusCode != null ? (disconnectReasonByCode[statusCode] || 'unknown') : null

  return {
    statusCode,
    reason,
    payload
  }
}

function logConnectionUpdate(update, context = {}) {
  const { connection, lastDisconnect } = update
  const info = getDisconnectInfo(lastDisconnect)

  console.log('[WA connection.update]', {
    at: nowIso(),
    connection: connection ?? null,
    statusCode: info.statusCode,
    reason: info.reason,
    payload: info.payload,
    ...context
  })
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function clearPairingTimer() {
  if (pairingTimer) {
    clearTimeout(pairingTimer)
    pairingTimer = null
  }
}

function removeDirectoryContents(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      removeDirectoryContents(fullPath)
      try {
        fs.rmdirSync(fullPath)
      } catch {
        // best effort
      }
      continue
    }
    try {
      fs.unlinkSync(fullPath)
    } catch {
      // best effort
    }
  }
}

function clearSession() {
  const sessionPath = getSessionPath()
  if (!fs.existsSync(sessionPath)) {
    return true
  }

  try {
    fs.rmSync(sessionPath, { recursive: true, force: true })
  } catch (err) {
    console.error('❌ Erro ao limpar sessão com rmSync:', err)
  }

  try {
    fs.mkdirSync(sessionPath, { recursive: true })
    if (fs.readdirSync(sessionPath).length > 0) {
      removeDirectoryContents(sessionPath)
    }

    const remaining = fs.readdirSync(sessionPath).length
    if (remaining > 0) {
      console.error(`❌ Erro ao limpar sessão: ${remaining} arquivos restantes`)
      return false
    }

    console.log('✅ Sessão limpa automaticamente')
    return true
  } catch (err) {
    console.error('❌ Erro ao limpar sessão:', err)
    return false
  }
}

async function stopClient({ logout = false } = {}) {
  if (!client) return

  const activeClient = client
  client = null

  try {
    if (logout) {
      await activeClient.logout()
    } else {
      activeClient.end(new Error('replace-socket'))
    }
  } catch {
    // ignore close errors
  }
}

async function requestPairingCodeWithRetry(sock, phoneNumber, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (client !== sock || connectionStatus === 'disconnected') {
      return
    }

    try {
      const code = await sock.requestPairingCode(phoneNumber)
      if (client !== sock) return

      pairingCode = code?.match(/.{1,4}/g)?.join('-') || code
      connectionStatus = 'code_ready'
      console.log('📱 Código de pareamento:', pairingCode)
      return
    } catch (err) {
      const statusCode = err?.output?.statusCode ?? null
      const retryable = statusCode === 428 || /Connection Closed|Connection Terminated/i.test(String(err?.message || ''))

      console.error(`❌ Erro ao gerar código (tentativa ${attempt}/${maxRetries}):`, {
        statusCode,
        message: err?.message
      })

      if (!retryable || attempt === maxRetries) {
        throw err
      }

      await wait(2000)
    }
  }
}

function ensureSessionDirectory() {
  const sessionPath = getSessionPath()
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
  }
  return sessionPath
}

function hasActiveSocketOrStart() {
  return Boolean(client) || Boolean(startPromise)
}

function shouldRejectNewConnectRequest() {
  return hasActiveSocketOrStart() || activeConnectionStatuses.has(connectionStatus)
}

async function startBot({
  usePairingCode = false,
  phoneNumber = '',
  clearSessionFirst = false,
  allowReconnect = true,
  requestPairingCode = false
} = {}) {
  if (startPromise) {
    return startPromise
  }

  startPromise = (async () => {
    try {
      clearReconnectTimer()
      clearPairingTimer()

      if (clearSessionFirst) {
        await stopClient({ logout: false })
        const sessionCleared = clearSession()
        if (!sessionCleared) {
          throw new Error('Não foi possível limpar a sessão anterior')
        }
      }

      const sessionPath = ensureSessionDirectory()
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
      const { version } = await fetchLatestBaileysVersion()

      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        getMessage: async () => ""
      })

      client = sock
      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', async (update) => {
        if (client !== sock) return

        const { connection, lastDisconnect, qr } = update
        logConnectionUpdate(update, {
          usePairingCode,
          phoneNumberMasked: phoneNumber ? `${phoneNumber.slice(0, 4)}***` : ''
        })

        if (qr) {
          qrCodeData = await qrcode.toDataURL(qr)
          connectionStatus = 'qr_ready'
          if (!usePairingCode) {
            pairingCode = null
          }
        }

        if (connection === 'open') {
          connectionStatus = 'connected'
          qrCodeData = null
          pairingCode = null
          clearPairingTimer()
          console.log('✅ Bot conectado!')
          return
        }

        if (connection === 'close') {
          const info = getDisconnectInfo(lastDisconnect)
          const isLoggedOut = info.reason === 'loggedOut' || info.statusCode === DisconnectReason.loggedOut
          const shouldReconnect = allowReconnect && !isLoggedOut

          connectionStatus = 'disconnected'
          qrCodeData = null
          pairingCode = null
          clearPairingTimer()
          client = null

          if (isLoggedOut) {
            clearSession()
            console.log('ℹ️ Sessão removida após loggedOut')
          }

          if (shouldReconnect) {
            clearReconnectTimer()
            reconnectTimer = setTimeout(() => {
              startBot({
                usePairingCode,
                phoneNumber,
                clearSessionFirst: false,
                allowReconnect: true,
                requestPairingCode: false
              }).catch((err) => {
                console.error('❌ Erro na reconexão automática:', err)
              })
            }, 3000)
          }
        }
      })

      if (usePairingCode && requestPairingCode && phoneNumber && !state.creds.registered) {
        pairingTimer = setTimeout(() => {
          requestPairingCodeWithRetry(sock, phoneNumber, 5).catch((err) => {
            if (client === sock) {
              console.error('❌ Erro final ao gerar código:', err?.message || err)
            }
          })
        }, 1500)
      }

      return sock
    } catch (err) {
      console.error('❌ Erro ao iniciar bot:', err)
      connectionStatus = 'error'
      throw err
    } finally {
      startPromise = null
    }
  })()

  return startPromise
}

// Rotas da API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: qrCodeData,
    code: pairingCode,
    timestamp: nowIso()
  })
})

app.post('/api/connect/qr', async (req, res) => {
  try {
    if (shouldRejectNewConnectRequest()) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma sessão/sock ativa. Desconecte antes de iniciar outra.'
      })
    }

    connectionStatus = 'connecting'
    qrCodeData = null
    pairingCode = null

    await startBot({
      usePairingCode: false,
      phoneNumber: '',
      clearSessionFirst: false,
      allowReconnect: true,
      requestPairingCode: false
    })

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

    const cleanNumber = String(phoneNumber).replace(/\D/g, '')
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Número inválido. Envie no formato DDI+DDD+número.'
      })
    }

    if (shouldRejectNewConnectRequest()) {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma sessão/sock ativa. Desconecte antes de iniciar outra.'
      })
    }

    connectionStatus = 'connecting'
    qrCodeData = null
    pairingCode = null

    await startBot({
      usePairingCode: true,
      phoneNumber: cleanNumber,
      clearSessionFirst: false,
      allowReconnect: true,
      requestPairingCode: true
    })

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
    clearReconnectTimer()
    clearPairingTimer()
    await stopClient({ logout: true })

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

process.on('unhandledRejection', (reason) => {
  console.error('❌ UnhandledRejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('❌ UncaughtException:', error)
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`🌐 Acesse: http://localhost:${PORT}`)
})

export default app
