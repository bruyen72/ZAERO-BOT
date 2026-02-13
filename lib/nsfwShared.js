import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { runFfmpeg } from './system/ffmpeg.js'
import { globalJobQueue } from './jobQueue.js'
import { getMediaCache, setMediaCache } from './cache.js'

/**
 * ZÆRØ BOT - NSFW Shared Utils (2026 High Compatibility)
 * Focado em eliminar a "tela cinza" no WhatsApp Mobile.
 */

const MAX_WA_VIDEO_BYTES = 12 * 1024 * 1024 // 12MB Limite real Fly.io
const COMPRESS_THRESHOLD = 8 * 1024 * 1024
const REDGIFS_HISTORY_LIMIT = 500

/**
 * Transcodifica para o formato "WhatsApp Mobile Gold Standard".
 */
export async function transcodeForWhatsapp(inputBuffer, options = {}) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) throw new Error('Buffer inválido')

  const cacheKey = crypto.createHash('md5').update(inputBuffer.slice(0, 10000)).digest('hex')
  const cached = getMediaCache(cacheKey)
  if (cached) return fs.readFileSync(cached)

  if (inputBuffer.length > MAX_WA_VIDEO_BYTES) {
    throw new Error('Vídeo muito grande para processar no servidor atual (Limite 12MB).')
  }

  return await globalJobQueue.enqueue(async () => {
    const tmpDir = './tmp'
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const inPath = path.join(tmpDir, `in-${id}.mp4`)
    const outPath = path.join(tmpDir, `out-${id}.mp4`)

    try {
      fs.writeFileSync(inPath, inputBuffer)

      // COMANDO DE ALTA COMPATIBILIDADE (2026 GOLD STANDARD)
      // Resolve tela cinza: Baseline Profile + YUV420P + Faststart + Escala Par (trunc)
      // Adicionado logs e parâmetros de compatibilidade mobile extrema
      const startTime = Date.now()
      
      await runFfmpeg([
        '-y', '-i', inPath,
        '-t', '10', // Limita duração para 10s (mais generoso)
        '-vf', "scale='trunc(iw/2)*2:trunc(ih/2)*2',fps=24",
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-pix_fmt', 'yuv420p', // Forçar pixel format compatível
        '-preset', 'veryfast',
        '-crf', '28',
        '-an', // Remove áudio (vídeos de RedGifs/GIFs não precisam e economiza)
        '-movflags', '+faststart',
        '-threads', '1', // Evita picos de CPU no Fly (shared-cpu-1x)
        outPath
      ], { timeoutMs: 90000 })

      if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
        throw new Error('Falha na transcodificação: Arquivo de saída vazio.')
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      const sizeIn = (inputBuffer.length / 1024 / 1024).toFixed(2)
      const sizeOut = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2)
      
      console.log(`[Transcode] Sucesso: ${sizeIn}MB -> ${sizeOut}MB em ${duration}s (H.264 Baseline/yuv420p)`)

      setMediaCache(cacheKey, outPath)
      return fs.readFileSync(outPath)
    } finally {
      try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath) } catch {}
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath) } catch {}
    }
  }, { priority: 2, userId: options.userId || 'global', label: 'transcode' })
}

export function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false
  return buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp')
}

export function normalizeId(value = '') {
  return String(value).toLowerCase().trim()
}

export function getChatRedgifsHistory(chat = {}) {
  if (!Array.isArray(chat.nsfwRedgifsSentIds)) chat.nsfwRedgifsSentIds = []
  return chat.nsfwRedgifsSentIds
}

export function registerSentRedgifsId(chat = {}, id = '') {
  const normalized = normalizeId(id)
  if (!normalized) return
  let history = getChatRedgifsHistory(chat)
  if (!history.includes(normalized)) {
    history.push(normalized)
    if (history.length > REDGIFS_HISTORY_LIMIT) history.shift()
    chat.nsfwRedgifsSentIds = history
  }
}

export { MAX_WA_VIDEO_BYTES, COMPRESS_THRESHOLD }
