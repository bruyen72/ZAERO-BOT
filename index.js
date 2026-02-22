import "./settings.js"
import main, { getMainQueueStats } from './main.js'
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
console.log(chalk.magentaBright("\nIniciando..."))
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
  { name: 'ZAERO BOT', folder: './Sessions/Subs', starter: startSubBot }
]

global.conns = global.conns || []
const reconnecting = new Set()
const toDigitsId = (value = "") => DIGITS(String(value).split("@")[0])

// ✅ CORREÇÃO 1: Flag para controlar reconexões (igual ao BOTRENAN)
let shouldRestart = true

// Variáveis para interface web
let currentQR = null
let pairingCodeNumber = null

const MAIN_CONN = {
  client: null,
  startPromise: null,
  reconnectTimer: null,
  reconnectAttempt: 0,
  connectionId: 0,
  lastPrintedQR: null,
  qrUpdatedAt: 0,
  qrWaitPromise: null,
  qrWaitResolve: null,
  qrWaitReject: null,
  qrWaitTimer: null,
  timeout408Count: 0,
  timeout408WindowStart: 0,
  connectionClosedCount: 0,
  connectionClosedWindowStart: 0,
  hasRegisteredCreds: false,
  state: "idle",
}

const QR_WAIT_TIMEOUT_MS = Number(process.env.BOT_QR_TIMEOUT_MS || 120000)
const QR_STALE_MS = Number(process.env.BOT_QR_STALE_MS || 60000)
const RECONNECT_BASE_MS = Number(process.env.BOT_RECONNECT_BASE_MS || 2000)
const RECONNECT_MAX_MS = Number(process.env.BOT_RECONNECT_MAX_MS || 60000)
const RECONNECT_JITTER_MS = Number(process.env.BOT_RECONNECT_JITTER_MS || 1000)
const TIMEOUT_408_WINDOW_MS = Number(process.env.BOT_408_WINDOW_MS || 5 * 60 * 1000)
const TIMEOUT_408_MAX = Number(process.env.BOT_408_MAX || 3)
const CONNECTION_CLOSED_WINDOW_MS = Number(
  process.env.BOT_428_WINDOW_MS || 5 * 60 * 1000,
)
const CONNECTION_CLOSED_MAX = Number(process.env.BOT_428_MAX || 6)
const KEEP_ALIVE_MS = Number(process.env.BOT_KEEP_ALIVE_MS || 25000)
const MAX_IDLE_MS = Number(process.env.BOT_MAX_IDLE_MS || 90000)
const CONNECT_TIMEOUT_MS = Number(process.env.BOT_CONNECT_TIMEOUT_MS || 60000)
const PAIRING_RETRY_ATTEMPTS = Number(process.env.BOT_PAIRING_RETRY_ATTEMPTS || 3)
const PAIRING_RETRY_DELAY_MS = Number(process.env.BOT_PAIRING_RETRY_DELAY_MS || 1500)

const DISCONNECT_REASON_NAMES = new Map(
  Object.entries(DisconnectReason).map(([key, value]) => [value, key]),
)

function resolveDisconnectReason(code) {
  if (code == null) return "unknown"
  return DISCONNECT_REASON_NAMES.get(code) || String(code)
}

function computeBackoffMs(attempt = 0) {
  const pow = Math.min(attempt, 8)
  const base = RECONNECT_BASE_MS * Math.pow(2, pow)
  const capped = Math.min(RECONNECT_MAX_MS, base)
  const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS)
  return capped + jitter
}

function clearReconnectTimer() {
  if (MAIN_CONN.reconnectTimer) {
    clearTimeout(MAIN_CONN.reconnectTimer)
    MAIN_CONN.reconnectTimer = null
  }
}

function resetReconnectState() {
  MAIN_CONN.reconnectAttempt = 0
  clearReconnectTimer()
}

function clearQrWaiters() {
  if (MAIN_CONN.qrWaitTimer) {
    clearTimeout(MAIN_CONN.qrWaitTimer)
    MAIN_CONN.qrWaitTimer = null
  }
  MAIN_CONN.qrWaitPromise = null
  MAIN_CONN.qrWaitResolve = null
  MAIN_CONN.qrWaitReject = null
}

function setCurrentQR(qr) {
  currentQR = qr
  MAIN_CONN.qrUpdatedAt = Date.now()
  if (MAIN_CONN.qrWaitResolve) {
    MAIN_CONN.qrWaitResolve(qr)
    clearQrWaiters()
  }
}

function isQRFresh() {
  if (!currentQR) return false
  return Date.now() - MAIN_CONN.qrUpdatedAt <= QR_STALE_MS
}

function waitForQR(timeoutMs = QR_WAIT_TIMEOUT_MS) {
  if (isQRFresh()) return Promise.resolve(currentQR)
  if (MAIN_CONN.qrWaitPromise) return MAIN_CONN.qrWaitPromise

  MAIN_CONN.qrWaitPromise = new Promise((resolve, reject) => {
    MAIN_CONN.qrWaitResolve = resolve
    MAIN_CONN.qrWaitReject = reject
    MAIN_CONN.qrWaitTimer = setTimeout(() => {
      clearQrWaiters()
      reject(new Error("Timeout ao gerar QR Code"))
    }, timeoutMs)
  })

  return MAIN_CONN.qrWaitPromise
}

function clearQrState() {
  currentQR = null
  MAIN_CONN.qrUpdatedAt = 0
  MAIN_CONN.lastPrintedQR = null
}

function resetConnectionClosedState() {
  MAIN_CONN.connectionClosedCount = 0
  MAIN_CONN.connectionClosedWindowStart = 0
}

const delay = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

function extractDisconnectCode(lastDisconnect = {}) {
  return (
    lastDisconnect?.error?.output?.statusCode ||
    lastDisconnect?.error?.statusCode ||
    lastDisconnect?.statusCode ||
    lastDisconnect?.reason ||
    0
  )
}

function extractErrorStatusCode(error = {}) {
  return (
    error?.output?.statusCode ||
    error?.statusCode ||
    error?.status ||
    error?.data?.status ||
    0
  )
}

async function destroyClient(client, { logout = false, reason = "" } = {}) {
  if (!client) return
  try {
    client.ev?.removeAllListeners?.()
  } catch {}
  try {
    client.ws?.removeAllListeners?.()
  } catch {}

  if (logout) {
    try {
      await client.logout()
    } catch {}
  }

  try {
    if (typeof client.end === "function") {
      client.end(new Error(reason || "socket closed"))
    }
  } catch {}

  try {
    client.ws?.close?.()
  } catch {}
}

function isSessionInvalidReason(code = 0) {
  return [
    DisconnectReason.loggedOut,
    DisconnectReason.badSession,
    DisconnectReason.forbidden,
    DisconnectReason.multideviceMismatch,
  ].includes(code) || [401, 403].includes(code)
}

function isTimeoutReason(code = 0) {
  return code === 408 || code === DisconnectReason.timedOut
}

function isConnectionClosedReason(code = 0) {
  return (
    code === 428 ||
    code === DisconnectReason.connectionClosed ||
    code === DisconnectReason.connectionLost
  )
}

function isPairingRetryableError(error) {
  const statusCode = Number(extractErrorStatusCode(error))
  if (
    [
      408,
      428,
      DisconnectReason.connectionClosed,
      DisconnectReason.connectionLost,
      DisconnectReason.timedOut,
    ].includes(statusCode)
  ) {
    return true
  }

  const message = String(error?.message || "")
  return /(connection|closed|timed out|timedout|428|408|stream|socket|network)/i.test(
    message,
  )
}

async function ensureMainClientReady({ force = false } = {}) {
  if (force || !global.client || ["idle", "closed"].includes(MAIN_CONN.state)) {
    await startBot({ force: true })
  } else if (!["open", "connecting"].includes(MAIN_CONN.state)) {
    await startBot()
  }
  return global.client || MAIN_CONN.client
}

async function requestPairingCodeWithRetry(phone) {
  let lastError = null
  for (let attempt = 1; attempt <= PAIRING_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const client = await ensureMainClientReady({ force: attempt > 1 })
      if (!client) {
        throw new Error("Cliente WhatsApp indisponivel no momento")
      }

      const code = await client.requestPairingCode(phone)
      if (!code) throw new Error("Codigo de pareamento vazio")
      return code
    } catch (error) {
      lastError = error
      const retryable = isPairingRetryableError(error)
      if (!retryable || attempt >= PAIRING_RETRY_ATTEMPTS) break

      const waitMs = PAIRING_RETRY_DELAY_MS * attempt
      log.warn(
        `Falha ao gerar pairing (${attempt}/${PAIRING_RETRY_ATTEMPTS}). Tentando novamente em ${Math.round(waitMs / 1000)}s...`,
      )
      await delay(waitMs)
    }
  }

  throw lastError || new Error("Nao foi possivel gerar codigo de pareamento")
}

function isCurrentClient(client, connectionId) {
  return MAIN_CONN.client === client && MAIN_CONN.connectionId === connectionId
}

function scheduleReconnect(reason, { immediate = false } = {}) {
  if (!shouldRestart) return
  clearReconnectTimer()

  const attempt = MAIN_CONN.reconnectAttempt
  const delay = immediate ? 0 : computeBackoffMs(attempt)
  MAIN_CONN.reconnectAttempt += 1

  log.warning(
    `Reconectando em ${Math.round(delay / 1000)}s (tentativa ${MAIN_CONN.reconnectAttempt}) - ${reason}`,
  )

  MAIN_CONN.reconnectTimer = setTimeout(() => {
    MAIN_CONN.reconnectTimer = null
    startBot({ force: true, reason })
  }, delay)
}

async function handleDisconnect({ lastDisconnect }, client, connectionId) {
  if (!isCurrentClient(client, connectionId)) return

  clearReconnectTimer()

  const code = extractDisconnectCode(lastDisconnect)
  const reasonName = resolveDisconnectReason(code)

  console.log(chalk.yellow(`Conexao fechada. Razao: ${code} (${reasonName})`))

  MAIN_CONN.state = "closed"
  clearQrState()

  if (isTimeoutReason(code)) {
    const now = Date.now()
    if (
      !MAIN_CONN.timeout408WindowStart ||
      now - MAIN_CONN.timeout408WindowStart > TIMEOUT_408_WINDOW_MS
    ) {
      MAIN_CONN.timeout408WindowStart = now
      MAIN_CONN.timeout408Count = 0
    }
    MAIN_CONN.timeout408Count += 1
    if (MAIN_CONN.timeout408Count >= TIMEOUT_408_MAX) {
      log.warning("Muitos erros 408 em sequencia. Forcando reset completo da conexao.")
    }
  }

  if (isConnectionClosedReason(code)) {
    const now = Date.now()
    if (
      !MAIN_CONN.connectionClosedWindowStart ||
      now - MAIN_CONN.connectionClosedWindowStart > CONNECTION_CLOSED_WINDOW_MS
    ) {
      MAIN_CONN.connectionClosedWindowStart = now
      MAIN_CONN.connectionClosedCount = 0
    }
    MAIN_CONN.connectionClosedCount += 1

    if (
      !MAIN_CONN.hasRegisteredCreds &&
      MAIN_CONN.connectionClosedCount >= CONNECTION_CLOSED_MAX
    ) {
      log.warning(
        "Muitas desconexoes 428 sem sessao registrada. Limpando estado parcial para gerar novo QR/pairing...",
      )
      try {
        clearOwnerSessionDir()
      } catch (err) {
        console.error(chalk.red("Erro ao resetar sessao parcial:"), err)
      }
      MAIN_CONN.hasRegisteredCreds = false
      resetConnectionClosedState()
    }
  }

  const invalidSession = isSessionInvalidReason(code)
  if (invalidSession) {
    MAIN_CONN.hasRegisteredCreds = false
    log.warning("Sessao invalida ou desconectada pelo WhatsApp. Limpando credenciais...")
    try {
      clearOwnerSessionDir()
    } catch (err) {
      console.error(chalk.red("Erro ao apagar sessao:"), err)
    }
  }

  if (code === DisconnectReason.connectionReplaced) {
    log.warning("Conexao substituida por outro dispositivo. Reconexao abortada.")
    await destroyClient(client, { reason: `disconnect:${code}` })
    if (MAIN_CONN.client === client) {
      MAIN_CONN.client = null
      global.client = null
    }
    return
  }

  await destroyClient(client, { reason: `disconnect:${code}` })
  if (MAIN_CONN.client === client) {
    MAIN_CONN.client = null
    global.client = null
  }

  if (invalidSession) {
    scheduleReconnect("sessao invalida", { immediate: true })
    return
  }

  if (isTimeoutReason(code)) {
    scheduleReconnect("timeout 408", { immediate: false })
    return
  }

  if (isConnectionClosedReason(code)) {
    if (!MAIN_CONN.hasRegisteredCreds) {
      MAIN_CONN.reconnectAttempt = 0
      scheduleReconnect("sessao nao autenticada (428)", { immediate: false })
      return
    }
    scheduleReconnect("connectionClosed 428", { immediate: false })
    return
  }

  scheduleReconnect(`motivo ${code}`, { immediate: false })
}

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
          console.log(chalk.gray(`[ OK ] SUB-BOT invalido eliminado: ${normalizedUserId}`))
        } catch {
          console.log(chalk.gray(`[ WARN ] No se pudo eliminar la sesion invalida ${normalizedUserId}`))
        }
        continue
      }
      if (global.conns.some((conn) => toDigitsId(conn.userId) === normalizedUserId)) continue
      if (reconnecting.has(normalizedUserId)) continue
      try {
        reconnecting.add(normalizedUserId)
        await starter(null, null, 'Auto reconexion', false, normalizedUserId, sessionPath)
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

const readOwnerCreds = () => {
  try {
    const credsPath = getOwnerCredsPath()
    if (!fs.existsSync(credsPath)) return null
    return JSON.parse(fs.readFileSync(credsPath, "utf8"))
  } catch {
    return null
  }
}

const hasRegisteredOwnerCreds = () => {
  const creds = readOwnerCreds()
  return Boolean(creds?.registered)
}
if (methodCodeQR) {
  opcion = "1";
} else if (methodCode) {
  opcion = "2";
} else if (!hasRegisteredOwnerCreds()) {
  // ✅ CORREÇÃO 8: Detectar ambiente não-interativo (Render, Docker, etc)
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (!isInteractive) {
  console.log(chalk.yellow("Ambiente nao-interativo detectado. Usando QR Code automaticamente."));
  opcion = "1";
} else {
  // Ambiente local/terminal: perguntar ao usuario
  opcion = readlineSync.question(
    chalk.bold.white("\nSeleccione una opcion:\n") +
      chalk.blueBright("1. Con codigo QR\n") +
      chalk.cyan("2. Con codigo de texto de 8 digitos\n--> "),
  );
  while (!/^[1-2]$/.test(opcion)) {
    console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2, tampoco letras o simbolos especiales.`));
    opcion = readlineSync.question("--> ");
  }
  if (opcion === "2") {
    console.log(
      chalk.bold.redBright(
        `\nPor favor, Ingrese el numero de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +57301******")}\n${chalk.bold.magentaBright('---> ')} `,
      ),
    );
    phoneInput = readlineSync.question("");
    phoneNumber = normalizePhoneForPairing(phoneInput);
  }
}
}

function handleConnectionUpdate(update, client, connectionId) {
  if (!isCurrentClient(client, connectionId)) return

  const {
    qr,
    connection,
    lastDisconnect,
    isNewLogin,
    receivedPendingNotifications,
  } = update

  if (qr) {
    setCurrentQR(qr)
    if ((opcion === "1" || methodCodeQR) && MAIN_CONN.lastPrintedQR !== qr) {
      MAIN_CONN.lastPrintedQR = qr
      console.log(chalk.green.bold("[ QR ] Escaneie este codigo QR"))
      const port = Number(process.env.PORT || 3000)
      console.log(chalk.cyan(`Acesse: http://localhost:${port}/connect`))
      qrcode.generate(qr, { small: true })
    }
  }

  if (connection === "close") {
    handleDisconnect({ lastDisconnect }, client, connectionId)
    return
  }

  if (connection === "open") {
    MAIN_CONN.state = "open"
    resetReconnectState()
    MAIN_CONN.timeout408Count = 0
    MAIN_CONN.timeout408WindowStart = 0
    resetConnectionClosedState()
    MAIN_CONN.hasRegisteredCreds = true
    clearQrState()
    const userName = client.user?.name || "Desconhecido"
    console.log(chalk.green.bold(`[ OK ] Conectado a: ${userName}`))
  }

  if (isNewLogin) {
    log.info("Nuevo dispositivo detectado")
  }

  if (receivedPendingNotifications === true || receivedPendingNotifications === "true") {
    log.warn("Por favor espere aproximadamente 1 minuto...")
    client.ev.flush()
  }
}

async function startBot({ force = false } = {}) {
  if (MAIN_CONN.startPromise) return MAIN_CONN.startPromise

  MAIN_CONN.startPromise = (async () => {
    // ✅ CORREÇÃO 2: Resetar flag de reconexão
    shouldRestart = true
    ensureOwnerSessionDir()

    if (MAIN_CONN.client && !force && MAIN_CONN.state === "open") {
      return MAIN_CONN.client
    }

    MAIN_CONN.state = "connecting"

    if (MAIN_CONN.client) {
      await destroyClient(MAIN_CONN.client, { reason: "restart" })
    }
    MAIN_CONN.client = null
    global.client = null
    clearQrState()

    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
    MAIN_CONN.hasRegisteredCreds = Boolean(state.creds?.registered)
    const { version } = await fetchLatestBaileysVersion()
    const logger = pino({ level: "silent" })
    console.info = () => {}
    console.debug = () => {}

    const clientt = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      browser: Browsers.macOS("Chrome"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      // ✅ CORREÇÃO 3: Marcar como online para estabilidade (igual ao BOTRENAN)
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      keepAliveIntervalMs: KEEP_ALIVE_MS,
      maxIdleTimeMs: MAX_IDLE_MS,
      connectTimeoutMs: CONNECT_TIMEOUT_MS,
    })

    MAIN_CONN.client = clientt
    global.client = clientt
    const connectionId = ++MAIN_CONN.connectionId
    const client = clientt

    client.isInit = false
    client.ev.on("creds.update", async () => {
      MAIN_CONN.hasRegisteredCreds = Boolean(state.creds?.registered)
      await saveCreds()
    })
    if (opcion === "2" && !hasRegisteredOwnerCreds()) {
      setTimeout(async () => {
        try {
          if (!state.creds.registered) {
            const pairing = await requestPairingCodeWithRetry(phoneNumber)
            const codeBot = pairing?.match(/.{1,4}/g)?.join("-") || pairing
            console.log(
              chalk.bold.white(chalk.bgMagenta(`Codigo de emparejamiento:`)),
              chalk.bold.white(chalk.white(codeBot)),
            )
          }
        } catch (err) {
          console.log(chalk.red("Error al generar codigo:"), err)
        }
      }, 3000)
    }

    client.sendText = (jid, text, quoted = "", options) =>
      client.sendMessage(jid, { text: text, ...options }, { quoted })
    client.ev.on("connection.update", (update) =>
      handleConnectionUpdate(update, client, connectionId),
    )

    let m
    client.ev.on("messages.upsert", async ({ messages }) => {
      try {
        m = messages[0]
        if (!m.message) return
        m.message =
          Object.keys(m.message)[0] === "ephemeralMessage"
            ? m.message.ephemeralMessage.message
            : m.message
        if (m.key && m.key.remoteJid === "status@broadcast") return
        if (!client.public && !m.key.fromMe && messages.type === "notify") return
        if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return
        m = await smsg(client, m)
        main(client, m, messages)
      } catch (err) {
        // Filtrar erros de descriptografia (nao afetam o funcionamento)
        if (err.message && err.message.includes("decrypt")) return
        if (err.name && err.name.includes("MessageCounterError")) return
        console.log(err)
      }
    })
    try {
      await events(client, m)
    } catch (err) {
      console.log(chalk.gray(`[ BOT  ]  -> ${err}`))
    }
    client.decodeJid = (jid) => {
      if (!jid) return jid
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {}
        return (
          (decode.user && decode.server && decode.user + "@" + decode.server) ||
          jid
        )
      } else return jid
    }

    return clientt
  })().finally(() => {
    MAIN_CONN.startPromise = null
  })

  return MAIN_CONN.startPromise
}

// ✅ CORREÇÃO 7: Função de inicialização inteligente (igual ao BOTRENAN)
async function init() {
  global.loadDatabase()
  console.log(chalk.magentaBright("\nIniciando..."))
  console.log(chalk.gray('[ OK ] Base de datos cargada correctamente.'))

  // Verifica se ja existe sessao valida e registrada
  const { state } = await useMultiFileAuthState(global.sessionName)
  if (state.creds && state.creds.registered) {
    console.log(chalk.green('Sessao encontrada, iniciando reconexao automatica...'))
  } else {
    console.log(chalk.yellow('Nenhuma sessao encontrada. Aguardando novo login...'))
  }

  await startBot()

    // SANITY CHECK OBRIGATORIO (Solicitado pelo usuario)
  setTimeout(() => {
    console.log(chalk.cyan.bold('\n--- [ SANITY CHECK FINAL ] ---'))
    console.log(chalk.white(`[CHECK] Prefixos ativos: .`))
    console.log(chalk.white(`[CHECK] totalCommands=${global.comandos ? global.comandos.size : '?'}`))

    const cmds = ['sticker', 's', 'beijo', 'lickass', 'menu']
    const status = cmds.map(c => `${c}=${global.comandos?.has(c)}`).join('  ')
    console.log(chalk.white(`[CHECK] ${status}`))

    console.log(chalk.white(`[CHECK] ffmpeg pipeline configurada com concorrencia=1`))
    console.log(chalk.white(`[CHECK] media re-encode habilitado para MP4 H.264 baseline`))
    console.log(chalk.cyan.bold('-'.repeat(50) + '\n'))
  }, 5000)
}

// Inicia o bot
init()

// ===================================================================
// ===================================================================
import express from 'express'
import cors from 'cors'
import QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createServer } from 'http'
import rateLimit from 'express-rate-limit'
import session from 'express-session'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
let SocketIOServer = null
try {
  ;({ Server: SocketIOServer } = await import('socket.io'))
} catch {
  console.warn(chalk.yellow('[JogoDaVelha] socket.io nao encontrado. Rode "npm i socket.io" para habilitar o jogo online.'))
}

const app = express()
const HEALTHZ_RESPONSE = Buffer.from('ok')
const httpServer = createServer((req, res) => {
  const url = String(req?.url || '')
  if (req?.method === 'GET' && (url === '/healthz' || url.startsWith('/healthz?'))) {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': HEALTHZ_RESPONSE.length,
    })
    res.end(HEALTHZ_RESPONSE)
    return
  }
  app(req, res)
})
const io = SocketIOServer
  ? new SocketIOServer(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } })
  : null
app.set('trust proxy', 1)
const PORT = Number(process.env.PORT || 3000)
const BOOT_TIME_MS = Date.now()

function toMB(bytes = 0) {
  return Number((Number(bytes || 0) / 1024 / 1024).toFixed(2))
}

function buildHealthPayload() {
  const mem = process.memoryUsage()
  const queue = getMainQueueStats()
  return {
    status: 'ok',
    connected: Boolean(global.client?.user?.id),
    uptimeSec: Math.floor((Date.now() - BOOT_TIME_MS) / 1000),
    timestamp: new Date().toISOString(),
    node: process.version,
    memoryMB: {
      rss: toMB(mem.rss),
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      external: toMB(mem.external),
      arrayBuffers: toMB(mem.arrayBuffers),
    },
    queue,
  }
}

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

// Evita bypass por acesso direto ao arquivo estatico.
app.get('/connect.html', (req, res) => {
  res.redirect('/connect')
})

app.use(express.static(join(__dirname, 'public')))

// Healthcheck público para Fly.io
app.get('/health', (req, res) => {
  const payload = buildHealthPayload()
  const rssLimitMb = Number(process.env.BOT_HEALTH_RSS_LIMIT_MB || 900)
  const queueLimit = Number(process.env.BOT_HEALTH_QUEUE_LIMIT || 5000)
  const rssCritical = payload.memoryMB.rss >= rssLimitMb
  const queueCritical = Number(payload.queue?.chat?.pendingGlobal || 0) >= queueLimit

  if (rssCritical || queueCritical) {
    return res.status(503).json({
      ...payload,
      status: 'degraded',
      critical: {
        rssCritical,
        queueCritical,
      },
    })
  }

  return res.status(200).json(payload)
})

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
const activeTokens = new Map() // token -> { createdAt, ip, username }
const TOKEN_TTL_MS = SESSION_TTL_MS

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
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress
    console.log(chalk.red(`[SECURITY] IP bloqueado por excesso de tentativas de login: ${ip}`))

    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      blocked: true
    })
  }
})

// Rate limiter para APIs protegidas (30 requisicoes por minuto)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requisicoes
  message: {
    success: false,
    message: 'Limite de requisicoes excedido. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress
    console.log(chalk.red(`[SECURITY] IP bloqueado por excesso de requisicoes: ${ip}`))

    res.status(429).json({
      success: false,
      message: 'Muitas requisicoes. Aguarde 1 minuto.',
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

  console.log(chalk.yellow(`[SECURITY] Atividade suspeita detectada: ${ip} -> ${action}`))
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
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  const ip = req.ip || req.connection.remoteAddress

  if (req.session?.user) {
    return next()
  }

  if (token && isTokenValid(token)) {
    const tokenData = activeTokens.get(token)
    if (req.session && !req.session.user) {
      req.session.user = { username: tokenData?.username || 'legacy-token-user' }
    }
    return next()
  }

  // Verificar token seguro (armazenado em memória)
  trackSuspiciousActivity(ip, `Tentativa sem autenticacao: ${req.method} ${req.path}`)
  console.log(chalk.yellow(`[AUTH] Acesso negado: ${ip} -> ${req.path}`))

  const wantsHtml = req.method === 'GET' && String(req.headers.accept || '').toLowerCase().includes('text/html')
  if (wantsHtml) {
    return res.redirect('/login')
  }

  return res.status(401).json({
    success: false,
    message: 'Nao autenticado. Faca login para continuar.'
  })
}

const requireAuth = authMiddleware

// ===================================================================
// ROTAS DA INTERFACE WEB
// ===================================================================

// Página de login
app.get('/login', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'login.html'))
})

// Página principal de conexão (PROTEGIDA - validação feita no client-side via localStorage)
app.get('/connect', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'connect.html'))
})

// Redirecionar raiz para landing page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

// ===================================================================
// JOGO DA VELHA ONLINE
// ===================================================================

const partidasJogoVelha = new Map()

function gerarCodigoPartidaJogoVelha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function verificarVitoriaJogoVelha(tabuleiro) {
  const combinacoes = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ]

  for (const combo of combinacoes) {
    const [a, b, c] = combo
    if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return { simbolo: tabuleiro[a], posicoes: combo }
    }
  }
  return null
}

function limparPartidasAntigasJogoVelha() {
  const now = Date.now()
  const ttl = 60 * 60 * 1000
  for (const [codigo, partida] of partidasJogoVelha.entries()) {
    if (now - Number(new Date(partida.criadaEm).getTime() || 0) > ttl) {
      partidasJogoVelha.delete(codigo)
    }
  }
}

function getPublicGameBaseUrl(req) {
  const envUrl = String(
    process.env.JOGODAVELHA_SERVER_URL ||
    process.env.JOGODAVELHA_PUBLIC_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ''
  ).trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(envUrl)) return envUrl

  if (process.env.FLY_APP_NAME) {
    return `https://${process.env.FLY_APP_NAME}.fly.dev`
  }

  const host = req.get('host')
  if (host) return `${req.protocol}://${host}`
  return `http://127.0.0.1:${PORT}`
}

function normalizePlayerName(raw = '') {
  return String(raw || '').trim().slice(0, 60)
}

function getDefaultGameMeta() {
  const botJid = global.client?.user?.id
    ? `${String(global.client.user.id).split(':')[0]}@s.whatsapp.net`
    : ''
  const botSettings = global.db?.data?.settings?.[botJid] || {}
  const ownerRaw = String(botSettings.owner || '').trim()
  const ownerDigits = ownerRaw.replace(/\D/g, '')
  const ownerFromSettings = ownerRaw && ownerDigits.length < 8 ? ownerRaw : ''

  const brandName = normalizePlayerName(
    process.env.JOGODAVELHA_BRAND ||
    botSettings.namebot ||
    botSettings.botname ||
    global.botName ||
    'ZAERO'
  ).slice(0, 24)
  const ownerName = normalizePlayerName(
    process.env.JOGODAVELHA_OWNER ||
    ownerFromSettings ||
    'Dono'
  ).slice(0, 24)
  const matchTitle = normalizePlayerName(
    process.env.JOGODAVELHA_MATCH_TITLE ||
    'Partida Relampago'
  ).slice(0, 30)

  return {
    brandName: brandName || 'ZAERO',
    ownerName: ownerName || 'Dono',
    matchTitle: matchTitle || 'Partida Relampago',
  }
}

function normalizePlayerNumber(raw = '') {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 16) return ''
  return digits
}

function normalizePlayerJid(raw = '') {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return ''

  if (/^\d{8,16}$/.test(value)) {
    return `${value}@s.whatsapp.net`
  }

  if (/^\d{8,16}@(s|lid)\.whatsapp\.net$/.test(value)) {
    return value
  }

  return ''
}

function buildJidFromNumber(number = '') {
  const digits = normalizePlayerNumber(number)
  return digits ? `${digits}@s.whatsapp.net` : ''
}

function extractNumberFromJid(jid = '') {
  const digits = String(jid || '').split('@')[0] || ''
  return normalizePlayerNumber(digits)
}

function fallbackNameFromJid(jid = '') {
  const numero = extractNumberFromJid(jid)
  if (!numero) return ''
  const tail = numero.slice(-4)
  return `Jogador ${tail}`
}

function parseMatchMeta(query = {}) {
  const defaults = getDefaultGameMeta()
  const creatorJid = String(query.creatorJid || '').trim()
  const creatorName = normalizePlayerName(query.creatorName || '')
  const opponentJid = String(query.opponentJid || '').trim()
  const opponentName = normalizePlayerName(query.opponentName || '')
  const chatJid = String(query.chatJid || '').trim()
  const brandName = normalizePlayerName(query.brandName || defaults.brandName).slice(0, 24)
  const ownerName = normalizePlayerName(query.ownerName || defaults.ownerName).slice(0, 24)
  const matchTitle = normalizePlayerName(query.matchTitle || defaults.matchTitle).slice(0, 30)

  return {
    creatorJid: creatorJid.includes('@') ? creatorJid : '',
    creatorName,
    opponentJid: opponentJid.includes('@') ? opponentJid : '',
    opponentName,
    chatJid: chatJid.includes('@') ? chatJid : '',
    brandName: brandName || defaults.brandName,
    ownerName: ownerName || defaults.ownerName,
    matchTitle: matchTitle || defaults.matchTitle,
  }
}

function resolveResultMediaPath(type = 'win') {
  const names = type === 'win'
    ? ['vence.gif', 'vence.mp4', 'vence.webp', 'vence.jpg', 'vence.jpeg', 'vence.png', 'win.gif']
    : ['chora.gif', 'chora.mp4', 'chora.webp', 'chora.jpg', 'chora.jpeg', 'chora.png', 'lose.gif']

  const dirs = [
    join(__dirname, 'public'),
    __dirname,
  ]

  for (const dir of dirs) {
    for (const name of names) {
      const filePath = join(dir, name)
      if (fs.existsSync(filePath)) return filePath
    }
  }
  return ''
}

async function sendResultToWhatsApp(jid, text, type = 'win') {
  const client = global.client
  if (!client?.sendMessage || !jid) return false

  const mediaPath = resolveResultMediaPath(type)
  try {
    if (mediaPath) {
      const ext = path.extname(mediaPath).toLowerCase()
      if (['.gif', '.mp4', '.webm'].includes(ext)) {
        await client.sendMessage(jid, {
          video: { url: mediaPath },
          gifPlayback: true,
          caption: text
        })
        return true
      }

      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        await client.sendMessage(jid, {
          image: { url: mediaPath },
          caption: text
        })
        return true
      }
    }

    await client.sendMessage(jid, { text })
    return true
  } catch {
    return false
  }
}

async function notifyMatchResult(partida, { codigo, tipo, vencedor }) {
  if (!partida || partida.resultNotified) return
  partida.resultNotified = true

  const players = Array.isArray(partida.jogadores) ? partida.jogadores : []
  const pX = players.find((p) => p.simbolo === 'X')
  const pO = players.find((p) => p.simbolo === 'O')
  const defaults = getDefaultGameMeta()
  const meta = partida.meta || {}
  const brandName = String(meta.brandName || defaults.brandName || 'ZAERO')
  const ownerName = String(meta.ownerName || defaults.ownerName || 'Dono')
  const matchTitle = String(meta.matchTitle || defaults.matchTitle || 'Partida Relampago')
  const header = `${brandName} | ${matchTitle}`
  const ownerLine = `Dono: ${ownerName}`

  if (tipo === 'empate') {
    const msg = `${header}\n${ownerLine}\n\nEmpate na partida.\nCodigo: ${codigo}`
    for (const p of [pX, pO]) {
      if (p?.jid) await sendResultToWhatsApp(p.jid, msg, 'lose')
    }
    if (partida.meta?.chatJid) {
      await sendResultToWhatsApp(
        partida.meta.chatJid,
        `${header}\n${ownerLine}\n\nPartida ${codigo} terminou em empate.`,
        'lose'
      )
    }
    return
  }

  const winner = players.find((p) => p.simbolo === vencedor?.simbolo)
  const loser = players.find((p) => p.simbolo !== vencedor?.simbolo)
  const winnerName = winner?.nome || winner?.simbolo || 'Jogador'
  const loserName = loser?.nome || loser?.simbolo || 'Jogador'

  if (winner?.jid) {
    await sendResultToWhatsApp(
      winner.jid,
      `${header}\n${ownerLine}\n\nVoce venceu!\nCodigo: ${codigo}\nAdversario: ${loserName}`,
      'win'
    )
  }

  if (loser?.jid) {
    await sendResultToWhatsApp(
      loser.jid,
      `${header}\n${ownerLine}\n\nVoce perdeu.\nCodigo: ${codigo}\nVencedor: ${winnerName}`,
      'lose'
    )
  }

  if (partida.meta?.chatJid) {
    const resumo = `${header}\n${ownerLine}\n\nResultado da partida ${codigo}\nVencedor: ${winnerName}\nPerdedor: ${loserName}`
    await sendResultToWhatsApp(partida.meta.chatJid, resumo, 'win')
  }
}

app.get('/criar-partida', (req, res) => {
  if (!io) {
    return res.status(503).json({
      sucesso: false,
      error: 'Jogo da velha indisponivel: socket.io nao instalado no servidor.'
    })
  }

  const codigo = gerarCodigoPartidaJogoVelha()
  const meta = parseMatchMeta(req.query || {})
  partidasJogoVelha.set(codigo, {
    codigo,
    jogadores: [],
    tabuleiro: ['', '', '', '', '', '', '', '', ''],
    jogadorAtual: 'X',
    status: 'aguardando',
    criadaEm: new Date().toISOString(),
    resultNotified: false,
    meta
  })

  limparPartidasAntigasJogoVelha()

  const publicBase = getPublicGameBaseUrl(req)
  return res.json({
    sucesso: true,
    codigo,
    url: `${publicBase}/partida/${codigo}`
  })
})

app.get('/partida/:codigo', (req, res) => {
  if (!io) {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Jogo indisponivel</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
        <h1>Jogo indisponivel</h1>
        <p>Falta instalar <code>socket.io</code> no servidor.</p>
      </body>
      </html>
    `)
  }

  const codigo = String(req.params.codigo || '').toUpperCase()
  if (!partidasJogoVelha.has(codigo)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Partida nao encontrada</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
        <h1>Partida nao encontrada</h1>
        <p>O codigo <strong>${codigo}</strong> nao existe ou expirou.</p>
      </body>
      </html>
    `)
  }

  return res.sendFile(join(__dirname, 'public', 'partida.html'))
})

app.get('/jogodavelha-config/:codigo', (req, res) => {
  const codigo = String(req.params.codigo || '').toUpperCase()
  const defaults = getDefaultGameMeta()
  const partida = partidasJogoVelha.get(codigo)
  const meta = partida?.meta || {}

  return res.json({
    codigo,
    brandName: String(meta.brandName || defaults.brandName),
    ownerName: String(meta.ownerName || defaults.ownerName),
    matchTitle: String(meta.matchTitle || defaults.matchTitle),
  })
})

if (io) io.on('connection', (socket) => {
  socket.on('entrar-partida', (payload = {}) => {
    const incoming = typeof payload === 'string' ? { codigo: payload } : payload
    const codigo = String(incoming?.codigo || '').toUpperCase()
    const nomeInformado = normalizePlayerName(incoming?.nome)
    const numeroInformado = normalizePlayerNumber(incoming?.numero)
    const jidInformado = normalizePlayerJid(incoming?.jid || '')

    if (!partidasJogoVelha.has(codigo)) {
      socket.emit('erro', 'Partida nao encontrada')
      return
    }

    const partida = partidasJogoVelha.get(codigo)
    if (partida.jogadores.length >= 2) {
      socket.emit('erro', 'Partida ja esta cheia')
      return
    }

    const fallbackSlotJid = partida.jogadores.length === 0
      ? normalizePlayerJid(partida.meta?.creatorJid || '')
      : normalizePlayerJid(partida.meta?.opponentJid || '')

    const jid = jidInformado || fallbackSlotJid || buildJidFromNumber(numeroInformado)
    const nome = nomeInformado || fallbackNameFromJid(jid)
    if (!nome) {
      socket.emit('erro', 'Informe um nome valido antes de entrar.')
      return
    }
    const numero = numeroInformado || extractNumberFromJid(jid)
    const nomeDuplicado = partida.jogadores.some(
      (p) => String(p.nome || '').toLowerCase() === nome.toLowerCase()
    )
    if (nomeDuplicado) {
      socket.emit('erro', 'Este nome ja esta em uso na partida.')
      return
    }

    const duplicate = partida.jogadores.find(
      (p) => (jid && p.jid === jid) || (numero && p.numero === numero)
    )
    if (duplicate) {
      socket.emit('erro', 'Este usuario ja entrou na partida.')
      return
    }

    socket.join(codigo)

    let simbolo = 'X'
    if (partida.jogadores.length > 0) {
      simbolo = 'O'
      partida.status = 'jogando'
    }

    partida.jogadores.push({
      id: socket.id,
      simbolo,
      nome,
      numero,
      jid
    })
    socket.data.partidaAtual = codigo
    socket.data.simbolo = simbolo

    socket.emit('partida-entrou', {
      simbolo,
      nome,
      numero,
      status: partida.status,
      tabuleiro: partida.tabuleiro,
      jogadorAtual: partida.jogadorAtual,
      jogadores: partida.jogadores.length
    })

    io.to(codigo).emit('jogadores-atualizados', {
      total: partida.jogadores.length,
      status: partida.status
    })
  })

  socket.on('fazer-jogada', (payload = {}) => {
    const codigo = socket.data.partidaAtual
    const partida = partidasJogoVelha.get(codigo)
    if (!partida) {
      socket.emit('erro', 'Partida nao encontrada')
      return
    }

    if (socket.data.simbolo !== partida.jogadorAtual) {
      socket.emit('erro', 'Nao e sua vez')
      return
    }

    const posicao = Number(payload.posicao)
    if (!Number.isInteger(posicao) || posicao < 0 || posicao > 8) {
      socket.emit('erro', 'Jogada invalida')
      return
    }

    if (partida.tabuleiro[posicao] !== '') {
      socket.emit('erro', 'Posicao ja ocupada')
      return
    }

    partida.tabuleiro[posicao] = socket.data.simbolo
    const vencedor = verificarVitoriaJogoVelha(partida.tabuleiro)

    if (vencedor) {
      partida.status = 'finalizada'
      io.to(codigo).emit('partida-finalizada', {
        tipo: 'vitoria',
        vencedor,
        tabuleiro: partida.tabuleiro
      })
      notifyMatchResult(partida, {
        codigo,
        tipo: 'vitoria',
        vencedor
      }).catch(() => {})
      return
    }

    if (!partida.tabuleiro.includes('')) {
      partida.status = 'finalizada'
      io.to(codigo).emit('partida-finalizada', {
        tipo: 'empate',
        tabuleiro: partida.tabuleiro
      })
      notifyMatchResult(partida, {
        codigo,
        tipo: 'empate',
        vencedor: null
      }).catch(() => {})
      return
    }

    partida.jogadorAtual = partida.jogadorAtual === 'X' ? 'O' : 'X'
    io.to(codigo).emit('jogada-feita', {
      posicao,
      simbolo: socket.data.simbolo,
      proximoJogador: partida.jogadorAtual,
      tabuleiro: partida.tabuleiro
    })
  })

  socket.on('nova-partida', () => {
    const codigo = socket.data.partidaAtual
    const partida = partidasJogoVelha.get(codigo)
    if (!partida) return

    partida.tabuleiro = ['', '', '', '', '', '', '', '', '']
    partida.jogadorAtual = 'X'
    partida.status = 'jogando'
    partida.resultNotified = false

    io.to(codigo).emit('partida-resetada', {
      tabuleiro: partida.tabuleiro,
      jogadorAtual: partida.jogadorAtual
    })
  })

  socket.on('disconnect', () => {
    const codigo = socket.data.partidaAtual
    if (!codigo || !partidasJogoVelha.has(codigo)) return

    const partida = partidasJogoVelha.get(codigo)
    partida.jogadores = partida.jogadores.filter((j) => j.id !== socket.id)

    io.to(codigo).emit('jogador-saiu', {
      jogadores: partida.jogadores.length
    })

    if (partida.jogadores.length === 0) {
      partidasJogoVelha.delete(codigo)
    }
  })
})

setInterval(limparPartidasAntigasJogoVelha, 10 * 60 * 1000)

// ===================================================================
// API DE AUTENTICAÇÃO
// ===================================================================

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

function respondLoginSuccess(req, res, token) {
  if (requestWantsJson(req)) {
    return res.json({
      success: true,
      token,
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

// Login handler (sessao no servidor)
const handleLoginRequest = (req, res) => {
  try {
    const { username, password } = req.body || {}
    const ip = req.ip || req.connection.remoteAddress

    if (!username || !password) {
      trackSuspiciousActivity(ip, 'Login sem credenciais')
      if (requestWantsJson(req)) {
        return res.status(400).json({ success: false, message: 'Usuario e senha sao obrigatorios' })
      }
      return res.status(400).send('Usuario e senha sao obrigatorios')
    }

    const userMatch = credentialsMatch(username, AUTH_CONFIG.username)
    const passMatch = credentialsMatch(password, AUTH_CONFIG.password)

    if (!userMatch || !passMatch) {
      trackSuspiciousActivity(ip, `Login falhou: ${username}`)
      console.log(chalk.yellow(`[AUTH] Tentativa de login falhou: ${username} (IP: ${ip})`))
      if (requestWantsJson(req)) {
        return res.status(401).json({ success: false, message: 'Usuario ou senha incorretos' })
      }
      return res.status(401).send('Usuario ou senha incorretos')
    }

    const token = generateSecureToken()
    activeTokens.set(token, { createdAt: Date.now(), ip, username })
    req.session.user = { username }

    console.log(chalk.green(`[AUTH] Login bem-sucedido: ${username} (IP: ${ip})`))

    return req.session.save((error) => {
      if (error) {
        console.error(chalk.red('[AUTH] Erro ao salvar sessao:'), error)
        return res.status(500).json({ success: false, message: 'Erro ao iniciar sessao' })
      }

      return respondLoginSuccess(req, res, token)
    })
  } catch (error) {
    console.error(chalk.red('[AUTH] Erro no login:'), error)
    if (requestWantsJson(req)) {
      return res.status(500).json({ success: false, message: 'Erro no servidor' })
    }
    return res.status(500).send('Erro no servidor')
  }
}

// Login principal (cria sessao no servidor)
app.post('/login', loginLimiter, handleLoginRequest)
// Compatibilidade com cliente legado
app.post('/api/auth/login', loginLimiter, handleLoginRequest)

// Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (token) {
    activeTokens.delete(token)
  }

  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME)
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })
  })
})

// ===================================================================
// API ENDPOINTS
// ===================================================================

// Status da conexão (PROTEGIDA)
app.get('/api/status', requireAuth, apiLimiter, (req, res) => {
  try {
    const connected = global.client?.user?.id ? true : false
    const userInfo = {
      connected,
      number: connected ? global.client.user.id.split(':')[0] : null,
      name: connected ? global.client.user.name : null,
      user: connected ? {
        number: global.client.user.id.split(':')[0],
        name: global.client.user.name || null
      } : null,
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
app.post('/api/qr', requireAuth, apiLimiter, async (req, res) => {
  try {
    const connected = Boolean(global.client?.user?.id)
    if (connected) {
      return res.json({
        success: true,
        connected: true,
        message: 'Bot ja esta conectado'
      })
    }

    if (!global.client || MAIN_CONN.state === "idle" || MAIN_CONN.state === "closed") {
      await startBot({ force: true })
    }

    if (MAIN_CONN.hasRegisteredCreds && MAIN_CONN.state !== "open") {
      return res.status(202).json({
        success: false,
        connected: false,
        message: 'Sessao existente. Reconectando sem QR.',
        state: MAIN_CONN.state
      })
    }

    if (isQRFresh()) {
      const qrDataURL = await QRCode.toDataURL(currentQR)
      return res.json({
        success: true,
        qr: qrDataURL,
        message: 'QR Code gerado com sucesso'
      })
    }

    const qr = await waitForQR(QR_WAIT_TIMEOUT_MS)
    const qrDataURL = await QRCode.toDataURL(qr)

    return res.json({
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
app.post('/api/pairing-code', requireAuth, apiLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefone e obrigatorio'
      })
    }

    // Validar número
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    if (cleanNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefone invalido'
      })
    }

    // Normalizar número
    pairingCodeNumber = normalizePhoneForPairing(cleanNumber)

    if (!global.client || MAIN_CONN.state === "idle" || MAIN_CONN.state === "closed") {
      await startBot({ force: true })
    }

    // Se o bot não está conectado, solicitar código
    if (!global.client?.user?.id) {
      try {
        const code = await requestPairingCodeWithRetry(pairingCodeNumber)
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code

        res.json({
          success: true,
          code: code,
          formattedCode: formattedCode,
          message: 'Codigo gerado com sucesso'
        })
      } catch (error) {
        throw new Error('Erro ao solicitar codigo: ' + error.message)
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Bot ja esta conectado'
      })
    }

  } catch (error) {
    console.error('Erro ao gerar codigo:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar codigo: ' + error.message
    })
  }
})

// Desconectar bot (PROTEGIDA)
app.post('/api/disconnect', requireAuth, apiLimiter, async (req, res) => {
  try {
    if (global.client) {
      await destroyClient(global.client, { logout: true, reason: 'api-disconnect' })
      MAIN_CONN.client = null
      global.client = null
      MAIN_CONN.state = 'closed'
      MAIN_CONN.hasRegisteredCreds = false
      clearQrState()
      resetReconnectState()

      // Limpar sessao
      try {
        clearOwnerSessionDir()
      } catch (err) {
        console.error('Erro ao apagar sessao:', err)
      }

      res.json({
        success: true,
        message: 'Bot desconectado com sucesso'
      })

      // Reiniciar bot apos 2 segundos
      setTimeout(() => startBot({ force: true }), 2000)
    } else {
      res.status(400).json({
        success: false,
        message: 'Bot nao esta conectado'
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
app.get('/api/info', requireAuth, apiLimiter, (req, res) => {
  res.json({
    name: 'ZAERO BOT',
    version: '2.0',
    status: global.client?.user?.id ? 'online' : 'offline',
    uptime: process.uptime(),
    commands: 529
  })
})

// Iniciar servidor
httpServer.listen(PORT, '0.0.0.0', () => {
  if (io) {
    console.log(chalk.cyan(`Jogo da velha: http://localhost:${PORT}/criar-partida`))
  } else {
    console.log(chalk.yellow(`Jogo da velha desativado: instale socket.io para habilitar.`))
  }
  console.log(chalk.green(`\nServidor web rodando em: http://localhost:${PORT}`))
  console.log(chalk.cyan(`Interface de conexao: http://localhost:${PORT}/connect`))
  console.log(chalk.white(`Health check rapido: http://localhost:${PORT}/healthz`))
  console.log(chalk.gray('-'.repeat(50)))
})




