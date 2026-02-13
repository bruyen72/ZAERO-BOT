import { fetchJsonWithTimeout, fetchWithTimeout } from '../../lib/fetchWithTimeout.js'

const INSTAGRAM_HOST_REGEX = /(^|\.)instagram\.com$/i
const MAX_CAROUSEL_ITEMS = 5

export default {
  command: ['instagram', 'ig'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    const rawInput = args.join(' ').trim()
    if (!rawInput) {
      return m.reply(`《✧》 Envie um link do Instagram.\nExemplo: ${usedPrefix}${command} https://www.instagram.com/reel/...`)
    }

    try {
      const normalized = await normalizeInstagramUrl(rawInput)
      if (!normalized) {
        return m.reply('《✧》 Link invalido. Use um link publico do Instagram (p, reel ou tv).')
      }

      const mediaPayload = await getInstagramMedia(normalized.url, normalized.type)
      if (!mediaPayload || !Array.isArray(mediaPayload.mediaUrls) || !mediaPayload.mediaUrls.length) {
        return m.reply('Nao consegui baixar, link privado ou bloqueado.')
      }

      const caption = buildCaption(mediaPayload, normalized.type)
      const sent = await sendInstagramMedia(client, m, mediaPayload, caption)
      if (sent) return

      const links = mediaPayload.mediaUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n')
      await m.reply(`${caption}\n\nNao consegui enviar a midia diretamente.\nLinks:\n${links}`)
    } catch (error) {
      await m.reply('Nao consegui baixar, link privado ou bloqueado.')
    }
  }
}

async function normalizeInstagramUrl(input) {
  const extracted = extractFirstUrl(input)
  if (!extracted) return null

  let candidate = extracted
    .replace(/^<|>$/g, '')
    .replace(/[),.;!?]+$/g, '')
    .trim()

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  let urlObj
  try {
    urlObj = new URL(candidate)
  } catch {
    return null
  }

  if (urlObj.hostname.toLowerCase() === 'l.instagram.com') {
    const wrappedUrl = urlObj.searchParams.get('u')
    if (!wrappedUrl) return null
    try {
      urlObj = new URL(decodeURIComponent(wrappedUrl))
    } catch {
      return null
    }
  }

  if (!isInstagramHost(urlObj.hostname)) return null

  let parsedPath = parseInstagramPath(urlObj.pathname)
  if (!parsedPath) {
    const resolved = await resolveInstagramRedirect(urlObj.toString())
    if (resolved) {
      try {
        const resolvedObj = new URL(resolved)
        if (isInstagramHost(resolvedObj.hostname)) {
          urlObj = resolvedObj
          parsedPath = parseInstagramPath(urlObj.pathname)
        }
      } catch {
        return null
      }
    }
  }

  if (!parsedPath) return null

  return {
    type: parsedPath.type,
    id: parsedPath.id,
    url: `https://www.instagram.com/${parsedPath.type}/${parsedPath.id}/`
  }
}

function parseInstagramPath(pathname) {
  const normalizedPath = String(pathname || '').replace(/\/+/g, '/')

  const shareMatch = normalizedPath.match(/^\/share\/(reel|p|tv)\/([^/?#]+)/i)
  if (shareMatch) {
    return {
      type: shareMatch[1].toLowerCase(),
      id: shareMatch[2]
    }
  }

  const directMatch = normalizedPath.match(/^\/(reels?|p|tv)\/([^/?#]+)/i)
  if (!directMatch) return null

  const rawType = directMatch[1].toLowerCase()
  return {
    type: rawType === 'reels' ? 'reel' : rawType,
    id: directMatch[2]
  }
}

async function resolveInstagramRedirect(url) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      8000,
      0
    )
    return response?.url || url
  } catch {
    return url
  }
}

function extractFirstUrl(text) {
  const input = String(text || '').trim()
  if (!input) return null

  const explicitUrl = input.match(/https?:\/\/[^\s<>"']+/i)
  if (explicitUrl) return explicitUrl[0]

  const instagramUrl = input.match(/(?:www\.|m\.)?instagram\.com\/[^\s<>"']+/i)
  if (instagramUrl) return `https://${instagramUrl[0]}`

  const shortInstagram = input.match(/(?:www\.)?instagr\.am\/[^\s<>"']+/i)
  if (shortInstagram) return `https://${shortInstagram[0]}`

  return null
}

function isInstagramHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return INSTAGRAM_HOST_REGEX.test(host) || host === 'instagr.am' || host === 'www.instagr.am'
}

async function getInstagramMedia(url, postType) {
  const endpoints = buildApiEndpoints(url)

  for (const endpoint of endpoints) {
    try {
      const response = await fetchJsonWithTimeout(endpoint, {}, 10000, 1)
      const extracted = extractMediaFromResponse(response, postType)
      if (extracted?.mediaUrls?.length) return extracted
    } catch {
      // Tenta o proximo endpoint
    }

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return null
}

function buildApiEndpoints(url) {
  const encoded = encodeURIComponent(url)
  const endpoints = []

  const stellar = global?.APIs?.stellar
  if (stellar?.url && stellar?.key) {
    endpoints.push(`${stellar.url}/dl/instagram?url=${encoded}&key=${stellar.key}`)
    endpoints.push(`${stellar.url}/dl/instagramv2?url=${encoded}&key=${stellar.key}`)
  }

  const nekolabs = global?.APIs?.nekolabs
  if (nekolabs?.url) {
    endpoints.push(`${nekolabs.url}/downloader/instagram?url=${encoded}`)
  }

  const delirius = global?.APIs?.delirius
  if (delirius?.url) {
    endpoints.push(`${delirius.url}/download/instagram?url=${encoded}`)
  }

  const ootaizumi = global?.APIs?.ootaizumi
  if (ootaizumi?.url) {
    endpoints.push(`${ootaizumi.url}/downloader/instagram/v2?url=${encoded}`)
    endpoints.push(`${ootaizumi.url}/downloader/instagram/v1?url=${encoded}`)
  }

  return endpoints
}

function extractMediaFromResponse(response, postType) {
  if (!response || typeof response !== 'object') return null

  const mediaCandidates = []
  collectMediaCandidates(response, mediaCandidates)

  const uniqueMedia = dedupeMedia(mediaCandidates)
  if (!uniqueMedia.length) return null

  const selectedMedia = selectBestMedia(uniqueMedia, postType)
  const selectedType = resolvePayloadType(selectedMedia, postType)
  const metadata = extractMetadata(response)

  return {
    ...metadata,
    type: selectedType,
    media: selectedMedia,
    mediaUrls: selectedMedia.map(item => item.url),
    format: inferFormat(selectedType, selectedMedia)
  }
}

function collectMediaCandidates(node, output, depth = 0, parentKey = '', inheritedHint = null) {
  if (depth > 6 || node == null) return

  if (typeof node === 'string') {
    pushMediaCandidate(output, node, inheritedHint, parentKey)
    return
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectMediaCandidates(item, output, depth + 1, parentKey, inheritedHint)
    }
    return
  }

  if (typeof node !== 'object') return

  const objectHint = resolveKindFromObject(node) || inheritedHint
  for (const [key, value] of Object.entries(node)) {
    const keyName = String(key).toLowerCase()

    if (typeof value === 'string') {
      pushMediaCandidate(output, value, objectHint || resolveKindFromKey(keyName), keyName)
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          pushMediaCandidate(output, item, objectHint || resolveKindFromKey(keyName), keyName)
        } else {
          collectMediaCandidates(item, output, depth + 1, keyName, objectHint || resolveKindFromKey(keyName))
        }
      }
      continue
    }

    if (typeof value === 'object' && value !== null) {
      collectMediaCandidates(value, output, depth + 1, keyName, objectHint || resolveKindFromKey(keyName))
    }
  }
}

function pushMediaCandidate(output, rawUrl, kindHint = null, keyName = '') {
  const url = normalizeMediaUrl(rawUrl)
  if (!url) return
  if (isInstagramPageUrl(url)) return

  const resolvedKind =
    normalizeKind(kindHint) ||
    resolveKindFromKey(keyName) ||
    inferKindFromUrl(url) ||
    (isGenericMediaKey(keyName) ? 'image' : null)

  if (!resolvedKind) return
  if (isIgnoredKey(keyName) && resolvedKind !== 'video') return

  output.push({ url, kind: resolvedKind })
}

function normalizeMediaUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return null

  let url = rawUrl.trim()
  if (!url) return null

  url = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/')
  if (url.startsWith('//')) {
    url = `https:${url}`
  }
  if (!/^https?:\/\//i.test(url)) return null

  try {
    return new URL(url).toString()
  } catch {
    return null
  }
}

function dedupeMedia(mediaList) {
  const map = new Map()
  for (const media of mediaList) {
    const key = buildMediaKey(media.url)
    if (!key) continue

    if (!map.has(key)) {
      map.set(key, media)
      continue
    }

    const existing = map.get(key)
    if (existing.kind !== 'video' && media.kind === 'video') {
      map.set(key, media)
    }
  }
  return Array.from(map.values())
}

function buildMediaKey(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname}`
  } catch {
    return null
  }
}

function selectBestMedia(mediaList, postType) {
  const videos = mediaList.filter(item => item.kind === 'video')
  const images = mediaList.filter(item => item.kind !== 'video')

  if (postType === 'reel' || postType === 'tv') {
    if (videos.length) return [videos[0]]

    if (mediaList.length) {
      const forced = { ...mediaList[0] }
      if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(forced.url)) {
        forced.kind = 'video'
      }
      return [forced]
    }
  }

  if (mediaList.length === 1) return [mediaList[0]]

  if (videos.length === 1 && images.length <= 1) {
    return [videos[0]]
  }

  return mediaList
}

function resolvePayloadType(selectedMedia, postType) {
  if (!selectedMedia.length) return 'image'

  if (selectedMedia.length > 1) return 'carousel'
  if (postType === 'reel' || postType === 'tv') return 'video'
  return selectedMedia[0].kind === 'video' ? 'video' : 'image'
}

async function sendInstagramMedia(client, m, payload, caption) {
  const media = Array.isArray(payload.media) ? payload.media : []
  if (!media.length) return false

  if (payload.type === 'video' || payload.type === 'image') {
    const item = media[0]
    return sendSingleMedia(client, m, item, caption)
  }

  const limited = media.slice(0, MAX_CAROUSEL_ITEMS)
  let sentCount = 0

  for (let index = 0; index < limited.length; index += 1) {
    const item = limited[index]
    const mediaCaption =
      index === 0
        ? `${caption}\n\n📚 Midias: ${media.length}`
        : `📎 Midia ${index + 1}/${limited.length}`

    const sent = await sendSingleMedia(client, m, item, mediaCaption)
    if (sent) sentCount += 1
  }

  if (media.length > MAX_CAROUSEL_ITEMS) {
    await m.reply(`Enviei ${MAX_CAROUSEL_ITEMS} de ${media.length} midias para evitar spam.`)
  }

  return sentCount > 0
}

async function sendSingleMedia(client, m, media, caption) {
  if (!media?.url) return false

  const kind = media.kind || inferKindFromUrl(media.url) || 'image'
  try {
    if (kind === 'video') {
      await client.sendMessage(
        m.chat,
        {
          video: { url: media.url },
          caption,
          mimetype: 'video/mp4',
          fileName: 'ig.mp4'
        },
        { quoted: m }
      )
      return true
    }

    await client.sendMessage(
      m.chat,
      {
        image: { url: media.url },
        caption
      },
      { quoted: m }
    )
    return true
  } catch {
    return false
  }
}

function buildCaption(payload, sourceType) {
  const formatLabel =
    payload.type === 'carousel'
      ? `CAROUSEL (${payload.mediaUrls.length})`
      : payload.type === 'video'
        ? 'MP4'
        : 'JPG/PNG'

  const lines = [
    '╔═══『 📸 INSTAGRAM 』═══╗',
    '║'
  ]

  if (payload.username) lines.push(`║ 👤 Usuario: ${payload.username}`)
  if (payload.caption) lines.push(`║ 📝 ${truncate(payload.caption, 260)}`)
  if (payload.like != null) lines.push(`║ ❤️ Likes: ${payload.like}`)
  if (payload.comment != null) lines.push(`║ 💬 Comentarios: ${payload.comment}`)
  if (payload.views != null) lines.push(`║ 👁️ Views: ${payload.views}`)
  if (payload.duration) lines.push(`║ ⏱️ Duracao: ${payload.duration}`)
  if (payload.resolution) lines.push(`║ 🎥 Resolucao: ${payload.resolution}`)

  lines.push(`║ 📦 Formato: ${formatLabel}`)
  lines.push(`║ 🔗 Tipo: ${String(sourceType || '').toUpperCase()}`)
  lines.push('║')
  lines.push('╚═══『  ZÆRØ BOT  』═══╝')

  return lines.join('\n')
}

function extractMetadata(response) {
  const username = firstString([
    response?.result?.metadata?.username,
    response?.result?.meta?.username,
    response?.data?.username,
    response?.username,
    response?.result?.metadata?.author,
    response?.data?.author
  ])

  const caption = firstString([
    response?.result?.metadata?.caption,
    response?.result?.meta?.title,
    response?.data?.caption,
    response?.caption,
    response?.description
  ])

  const like = firstNumber([
    response?.result?.metadata?.like,
    response?.result?.meta?.like_count,
    response?.data?.like,
    response?.likes
  ])

  const comment = firstNumber([
    response?.result?.metadata?.comment,
    response?.result?.meta?.comment_count,
    response?.data?.comment,
    response?.comments
  ])

  const views = firstNumber([
    response?.result?.metadata?.views,
    response?.result?.meta?.view_count,
    response?.data?.views
  ])

  const durationSeconds = firstNumber([
    response?.result?.metadata?.duration,
    response?.data?.videoMeta?.duration,
    response?.duration
  ])

  const resolution = firstString([
    response?.result?.metadata?.resolution,
    response?.data?.resolution,
    response?.resolution
  ])

  return {
    username,
    caption,
    like,
    comment,
    views,
    duration: durationSeconds != null ? `${Math.round(durationSeconds)}s` : null,
    resolution
  }
}

function firstString(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

function firstNumber(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
    if (typeof candidate === 'string') {
      const numeric = Number(candidate.replace(/[^\d.-]/g, ''))
      if (!Number.isNaN(numeric) && Number.isFinite(numeric)) return numeric
    }
  }
  return null
}

function truncate(text, maxLength) {
  const value = String(text || '').trim()
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function inferFormat(type, mediaList) {
  if (type === 'carousel') return 'carousel'
  if (!mediaList.length) return null
  if (type === 'video') return 'mp4'

  const imageMedia = mediaList.find(item => item.kind === 'image') || mediaList[0]
  const extension = imageMedia.url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase()
  return extension || 'jpg'
}

function resolveKindFromObject(node) {
  if (node?.isVideo === true) return 'video'
  if (node?.isVideo === false) return 'image'

  return normalizeKind(node?.type || node?.tipo || node?.ext || null)
}

function resolveKindFromKey(keyName) {
  const key = String(keyName || '').toLowerCase()
  if (!key) return null

  if (/video|mp4|mov|m4v|webm|play/i.test(key)) return 'video'
  if (/image|img|photo|display|jpeg|jpg|png|webp/i.test(key)) return 'image'
  return null
}

function normalizeKind(value) {
  if (!value) return null
  const normalized = String(value).toLowerCase()
  if (normalized.includes('video') || normalized.includes('mp4') || normalized.includes('mov') || normalized.includes('webm')) {
    return 'video'
  }
  if (
    normalized.includes('image') ||
    normalized.includes('jpg') ||
    normalized.includes('jpeg') ||
    normalized.includes('png') ||
    normalized.includes('webp')
  ) {
    return 'image'
  }
  return null
}

function inferKindFromUrl(url) {
  const lowerUrl = String(url || '').toLowerCase()
  if (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(lowerUrl)) return 'video'
  if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(lowerUrl)) return 'image'
  if (/\/video\//i.test(lowerUrl)) return 'video'
  if (/\/image\//i.test(lowerUrl)) return 'image'
  return null
}

function isGenericMediaKey(keyName) {
  const key = String(keyName || '').toLowerCase()
  return key === 'url' || key.endsWith('url') || key.includes('download')
}

function isIgnoredKey(keyName) {
  return /(thumb|thumbnail|avatar|profile|icon|logo|preview|cover|ppc|profile_pic)/i.test(String(keyName || ''))
}

function isInstagramPageUrl(url) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am', 'www.instagr.am'].includes(host)) {
      return false
    }

    const hasFileExtension = /\.[a-z0-9]{2,5}(\?|$)/i.test(parsed.pathname)
    if (hasFileExtension) return false
    return true
  } catch {
    return false
  }
}
