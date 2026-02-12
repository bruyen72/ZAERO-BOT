import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import qrcode from 'qrcode'
import crypto from 'crypto'
import session from 'express-session'
import rateLimit from 'express-rate-limit'
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
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const SESSION_COOKIE_NAME = 'zaero.sid'
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true'
  ? true
  : process.env.SESSION_COOKIE_SECURE === 'false'
    ? false
    : 'auto'

app.use(session({
  proxy: true,
  name: SESSION_COOKIE_NAME,
  secret: process.env.BOT_SESSION_SECRET || process.env.BOT_TOKEN_SECRET || 'zaero-bot-session-secret-2026',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: SESSION_COOKIE_SECURE,
    maxAge: SESSION_TTL_MS
  }
}))

// Evita bypass por acesso direto ao arquivo estatico de conexao.
app.get('/connect.html', (req, res) => {
  res.redirect('/connect')
})

app.use(express.static(path.join(__dirname, '..', 'public')))
// Auth config
const AUTH_CONFIG = {
  username: process.env.BOT_ADMIN_USER || 'bruyen',
  password: process.env.BOT_ADMIN_PASS || 'BRPO@hulk1'
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  }
})

function credentialsMatch(input, expected) {
  const left = Buffer.from(String(input || ''))
  const right = Buffer.from(String(expected || ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function requestWantsJson(req) {
  const accept = String(req.headers.accept || '').toLowerCase()
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  return accept.includes('application/json') || contentType.includes('application/json') || req.path.startsWith('/api/')
}

function requireAuth(req, res, next) {
  if (req.session?.user) return next()

  const wantsHtml = req.method === 'GET' && String(req.headers.accept || '').toLowerCase().includes('text/html')
  if (wantsHtml) {
    return res.redirect('/login')
  }

  return res.status(401).json({
    success: false,
    message: 'Nao autenticado. Faca login para continuar.'
  })
}

function respondLoginSuccess(req, res) {
  if (requestWantsJson(req)) {
    return res.json({
      success: true,
      redirectTo: '/connect',
      message: 'Autenticado com sucesso'
    })
  }
  return res.redirect('/connect')
}

function respondLoginFailure(req, res, message, status = 401) {
  if (requestWantsJson(req)) {
    return res.status(status).json({ success: false, message })
  }
  return res.status(status).send(message)
}

function handleLogin(req, res) {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return respondLoginFailure(req, res, 'Usuario e senha sao obrigatorios', 400)
    }

    const userMatch = credentialsMatch(username, AUTH_CONFIG.username)
    const passMatch = credentialsMatch(password, AUTH_CONFIG.password)

    if (!userMatch || !passMatch) {
      return respondLoginFailure(req, res, 'Usuario ou senha incorretos', 401)
    }

    req.session.user = { username }
    return req.session.save((error) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao iniciar sessao'
        })
      }
      return respondLoginSuccess(req, res)
    })
  } catch (error) {
    return respondLoginFailure(req, res, 'Erro no servidor', 500)
  }
}
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

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
})

app.post('/login', loginLimiter, handleLogin)
app.post('/api/auth/login', loginLimiter, handleLogin)

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME)
    res.json({ success: true, message: 'Logout realizado com sucesso' })
  })
})

app.get('/connect', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'connect.html'))
})

app.get('/api/status', requireAuth, (req, res) => {
  const connected = connectionStatus === 'connected'
  res.json({
    connected,
    status: connectionStatus,
    qr: qrCodeData,
    code: pairingCode,
    user: connected && client?.user ? {
      number: String(client.user.id || '').split(':')[0] || null,
      name: client.user.name || null
    } : null,
    timestamp: nowIso()
  })
})

const connectViaQrHandler = async (req, res) => {
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
}

app.post('/api/connect/qr', requireAuth, connectViaQrHandler)
app.post('/api/qr', requireAuth, connectViaQrHandler)

const connectViaCodeHandler = async (req, res) => {
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
}

app.post('/api/connect/code', requireAuth, connectViaCodeHandler)
app.post('/api/pairing-code', requireAuth, connectViaCodeHandler)

app.post('/api/disconnect', requireAuth, async (req, res) => {
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

