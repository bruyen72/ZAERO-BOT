import fs from 'fs'
import moment from 'moment-timezone'
import { getDevice } from '@whiskeysockets/baileys'
import { bodyMenu, menuObject } from '../../lib/commands.js'
import { apiCache } from '../../lib/cache.js'

function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeBotDisplayName(name = '') {
  const fallback = 'ZARO BOT'
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
  download: ['download', 'apk'],
  downloader: ['downloader', 'downloads', 'baixar', 'midia'],
  economy: ['economy', 'economia'],
  fun: ['fun', 'diversao'],
  gacha: ['gacha'],
  github: ['github', 'git'],
  group: ['group'],
  grupo: ['grupo', 'grupos'],
  info: ['info', 'informacoes'],
  internet: ['internet'],
  mod: ['mod', 'moderacao'],
  nsfw: ['nsfw', '18'],
  owner: ['owner', 'dono'],
  profile: ['profile', 'perfil'],
  rpg: ['rpg'],
  search: ['search', 'pesquisa', 'buscar'],
  socket: ['socket', 'sockets', 'bot', 'bots'],
  sticker: ['sticker', 'stickers'],
  tools: ['tools', 'ferramentas'],
  uncategorized: ['uncategorized', 'outros'],
  utils: ['utils', 'utilitarios']
}

function resolveCategory(input = '') {
  const key = normalize(input)
  if (!key) return null

  for (const [category, aliases] of Object.entries(categoryAlias)) {
    if (aliases.map(normalize).includes(key)) return category
  }

  if (Object.prototype.hasOwnProperty.call(menuObject, key)) return key
  return null
}

function buildCategoryList() {
  return Object.keys(menuObject)
    .sort((a, b) => a.localeCompare(b))
    .map((cat) => `- ${cat}`)
    .join('\n')
}

export default {
  command: ['allmenu', 'help', 'menu', 'ajuda', 'comandos'],
  category: 'info',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const rawCategory = String(args[0] || '').trim()
      const resolvedCategory = resolveCategory(rawCategory)
      const cacheKey = `menu_text_${m.sender}_${normalize(rawCategory || 'all')}`
      let payload = apiCache.get(cacheKey)

      if (!payload) {
        const botId = client?.user?.id?.split(':')[0] + '@s.whatsapp.net'
        const botSettings = global.db?.data?.settings?.[botId] || {}
        const botname = normalizeBotDisplayName(botSettings.botname || botSettings.namebot || global.botName)
        const owner = resolveOwnerDisplayName(botSettings.owner || global.owner?.[0] || '')
        const banner = botSettings.banner || global.botLogo || './ZK.png'
        const botType = global.client?.user?.id && botId === (global.client.user.id.split(':')[0] + '@s.whatsapp.net')
          ? 'Principal'
          : 'SubBot'
        const users = Object.keys(global.db?.data?.users || {}).length
        const device = getDevice(m.key?.id || '')
        const senderName = global.db?.data?.users?.[m.sender]?.name || m.pushName || 'Usuario'
        const senderMention = `@${m.sender.split('@')[0]}`
        const dateText = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY')
        const timeText = moment.tz('America/Sao_Paulo').format('HH:mm')
        const uptime = client.uptime ? formatMs(Date.now() - client.uptime) : 'Desconhecido'

        if (rawCategory && !resolvedCategory) {
          return m.reply(
            `A categoria *${rawCategory}* nao existe.\n\nCategorias disponiveis:\n${buildCategoryList()}\n\nExemplo: ${usedPrefix}menu downloader`
          )
        }

        const sections = resolvedCategory
          ? [String(menuObject[resolvedCategory] || '')]
          : Object.keys(menuObject)
              .sort((a, b) => a.localeCompare(b))
              .map((cat) => String(menuObject[cat] || ''))

        let text = `${String(bodyMenu || '').trim()}\n\n${sections.join('\n\n')}`.trim()

        const replacements = {
          '$owner': owner,
          '$botType': botType,
          '$device': device,
          '$tiempo': dateText,
          '$tempo': timeText,
          '$users': users.toLocaleString('pt-BR'),
          '$cat': resolvedCategory ? ` (${resolvedCategory})` : '',
          '$sender': senderMention,
          '$senderName': senderName,
          '$botname': botname,
          '$namebot': botname,
          '$prefix': usedPrefix,
          '$uptime': uptime
        }

        for (const [token, value] of Object.entries(replacements)) {
          text = text.split(token).join(String(value))
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
