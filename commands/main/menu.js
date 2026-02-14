import fs from 'fs'
import moment from 'moment-timezone'
import { getDevice } from '@whiskeysockets/baileys'
import { apiCache } from '../../lib/cache.js'
import { bodyMenu, menuObject } from '../../lib/commands.js'

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

const categoryRemap = {
  download: 'downloads',
  downloader: 'downloads',
  group: 'grupo',
  sticker: 'stickers',
  tool: 'utils',
  ia: 'utils',
  ai: 'utils',
  redes: 'redes',
  social: 'redes',
  anime: 'anime',
  profile: 'profile',
  perfil: 'profile',
  grupo: 'grupo',
  bot: 'bot',
  owner: 'owner',
  dono: 'owner',
  nsfw: 'nsfw'
}

function resolveCategory(input = '') {
  const key = normalize(input)
  if (!key) return null
  if (menuObject[key]) return key
  return categoryRemap[key] || null
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
        const usersCount = Object.keys(global.db?.data?.users || {}).length
        const device = getDevice(m.key?.id || '')
        const senderMention = `@${m.sender.split('@')[0]}`
        const dateText = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY')
        const timeText = moment.tz('America/Sao_Paulo').format('HH:mm')
        const uptime = client.uptime ? formatMs(Date.now() - client.uptime) : 'Desconhecido'

        let text = ''
        if (!resolvedCategory) {
          text = bodyMenu
            .replace(/\$sender/g, senderMention)
            .replace(/\$device/g, device)
            .replace(/\$users/g, usersCount.toLocaleString('pt-BR'))
            .replace(/\$uptime/g, uptime)
            .replace(/\$tiempo/g, dateText)
            .replace(/\$tempo/g, timeText)
            .replace(/\$prefix/g, usedPrefix)
        } else {
          text = menuObject[resolvedCategory] || ''
          text = text.replace(/\$prefix/g, usedPrefix)
        }

        if (!text && rawCategory) {
          return m.reply(`Categoria *${rawCategory}* não encontrada. Use ${usedPrefix}menu para ver as opções.`)
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
