import ws from 'ws';
import moment from 'moment';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import gradient from 'gradient-string';
import seeCommands from './lib/system/commandLoader.js';
import commandAliases from './lib/system/commandAliases.js';
import initDB from './lib/system/initDB.js';
import antilink from './commands/antilink.js';
import level from './commands/level.js';
import { clearGroupCache, getCachedGroupMetadata } from './lib/cache.js';
import { ChatTaskQueue } from './lib/system/taskQueue.js';
import { QueueManager } from './lib/system/queueManager.js';
import { parseCountArg } from './lib/system/limits.js';
import { sendUnknownCommandFeedback } from './lib/system/unknownCommandReply.js';
import {
  executeCommandTask,
  getCommandTimeoutMs,
} from './lib/system/heavyTaskManager.js';

// Inicializa comandos com await para garantir que todos existam antes do bot responder
await seeCommands();
console.log(chalk.green(`[ ✿ ] ${global.comandos.size} Comandos carregados com sucesso.`));

const recentMenuRequests = new Map();
const recentMessageIds = new Map();
// ? Reduzido para 3 segundos para permitir respostas mais r�pidas
const MENU_DEDUP_WINDOW_MS = 3000;
const MESSAGE_DEDUP_WINDOW_MS = 10000;
const BUSY_NOTICE_WINDOW_MS = 10 * 1000;
const busyNoticeByChat = new Map();

const chatTaskQueue = new ChatTaskQueue({
  maxPendingPerChat: Number(process.env.BOT_CHAT_QUEUE_MAX_PENDING || 60),
  maxPendingGlobal: Number(process.env.BOT_QUEUE_MAX_PENDING || 1500),
  maxConcurrentGlobal: Number(process.env.BOT_QUEUE_MAX_CONCURRENT || 4),
});

const queue = new QueueManager({
  perChatConcurrency: 1,
  maxQueuePerChat: 10,
  minGapMs: 900,
});

const heavy = new Set([
  'fig',
  'img',
  'imagem',
  'imagen',
  'image',
  'red',
  'redgifs',
  'redgif',
  'rgifs',
  'gif',
  'video',
  'hentai',
  'porn',
  'xxx',
  'nsfw',
  'r34',
  'rule34',
  'gelbooru',
  'danbooru',
  'testered',
  'testpesado',
  'testcomando',
]);

function isHeavyQueuedCommand(cmdData, commandName = '') {
  const normalizedCommand = String(commandName || '').toLowerCase().trim();
  const normalizedCategory = String(cmdData?.category || '').toLowerCase().trim();
  if (normalizedCategory === 'nsfw') return true;
  return heavy.has(normalizedCommand);
}

function shouldSendBusyNotice(chatId) {
  const key = String(chatId || 'unknown');
  const now = Date.now();
  if (busyNoticeByChat.size > 1000) {
    for (const [chatKey, ts] of busyNoticeByChat.entries()) {
      if (now - ts > BUSY_NOTICE_WINDOW_MS) busyNoticeByChat.delete(chatKey);
    }
  }
  const prev = busyNoticeByChat.get(key) || 0;
  if (now - prev < BUSY_NOTICE_WINDOW_MS) return false;
  busyNoticeByChat.set(key, now);
  return true;
}

export function getMainQueueStats() {
  return {
    chat: chatTaskQueue.getStats(),
    heavy: queue.getGlobalStats(),
  };
}
function pruneRecentMenuRequests(now = Date.now()) {
  if (recentMenuRequests.size < 200) return;
  for (const [key, timestamp] of recentMenuRequests.entries()) {
    if (now - timestamp > MENU_DEDUP_WINDOW_MS) {
      recentMenuRequests.delete(key);
    }
  }
}

function pruneRecentMessageIds(now = Date.now()) {
  if (recentMessageIds.size < 500) return;
  for (const [key, timestamp] of recentMessageIds.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_WINDOW_MS) {
      recentMessageIds.delete(key);
    }
  }
}

function addJidVariants(target, jid, client) {
  const add = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized) target.add(normalized);
  };

  const raw = String(jid || '').trim();
  if (!raw) return;
  add(raw);

  if (/^\d{5,20}$/.test(raw)) {
    add(`${raw}@s.whatsapp.net`);
  }

  let decoded = raw;
  try {
    decoded = client?.decodeJid ? client.decodeJid(raw) || raw : raw;
  } catch {}

  add(decoded);
  add(String(decoded).replace(/:\d+@/g, '@'));

  const numberMatch = String(decoded).match(/^(\d{5,20})@s\.whatsapp\.net$/i);
  if (numberMatch) {
    add(numberMatch[1]);
    add(`${numberMatch[1]}@lid`);
  }

  if (/@lid$/i.test(String(decoded)) && typeof client?.findJidByLid === 'function') {
    try {
      const resolved = client.findJidByLid(decoded);
      if (resolved) {
        add(resolved);
        if (client?.decodeJid) add(client.decodeJid(resolved));
      }
    } catch {}
  }
}

function participantIsAdmin(participant) {
  if (!participant || typeof participant !== 'object') return false;
  const role = String(participant.admin || '').toLowerCase();
  return participant.admin === true || role === 'admin' || role === 'superadmin';
}

function participantMatchesIdentity(participant, targetKeys, client) {
  if (!participant || !(targetKeys instanceof Set) || targetKeys.size === 0) return false;
  const participantKeys = new Set();
  addJidVariants(participantKeys, participant.id, client);
  addJidVariants(participantKeys, participant.jid, client);
  addJidVariants(participantKeys, participant.lid, client);

  const phone = String(participant.phoneNumber || '').replace(/\D/g, '');
  if (phone) {
    addJidVariants(participantKeys, phone, client);
    addJidVariants(participantKeys, `${phone}@s.whatsapp.net`, client);
  }

  for (const key of participantKeys) {
    if (targetKeys.has(key)) return true;
  }
  return false;
}

function resolveAdminState(client, groupMetadata, sender, botJid) {
  const participants = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [];
  const senderKeys = new Set();
  const botKeys = new Set();

  addJidVariants(senderKeys, sender, client);
  addJidVariants(botKeys, botJid, client);
  addJidVariants(botKeys, client?.user?.id, client);
  addJidVariants(botKeys, client?.user?.jid, client);
  addJidVariants(botKeys, client?.user?.lid, client);

  let isAdmins = false;
  let isBotAdmins = false;

  for (const participant of participants) {
    if (!participantIsAdmin(participant)) continue;
    if (!isAdmins && participantMatchesIdentity(participant, senderKeys, client)) isAdmins = true;
    if (!isBotAdmins && participantMatchesIdentity(participant, botKeys, client)) isBotAdmins = true;
    if (isAdmins && isBotAdmins) break;
  }

  return { isAdmins, isBotAdmins };
}

export default function onMessage(client, m) {
  if (!m?.message) return;

  const chatId = m.chat || m.key?.remoteJid || 'unknown';
  chatTaskQueue
    .enqueue(
      chatId,
      async () => {
        await processMessage(client, m);
      },
      { messageId: m?.key?.id || null, sender: m?.sender || null },
    )
    .catch((error) => {
      console.error(`? Erro ao enfileirar/processar mensagem (${chatId}): ${error?.message || error}`);
      if (/Fila (global|do chat) cheia/i.test(String(error?.message || '')) && shouldSendBusyNotice(chatId)) {
        client
          .sendMessage(chatId, { text: '⚠️ Bot ocupado agora. Tente novamente em alguns segundos.' })
          .catch(() => {});
      }
    });
}

let sessionBotsCache = null;
let sessionBotsCacheTime = 0;
function getAllSessionBots() {
  const now = Date.now();
  if (sessionBotsCache && (now - sessionBotsCacheTime) < 30000) return sessionBotsCache;
  const sessionDirs = ['./Sessions/Subs']
  let bots = []
  for (const dir of sessionDirs) {
    try {
      const subDirs = fs.readdirSync(path.resolve(dir))
      for (const sub of subDirs) {
        const credsPath = path.resolve(dir, sub, 'creds.json')
        if (fs.existsSync(credsPath)) bots.push(sub + '@s.whatsapp.net')
      }} catch {}
  }
  try {
    const ownerId = global.client?.user?.id
      ? global.client.user.id.split(':')[0] + '@s.whatsapp.net'
      : null
    if (ownerId) bots.push(ownerId)
  } catch {}
  sessionBotsCache = bots;
  sessionBotsCacheTime = now;
  return bots;
}

async function processMessage(client, m) {
  if (!m.message) return
  const messageId = m?.key?.id
  if (messageId) {
    const now = Date.now()
    const dedupKey = `${m.chat || 'unknown'}:${messageId}`
    const lastSeen = recentMessageIds.get(dedupKey) || 0
    if (now - lastSeen < MESSAGE_DEDUP_WINDOW_MS) return
    recentMessageIds.set(dedupKey, now)
    pruneRecentMessageIds(now)
  }
  const sender = m.sender
  
  // 1. Inicializa DB imediatamente
  initDB(m, client);

  // Fallbacks defensivos para plugins que dependem destes helpers
  if (typeof m.reply !== 'function') {
    m.reply = async (text) => client.sendMessage(m.chat, { text: String(text) }, { quoted: m })
  }
  if (typeof m.react !== 'function') {
    m.react = async (emoji) => client.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
  }
  if (typeof m.download !== 'function') {
    m.download = () => client.downloadMediaMessage(m)
  }
  if (m.quoted && typeof m.quoted.download !== 'function') {
    m.quoted.download = () => client.downloadMediaMessage(m.quoted)
  }

  const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const chat = global.db.data.chats[m.chat] || {}
  const settings = global.db.data.settings[botJid] || {}
  const user = global.db.data.users[sender] || {}
  const chatUsers = chat.users || (chat.users = {})
  const chatUser = chatUsers[sender] || (chatUsers[sender] = {})

  // 2. Prefixo FIXO e ESTRITO: apenas "." (ponto)
  const PREFIX = '.'

  // TAREFA: Compatibilidade Universal (Desktop/iPhone)
  const rawText = m.text || m.body || m.msg?.text || m.msg?.caption || 
                  m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  const fullText = typeof rawText === 'string' ? rawText.trim() : '';

  // Ignora mensagens compostas apenas por pontos (., .., ..., etc).
  if (/^\.+$/.test(fullText)) return;

  // Validação estrita do prefixo
  let command = '', args = [], text = '', usedPrefix = ''

  if (fullText.startsWith(PREFIX)) {
    // Extrai o comando SEM o prefixo
    const content = fullText.slice(PREFIX.length).trim()

    if (content) {
      usedPrefix = PREFIX
      args = content.split(/\s+/)
      command = args.shift().toLowerCase()
      text = args.join(' ')
      
      // ✅ [DEBUG] Log de extração de comando (Solicitado pelo usuário)
      console.log(chalk.gray(`[DEBUG] Parser: prefixo=${usedPrefix} comando=${command} args=${args.length}`))
    }
  }
  const resolvedCommand = command ? (commandAliases[command] || command) : ''

  // Evita fila desnecessária quando o usuário dispara o mesmo menu várias vezes em poucos segundos.
  if (resolvedCommand && ['menu', 'allmenu', 'help', 'ajuda', 'comandos'].includes(resolvedCommand)) {
    const now = Date.now()
    const scope = (args[0] || 'all').toLowerCase()
    const dedupKey = `${botJid}|${m.chat}|${sender}|${scope}`
    const last = recentMenuRequests.get(dedupKey) || 0
    if (now - last < MENU_DEDUP_WINDOW_MS) return
    recentMenuRequests.set(dedupKey, now)
    pruneRecentMenuRequests(now)
  }

  // 3. Verificações de Dono (Múltiplas checagens para garantir)
  const ownerNumbers = global.owner.map(num => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  const isOwners = [
    botJid, 
    ...(settings.owner ? [settings.owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net'] : []), 
    ...ownerNumbers
  ].includes(sender)

  // 4. Executa plugins "all" e "before"
  for (const name in global.plugins) {
    const plugin = global.plugins[name]
    if (plugin.disabled) continue
    if (typeof plugin.all === "function") {
      try { await plugin.all.call(client, m, { client }) } catch (e) {}
    }
    if (typeof plugin.before === "function") {
      try { if (await plugin.before.call(client, m, { client })) return } catch (e) {}
    }
  }

  // 5. Antilink
  setImmediate(() => antilink(client, m));

  // 6. Logs (Apenas comandos)
  if (command) {
    const pushname = m.pushName || 'Usuário'
    const timestamp = moment().format('HH:mm:ss');
    const location = m.isGroup ? (global.db.data.chats[m.chat]?.subject || 'Grupo') : 'Privado';
    console.log(chalk.cyan(`[${timestamp}] `) + chalk.white(`${pushname} | ${location}: `) + chalk.green(`${usedPrefix}${command}`));
  }

  // 7. Restrições e Rate Limit (ZÆRØ DARK)
  if (!isOwners && settings.self) return
  
  // Rate Limit por Usuário (1 comando a cada 1.5s)
  const userRateLimit = 1500;
  if (!isOwners && (Date.now() - (user.lastCommandTime || 0)) < userRateLimit) {
    // Silencioso, ou opcionalmente m.react('⏳')
    return;
  }
  user.lastCommandTime = Date.now();

  if (!m.isGroup && !isOwners) {
    // Comandos liberados em privado
  }

  if (chat?.isBanned && !isOwners && resolvedCommand !== 'bot') return

  // 8. Estatísticas
  const today = moment().format('YYYY-MM-DD');
  if (!chatUser.stats) chatUser.stats = {}
  if (!chatUser.stats[today]) chatUser.stats[today] = { msgs: 0, cmds: 0 }
  chatUser.stats[today].msgs++

  // 9. Execução de Comando
  if (!command) return
  const cmdData = global.comandos.get(resolvedCommand)
  
  if (!cmdData) {
    // Se digitou o ponto mas o comando não existe
    if (usedPrefix === '.') {
      await sendUnknownCommandFeedback(client, m, { command, usedPrefix }).catch(() => {})
      return
    }
    return
  }

  const normalizedCommand = String(resolvedCommand || '').toLowerCase()
  let isBotAdmins = false
  let isAdmins = false
  if (m.isGroup && (cmdData.isAdmin || cmdData.botAdmin)) {
    let groupMetadata = await getCachedGroupMetadata(client, m.chat)
    ;({ isBotAdmins, isAdmins } = resolveAdminState(client, groupMetadata, sender, botJid))

    // Evita falso negativo quando o cache ainda nao refletiu promocao de admin.
    if ((cmdData.botAdmin && !isBotAdmins) || (cmdData.isAdmin && !isAdmins)) {
      clearGroupCache(m.chat)
      groupMetadata = await getCachedGroupMetadata(client, m.chat)
      ;({ isBotAdmins, isAdmins } = resolveAdminState(client, groupMetadata, sender, botJid))
    }
  }

  if (cmdData.isOwner && !isOwners) return m.reply(`⚠️ Este comando é exclusivo para o dono do bot.`)
  if (cmdData.isAdmin && !isAdmins && !isOwners) return m.reply(`⚠️ Este comando só pode ser usado por administradores.`)
  const skipBotAdminGate = normalizedCommand === 'kick' || isOwners
  if (cmdData.botAdmin && !isBotAdmins && !skipBotAdminGate) return m.reply(`⚠️ O bot precisa ser administrador.`)

  const heavyCommand = isHeavyQueuedCommand(cmdData, normalizedCommand)
  const isFigOrImg = ['fig', 'img', 'imagem', 'imagen', 'image'].includes(normalizedCommand)
  if (isFigOrImg && /^-?\d+$/.test(String(args[0] || ''))) {
    args[0] = String(parseCountArg(args, 5))
  }

  try {
    const timeoutMs = getCommandTimeoutMs(cmdData, resolvedCommand, heavyCommand)
    const runCommand = async (asHeavy = false) => {
      client.readMessages([m.key]).catch(() => {});
      setImmediate(() => {
        user.usedcommands = (user.usedcommands || 0) + 1
        settings.commandsejecut = (settings.commandsejecut || 0) + 1
        chatUser.usedTime = new Date()
        chatUser.lastCmd = Date.now()
        user.exp = (user.exp || 0) + Math.floor(Math.random() * 100)
        chatUser.stats[today].cmds++
      });

      await executeCommandTask(
        client,
        m,
        () => cmdData.run(client, m, args, usedPrefix, resolvedCommand, text),
        {
          heavy: asHeavy,
          chatId: m.chat,
          timeoutMs,
          label: `${resolvedCommand}@${m.chat}`,
        },
      )
      setImmediate(() => level(m));
    }

    if (heavyCommand) {
      const enq = queue.enqueue(m.chat, async () => {
        await runCommand(true)
      })

      if (!enq.ok) {
        await m.reply('Fila cheia agora. Tenta novamente em alguns segundos pra não travar o WhatsApp.').catch(() => {})
        return
      }

      await m.reply(
        `Calma tô preparando seu pedido.\n📌 Posição na fila: ${enq.position}\n💡 Comandos pesados vão por fila pra evitar travar celulares fracos (3/4GB RAM) e evitar o bot cair.`,
      ).catch(() => {})
      return
    }

    await runCommand(false)
  } catch (error) {
    // Silencia erros de timeout já tratados no manager
    if (error.isTimeout || error.isBusy) return;
    console.error(error)
    await client.sendMessage(m.chat, { text: `❌ Erro no comando ${command}:\n${error.message}` }, { quoted: m })
  }
}
