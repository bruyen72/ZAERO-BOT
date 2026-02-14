import { fetchMediaSafe, fetchNsfwMedia, resolveNsfwVideo } from '../../lib/mediaFetcher.js'
import { promises as fs } from 'fs'
import {
  COMPRESS_THRESHOLD,
  MAX_DOWNLOAD_VIDEO_BYTES,
  MAX_WA_VIDEO_BYTES,
  downloadVideoBuffer,
  transcodeForWhatsapp,
  getChatRedgifsHistory,
  isValidVideoBuffer,
  normalizeId,
  registerSentRedgifsId,
  withChatNsfwQueue,
} from '../../lib/nsfwShared.js'

const SEARCH_MAX_ATTEMPTS = 4
const FETCH_TIMEOUT_MS = 30000

const MEDIA_MODE_ALIASES = Object.freeze({
  video: 'video',
  v: 'video',
  gif: 'gif',
  g: 'gif',
  both: 'both',
  all: 'both',
  ambos: 'both',
  todos: 'both',
})

function isRedgifsUrl(value = '') {
  return /https?:\/\/(?:www\.)?(?:redgifs\.com|media\.redgifs\.com)\//i.test(String(value))
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isLikelyRedgifsId(value = '') {
  const normalized = normalizeText(value)
  return /^[a-z0-9]{12,64}$/.test(normalized)
}

function parseSearchInput(rawInput = '') {
  const chunks = String(rawInput || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  let mode = 'video'
  let tags = ''
  const queryParts = []

  for (let index = 0; index < chunks.length; index += 1) {
    const value = chunks[index]
    const normalized = normalizeText(value)

    if (index === 0 && MEDIA_MODE_ALIASES[normalized]) {
      mode = MEDIA_MODE_ALIASES[normalized]
      continue
    }

    if (normalized.startsWith('tags:') || normalized.startsWith('tag:') || normalized.startsWith('tags=')) {
      const explicitTags = value.replace(/^[^:=]+[:=]/i, '').trim()
      if (explicitTags) tags = explicitTags
      continue
    }

    queryParts.push(value)
  }

  let query = queryParts.join(' ').trim()
  if (!query && tags) {
    query = tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(' ')
  }

  return { mode, tags, query }
}

function allowedMediaTypesForMode(mode = 'video') {
  if (mode === 'gif') return ['gif', 'video']
  if (mode === 'both') return ['video', 'gif']
  return ['video']
}

function preferredMediaTypeForMode(mode = 'video') {
  if (mode === 'gif') return 'gif'
  return 'video'
}

function buildDownloadHeaders(pageUrl = '') {
  try {
    const parsed = new URL(String(pageUrl || ''))
    return {
      Referer: parsed.href,
      Origin: parsed.origin,
    }
  } catch {
    return {}
  }
}

function pickBestCandidate(candidates = [], preferredMediaType = 'video') {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  if (preferredMediaType === 'gif') {
    return (
      candidates.find((item) => item.mediaType === 'gif' && item.url.includes('.gif')) ||
      candidates.find((item) => item.mediaType === 'gif') ||
      candidates.find((item) => item.mediaType === 'video' && item.url.includes('hd.mp4')) ||
      candidates.find((item) => item.mediaType === 'video' && item.url.includes('.mp4') && !item.url.includes('silent')) ||
      candidates.find((item) => item.mediaType === 'video') ||
      null
    )
  }

  return (
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('hd.mp4')) ||
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('.mp4') && !item.url.includes('silent')) ||
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('.mp4')) ||
    candidates.find((item) => item.mediaType === 'gif') ||
    candidates.find((item) => item.mediaType === 'video') ||
    null
  )
}

function humanDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0))
  if (!total) return 'desconhecida'
  const mins = Math.floor(total / 60)
  const secs = Math.round(total % 60)
  if (mins <= 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function cleanText(value = '', fallback = 'Sem titulo') {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function isTimeoutLike(error) {
  const code = String(error?.code || '')
  if (code === 'FFMPEG_TIMEOUT' || code === 'FFMPEG_QUEUE_TIMEOUT' || code === 'BENCH_TIMEOUT') return true
  return /timeout/i.test(String(error?.message || ''))
}

function ensureChatData(chatId) {
  if (!globalThis.db?.data) return {}
  if (!globalThis.db.data.chats) globalThis.db.data.chats = {}
  if (!globalThis.db.data.chats[chatId]) globalThis.db.data.chats[chatId] = {}
  return globalThis.db.data.chats[chatId]
}

function buildCaption(media = {}, sourceLabel = 'RedGifs') {
  return (
    `*ZÆRØ BOT — ADULTO (18+)*\n\n` +
    `Título: ${cleanText(media.title)}\n\n` +
    `⚠️ *AVISO:* O conteúdo 18+ é de sua total responsabilidade. O bot não se responsabiliza pelo uso das mídias. Você é um adulto, use com consciência.`
  )
}

function pickTranscodeOptions(sizeBytes = 0, aggressive = false) {
  const sizeMb = sizeBytes / 1024 / 1024
  if (aggressive || sizeMb > 40) {
    return {
      preset: 'ultrafast',
      crf: 30,
      maxBitrate: 450,
      scale: '640:-2',
      timeoutMs: 180000,
      limitSeconds: 12,
    }
  }

  if (sizeBytes > COMPRESS_THRESHOLD) {
    return {
      preset: 'veryfast',
      crf: 27,
      maxBitrate: 800,
      scale: '720:-2',
      timeoutMs: 150000,
      limitSeconds: 15,
    }
  }

  return {
    preset: 'fast',
    crf: 24,
    maxBitrate: 1000,
    timeoutMs: 120000,
    limitSeconds: 15,
  }
}

async function normalizeForWhatsapp(videoBuffer, logLabel = 'redgifs') {
  const originalMb = videoBuffer.length / 1024 / 1024
  console.log(`[RedGifs] ${logLabel}: tamanho original ${originalMb.toFixed(2)}MB`)

  let normalized = await transcodeForWhatsapp(videoBuffer, pickTranscodeOptions(videoBuffer.length, false))

  if (normalized.length > MAX_WA_VIDEO_BYTES) {
    const largeMb = normalized.length / 1024 / 1024
    console.warn(`[RedGifs] ${logLabel}: ainda grande (${largeMb.toFixed(2)}MB), tentando compressao agressiva...`)
    normalized = await transcodeForWhatsapp(normalized, pickTranscodeOptions(normalized.length, true))
  }

  if (normalized.length > MAX_WA_VIDEO_BYTES) {
    const finalMb = normalized.length / 1024 / 1024
    throw new Error(`Video ainda acima do limite apos compressao (${finalMb.toFixed(2)}MB)`)
  }

  const finalMb = normalized.length / 1024 / 1024
  console.log(`[RedGifs] ${logLabel}: tamanho final ${finalMb.toFixed(2)}MB`)
  return normalized
}

async function sendTranscodedBuffer(client, m, videoBuffer, caption) {
  await client.sendMessage(
    m.chat,
    {
      video: videoBuffer,
      caption,
      gifPlayback: true,
      mimetype: 'video/mp4',
      ptv: false,
    },
    { quoted: m },
  )
  return true
}

async function sendByUrl(client, m, url, caption, logLabel = 'redgifs-url', headers = {}) {
  if (!url) return false

  const downloaded = await downloadVideoBuffer(url, {
    timeoutMs: 45000,
    maxBytes: MAX_DOWNLOAD_VIDEO_BYTES,
    headers,
  })

  if (!isValidVideoBuffer(downloaded)) {
    throw new Error('Download retornou buffer de video invalido')
  }

  try {
    const normalized = await normalizeForWhatsapp(downloaded, logLabel)
    return sendTranscodedBuffer(client, m, normalized, caption)
  } catch (error) {
    if (downloaded.length <= MAX_WA_VIDEO_BYTES && isTimeoutLike(error)) {
      console.warn(`[RedGifs] ${logLabel}: timeout no reencode, enviando buffer original como fallback rapido.`)
      return sendTranscodedBuffer(client, m, downloaded, caption)
    }
    throw error
  }
}

async function readOptimizedFileBuffer(mediaResult, logLabel = 'redgifs') {
  const filePath = String(mediaResult?.file || '').trim()
  if (!filePath) return null

  try {
    const fromFile = await fs.readFile(filePath)
    if (!isValidVideoBuffer(fromFile)) return null
    console.log(`[RedGifs] ${logLabel}: usando arquivo otimizado em cache (${(fromFile.length / 1024 / 1024).toFixed(2)}MB)`)
    return fromFile
  } catch (error) {
    console.warn(`[RedGifs] ${logLabel}: falha ao ler arquivo otimizado (${error.message})`)
    return null
  }
}

async function sendResultProcessed(client, m, mediaResult, caption, logLabel = 'redgifs') {
  const fallbackUrl = mediaResult?.url || null
  const fallbackHeaders = buildDownloadHeaders(mediaResult?.pageUrl || '')
  let videoBuffer = Buffer.isBuffer(mediaResult?.buffer) ? mediaResult.buffer : null

  if ((!videoBuffer || videoBuffer.length === 0) && mediaResult?.optimized === true) {
    videoBuffer = await readOptimizedFileBuffer(mediaResult, `${logLabel}:file`)
  }

  if (
    mediaResult?.optimized === true &&
    Buffer.isBuffer(videoBuffer) &&
    videoBuffer.length > 0 &&
    videoBuffer.length <= MAX_WA_VIDEO_BYTES &&
    isValidVideoBuffer(videoBuffer)
  ) {
    try {
      return await sendTranscodedBuffer(client, m, videoBuffer, caption)
    } catch (error) {
      console.error(`[RedGifs] ${logLabel}: envio direto do arquivo otimizado falhou (${error.message})`)
      if (!fallbackUrl) throw error
    }
  }

  if (!videoBuffer || videoBuffer.length === 0) {
    if (!fallbackUrl) throw new Error('Sem buffer e sem URL para download')
    return sendByUrl(client, m, fallbackUrl, caption, `${logLabel}:download`, fallbackHeaders)
  }

  if (!isValidVideoBuffer(videoBuffer)) {
    console.warn(`[RedGifs] ${logLabel}: buffer invalido, tentando baixar pela URL...`)
    if (!fallbackUrl) throw new Error('Buffer invalido e sem URL para recuperar')
    return sendByUrl(client, m, fallbackUrl, caption, `${logLabel}:recover`, fallbackHeaders)
  }

  let normalized = null
  try {
    normalized = await normalizeForWhatsapp(videoBuffer, logLabel)
  } catch (error) {
    console.error(`[RedGifs] ${logLabel}: falha ao normalizar buffer local (${error.message})`)
    if (videoBuffer.length <= MAX_WA_VIDEO_BYTES && isTimeoutLike(error)) {
      console.warn(`[RedGifs] ${logLabel}: fallback rapido com buffer local sem reencode.`)
      normalized = videoBuffer
    } else {
      if (!fallbackUrl) throw error
      return sendByUrl(client, m, fallbackUrl, caption, `${logLabel}:fallback`, fallbackHeaders)
    }
  }

  try {
    await sendTranscodedBuffer(client, m, normalized, caption)
    return true
  } catch (error) {
    console.error(`[RedGifs] ${logLabel}: envio por buffer falhou (${error.message})`)
    if (!fallbackUrl) throw error
    return sendByUrl(client, m, fallbackUrl, caption, `${logLabel}:resend`, fallbackHeaders)
  }
}

async function resolveDirectInput(input, options = {}) {
  const parsed = await resolveNsfwVideo(input)
  const best = pickBestCandidate(parsed?.candidates || [], options.preferredMediaType || 'video')

  if (!best?.url) {
    throw new Error('Nao encontrei midia animada neste link.')
  }

  const mediaBuffer = await fetchMediaSafe(best.url, {
    validateFirst: true,
    timeout: FETCH_TIMEOUT_MS,
    retries: 2,
    headers: best.headers || {},
    logPrefix: '[RedGifs]',
  })

  return {
    id: normalizeId(parsed?.id || ''),
    title: parsed?.title || 'RedGifs',
    duration: parsed?.duration || null,
    pageUrl: parsed?.pageUrl || input,
    url: best.url,
    buffer: mediaBuffer || null,
  }
}

async function fetchUniqueSearchResult(query, excludeIds = [], options = {}) {
  return fetchNsfwMedia(query, null, {
    allowedMediaTypes: options.allowedMediaTypes || ['video'],
    source: 'redgifs',
    allowStaticFallback: false,
    uniqueIds: true,
    excludeIds,
    maxPages: 3,
    perPage: 40,
    nicheOverride: options.nicheOverride || query,
    strictQuery: true,
    redgifsTags: options.tags || '',
    directIdHint: options.directIdHint || '',
    preferredMediaType: options.preferredMediaType || 'video',
    optimizeVideos: true,
    optimizeMaxSourceBytes: 100 * 1024 * 1024,
  })
}

export default {
  command: ['redgifs', 'redgif', 'rgifs', 'redgifts', 'red'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (m.isGroup && !globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply(`O conteudo *NSFW* esta desabilitado neste grupo.\n\nUm *administrador* pode habilitar com:\n>> *${usedPrefix}nsfw on*`)
    }

    const input = args.join(' ').trim()
    if (!input) {
      return m.reply(
        `Use assim:\n` +
          `- *${usedPrefix + command} <termo>*\n` +
          `- *${usedPrefix + command} <video|gif|both> <termo>*\n` +
          `- *${usedPrefix + command} tags:<tag1,tag2> <termo opcional>*\n` +
          `- *${usedPrefix + command} <url do redgifs>*\n\n` +
          `Exemplos:\n` +
          `*${usedPrefix + command} ass*\n` +
          `*${usedPrefix + command} gif ass*\n` +
          `*${usedPrefix + command} tags:big-ass,pawg ass*`,
      )
    }

    const parsedInput = parseSearchInput(input)
    if (!parsedInput.query) {
      return m.reply(`Informe um termo ou URL.\nExemplo: *${usedPrefix + command} ass*`)
    }
    const allowedMediaTypes = allowedMediaTypesForMode(parsedInput.mode)
    const preferredMediaType = preferredMediaTypeForMode(parsedInput.mode)
    const queryInput = parsedInput.query
    const directIdHint = isLikelyRedgifsId(queryInput) ? queryInput : ''

    const chatData = ensureChatData(m.chat)
    const history = getChatRedgifsHistory(chatData)
    const attemptedIds = new Set(history.map((item) => normalizeId(item)).filter(Boolean))

    try {
      await m.react('\u23F3')

      if (isRedgifsUrl(queryInput)) {
        await withChatNsfwQueue(m.chat, async () => {
          const mediaResult = await resolveDirectInput(queryInput, { preferredMediaType })
          const caption = buildCaption(mediaResult, mediaResult.pageUrl || queryInput)
          const sent = await sendResultProcessed(client, m, mediaResult, caption, command)

          if (!sent) {
            await m.react('\u274C')
            return m.reply('Erro ao enviar esta midia. Tente outro link.')
          }

          if (mediaResult.id) registerSentRedgifsId(chatData, mediaResult.id)
          await m.react('\u2705')
        })
        return
      }

      await withChatNsfwQueue(m.chat, async () => {
        let sent = false

        for (let attempt = 1; attempt <= SEARCH_MAX_ATTEMPTS; attempt += 1) {
          let mediaResult = null
          try {
            mediaResult = await fetchUniqueSearchResult(queryInput, [...attemptedIds], {
              allowedMediaTypes,
              tags: parsedInput.tags,
              directIdHint,
              preferredMediaType,
              nicheOverride: queryInput,
            })
          } catch {
            continue
          }

          if (!mediaResult) break

          const currentId = normalizeId(mediaResult.id || '')
          if (currentId && attemptedIds.has(currentId)) continue
          if (currentId) attemptedIds.add(currentId)

          const caption = buildCaption(mediaResult, mediaResult.pageUrl || mediaResult.url || queryInput)

          try {
            const sentThisAttempt = await sendResultProcessed(client, m, mediaResult, caption, `${command}#${attempt}`)
            if (!sentThisAttempt) continue

            if (currentId) registerSentRedgifsId(chatData, currentId)
            sent = true
            break
          } catch {
            continue
          }
        }

        if (!sent) {
          await m.react('\u274C')
          return m.reply('Nenhuma midia valida encontrada para esse termo no momento.')
        }
        await m.react('\u2705')
      })
    } catch (error) {
      await m.react('\u274C')
      await m.reply(`> Erro ao executar *${usedPrefix + command}*.\n> [Erro: *${error.message}*]`)
    }
  },
}
