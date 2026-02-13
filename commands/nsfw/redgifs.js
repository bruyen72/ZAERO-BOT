import { fetchMediaSafe, fetchNsfwMedia, resolveNsfwVideo } from '../../lib/mediaFetcher.js'
import {
  COMPRESS_THRESHOLD,
  MAX_WA_VIDEO_BYTES,
  transcodeForWhatsapp,
  getChatRedgifsHistory,
  isValidVideoBuffer,
  normalizeId,
  registerSentRedgifsId,
  withChatNsfwQueue,
} from '../../lib/nsfwShared.js'

const SEARCH_MAX_ATTEMPTS = 4
const FETCH_TIMEOUT_MS = 30000

function isRedgifsUrl(value = '') {
  return /https?:\/\/(?:www\.)?(?:redgifs\.com|media\.redgifs\.com)\//i.test(String(value))
}

function pickBestCandidate(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  // Prioriza MP4 HD para melhor base de conversão
  return (
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('hd.mp4')) ||
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('.mp4') && !item.url.includes('silent')) ||
    candidates.find((item) => item.mediaType === 'video' && item.url.includes('.mp4')) ||
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

function cleanText(value = '', fallback = 'Sem título') {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
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
    `🔞 *REDGIFS PRO* 🔞\n\n` +
    `🎬 *Título:* ${cleanText(media.title)}\n` +
    `⏱️ *Duração:* ${humanDuration(media.duration)}\n` +
    `🔗 *Fonte:* ${sourceLabel || 'RedGifs'}\n\n` +
    `> _Vídeo otimizado para Mobile (2026)_`
  )
}

async function sendByUrl(client, m, url, caption) {
  if (!url) return false
  // Nota: Enviar por URL pode causar tela cinza se o RedGifs não estiver em formato compatível.
  // Mas serve como último recurso (fallback).
  await client.sendMessage(m.chat, { video: { url }, caption }, { quoted: m })
  return true
}

/**
 * Processa e envia o resultado garantindo compatibilidade mobile.
 */
async function sendResultProcessed(client, m, mediaResult, caption, logLabel = 'redgifs') {
  const fallbackUrl = mediaResult?.url || null
  let videoBuffer = Buffer.isBuffer(mediaResult?.buffer) ? mediaResult.buffer : null

  // Se não tem buffer, tenta enviar direto por URL
  if (!videoBuffer || videoBuffer.length === 0) {
    return sendByUrl(client, m, fallbackUrl, caption)
  }

  // Validação básica do buffer
  if (!isValidVideoBuffer(videoBuffer)) {
    console.warn(`[RedGifs] ${logLabel}: buffer inválido, tentando URL...`)
    return sendByUrl(client, m, fallbackUrl, caption)
  }

  // SEMPRE Transcodifica para garantir compatibilidade Mobile (H.264 Baseline, YUV420P)
  // Isso resolve o problema da tela cinza.
  console.log(`[RedGifs] ${logLabel}: Normalizando vídeo para compatibilidade mobile...`)
  try {
    // Se for muito grande (>18MB), o FFmpeg pode demorar demais ou estourar RAM
    if (videoBuffer.length > 20 * 1024 * 1024) {
      console.warn(`[RedGifs] Video muito grande (${(videoBuffer.length/1024/1024).toFixed(1)}MB), enviando URL direto.`)
      return sendByUrl(client, m, fallbackUrl, caption)
    }

    videoBuffer = await transcodeForWhatsapp(videoBuffer)
    console.log(`[RedGifs] ${logLabel}: Transcodificação concluída. Tamanho final: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`)
  } catch (error) {
    console.error(`[RedGifs] ${logLabel}: falha na transcodificação: ${error.message}`)
    // Se falhar a transcodificação (ex: timeout), tenta enviar o buffer original se for pequeno,
    // ou vai para o fallback de URL.
    if (videoBuffer.length > MAX_WA_VIDEO_BYTES) {
      return sendByUrl(client, m, fallbackUrl, caption)
    }
  }

  try {
    await client.sendMessage(m.chat, { video: videoBuffer, caption }, { quoted: m })
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
    throw new Error('Não encontrei mídia animada neste link.')
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
    maxPages: 3,
    perPage: 40,
    nicheOverride: query,
    strictQuery: true,
  })
}

export default {
  command: ['redgifs', 'redgif', 'rgifs', 'redgifts'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply(`O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitar com:\n» *${usedPrefix}nsfw on*`)
    }

    const input = args.join(' ').trim()
    if (!input) {
      return m.reply(`Use assim:\n- *${usedPrefix + command} <termo>*\n- *${usedPrefix + command} <url do redgifs>*\n\nExemplo: *${usedPrefix + command} blowjob*`)
    }

    const chatData = ensureChatData(m.chat)
    const history = getChatRedgifsHistory(chatData)
    const attemptedIds = new Set(history.map((item) => normalizeId(item)).filter(Boolean))

    try {
      await m.react('⏳')

      if (isRedgifsUrl(input)) {
        await withChatNsfwQueue(m.chat, async () => {
          const mediaResult = await resolveDirectInput(input)
          const caption = buildCaption(mediaResult, mediaResult.pageUrl || input)
          const sent = await sendResultProcessed(client, m, mediaResult, caption, command)

          if (!sent) {
            await m.react('❌')
            return m.reply('Erro ao enviar esta mídia. Tente outro link.')
          }

          if (mediaResult.id) registerSentRedgifsId(chatData, mediaResult.id)
          await m.react('✅')
        })
        return
      }

      await withChatNsfwQueue(m.chat, async () => {
        let sent = false
        let lastError = null

        for (let attempt = 1; attempt <= SEARCH_MAX_ATTEMPTS; attempt += 1) {
          let mediaResult = null
          try {
            mediaResult = await fetchUniqueSearchResult(input, [...attemptedIds])
          } catch (error) {
            lastError = error
            continue
          }

          if (!mediaResult) break

          const currentId = normalizeId(mediaResult.id || '')
          if (currentId && attemptedIds.has(currentId)) continue
          if (currentId) attemptedIds.add(currentId)

          const caption = buildCaption(mediaResult, mediaResult.pageUrl || mediaResult.url || input)

          try {
            const sentThisAttempt = await sendResultProcessed(client, m, mediaResult, caption, `${command}#${attempt}`)
            if (!sentThisAttempt) continue

            if (currentId) registerSentRedgifsId(chatData, currentId)
            sent = true
            break
          } catch (error) {
            lastError = error
          }
        }

        if (!sent) {
          await m.react('❌')
          return m.reply(`Nenhuma mídia válida encontrada para esse termo no momento.`)
        }
        await m.react('✅')
      })
    } catch (error) {
      await m.react('❌')
      await m.reply(`> Erro ao executar *${usedPrefix + command}*.\n> [Erro: *${error.message}*]`)
    }
  },
}
