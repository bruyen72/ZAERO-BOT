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
import { getGroupAdmins } from './lib/message.js';
import { getCachedGroupMetadata } from './lib/cache.js';

// Inicializa comandos com await para garantir que todos existam antes do bot responder
await seeCommands();
console.log(chalk.green(`[ ✿ ] ${global.comandos.size} Comandos carregados com sucesso.`));

const messageQueue = [];
let processingCount = 0;
const MAX_CONCURRENT = 5; // ⚡ Processa até 5 mensagens em paralelo
const recentMenuRequests = new Map();
const MENU_DEDUP_WINDOW_MS = 2000; // ⚡ Reduzido para 2 segundos

function pruneRecentMenuRequests(now = Date.now()) {
  if (recentMenuRequests.size < 200) return;
  for (const [key, timestamp] of recentMenuRequests.entries()) {
    if (now - timestamp > MENU_DEDUP_WINDOW_MS) {
      recentMenuRequests.delete(key);
    }
  }
}

async function processMessageQueue() {
  while (messageQueue.length > 0 && processingCount < MAX_CONCURRENT) {
    const { client, m } = messageQueue.shift();
    processingCount++;

    // ⚡ Processa em paralelo sem bloquear a fila
    processMessage(client, m)
      .catch(err => console.error('❌ Erro ao processar mensagem:', err.message))
      .finally(() => {
        processingCount--;
        if (messageQueue.length > 0) {
          setImmediate(processMessageQueue);
        }
      });
  }
}

export default async (client, m) => {
  if (!m.message) return;
  messageQueue.push({ client, m });
  setImmediate(processMessageQueue);
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

  // 2. Prefixo dinâmico
  const prefixArray = Array.isArray(settings.prefix) ? settings.prefix : (typeof settings.prefix === 'string' ? [settings.prefix] : ['.', '!', '#', '/'])
  const usedPrefix = prefixArray.find(p => m.text?.startsWith(p)) || (m.text?.startsWith('.') ? '.' : '')
  
  let command = '', args = [], text = ''
  if (usedPrefix) {
    const content = m.text.slice(usedPrefix.length).trim()
    if (content) {
      args = content.split(/\s+/)
      command = args.shift().toLowerCase()
      text = args.join(' ')
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

  // 4. Executa plugins "all" e "before" EM PARALELO ⚡
  const pluginPromises = [];
  for (const name in global.plugins) {
    const plugin = global.plugins[name]
    if (plugin.disabled) continue

    if (typeof plugin.all === "function") {
      pluginPromises.push(
        Promise.resolve(plugin.all.call(client, m, { client })).catch(() => {})
      );
    }

    if (typeof plugin.before === "function") {
      pluginPromises.push(
        Promise.resolve(plugin.before.call(client, m, { client }))
          .then(shouldReturn => shouldReturn ? 'STOP' : null)
          .catch(() => null)
      );
    }
  }

  const pluginResults = await Promise.allSettled(pluginPromises);
  if (pluginResults.some(r => r.status === 'fulfilled' && r.value === 'STOP')) return;

  // 5. Antilink
  setImmediate(() => antilink(client, m));

  // 6. Logs (Apenas comandos)
  if (command) {
    const pushname = m.pushName || 'Usuário'
    const timestamp = moment().format('HH:mm:ss');
    const location = m.isGroup ? (global.db.data.chats[m.chat]?.subject || 'Grupo') : 'Privado';
    console.log(chalk.cyan(`[${timestamp}] `) + chalk.white(`${pushname} | ${location}: `) + chalk.green(`${usedPrefix}${command}`));
  }

  // 7. Restrições
  if (!isOwners && settings.self) return
  if (!m.isGroup && !isOwners) {
    const allowedInPrivate = ['menu', 'help', 'ajuda', 'allmenu', 'report', 'suggest', 'qr', 'code']
    if (command && !allowedInPrivate.includes(resolvedCommand)) return
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
      return m.reply(`ꕤ O comando *${command}* não existe.\n✎ Use *${usedPrefix}menu* para ver a lista de comandos.`)
    }
    return
  }

  let isBotAdmins = false
  let isAdmins = false
  if (m.isGroup && (cmdData.isAdmin || cmdData.botAdmin)) {
    try {
      // ⚡ Timeout de 3 segundos para metadata
      const groupMetadata = await Promise.race([
        getCachedGroupMetadata(client, m.chat),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      const groupAdmins = groupMetadata?.participants?.filter(p => p.admin) || []
      isBotAdmins = groupAdmins.some(p => p.id === botJid)
      isAdmins = groupAdmins.some(p => p.id === sender)
    } catch (err) {
      console.error('⚠️ Erro ao obter metadata do grupo:', err.message);
    }
  }

  if (cmdData.isOwner && !isOwners) return m.reply(`⚠️ Este comando é exclusivo para o dono do bot.`)
  if (cmdData.isAdmin && !isAdmins && !isOwners) return m.reply(`⚠️ Este comando só pode ser usado por administradores.`)
  if (cmdData.botAdmin && !isBotAdmins) return m.reply(`⚠️ O bot precisa ser administrador.`)

  try {
    // ⚡ readMessages em background
    setImmediate(() => client.readMessages([m.key]).catch(() => {}));

    // ⚡ Estatísticas em background
    setImmediate(() => {
      user.usedcommands = (user.usedcommands || 0) + 1
      settings.commandsejecut = (settings.commandsejecut || 0) + 1
      chatUser.usedTime = new Date()
      chatUser.lastCmd = Date.now()
      user.exp = (user.exp || 0) + Math.floor(Math.random() * 100)
      chatUser.stats[today].cmds++
    });

    // ⚡ Timeout dinâmico baseado no comando
    const slowCommands = ['imagen', 'image', 'img', 'play', 'play2', 'tiktok', 'facebook', 'fb', 'twitter']
    const commandTimeout = slowCommands.includes(resolvedCommand) ? 45000 : 15000 // 45s para comandos lentos, 15s para outros

    await Promise.race([
      cmdData.run(client, m, args, usedPrefix, resolvedCommand, text),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Comando excedeu o tempo limite (${commandTimeout/1000}s)`)), commandTimeout)
      )
    ]);

    // ⚡ Level em background
    setImmediate(() => level(m));
  } catch (error) {
    console.error(error)
    if (error.message.includes('tempo limite')) {
      await client.sendMessage(m.chat, {
        text: `⏱️ O comando *${command}* demorou muito para responder.\n\n💡 Tente novamente em alguns instantes.`
      }, { quoted: m })
    } else {
      await client.sendMessage(m.chat, { text: `❌ Erro no comando ${command}:\n${error.message}` }, { quoted: m })
    }
  }
}
