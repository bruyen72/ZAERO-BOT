import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { apiCache } from './cache.js'
import { runFfmpeg } from './system/ffmpeg.js'
import { scrapeTenor } from './tenorScraper.js'

const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search'
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search'

const TENOR_CACHE_TTL_SECONDS = 300
const DOWNLOAD_TIMEOUT_MS = 20000
const CONVERT_TIMEOUT_MS = 20000
const MAX_DOWNLOAD_BYTES = 16 * 1024 * 1024
const DEFAULT_OUTPUT_LIMIT_BYTES = 850 * 1024
const DEFAULT_TRIM_SECONDS = 6
const MAX_QUEUE_SIZE = 80
const CONVERT_CONCURRENCY = clampInt(process.env.BOT_FIG_CONCURRENCY, 1, 2, 2)

let activeConversions = 0
const conversionQueue = []

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function normalizeTerm(term = '') {
  return String(term || '').trim().toLowerCase()
}

function cacheKey(term = '') {
  return `fig:tenor:${normalizeTerm(term)}`
}

function safeUnlink(filePath = '') {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

function shuffle(items = []) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function uniqueUrls(items = []) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const url = String(item || '').trim()
    if (!/^https?:\/\//i.test(url)) continue
    const key = url.split('?')[0].toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }
  return out
}

function inferExt(url = '', contentType = '') {
  try {
    const pathname = new URL(url).pathname || ''
    const ext = path.extname(pathname).toLowerCase()
    if (ext && ext.length <= 5) return ext
  } catch {}

  const ctype = String(contentType || '').toLowerCase()
  if (ctype.includes('gif')) return '.gif'
  if (ctype.includes('mp4')) return '.mp4'
  if (ctype.includes('webm')) return '.webm'
  if (ctype.includes('png')) return '.png'
  if (ctype.includes('jpeg') || ctype.includes('jpg')) return '.jpg'
  return '.bin'
}

function buildTempPath(prefix = 'fig', ext = '.tmp') {
  const token = crypto.randomBytes(6).toString('hex')
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${token}${ext}`)
}

async function fetchJson(url, timeoutMs = DOWNLOAD_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ZAERO-BOT-FIG/1.0'
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function pickTenorMediaUrl(mediaFormats = {}) {
  const order = [
    'nanomp4',
    'tinymp4',
    'mp4',
    'tinygif',
    'mediumgif',
    'gif',
    'tinywebm',
    'webm',
    'loopedmp4'
  ]

  for (const key of order) {
    const url = String(mediaFormats?.[key]?.url || '').trim()
    if (/^https?:\/\//i.test(url)) return url
  }

  return null
}

async function requestTenor(term, limit, { searchfilter = '' } = {}) {
  const tenorApiKey = String(process.env.TENOR_API_KEY || '').trim()
  if (!tenorApiKey) {
    throw new Error('TENOR_API_KEY nao configurada')
  }

  const params = new URLSearchParams({
    key: tenorApiKey,
    client_key: String(process.env.TENOR_CLIENT_KEY || 'zaero-bot'),
    q: term,
    limit: String(limit),
    random: 'true',
    contentfilter: String(process.env.TENOR_CONTENT_FILTER || 'medium'),
    locale: String(process.env.TENOR_LOCALE || 'pt_BR'),
    media_filter: 'nanomp4,tinymp4,mp4,tinygif,mediumgif,gif,tinywebm,webm'
  })

  if (searchfilter) params.set('searchfilter', searchfilter)

  const url = `${TENOR_SEARCH_URL}?${params.toString()}`
  console.log(`[FIG] Buscando Tenor termo="${term}" limit=${limit} filtro=${searchfilter || 'padrao'}`)

  const data = await fetchJson(url, DOWNLOAD_TIMEOUT_MS)
  const results = Array.isArray(data?.results) ? data.results : []

  const urls = []
  for (const item of results) {
    const mediaFormats = item?.media_formats || {}
    const mediaUrl = pickTenorMediaUrl(mediaFormats)
    if (mediaUrl) urls.push(mediaUrl)
  }

  const unique = uniqueUrls(urls)
  console.log(`[FIG] Tenor retornou ${unique.length} URLs`)
  return unique
}

async function requestGiphy(term, limit) {
  const giphyApiKey = String(process.env.GIPHY_API_KEY || '').trim()
  if (!giphyApiKey) return []

  const params = new URLSearchParams({
    api_key: giphyApiKey,
    q: term,
    limit: String(limit),
    offset: '0',
    rating: 'g',
    lang: 'pt'
  })

  const url = `${GIPHY_SEARCH_URL}?${params.toString()}`
  console.log(`[FIG] Fallback GIPHY termo="${term}" limit=${limit}`)

  const data = await fetchJson(url, DOWNLOAD_TIMEOUT_MS)
  const results = Array.isArray(data?.data) ? data.data : []
  const urls = []

  for (const item of results) {
    const images = item?.images || {}
    const candidates = [
      images?.fixed_width?.mp4,
      images?.downsized_medium?.mp4,
      images?.original?.mp4,
      images?.fixed_width?.url,
      images?.downsized?.url,
      images?.original?.url
    ]

    const firstValid = candidates.find((entry) => /^https?:\/\//i.test(String(entry || '').trim()))
    if (firstValid) urls.push(String(firstValid))
  }

  const unique = uniqueUrls(urls)
  console.log(`[FIG] GIPHY retornou ${unique.length} URLs`)
  return unique
}

async function downloadToTempFile(url, { timeoutMs = DOWNLOAD_TIMEOUT_MS, maxBytes = MAX_DOWNLOAD_BYTES } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[FIG] Download iniciado: ${url}`)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'ZAERO-BOT-FIG/1.0'
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = String(res.headers.get('content-type') || '').toLowerCase()
    const contentLength = Number(res.headers.get('content-length') || 0)
    if (contentLength > maxBytes) throw new Error('Arquivo muito grande para baixar')

    const outPath = buildTempPath('fig-src', inferExt(url, contentType))

    let downloaded = 0
    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        downloaded += chunk.length
        if (downloaded > maxBytes) {
          controller.abort()
          callback(new Error('Download excedeu o limite permitido'))
          return
        }
        callback(null, chunk)
      }
    })

    await pipeline(res.body, limiter, fs.createWriteStream(outPath))
    console.log(`[FIG] Download concluido: ${(downloaded / 1024).toFixed(1)}KB`)
    return { path: outPath, bytes: downloaded }
  } finally {
    clearTimeout(timer)
  }
}

function drainConversionQueue() {
  while (activeConversions < CONVERT_CONCURRENCY && conversionQueue.length > 0) {
    const job = conversionQueue.shift()
    if (!job) return

    activeConversions += 1
    Promise.resolve()
      .then(job.task)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        activeConversions -= 1
        setImmediate(drainConversionQueue)
      })
  }
}

function queueConversion(task) {
  return new Promise((resolve, reject) => {
    if (conversionQueue.length >= MAX_QUEUE_SIZE) {
      reject(new Error('Fila de conversao cheia, tente novamente em instantes'))
      return
    }

    conversionQueue.push({ task, resolve, reject })
    drainConversionQueue()
  })
}

export async function searchTenor(term = '', limit = 10) {
  const normalized = normalizeTerm(term)
  if (!normalized) return []

  const safeLimit = clampInt(limit, 1, 40, 10)
  const key = cacheKey(normalized)
  const cached = apiCache.get(key)

  if (Array.isArray(cached) && cached.length > 0) {
    console.log(`[FIG] Cache hit termo="${normalized}" itens=${cached.length}`)
    return shuffle(cached).slice(0, safeLimit)
  }

  const fetchLimit = Math.max(safeLimit, Math.min(40, safeLimit * 3))
  let urls = []
  let lastError = null

  const tenorApiKey = String(process.env.TENOR_API_KEY || '').trim()

  if (tenorApiKey) {
    try {
      urls = await requestTenor(normalized, fetchLimit, { searchfilter: 'sticker' })
    } catch (error) {
      lastError = error
      console.warn(`[FIG] Falha no Tenor API (sticker): ${error.message}`)
    }
  }

  // Se a API falhou ou não tem chave, usa o scraper
  if (urls.length === 0) {
    try {
      console.log(`[FIG] Usando Scraper para: "${normalized}"`)
      urls = await scrapeTenor(normalized)
    } catch (error) {
      lastError = error
      console.warn(`[FIG] Falha no Scraper: ${error.message}`)
    }
  }

  if (tenorApiKey && urls.length < safeLimit) {
    try {
      const fromGifSearch = await requestTenor(normalized, fetchLimit, { searchfilter: '' })
      urls = uniqueUrls([...urls, ...fromGifSearch])
    } catch (error) {
      lastError = error
      console.warn(`[FIG] Falha no Tenor API (gif): ${error.message}`)
    }
  }

  if (urls.length === 0) {
    const fallback = await requestGiphy(normalized, fetchLimit).catch((error) => {
      lastError = error
      console.warn(`[FIG] Falha no fallback GIPHY: ${error.message}`)
      return []
    })
    urls = uniqueUrls(fallback)
  }

  if (urls.length === 0 && lastError) {
    throw lastError
  }

  if (urls.length > 0) {
    apiCache.set(key, urls, TENOR_CACHE_TTL_SECONDS)
  }

  return shuffle(urls).slice(0, safeLimit)
}

async function convertToWebpInternal(inputUrlOrBuffer, options = {}) {
  const downloadTimeoutMs = clampInt(options.downloadTimeoutMs, 5000, 120000, DOWNLOAD_TIMEOUT_MS)
  const ffmpegTimeoutMs = clampInt(
    options.timeoutMs || options.ffmpegTimeoutMs,
    5000,
    120000,
    CONVERT_TIMEOUT_MS
  )
  const maxDownloadBytes = clampInt(options.maxDownloadBytes, 1024 * 1024, 64 * 1024 * 1024, MAX_DOWNLOAD_BYTES)
  const maxOutputBytes = clampInt(
    options.maxOutputBytes,
    100 * 1024,
    2 * 1024 * 1024,
    DEFAULT_OUTPUT_LIMIT_BYTES
  )
  const trimSeconds = clampInt(options.trimSeconds, 2, 12, DEFAULT_TRIM_SECONDS)

  const cleanupPaths = []

  try {
    let inputPath = ''

    if (Buffer.isBuffer(inputUrlOrBuffer)) {
      inputPath = buildTempPath('fig-src', '.bin')
      fs.writeFileSync(inputPath, inputUrlOrBuffer)
      cleanupPaths.push(inputPath)
      console.log(`[FIG] Buffer recebido para conversao: ${(inputUrlOrBuffer.length / 1024).toFixed(1)}KB`)
    } else if (/^https?:\/\//i.test(String(inputUrlOrBuffer || '').trim())) {
      const downloaded = await downloadToTempFile(String(inputUrlOrBuffer), {
        timeoutMs: downloadTimeoutMs,
        maxBytes: maxDownloadBytes
      })
      inputPath = downloaded.path
      cleanupPaths.push(inputPath)
    } else {
      throw new Error('Entrada invalida para toStickerWebp')
    }

    const attempts = [
      { fps: 15, scale: 512, q: 55, compression: 4, maxBytes: maxOutputBytes },
      { fps: 12, scale: 448, q: 45, compression: 4, maxBytes: Math.floor(maxOutputBytes * 0.95) },
      { fps: 10, scale: 384, q: 35, compression: 3, maxBytes: Math.floor(maxOutputBytes * 0.9) },
      { fps: 8, scale: 320, q: 30, compression: 2, maxBytes: Math.floor(maxOutputBytes * 0.85) }
    ]

    let bestBuffer = null
    let bestSize = Number.POSITIVE_INFINITY
    let lastError = null

    for (let i = 0; i < attempts.length; i += 1) {
      const preset = attempts[i]
      const outPath = buildTempPath('fig-out', '.webp')
      cleanupPaths.push(outPath)

      const vf = [
        `fps=${preset.fps}`,
        `scale=${preset.scale}:${preset.scale}:force_original_aspect_ratio=decrease:flags=lanczos`,
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'format=rgba'
      ].join(',')

      console.log(
        `[FIG] Otimizando tentativa ${i + 1}/${attempts.length} fps=${preset.fps} scale=${preset.scale} c=${preset.compression}`
      )

      try {
        await runFfmpeg(
          [
            '-y',
            '-t',
            String(trimSeconds),
            '-i',
            inputPath,
            '-vf',
            vf,
            '-an',
            '-vsync',
            '0',
            '-vcodec',
            'libwebp',
            '-loop',
            '0',
            '-preset',
            'default',
            '-compression_level',
            String(preset.compression),
            '-q:v',
            String(preset.q),
            outPath
          ],
          {
            timeoutMs: ffmpegTimeoutMs,
            queueWaitTimeoutMs: Math.max(ffmpegTimeoutMs, 45000)
          }
        )
      } catch (error) {
        lastError = error
        console.warn(`[FIG] Falha na conversao tentativa ${i + 1}: ${error.message}`)
        continue
      }

      if (!fs.existsSync(outPath)) continue

      const size = fs.statSync(outPath).size
      const currentBuffer = fs.readFileSync(outPath)
      console.log(`[FIG] Resultado tentativa ${i + 1}: ${(size / 1024).toFixed(1)}KB`)

      if (size < bestSize) {
        bestSize = size
        bestBuffer = currentBuffer
      }

      if (size <= preset.maxBytes) {
        console.log(`[FIG] Conversao aprovada com ${(size / 1024).toFixed(1)}KB`)
        return currentBuffer
      }
    }

    if (bestBuffer && bestSize <= Math.floor(maxOutputBytes * 1.35)) {
      console.log(`[FIG] Conversao final acima do alvo, mas valida: ${(bestSize / 1024).toFixed(1)}KB`)
      return bestBuffer
    }

    if (lastError) throw lastError
    throw new Error('Falha ao converter para figurinha WebP')
  } finally {
    cleanupPaths.forEach(safeUnlink)
  }
}

export function toStickerWebp(inputUrlOrBuffer, options = {}) {
  return queueConversion(() => convertToWebpInternal(inputUrlOrBuffer, options))
}

export default {
  searchTenor,
  toStickerWebp
}

