import fs from 'fs'
import crypto from 'crypto'
import exif from '../../lib/exif.js'
import { searchTenor, toStickerWebp } from '../../lib/tenorSticker.js'

const { writeExif } = exif

const MAX_QTY = 10
const DEFAULT_QTY = 10
const RECENT_LIMIT = 120
const PACK_NAME = 'ZAERO FIG'
const PACK_AUTHOR = 'Tenor'

const RANDOM_TERMS = [
  'engracado',
  'meme',
  'anime reaction',
  'beijo',
  'feliz',
  'dance',
  'cat funny',
  'dog funny'
]

const recentByChat = new Map()

function clampQty(value, fallback = DEFAULT_QTY) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 1) return fallback
  return Math.min(parsed, MAX_QTY)
}

function shuffle(items = []) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function randomTerm() {
  return RANDOM_TERMS[Math.floor(Math.random() * RANDOM_TERMS.length)]
}

function normalizeUrl(url = '') {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().toLowerCase()
  } catch {
    return raw.split('?')[0].toLowerCase()
  }
}

function hashUrl(url = '') {
  return crypto.createHash('sha1').update(normalizeUrl(url)).digest('hex')
}

function getRecentSet(chatId) {
  return new Set(recentByChat.get(chatId) || [])
}

function pushRecent(chatId, url = '') {
  const hash = hashUrl(url)
  if (!hash) return

  const list = recentByChat.get(chatId) || []
  list.unshift(hash)
  if (list.length > RECENT_LIMIT) list.length = RECENT_LIMIT
  recentByChat.set(chatId, list)
}

function pickUrlsForChat(chatId, urls = [], qty = DEFAULT_QTY) {
  const recent = getRecentSet(chatId)
  const selected = []
  const selectedHashes = new Set()

  for (const url of shuffle(urls)) {
    const hash = hashUrl(url)
    if (!hash || selectedHashes.has(hash) || recent.has(hash)) continue
    selected.push(url)
    selectedHashes.add(hash)
    if (selected.length >= qty) return selected
  }

  // Se o cache de repeticao estiver muito restrito, completa ignorando historico antigo.
  for (const url of shuffle(urls)) {
    const hash = hashUrl(url)
    if (!hash || selectedHashes.has(hash)) continue
    selected.push(url)
    selectedHashes.add(hash)
    if (selected.length >= qty) return selected
  }

  return selected
}

function parseFigArgs(args = []) {
  let qty = DEFAULT_QTY
  let termParts = [...args]

  if (args.length > 0 && /^-?\d+$/.test(String(args[0]))) {
    qty = clampQty(args[0], DEFAULT_QTY)
    termParts = args.slice(1)
  }

  const termRaw = termParts.join(' ').trim()
  const randomMode = termRaw.length === 0
  const searchTerm = randomMode ? randomTerm() : termRaw

  return {
    qty,
    termRaw,
    randomMode,
    searchTerm,
    displayTerm: randomMode ? 'aleatorio' : termRaw
  }
}

function safeUnlink(filePath = '') {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

export default {
  command: ['fig', 'giffig'],
  category: 'utils',
  info: {
    desc: 'Busca GIFs no Tenor e envia como figurinha. Ex: .fig 4 beijar'
  },
  run: async (client, m, args, usedPrefix) => {
    const parsed = parseFigArgs(args)

    const searchingText = parsed.randomMode
      ? `Buscando ${parsed.qty} figurinhas aleatorias...`
      : `Buscando ${parsed.qty} figurinhas de: ${parsed.termRaw}...`

    await m.react('\u23F3').catch(() => {})
    await m.reply(searchingText).catch(() => {})

    let urls = []
    try {
      urls = await searchTenor(parsed.searchTerm, Math.max(parsed.qty * 4, parsed.qty))
    } catch (error) {
      console.error(`[FIG] Erro na busca: ${error.message}`)
      await m.react('\u274C').catch(() => {})
      return m.reply('Falha na busca. Configure TENOR_API_KEY e tente novamente.')
    }

    if (!Array.isArray(urls) || urls.length === 0) {
      await m.react('\u274C').catch(() => {})
      return m.reply(`Nao encontrei resultados para: ${parsed.displayTerm}`)
    }

    const picked = pickUrlsForChat(m.chat, urls, parsed.qty)
    if (picked.length === 0) {
      await m.react('\u274C').catch(() => {})
      return m.reply(`Nao encontrei resultados para: ${parsed.displayTerm}`)
    }

    let sent = 0

    for (const mediaUrl of picked) {
      try {
        const webpBuffer = await toStickerWebp(mediaUrl, {
          downloadTimeoutMs: 20000,
          timeoutMs: 20000,
          trimSeconds: 6,
          maxOutputBytes: 850 * 1024
        })

        const stickerPath = await writeExif(
          { mimetype: 'webp', data: webpBuffer },
          { packname: PACK_NAME, author: PACK_AUTHOR, categories: [''] }
        )

        try {
          await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
        } finally {
          safeUnlink(stickerPath)
        }

        pushRecent(m.chat, mediaUrl)
        sent += 1
      } catch (error) {
        console.warn(`[FIG] Falha ao converter/enviar: ${error.message}`)
      }
    }

    if (sent === 0) {
      await m.react('\u274C').catch(() => {})
      return m.reply('Falha ao converter, tente outro termo')
    }

    if (sent < parsed.qty) {
      await m.reply(`Enviei ${sent}/${parsed.qty} figurinhas. Algumas falharam na conversao.`).catch(() => {})
    }

    await m.react('\u2705').catch(() => {})
  }
}
