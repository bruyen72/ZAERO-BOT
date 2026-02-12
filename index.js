import "./settings.js"
import main from './main.js'
import events from './commands/events.js'
import { Browsers, makeWASocket, makeCacheableSignalKeyStore, useMultiFileAuthState, fetchLatestBaileysVersion, jidDecode, DisconnectReason, jidNormalizedUser, } from "@whiskeysockets/baileys";
import cfonts from 'cfonts';
import pino from "pino";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import readlineSync from "readline-sync";
import readline from "readline";
import os from "os";
import { smsg } from "./lib/message.js";
import db from "./lib/system/database.js";
import { startSubBot } from './lib/subs.js';
import { exec, execSync } from "child_process";
import crypto from "crypto";

const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold(`INFO`), chalk.white(msg)),
  success: (msg) =>
    console.log(chalk.bgGreen.white.bold(`SUCCESS`), chalk.greenBright(msg)),
  warn: (msg) =>
    console.log(
      chalk.bgYellowBright.blueBright.bold(`WARNING`),
      chalk.yellow(msg),
    ),
  warning: (msg) =>
    console.log(chalk.bgYellowBright.red.bold(`WARNING`), chalk.yellow(msg)),
  error: (msg) =>
    console.log(chalk.bgRed.white.bold(`ERROR`), chalk.redBright(msg)),
};

  let phoneNumber = global.botNumber || ""
  let phoneInput = ""
  const methodCodeQR = process.argv.includes("--qr")
  const methodCode = process.argv.includes("--code")
  const DIGITS = (s = "") => String(s).replace(/\D/g, "");

  function normalizePhoneForPairing(input) {
    let s = DIGITS(input);
    if (!s) return "";
    if (s.startsWith("0")) s = s.replace(/^0+/, "");
    if (s.length === 10 && s.startsWith("3")) {
      s = "57" + s;
    }
    if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) {
      s = "521" + s.slice(2);
    }
    if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) {
      s = "549" + s.slice(2);
    }
    return s;
  }
  
const { say } = cfonts
console.log(chalk.magentaBright('\n❀ Iniciando...'))
  say('Yuki Suou', {
  align: 'center',           
  gradient: ['red', 'blue'] 
})
  say('Made with love by Destroy', {
  font: 'console',
  align: 'center',
  gradient: ['blue', 'magenta']
})

const BOT_TYPES = [
  { name: 'SubBot', folder: './Sessions/Subs', starter: startSubBot }
]

global.conns = global.conns || []
const reconnecting = new Set()
const toDigitsId = (value = "") => DIGITS(String(value).split("@")[0])

// ✅ CORREÇÃO 1: Flag para controlar reconexões (igual ao BOTRENAN)
let shouldRestart = true

// Variáveis para interface web
let currentQR = null
let pairingCodeNumber = null

function getReservedMainNumbers() {
  const reserved = new Set()
  const add = (value) => {
    const digits = toDigitsId(value)
    if (digits) reserved.add(digits)
  }
  add(global.botNumber)
  if (Array.isArray(global.owner)) {
    for (const owner of global.owner) add(owner)
  }
  add(global.client?.user?.id)
  return reserved
}

async function loadBots() {
  const reservedMainNumbers = getReservedMainNumbers()
  for (const { name, folder, starter } of BOT_TYPES) {
    if (!fs.existsSync(folder)) continue
    const botIds = fs.readdirSync(folder)
    for (const userId of botIds) {
      const normalizedUserId = toDigitsId(userId)
      if (!normalizedUserId) continue
      const sessionPath = path.join(folder, userId)
      const credsPath = path.join(sessionPath, 'creds.json')
      if (!fs.existsSync(credsPath)) continue
      if (reservedMainNumbers.has(normalizedUserId)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true })
          console.log(chalk.gray(`[ ✿  ]  Sesión de SUB-BOT inválida eliminada: ${normalizedUserId}`))
        } catch {
          console.log(chalk.gray(`[ ✿  ]  No se pudo eliminar la sesión inválida ${normalizedUserId}`))
        }
        continue
      }
      if (global.conns.some((conn) => toDigitsId(conn.userId) === normalizedUserId)) continue
      if (reconnecting.has(normalizedUserId)) continue
      try {
        reconnecting.add(normalizedUserId)
        await starter(null, null, 'Auto reconexión', false, normalizedUserId, sessionPath)
      } catch {
      } finally {
        reconnecting.delete(normalizedUserId)
      }
      await new Promise((res) => setTimeout(res, 2500))
    }
  }
  setTimeout(loadBots, 60 * 1000)
}

(async () => {
  await loadBots()
})()

let opcion;
const getOwnerCredsPath = () => path.join(global.sessionName, 'creds.json')
const ensureOwnerSessionDir = () => {
  try {
    fs.mkdirSync(global.sessionName, { recursive: true })
  } catch {}
}
const clearOwnerSessionDir = () => {
  try {
    fs.rmSync(global.sessionName, { recursive: true, force: true })
  } catch {}
  ensureOwnerSessionDir()
}
if (methodCodeQR) {
  opcion = "1";
} else if (methodCode) {
  opcion = "2";
} else if (!fs.existsSync(getOwnerCredsPath())) {
  // ✅ CORREÇÃO 8: Detectar ambiente não-interativo (Render, Docker, etc)
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (!isInteractive) {
    // Ambiente de produção (Render, Docker): usar QR code automaticamente
    opcion = "1";
    console.log(chalk.yellow("🤖 Ambiente não-interativo detectado. Usando QR Code automaticamente."));
  } else {
    // Ambiente local/terminal: perguntar ao usuário
    opcion = readlineSync.question(chalk.bold.white("\nSeleccione una opción:\n") + chalk.blueBright("1. Con código QR\n") + chalk.cyan("2. Con código de texto de 8 dígitos\n--> "));
    while (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`));
      opcion = readlineSync.question("--> ");
    }
    if (opcion === "2") {
      console.log(chalk.bold.redBright(`\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +57301******")}\n${chalk.bold.magentaBright('---> ')} `));
      phoneInput = readlineSync.question("");
      phoneNumber = normalizePhoneForPairing(phoneInput);
    }
  }
}

async function startBot() {
  // ✅ CORREÇÃO 2: Resetar flag de reconexão
  shouldRestart = true
  ensureOwnerSessionDir()

  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const logger = pino({ level: "silent" })
  console.info = () => {}
  console.debug = () => {}
  const clientt = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // ✅ CORREÇÃO 3: Marcar como online para estabilidade (igual ao BOTRENAN)
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    // ❌ REMOVIDAS opções problemáticas que causam desconexões:
    // syncFullHistory: false,
    // getMessage: async () => "",
    // keepAliveIntervalMs: 45000,
    // maxIdleTimeMs: 60000,
  })
  
  global.client = clientt
  const client = global.client
  client.isInit = false
  client.ev.on("creds.update", saveCreds)
  if (opcion === "2" && !fs.existsSync(getOwnerCredsPath())) {
  setTimeout(async () => {
    try {
       if (!state.creds.registered) {
        const pairing = await global.client.requestPairingCode(phoneNumber)
        const codeBot = pairing?.match(/.{1,4}/g)?.join("-") || pairing
        console.log(chalk.bold.white(chalk.bgMagenta(`Código de emparejamiento:`)), chalk.bold.white(chalk.white(codeBot)))
      }
    } catch (err) {
      console.log(chalk.red("Error al generar código:"), err)
    }
  }, 3000)
}

  client.sendText = (jid, text, quoted = "", options) =>
  client.sendMessage(jid, { text: text, ...options }, { quoted })
  client.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications, } = update

    if (qr != 0 && qr != undefined || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      // Armazenar QR para API web
      currentQR = qr
      console.log(chalk.green.bold("[ ✿ ] Escanea este código QR"));
      console.log(chalk.cyan(`📱 Ou acesse: http://localhost:${PORT || 3000}/connect`));
      qrcode.generate(qr, { small: true });
    }}

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0;
      const shouldReconnect = reason !== DisconnectReason.loggedOut

      console.log(chalk.yellow(`❌ Conexão fechada. Razão: ${reason}`))

      // ✅ CORREÇÃO 4: Tratamento especial para loggedOut (igual ao BOTRENAN)
      if (reason === DisconnectReason.loggedOut) {
        log.warning("🚪 Dispositivo desconectado via celular. Apagando sessão e reiniciando...")
        try {
          clearOwnerSessionDir()
          console.log(chalk.green('🗑️ Pasta session apagada com sucesso.'))
        } catch (err) {
          console.error(chalk.red('⚠️ Erro ao apagar pasta session:'), err)
        }
        // ✅ RECONECTA DEPOIS DE APAGAR (corrigido - não mata mais o processo)
        setTimeout(() => startBot(), 1000)
        return // Sai para evitar reconexão duplicada
      }

      // ✅ CORREÇÃO 5: Erros que requerem limpeza de sessão
      if ([DisconnectReason.forbidden, DisconnectReason.multideviceMismatch].includes(reason)) {
        log.error("❌ Erro crítico de sessão. Apagando e reiniciando...")
        try {
          clearOwnerSessionDir()
          console.log(chalk.green('🗑️ Sessão corrompida apagada.'))
        } catch (err) {
          console.error(chalk.red('⚠️ Erro ao apagar:'), err)
        }
        setTimeout(() => startBot(), 2000)
        return
      }

      // ✅ CORREÇÃO 6: Reconexão automática com delay (igual ao BOTRENAN)
      if (shouldReconnect && shouldRestart) {
        if (reason === DisconnectReason.connectionLost) {
          log.warning("🔄 Se perdió la conexión al servidor, reconectando...")
        } else if (reason === DisconnectReason.connectionClosed) {
          log.warning("🔄 Conexión cerrada, reconectando...")
        } else if (reason === DisconnectReason.restartRequired) {
          log.warning("🔄 Es necesario reiniciar...")
        } else if (reason === DisconnectReason.timedOut) {
          log.warning("🔄 Tiempo de conexión agotado, reconectando...")
        } else if (reason === DisconnectReason.badSession) {
          log.warning("🔄 Sesión inválida detectada, reconectando...")
        } else if (reason === DisconnectReason.connectionReplaced) {
          log.warning("⚠️ Conexión reemplazada por otro dispositivo...")
          return // Não reconecta se foi substituída
        } else {
          log.warning(`🔄 Reconectando... (Razão: ${reason})`)
        }

        // ✅ DELAY DE 3 SEGUNDOS (igual ao BOTRENAN)
        setTimeout(() => startBot(), 3000)
      }
    }
    if (connection == "open") {
         const userJid = jidNormalizedUser(client.user.id)
         const userName = client.user.name || "Desconhecido"
         console.log(chalk.green.bold(`[ ✿ ]  Conectado a: ${userName}`))
         // Limpar QR code após conexão
         currentQR = null
    }
    if (isNewLogin) {
      log.info("Nuevo dispositivo detectado")
    }
    if (receivedPendingNotifications == "true") {
      log.warn("Por favor espere aproximadamente 1 minuto...")
      client.ev.flush()
    }
  });

  let m
  client.ev.on("messages.upsert", async ({ messages }) => {
    try {
      m = messages[0]
      if (!m.message) return
      m.message = Object.keys(m.message)[0] === "ephemeralMessage" ? m.message.ephemeralMessage.message : m.message
      if (m.key && m.key.remoteJid === "status@broadcast") return
      if (!client.public && !m.key.fromMe && messages.type === "notify") return
      if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return
      m = await smsg(client, m)
      main(client, m, messages)
    } catch (err) {
      // Filtrar erros de descriptografia (não afetam o funcionamento)
      if (err.message && err.message.includes('decrypt')) return
      if (err.name && err.name.includes('MessageCounterError')) return
      console.log(err)
    }
  })
  try {
  await events(client, m)
  } catch (err) {
   console.log(chalk.gray(`[ BOT  ]  → ${err}`))
  }
  client.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return ((decode.user && decode.server && decode.user + "@" + decode.server) || jid)
    } else return jid
  }
}

// ✅ CORREÇÃO 7: Função de inicialização inteligente (igual ao BOTRENAN)
async function init() {
  global.loadDatabase()
  console.log(chalk.gray('[ ✿  ]  Base de datos cargada correctamente.'))

  // Verifica se já existe sessão válida e registrada
  const { state } = await useMultiFileAuthState(global.sessionName)
  if (state.creds && state.creds.registered) {
    console.log(chalk.green('📂 Sessão encontrada, iniciando reconexão automática...'))
  } else {
    console.log(chalk.yellow('⏳ Nenhuma sessão encontrada. Aguardando novo login...'))
  }

  await startBot()
}

// Inicia o bot
init()

// ===================================================================
// SERVIDOR WEB - INTERFACE DE CONEXÃO
// ===================================================================
import express from 'express'
import cors from 'cors'
import QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import rateLimit from 'express-rate-limit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// ===================================================================
// SISTEMA DE AUTENTICAÇÃO
// ===================================================================

// Credenciais seguras (configurar via variáveis de ambiente)
const AUTH_CONFIG = {
  username: process.env.BOT_ADMIN_USER || 'bruyen',
  password: process.env.BOT_ADMIN_PASS || 'BRPO@hulk1',
  tokenSecret: process.env.BOT_TOKEN_SECRET || 'zaero-bot-secret-bruyen-2026-ultra-secure'
}

// Token seguro: armazenado em memória, gerado aleatoriamente a cada login
const activeTokens = new Map() // token -> { createdAt, ip }
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

function generateSecureToken() {
  return crypto.randomBytes(48).toString('hex')
}

function isTokenValid(token) {
  if (!token || !activeTokens.has(token)) return false
  const entry = activeTokens.get(token)
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    activeTokens.delete(token)
    return false
  }
  return true
}

function cleanExpiredTokens() {
  const now = Date.now()
  for (const [token, entry] of activeTokens) {
    if (now - entry.createdAt > TOKEN_TTL_MS) activeTokens.delete(token)
  }
}

// Limpar tokens expirados a cada 30 minutos
setInterval(cleanExpiredTokens, 30 * 60 * 1000)

// ===================================================================
// RATE LIMITING - Proteção contra Brute Force
// ===================================================================

// Rate limiter para login (máximo 5 tentativas a cada 15 minutos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    success: false,
    message: '⛔ Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress
    console.log(chalk.red(`[SECURITY] 🚨 IP bloqueado por excesso de tentativas de login: ${ip}`))

    res.status(429).json({
      success: false,
      message: '⛔ Muitas tentativas de login. Aguarde 15 minutos.',
      blocked: true
    })
  }
})

// Rate limiter para APIs protegidas (30 requisições por minuto)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requisições
  message: {
    success: false,
    message: '⛔ Limite de requisições excedido. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress
    console.log(chalk.red(`[SECURITY] 🚨 IP bloqueado por excesso de requisições: ${ip}`))

    res.status(429).json({
      success: false,
      message: '⛔ Muitas requisições. Aguarde 1 minuto.',
      blocked: true
    })
  }
})

// Sistema de rastreamento de IPs suspeitos
const suspiciousIPs = new Map()

function trackSuspiciousActivity(ip, action) {
  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, [])
  }

  const activities = suspiciousIPs.get(ip)
  activities.push({
    action,
    timestamp: new Date().toISOString()
  })

  // Manter apenas as últimas 50 atividades
  if (activities.length > 50) {
    activities.shift()
  }

  console.log(chalk.yellow(`[SECURITY] 🔍 Atividade suspeita detectada: ${ip} → ${action}`))
}

// ===================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===================================================================

// Headers de segurança para todas as respostas
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

// Middleware de autenticação para rotas protegidas
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const ip = req.ip || req.connection.remoteAddress

  if (!token) {
    trackSuspiciousActivity(ip, 'Tentativa de acesso sem token')
    console.log(chalk.yellow(`[AUTH] Acesso negado (sem token): ${ip} -> ${req.path}`))

    return res.status(401).json({
      success: false,
      message: 'Token de autenticacao nao fornecido'
    })
  }

  // Verificar token seguro (armazenado em memória)
  if (isTokenValid(token)) {
    next()
  } else {
    trackSuspiciousActivity(ip, 'Tentativa de acesso com token invalido')
    console.log(chalk.red(`[AUTH] Token invalido: ${ip} -> ${req.path}`))

    res.status(401).json({
      success: false,
      message: 'Token de autenticacao invalido ou expirado'
    })
  }
}

// ===================================================================
// ROTAS DA INTERFACE WEB
// ===================================================================

// Página de login
app.get('/login', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'login.html'))
})

// Página principal de conexão (PROTEGIDA - validação feita no client-side via localStorage)
app.get('/connect', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'connect.html'))
})

// Redirecionar raiz para landing page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

// ===================================================================
// API DE AUTENTICAÇÃO
// ===================================================================

// Login (PROTEGIDO COM RATE LIMITING)
app.post('/api/auth/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = req.body
    const ip = req.ip || req.connection.remoteAddress

    if (!username || !password) {
      trackSuspiciousActivity(ip, 'Login sem credenciais')
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      })
    }

    // Verificar credenciais com comparacao timing-safe
    const userMatch = username.length === AUTH_CONFIG.username.length &&
      crypto.timingSafeEqual(Buffer.from(username), Buffer.from(AUTH_CONFIG.username))
    const passMatch = password.length === AUTH_CONFIG.password.length &&
      crypto.timingSafeEqual(Buffer.from(password), Buffer.from(AUTH_CONFIG.password))

    if (userMatch && passMatch) {
      // Gerar token aleatório seguro
      const token = generateSecureToken()
      activeTokens.set(token, { createdAt: Date.now(), ip })

      console.log(chalk.green(`[AUTH] Login bem-sucedido: ${username} (IP: ${ip})`))

      res.json({
        success: true,
        token,
        message: 'Autenticado com sucesso'
      })
    } else {
      trackSuspiciousActivity(ip, `Login falhou: ${username}`)
      console.log(chalk.yellow(`[AUTH] ❌ Tentativa de login falhou: ${username} (IP: ${ip})`))

      res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      })
    }
  } catch (error) {
    console.error(chalk.red('[AUTH] Erro no login:'), error)
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    })
  }
})

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  })
})

// ===================================================================
// API ENDPOINTS
// ===================================================================

// Status da conexão (PROTEGIDA)
app.get('/api/status', authMiddleware, apiLimiter, (req, res) => {
  try {
    const connected = global.client?.user?.id ? true : false
    const userInfo = {
      connected,
      number: connected ? global.client.user.id.split(':')[0] : null,
      name: connected ? global.client.user.name : null,
      timestamp: Date.now()
    }

    res.json(userInfo)
  } catch (error) {
    res.json({
      connected: false,
      error: error.message
    })
  }
})

// Gerar QR Code (PROTEGIDA)
app.post('/api/qr', authMiddleware, apiLimiter, async (req, res) => {
  try {
    // Se já tem QR code armazenado, retornar
    if (currentQR) {
      const qrDataURL = await QRCode.toDataURL(currentQR)
      return res.json({
        success: true,
        qr: qrDataURL,
        message: 'QR Code gerado com sucesso'
      })
    }

    // Aguardar QR code ser gerado (máximo 10 segundos)
    const qrPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao gerar QR Code'))
      }, 10000)

      const checkQR = setInterval(() => {
        if (currentQR) {
          clearInterval(checkQR)
          clearTimeout(timeout)
          resolve(currentQR)
        }
      }, 500)
    })

    const qr = await qrPromise
    const qrDataURL = await QRCode.toDataURL(qr)

    res.json({
      success: true,
      qr: qrDataURL,
      message: 'QR Code gerado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar QR Code: ' + error.message
    })
  }
})

// Gerar código de pareamento (PROTEGIDA)
app.post('/api/pairing-code', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório'
      })
    }

    // Validar número
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone inválido'
      })
    }

    // Normalizar número
    pairingCodeNumber = normalizePhoneForPairing(cleanNumber)

    // Se o bot não está conectado, solicitar código
    if (!global.client?.user?.id) {
      try {
        const code = await global.client.requestPairingCode(pairingCodeNumber)
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code

        res.json({
          success: true,
          code: code,
          formattedCode: formattedCode,
          message: 'Código gerado com sucesso'
        })
      } catch (error) {
        throw new Error('Erro ao solicitar código: ' + error.message)
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Bot já está conectado'
      })
    }

  } catch (error) {
    console.error('Erro ao gerar código:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar código: ' + error.message
    })
  }
})

// Desconectar bot (PROTEGIDA)
app.post('/api/disconnect', authMiddleware, apiLimiter, async (req, res) => {
  try {
    if (global.client) {
      await global.client.logout()

      // Limpar sessão
      try {
        clearOwnerSessionDir()
      } catch (err) {
        console.error('Erro ao apagar sessão:', err)
      }

      res.json({
        success: true,
        message: 'Bot desconectado com sucesso'
      })

      // Reiniciar bot após 2 segundos
      setTimeout(() => startBot(), 2000)
    } else {
      res.status(400).json({
        success: false,
        message: 'Bot não está conectado'
      })
    }
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar: ' + error.message
    })
  }
})

// Informações do bot (PROTEGIDA)
app.get('/api/info', authMiddleware, apiLimiter, (req, res) => {
  res.json({
    name: 'ZÆRØ BOT',
    version: '2.0',
    status: global.client?.user?.id ? 'online' : 'offline',
    uptime: process.uptime(),
    commands: 529
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(chalk.green(`\n🌐 Servidor web rodando em: http://localhost:${PORT}`))
  console.log(chalk.cyan(`📱 Interface de conexão: http://localhost:${PORT}/connect`))
  console.log(chalk.gray(`─`.repeat(50)))
})
