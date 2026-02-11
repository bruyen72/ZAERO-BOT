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
if (methodCodeQR) {
  opcion = "1";
} else if (methodCode) {
  opcion = "2";
} else if (!fs.existsSync("./Sessions/Owner/creds.json")) {
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
  if (opcion === "2" && !fs.existsSync("./Sessions/Owner/creds.json")) {
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
      console.log(chalk.green.bold("[ ✿ ] Escanea este código QR"));
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
          fs.rmSync('./Sessions/Owner', { recursive: true, force: true })
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
          fs.rmSync('./Sessions/Owner', { recursive: true, force: true })
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
