import fs from 'fs'
import path from 'path'
import { transcodeForWhatsapp } from '../nsfwShared.js'

const DEFAULT_UNKNOWN_MEDIA = Object.freeze([
  'welcome.gif',
  'LIBRAS/affibras.gif',
  'LIBRAS/dificilbras.gif',
  'LIBRAS/librasviu.gif',
])

const TITLES = Object.freeze([
  'Quase acertou',
  'Comando torto',
  'Nao rolou',
  'Digitou errado',
  'Ops, nao existe',
])

const LINES = Object.freeze([
  'Manda o comando certinho e eu entrego.',
  'Foi por pouco. Tenta de novo.',
  'Esse eu nao conheco ainda.',
  'Errou a escrita, acerta no proximo.',
  'Aqui so funciona no comando exato.',
])

const bufferCache = new Map()
const gifVideoCache = new Map()

function pickRandom(list = []) {
  if (!Array.isArray(list) || list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)] || null
}

function uniqueStrings(items = []) {
  return [...new Set(items.filter(Boolean))]
}

function normalizeInput(value = '') {
  return String(value || '').trim()
}

function isUrl(value = '') {
  return /^https?:\/\//i.test(value)
}

function detectMediaType(value = '') {
  const lower = normalizeInput(value).toLowerCase()
  if (/\.(png|jpe?g|webp)(\?.*)?$/.test(lower)) return 'image'
  if (/\.(mp4|webm|mov)(\?.*)?$/.test(lower)) return 'video'
  if (/\.gif(\?.*)?$/.test(lower)) return 'gif'
  return 'image'
}

function getUnknownMediaPool() {
  return [...DEFAULT_UNKNOWN_MEDIA]
}

function sanitizeCommandName(command = '') {
  return String(command || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

function buildCaption(command = '', usedPrefix = '.') {
  const safeCommand = sanitizeCommandName(command) || 'comando'
  const title = pickRandom(TITLES) || 'Comando invalido'
  const line = pickRandom(LINES) || 'Use o comando certo.'
  return (
    `*${title}*` +
    `\n${line}` +
    `\n\nVoce digitou: *${usedPrefix}${safeCommand}*` +
    `\nUse *${usedPrefix}menu* para ver os comandos.`
  )
}

async function readLocalBuffer(filePath = '') {
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  if (bufferCache.has(absPath)) return bufferCache.get(absPath)

  const buffer = await fs.promises.readFile(absPath)
  bufferCache.set(absPath, buffer)
  return buffer
}

async function convertGifToMp4Buffer(inputBuffer, cacheKey = '') {
  const key = normalizeInput(cacheKey) || null
  if (key && gifVideoCache.has(key)) return gifVideoCache.get(key)

  const converted = await transcodeForWhatsapp(inputBuffer, {
    preset: 'ultrafast',
    crf: 28,
    maxBitrate: 700,
    scale: '640:-2',
    timeoutMs: 120000,
    queueWaitTimeoutMs: 60000,
    limitSeconds: 12,
    audioBitrate: '64k',
  })

  if (key) gifVideoCache.set(key, converted)
  return converted
}

async function loadUnknownMediaEntry(entry = '') {
  const normalized = normalizeInput(entry)
  if (!normalized) return null

  const mediaType = detectMediaType(normalized)

  if (isUrl(normalized)) {
    return {
      type: mediaType,
      payload: { url: normalized },
      ref: normalized,
    }
  }

  try {
    const buffer = await readLocalBuffer(normalized)
    return {
      type: mediaType,
      payload: buffer,
      ref: normalized,
    }
  } catch {
    return null
  }
}

async function sendAsImage(client, m, payload, caption) {
  await client.sendMessage(
    m.chat,
    { image: payload, caption },
    { quoted: m },
  )
}

async function sendAsVideo(client, m, payload, caption, asGifPlayback = false) {
  await client.sendMessage(
    m.chat,
    {
      video: payload,
      caption,
      gifPlayback: asGifPlayback,
      mimetype: 'video/mp4',
      ptv: false,
    },
    { quoted: m },
  )
}

async function sendAsDocument(client, m, payload, caption, fileName = 'media.gif') {
  await client.sendMessage(
    m.chat,
    {
      document: payload,
      fileName,
      mimetype: 'image/gif',
      caption,
    },
    { quoted: m },
  )
}

async function trySendUnknownMedia(client, m, media, caption) {
  if (!media) return false

  try {
    if (media.type === 'image') {
      await sendAsImage(client, m, media.payload, caption)
      return true
    }

    if (media.type === 'video') {
      await sendAsVideo(client, m, media.payload, caption, false)
      return true
    }

    if (media.type === 'gif') {
      // Evita enviar GIF bruto como video (causa "midia nao existe" em alguns celulares).
      if (Buffer.isBuffer(media.payload)) {
        try {
          const mp4Buffer = await convertGifToMp4Buffer(media.payload, media.ref)
          await sendAsVideo(client, m, mp4Buffer, caption, true)
          return true
        } catch {}

        try {
          await sendAsDocument(client, m, media.payload, caption)
          return true
        } catch {
          await sendAsImage(client, m, media.payload, caption)
          return true
        }
      }

      try {
        await sendAsDocument(client, m, media.payload, caption)
        return true
      } catch {
        await sendAsImage(client, m, media.payload, caption)
        return true
      }
    }
  } catch {
    return false
  }

  return false
}

export async function sendUnknownCommandFeedback(client, m, options = {}) {
  const command = options.command || ''
  const usedPrefix = options.usedPrefix || '.'
  const caption = buildCaption(command, usedPrefix)

  const mediaPool = getUnknownMediaPool()
  const shuffled = uniqueStrings([...mediaPool]).sort(() => Math.random() - 0.5)

  for (const entry of shuffled) {
    const loaded = await loadUnknownMediaEntry(entry)
    if (!loaded) continue
    const sent = await trySendUnknownMedia(client, m, loaded, caption)
    if (sent) return true
  }

  await client.sendMessage(m.chat, { text: caption }, { quoted: m })
  return true
}
