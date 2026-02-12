import { fetchMediaSafe, fetchNsfwMedia, resolveNsfwVideo } from '../../lib/mediaFetcher.js'
import {
  COMPRESS_THRESHOLD,
  MAX_WA_VIDEO_BYTES,
  compressVideoBuffer,
  getChatRedgifsHistory,
  isValidVideoBuffer,
  normalizeId,
  registerSentRedgifsId,
} from '../../lib/nsfwShared.js'

const SEARCH_MAX_ATTEMPTS = 8
const FETCH_TIMEOUT_MS = 30000

function isRedgifsUrl(value = '') {
  return /https?:\/\/(?:www\.)?(?:redgifs\.com|media\.redgifs\.com)\//i.test(String(value))
}

function pickBestCandidate(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  return (
    candidates.find((item) => item.mediaType === 'video' && /silent\.mp4|[-_]silent\b/i.test(item.url)) ||
    candidates.find((item) => item.mediaType === 'video') ||
    candidates.find((item) => item.mediaType === 'gif') ||
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
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || fallback
}

function ensureChatData(chatId) {
  if (!globalThis.db?.data) return {}
  if (!globalThis.db.data.chats) globalThis.db.data.chats = {}
  if (!globalThis.db.data.chats[chatId]) globalThis.db.data.chats[chatId] = {}
  return globalThis.db.data.chats[chatId]
}

function buildCaption(media = {}, sourceLabel = 'RedGifs') {
  return (
    `REDGIFS\n\n` +
    `Title: ${cleanText(media.title)}\n` +
    `Duration: ${humanDuration(media.duration)}\n` +
    `Source: ${sourceLabel || media.pageUrl || media.url || 'RedGifs'}`
  )
}

async function sendByUrl(client, m, url, caption) {
  if (!url) return false
  await client.sendMessage(
    m.chat,
    {
      video: { url },
      gifPlayback: true,
      caption,
    },
    { quoted: m },
  )
  return true
}

async function sendResultWithFallback(client, m, mediaResult, caption, logLabel = 'redgifs') {
  const fallbackUrl = mediaResult?.url || null
  let videoBuffer = Buffer.isBuffer(mediaResult?.buffer) ? mediaResult.buffer : null

  if (!videoBuffer || videoBuffer.length === 0) {
    return sendByUrl(client, m, fallbackUrl, caption)
  }

  if (!isValidVideoBuffer(videoBuffer)) {
    console.warn(`[RedGifs] ${logLabel}: buffer invalido, tentando URL...`)
    return sendByUrl(client, m, fallbackUrl, caption)
  }

  if (videoBuffer.length > COMPRESS_THRESHOLD) {
    console.log(
      `[RedGifs] ${logLabel}: comprimindo ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB (> ${(COMPRESS_THRESHOLD / 1024 / 1024).toFixed(0)}MB)`,
    )
    try {
      videoBuffer = await compressVideoBuffer(videoBuffer)
      console.log(`[RedGifs] ${logLabel}: comprimido para ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    } catch (error) {
      console.error(`[RedGifs] ${logLabel}: falha na compressao: ${error.message}`)
    }
  }

  if (videoBuffer.length > MAX_WA_VIDEO_BYTES) {
    console.warn(
      `[RedGifs] ${logLabel}: video ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB > ${(MAX_WA_VIDEO_BYTES / 1024 / 1024).toFixed(0)}MB, tentando URL`,
    )
    return sendByUrl(client, m, fallbackUrl, caption)
  }

  try {
    await client.sendMessage(
      m.chat,
      {
        video: videoBuffer,
        gifPlayback: true,
        caption,
      },
      { quoted: m },
    )
    return true
  } catch (error) {
    console.error(`[RedGifs] ${logLabel}: envio por buffer falhou (${error.message}), tentando URL...`)
    return sendByUrl(client, m, fallbackUrl, caption)
  }
}

async function resolveDirectInput(input) {
  const parsed = await resolveNsfwVideo(input)
  const best = pickBestCandidate(parsed?.candidates || [])

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

async function fetchUniqueSearchResult(query, excludeIds = []) {
  return fetchNsfwMedia(query, null, {
    allowedMediaTypes: ['video', 'gif'],
    source: 'redgifs',
    allowStaticFallback: false,
    uniqueIds: true,
    excludeIds,
    maxPages: 10,
    perPage: 40,
    nicheOverride: query,
  })
}

export default {
  command: ['redgifs', 'redgif', 'rgifs', 'redgifts'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply(
        `O conteudo *NSFW* esta desabilitado neste grupo.\n\n` +
          `Um *administrador* pode habilitar com:\n» *${usedPrefix}nsfw on*`,
      )
    }

    const input = args.join(' ').trim()
    if (!input) {
      return m.reply(
        `Use assim:\n` +
          `- *${usedPrefix + command} <termo>*\n` +
          `- *${usedPrefix + command} <url do redgifs>*\n\n` +
          `Exemplo: *${usedPrefix + command} blowjob*`,
      )
    }

    const chatData = ensureChatData(m.chat)
    const history = getChatRedgifsHistory(chatData)
    const attemptedIds = new Set(history.map((item) => normalizeId(item)).filter(Boolean))

    try {
      await m.react('⏳')

      if (isRedgifsUrl(input)) {
        const mediaResult = await resolveDirectInput(input)
        const caption = buildCaption(mediaResult, mediaResult.pageUrl || input)
        const sent = await sendResultWithFallback(client, m, mediaResult, caption, command)

        if (!sent) {
          await m.react('❌')
          return m.reply('Erro ao enviar esta midia. Tente outro link.')
        }

        if (mediaResult.id) {
          registerSentRedgifsId(chatData, mediaResult.id)
        }

        await m.react('✅')
        return
      }

      let sent = false
      let lastError = null

      for (let attempt = 1; attempt <= SEARCH_MAX_ATTEMPTS; attempt += 1) {
        let mediaResult = null
        try {
          mediaResult = await fetchUniqueSearchResult(input, [...attemptedIds])
        } catch (error) {
          lastError = error
          console.error(`[RedGifs] tentativa ${attempt}: falha ao buscar: ${error.message}`)
          continue
        }

        if (!mediaResult) break

        const currentId = normalizeId(mediaResult.id || '')
        if (currentId && attemptedIds.has(currentId)) {
          console.warn(`[RedGifs] tentativa ${attempt}: ID repetido ${currentId}, buscando outro...`)
          continue
        }
        if (currentId) {
          attemptedIds.add(currentId)
        }

        const sourceLabel = mediaResult.pageUrl || mediaResult.url || input
        const caption = buildCaption(mediaResult, sourceLabel)

        try {
          const sentThisAttempt = await sendResultWithFallback(client, m, mediaResult, caption, `${command}#${attempt}`)
          if (!sentThisAttempt) {
            console.warn(`[RedGifs] tentativa ${attempt}: buffer e URL falharam, tentando proximo resultado...`)
            continue
          }

          if (currentId) {
            registerSentRedgifsId(chatData, currentId)
          }

          sent = true
          break
        } catch (error) {
          lastError = error
          console.error(`[RedGifs] tentativa ${attempt}: erro no envio: ${error.message}`)
        }
      }

      if (!sent) {
        await m.react('❌')
        const suffix = lastError ? `\nDetalhe: ${lastError.message}` : ''
        return m.reply(`Nenhuma midia valida encontrada para esse termo no momento.${suffix}`)
      }

      await m.react('✅')
    } catch (error) {
      await m.react('❌')
      await m.reply(
        `> Erro ao executar *${usedPrefix + command}*.\n` +
          `> [Erro: *${error.message}*]`,
      )
    }
  },
}
