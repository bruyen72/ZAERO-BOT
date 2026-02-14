import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { runFfmpeg } from './system/ffmpeg.js'

const MAX_WA_VIDEO_BYTES = 15 * 1024 * 1024
const MAX_DOWNLOAD_VIDEO_BYTES = 50 * 1024 * 1024
const COMPRESS_THRESHOLD = 20 * 1024 * 1024
const REDGIFS_HISTORY_LIMIT = 500

const DEFAULT_VIDEO_HEADERS = Object.freeze({
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: '*/*',
})

function parsePositiveInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

function parseBitrateK(value, fallbackK = 900) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  const digits = String(value || '').match(/\d+/)
  if (!digits) return fallbackK
  const parsed = Number(digits[0])
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackK
}

function pickTranscodeOptions(inputSizeBytes = 0, custom = {}) {
  const inputMb = inputSizeBytes / 1024 / 1024
  const fallback = {
    preset: 'fast',
    crf: 24,
    maxBitrate: 900,
    scale: null,
    timeoutMs: 120000,
    limitSeconds: 15,
    audioBitrate: '64k',
  }

  const sized =
    inputMb > 40
      ? { preset: 'ultrafast', crf: 28, maxBitrate: 500, scale: '720:-2', timeoutMs: 180000, limitSeconds: 15 }
      : inputMb > COMPRESS_THRESHOLD / 1024 / 1024
        ? { preset: 'veryfast', crf: 26, maxBitrate: 800, scale: null, timeoutMs: 150000, limitSeconds: 15 }
        : fallback

  return {
    ...fallback,
    ...sized,
    ...custom,
  }
}

export async function downloadVideoBuffer(url, options = {}) {
  const target = String(url || '').trim()
  if (!target) throw new Error('URL vazia para download')

  const timeout = parsePositiveInt(options.timeoutMs, 45000)
  const maxBytes = parsePositiveInt(options.maxBytes, MAX_DOWNLOAD_VIDEO_BYTES)
  const response = await axios.get(target, {
    responseType: 'arraybuffer',
    timeout,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    headers: {
      ...DEFAULT_VIDEO_HEADERS,
      ...(options.headers || {}),
    },
  })

  const buffer = Buffer.from(response.data || [])
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Download retornou buffer vazio')
  }
  if (buffer.length > maxBytes) {
    throw new Error(`Midia acima do limite de download (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`)
  }
  return buffer
}

export async function transcodeForWhatsapp(inputBuffer, options = {}) {
  const inputSize = Buffer.isBuffer(inputBuffer) ? inputBuffer.length : 0
  if (inputSize === 0) throw new Error('Buffer de entrada vazio')

  const cfg = pickTranscodeOptions(inputSize, options)
  const timeoutMs = parsePositiveInt(cfg.timeoutMs, 120000)
  const queueWaitTimeoutMs = parsePositiveInt(cfg.queueWaitTimeoutMs, 45000)
  const limitSeconds = parsePositiveInt(cfg.limitSeconds, 15)
  const crf = parsePositiveInt(cfg.crf, 24)
  const preset = String(cfg.preset || 'fast')
  const maxBitrateK = parseBitrateK(cfg.maxBitrate, 900)
  const audioBitrate = String(cfg.audioBitrate || '64k')
  const scale = cfg.scale ? String(cfg.scale).trim() : ''

  const tmpDir = './tmp'
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const inPath = path.join(tmpDir, `trans-in-${id}.mp4`)
  const outPath = path.join(tmpDir, `trans-out-${id}.mp4`)
  const videoFilter = scale
    ? `scale=${scale},format=yuv420p`
    : "scale='trunc(iw/2)*2:trunc(ih/2)*2',format=yuv420p"

  try {
    fs.writeFileSync(inPath, inputBuffer)

    await runFfmpeg(
      [
        '-y',
        '-i',
        inPath,
        '-t',
        String(limitSeconds),
        '-vf',
        videoFilter,
        '-c:v',
        'libx264',
        '-profile:v',
        'baseline',
        '-level',
        '3.0',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        preset,
        '-crf',
        String(crf),
        '-maxrate',
        `${maxBitrateK}k`,
        '-bufsize',
        `${maxBitrateK * 2}k`,
        '-c:a',
        'aac',
        '-b:a',
        audioBitrate,
        '-ac',
        '1',
        '-movflags',
        '+faststart',
        outPath,
      ],
      { timeoutMs, queueWaitTimeoutMs },
    )

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      throw new Error('Falha na transcodificacao: arquivo de saida vazio')
    }

    return fs.readFileSync(outPath)
  } finally {
    try {
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
    } catch {}
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    } catch {}
  }
}

export async function compressVideoBuffer(buffer, options = {}) {
  return transcodeForWhatsapp(buffer, options)
}

export function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false
  const hasFtyp = buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp')
  const hasEbml = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
  const hasGifHeader = buffer.slice(0, 6).toString('ascii') === 'GIF87a' || buffer.slice(0, 6).toString('ascii') === 'GIF89a'
  const startsWithHtml =
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<!doctype') ||
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<html')
  if (startsWithHtml) return false
  return hasFtyp || hasEbml || hasGifHeader
}

const nsfwChatQueues = new Map()

export function withChatNsfwQueue(chatId, fn) {
  const key = String(chatId || 'unknown')
  const prev = nsfwChatQueues.get(key) || Promise.resolve()
  const next = prev.then(fn, fn)
  const safe = next.catch(() => {})
  nsfwChatQueues.set(key, safe)
  return next
}

export function normalizeId(value = '') {
  return String(value).toLowerCase().trim()
}

export function getChatRedgifsHistory(chat = {}) {
  if (!Array.isArray(chat.nsfwRedgifsSentIds)) {
    chat.nsfwRedgifsSentIds = []
  }
  chat.nsfwRedgifsSentIds = chat.nsfwRedgifsSentIds.map((item) => normalizeId(item)).filter(Boolean)
  return chat.nsfwRedgifsSentIds
}

export function registerSentRedgifsId(chat = {}, id = '') {
  const normalized = normalizeId(id)
  if (!normalized) return
  const history = getChatRedgifsHistory(chat).filter((item) => item !== normalized)
  history.push(normalized)
  if (history.length > REDGIFS_HISTORY_LIMIT) {
    chat.nsfwRedgifsSentIds = history.slice(-REDGIFS_HISTORY_LIMIT)
    return
  }
  chat.nsfwRedgifsSentIds = history
}

export { MAX_WA_VIDEO_BYTES, MAX_DOWNLOAD_VIDEO_BYTES, COMPRESS_THRESHOLD }
