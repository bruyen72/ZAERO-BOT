import axios from 'axios'
import crypto from 'crypto'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

const MAX_QTY = 6
const RECENT_CACHE_LIMIT = 80
const DOWNLOAD_TIMEOUT_MS = 25000
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024

const recentByChat = new Map()

const MEME_SOURCES = [
  'https://meme-api.com/gimme',
  'https://meme-api.com/gimme/memes',
  'https://meme-api.com/gimme/dankmemes',
  'https://meme-api.com/gimme/wholesomememes'
]

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function sha1(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex')
}

function normalizedMemeUrl(url = '') {
  return String(url).trim().split('?')[0]
}

function isLikelyImageUrl(url = '') {
  return /\.(jpe?g|png|webp)(\?.*)?$/i.test(String(url))
}

function getRecentSet(chatId) {
  return new Set(recentByChat.get(chatId) || [])
}

function pushRecent(chatId, hash) {
  const list = recentByChat.get(chatId) || []
  list.unshift(hash)
  if (list.length > RECENT_CACHE_LIMIT) list.length = RECENT_CACHE_LIMIT
  recentByChat.set(chatId, list)
}

function shuffle(items = []) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

async function fetchFromMemeApi(endpoint) {
  const { data } = await axios.get(endpoint, {
    timeout: 12000,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ZAERO-BOT/1.0'
    }
  })

  const url = String(data?.url || '').trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return null
  if (!isLikelyImageUrl(url)) return null
  return url
}

async function fetchRandomMemeUrl() {
  const sources = shuffle(MEME_SOURCES)
  for (const source of sources) {
    try {
      const url = await fetchFromMemeApi(source)
      if (url) return url
    } catch {}
  }
  return null
}

async function imageToStickerBuffer(imageUrl) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_DOWNLOAD_BYTES,
    maxBodyLength: MAX_DOWNLOAD_BYTES,
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': 'ZAERO-BOT/1.0'
    }
  })

  const buffer = Buffer.from(response.data)
  const sticker = new Sticker(buffer, {
    pack: 'ZAERO MEMES',
    author: 'ZAERO BOT',
    type: StickerTypes.FULL,
    quality: 60
  })

  return sticker.toBuffer()
}

export default {
  command: ['meme', 'memes'],
  category: 'utils',
  info: {
    desc: 'Envia meme como figurinha. Use .meme ou .meme 3'
  },
  run: async (client, m, args, usedPrefix, command) => {
    const chatId = m.chat
    const qty = clampInt(args?.[0], 1, MAX_QTY, 1)
    const recentSet = getRecentSet(chatId)
    const sentNow = new Set()

    let sentCount = 0
    let tries = 0
    const maxTries = qty * 12

    await m.react('⏳').catch(() => {})

    while (sentCount < qty && tries < maxTries) {
      tries += 1
      const url = await fetchRandomMemeUrl()
      if (!url) continue

      const hash = sha1(normalizedMemeUrl(url))
      if (sentNow.has(hash) || recentSet.has(hash)) continue

      try {
        const stickerBuffer = await imageToStickerBuffer(url)
        await client.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
        pushRecent(chatId, hash)
        sentNow.add(hash)
        sentCount += 1
      } catch {}
    }

    if (sentCount === 0) {
      await m.react('❌').catch(() => {})
      return m.reply(`❌ Não consegui pegar memes agora.\nTente novamente com *${usedPrefix}${command}*.`)
    }

    await m.react('✅').catch(() => {})
  }
}
