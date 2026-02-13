import fs from 'fs'
import path from 'path'
import { runFfmpeg } from './system/ffmpeg.js'

/**
 * ZÆRØ BOT - NSFW Shared Utils (2026 Edition)
 * Focado em compatibilidade absoluta com WhatsApp Mobile.
 */

const MAX_WA_VIDEO_BYTES = 12 * 1024 * 1024
const COMPRESS_THRESHOLD = 6 * 1024 * 1024
const REDGIFS_HISTORY_LIMIT = 500

/**
 * Transcodifica um vídeo para o formato "Golden Standard" do WhatsApp Mobile.
 * Resolve o problema da tela cinza/não reproduzindo.
 */
export async function transcodeForWhatsapp(inputBuffer, options = {}) {
  const inputSize = Buffer.isBuffer(inputBuffer) ? inputBuffer.length : 0
  if (inputSize === 0) throw new Error('Buffer de entrada vazio')

  const timeoutMs = options.timeoutMs || 90000
  const tmpDir = './tmp'
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const inPath = path.join(tmpDir, `trans-in-${id}.mp4`)
  const outPath = path.join(tmpDir, `trans-out-${id}.mp4`)

  try {
    fs.writeFileSync(inPath, inputBuffer)

    // COMANDO DE PRODUÇÃO 2026:
    // - H.264 Baseline Profile (compatível com QUALQUER celular)
    // - Escala par (múltiplo de 2)
    // - Pixel Format yuv420p
    // - +faststart para streaming imediato
    await runFfmpeg([
      '-y',
      '-i', inPath,
      '-t', '15', // Limita a 15s para RedGifs (ideal para WhatsApp)
      '-vf', "scale='trunc(iw/2)*2:trunc(ih/2)*2',format=yuv420p",
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '64k', // Bitrate baixo para áudio (economiza espaço)
      '-ac', '1',    // Mono é suficiente para RedGifs
      '-movflags', '+faststart',
      outPath
    ], { timeoutMs })

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      throw new Error('Falha na transcodificação: arquivo de saída vazio')
    }

    return fs.readFileSync(outPath)
  } finally {
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath) } catch {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath) } catch {}
  }
}

/**
 * Alias para manter retrocompatibilidade com códigos existentes, 
 * mas agora usando a transcodificação correta.
 */
export async function compressVideoBuffer(buffer, options = {}) {
  return transcodeForWhatsapp(buffer, options)
}

export function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false
  const hasFtyp = buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp')
  const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
  const startsWithHtml = buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<!doctype') ||
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<html')
  if (startsWithHtml) return false
  return hasFtyp || hasEbml
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
  chat.nsfwRedgifsSentIds = chat.nsfwRedgifsSentIds
    .map((item) => normalizeId(item))
    .filter(Boolean)
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

export { MAX_WA_VIDEO_BYTES, COMPRESS_THRESHOLD }
