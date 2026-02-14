import fs from 'fs'
import moment from 'moment-timezone'
import { getDevice } from '@whiskeysockets/baileys'
import { apiCache } from '../../lib/cache.js'

function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeBotDisplayName(name = '') {
  const fallback = 'ZAERO BOT'
  const clean = String(name || '').trim()
  if (!clean) return fallback
  const legacyNames = new Set(['yuki', 'yuki suou', 'alya', 'alya san'])
  if (legacyNames.has(clean.toLowerCase())) return fallback
  return clean
}

function resolveOwnerDisplayName(owner = '') {
  const fallback = 'Administrador'
  const raw = String(owner || '').trim()
  if (!raw) return fallback

  const rawDigits = raw.replace(/\D/g, '')
  const isNumericOwner = /^\d+$/.test(raw.replace(/@s\.whatsapp\.net$/, '')) || rawDigits.length >= 8
  if (isNumericOwner) return fallback
  return raw
}

const categoryAlias = {
  ai: ['ai', 'ia', 'chatgpt'],
  anime: ['anime', 'animes'],
  downloads: ['download', 'downloads', 'downloader', 'baixar', 'midia', 'apk', 'redes', 'social'],
  economy: ['economy', 'economia'],
  fun: ['fun', 'diversao'],
  gacha: ['gacha'],
  github: ['github', 'git'],
  grupo: ['group', 'grupo', 'grupos'],
  info: ['info', 'informacoes', 'menu', 'ajuda', 'comandos'],
  internet: ['internet'],
  mod: ['mod', 'moderacao'],
  nsfw: ['nsfw', '18'],
  owner: ['owner', 'dono'],
  profile: ['profile', 'perfil'],
  rpg: ['rpg'],
  search: ['search', 'pesquisa', 'buscar'],
  socket: ['socket', 'sockets', 'bot', 'bots'],
  stickers: ['sticker', 'stickers'],
  tools: ['tools', 'ferramentas'],
  uncategorized: ['uncategorized', 'outros'],
  utils: ['utils', 'utilitarios']
}

const categoryLabel = {
  ai: 'IA',
  anime: 'Anime',
  downloads: 'Downloads',
  economy: 'Economia',
  fun: 'Diversao',
  gacha: 'Gacha',
  github: 'GitHub',
  grupo: 'Grupo',
  info: 'Info',
  internet: 'Internet',
  mod: 'Moderacao',
  nsfw: 'NSFW',
  owner: 'Dono',
  profile: 'Perfil',
  rpg: 'RPG',
  search: 'Pesquisa',
  socket: 'Sockets',
  stickers: 'Stickers',
  tools: 'Ferramentas',
  uncategorized: 'Outros',
  utils: 'Utilitarios'
}

const categoryRemap = {
  download: 'downloads',
  downloader: 'downloads',
  group: 'grupo',
  sticker: 'stickers',
  tool: 'tools'
}

function canonicalCategory(category = '') {
  const key = normalize(category)
  if (!key) return 'uncategorized'
  return categoryRemap[key] || key
}

function resolveCategory(input = '', available = []) {
  const key = normalize(input)
  if (!key) return null

  for (const [category, aliases] of Object.entries(categoryAlias)) {
    if (aliases.map(normalize).includes(key)) {
      return available.includes(category) ? category : null
    }
  }

  return available.includes(key) ? key : null
}

function buildCategoryList(available = [], counts = new Map()) {
  return available
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((cat) => `- ${categoryLabel[cat] || cat} (${counts.get(cat) || 0})`)
    .join('\n')
}

function chunkCommands(commands = [], size = 18) {
  const chunks = []
  for (let i = 0; i < commands.length; i += size) {
    chunks.push(commands.slice(i, i + size))
  }
  return chunks
}

function buildCommandMap() {
  const buckets = new Map()

  for (const [cmd, data] of global.comandos.entries()) {
    const category = canonicalCategory(data?.category || 'uncategorized')
    if (!buckets.has(category)) buckets.set(category, new Set())
    buckets.get(category).add(String(cmd).toLowerCase())
  }

  return buckets
}

function getMenuHeader({ botname, owner, senderMention, users, uptime, device, dateText, timeText }) {
  return [
    '*MENU DE COMANDOS*',
    `Bot: ${botname}`,
    `Dono: ${owner}`,
    `Usuario: ${senderMention}`,
    `Usuarios: ${users.toLocaleString('pt-BR')}`,
    `Online: ${uptime}`,
    `Dispositivo: ${device}`,
    `Data: ${dateText}  Hora: ${timeText}`
  ].join('\n')
}

export default {
  command: ['allmenu', 'help', 'menu', 'ajuda', 'comandos'],
  category: 'info',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const commandMap = buildCommandMap()
      const availableCategories = Array.from(commandMap.keys()).sort((a, b) => a.localeCompare(b))
      const categoryCounts = new Map(
        availableCategories.map((cat) => [cat, (commandMap.get(cat) || new Set()).size])
      )

      const rawCategory = String(args[0] || '').trim()
      const resolvedCategory = resolveCategory(rawCategory, availableCategories)
      const cacheKey = `menu_text_${m.sender}_${normalize(rawCategory || 'all')}`
      let payload = apiCache.get(cacheKey)

      if (!payload) {
        const botId = client?.user?.id?.split(':')[0] + '@s.whatsapp.net'
        const botSettings = global.db?.data?.settings?.[botId] || {}
        const botname = normalizeBotDisplayName(botSettings.botname || botSettings.namebot || global.botName)
        const owner = resolveOwnerDisplayName(botSettings.owner || global.owner?.[0] || '')
        const banner = botSettings.banner || global.botLogo || './ZK.png'
        const users = Object.keys(global.db?.data?.users || {}).length
        const device = getDevice(m.key?.id || '')
        const senderMention = `@${m.sender.split('@')[0]}`
        const dateText = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY')
        const timeText = moment.tz('America/Sao_Paulo').format('HH:mm')
        const uptime = client.uptime ? formatMs(Date.now() - client.uptime) : 'Desconhecido'

        if (rawCategory && !resolvedCategory) {
          return m.reply(
            `Categoria *${rawCategory}* nao encontrada.\n\nCategorias disponiveis:\n${buildCategoryList(availableCategories, categoryCounts)}\n\nExemplo: ${usedPrefix}menu stickers`
          )
        }

        const header = getMenuHeader({
          botname,
          owner,
          senderMention,
          users,
          uptime,
          device,
          dateText,
          timeText
        })

        let text = ''
        if (!resolvedCategory) {
          text = [
            header,
            '',
            '*CATEGORIAS*',
            buildCategoryList(availableCategories, categoryCounts),
            '',
            `Use *${usedPrefix}menu categoria* para listar os comandos.`,
            `Exemplo: *${usedPrefix}menu stickers*`
          ].join('\n')
        } else {
          const cmds = Array.from(commandMap.get(resolvedCategory) || []).sort((a, b) => a.localeCompare(b))
          const chunks = chunkCommands(cmds)
          const cmdLines = chunks
            .map((chunk) => chunk.map((c) => `${usedPrefix}${c}`).join('  '))
            .join('\n')

          text = [
            header,
            '',
            `*CATEGORIA: ${categoryLabel[resolvedCategory] || resolvedCategory}*`,
            `Total de comandos: ${cmds.length}`,
            '',
            cmdLines || '(sem comandos)',
            '',
            `Voltar: *${usedPrefix}menu*`
          ].join('\n')
        }

        payload = { text, banner }
        apiCache.set(cacheKey, payload, 180)
      }

      const mentionContext = { contextInfo: { mentionedJid: [m.sender] } }
      const logoPath = './ZK.png'
      const hasLogo = fs.existsSync(logoPath)

      if (typeof payload.banner === 'string' && (payload.banner.includes('.mp4') || payload.banner.includes('.webm'))) {
        await client.sendMessage(
          m.chat,
          {
            video: { url: payload.banner },
            gifPlayback: true,
            caption: payload.text,
            ...mentionContext
          },
          { quoted: m }
        )
        return
      }

      if (hasLogo) {
        await client.sendMessage(
          m.chat,
          {
            image: { url: logoPath },
            caption: payload.text,
            ...mentionContext
          },
          { quoted: m }
        )
        return
      }

      await client.sendMessage(
        m.chat,
        {
          text: payload.text,
          ...mentionContext
        },
        { quoted: m }
      )
    } catch (e) {
      await m.reply(`Erro ao executar o comando *${usedPrefix + command}*.\n\nDetalhes: ${e.message}`)
    }
  }
}

function formatMs(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  return [
    days ? `${days}d` : null,
    `${hours % 24}h`,
    `${minutes % 60}m`,
    `${seconds % 60}s`
  ].filter(Boolean).join(' ')
}
