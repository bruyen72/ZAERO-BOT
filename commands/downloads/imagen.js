import axios from 'axios'
import * as cheerio from 'cheerio'
import { DARK_MSG } from '../../lib/system/heavyTaskManager.js'
import { parseCountArg } from '../../lib/system/limits.js'
import { globalDownloadLimiter } from '../../lib/system/limiter.js'
import { get as getShortCache, set as setShortCache } from '../../lib/system/cache.js'
import {
  cleanup as cleanupImageSeen,
  hashImageUrl,
  hasSeen as hasSeenImage,
  markSeen as markSeenImage,
  normalizeTermKey
} from './imageDedupeCache.js'

const MAX_SEND_IMAGES = 5
const API_TIMEOUT_MS = 20000
const HTML_MAX_BYTES = 3 * 1024 * 1024
const RESULTS_CACHE_TTL_MS = 90 * 1000
const GOOGLE_REFERER = 'https://www.google.com/imghp?hl=pt-BR&authuser=0&ogbl'
const GOOGLE_SEARCH_BASE = 'https://www.google.com/search'
const GOOGLE_PAGE_SIZE = 20
const MAX_GOOGLE_PAGES = 4
const GIF_MODE_PATTERN = /^gif(?:s)?$/i
const BLOCKED_IMAGE_HOSTS = new Set([
  'mediaproxy.tvtropes.org',
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com'
])
const IMAGE_EXT_PATTERN = /\.(?:jpe?g|png|webp|avif|bmp|svg|gif)(?:[?#]|$)/i
const GIF_EXT_PATTERN = /\.gif(?:[?#]|$)/i

const bannedWords = [
  '+18', '18+', 'conteudo adulto', 'conteudo explicito', 'conteudo sexual',
  'atriz porno', 'ator porno', 'estrela porno', 'pornstar', 'video xxx', 'xxx', 'x x x',
  'pornhub', 'xvideos', 'xnxx', 'redtube', 'brazzers', 'onlyfans', 'cam4', 'chaturbate',
  'myfreecams', 'bongacams', 'livejasmin', 'spankbang', 'tnaflix', 'hclips', 'fapello',
  'mia khalifa', 'lana rhoades', 'riley reid', 'abella danger', 'brandi love',
  'eva elfie', 'nicole aniston', 'janice griffith', 'alexis texas', 'lela star',
  'gianna michaels', 'adriana chechik', 'asa akira', 'mandy muse', 'kendra lust',
  'jordi el nino polla', 'johnny sins', 'danny d', 'manuel ferrara', 'mark rockwell',
  'porno', 'porn', 'sexo', 'sex', 'desnudo', 'desnuda', 'erotico', 'erotika',
  'tetas', 'pechos', 'boobs', 'boob', 'nalgas', 'culo', 'culos', 'qlos', 'trasero',
  'pene', 'verga', 'vergota', 'pito', 'chocha', 'vagina', 'vaginas', 'bichano', 'concha',
  'genital', 'genitales', 'masturbar', 'masturbacao', 'masturbacion', 'gemidos',
  'gemir', 'orgia', 'orgy', 'trio', 'gangbang', 'creampie', 'facial', 'cum',
  'milf', 'teen', 'incesto', 'incest', 'estupro', 'violacion', 'rape', 'bdsm',
  'hentai', 'tentacle', 'tentaculos', 'fetish', 'fetiche', 'sado', 'sadomaso',
  'camgirl', 'camsex', 'camshow', 'playboy', 'playgirl', 'playmate', 'striptease',
  'striptis', 'slut', 'puta', 'putas', 'perra', 'perras', 'whore', 'fuck', 'fucking',
  'fucked', 'cock', 'dick', 'pussy', 'ass', 'shemale', 'trans', 'transgenero',
  'lesbian', 'lesbiana', 'gay', 'lgbt', 'explicit', 'hardcore',
  'softcore', 'nudista', 'nudismo', 'nudity', 'deepthroat', 'dp', 'double penetration',
  'analplay', 'analplug', 'rimjob', 'spank', 'spanking', 'lick', 'licking', '69',
  'doggystyle', 'reverse cowgirl', 'cowgirl', 'blowjob', 'bj', 'handjob', 'hj',
  'p0rn', 's3x', 'v@gina', 'c0ck', 'd1ck', 'fuk', 'fuking', 'fak', 'boobz', 'pusy',
  'azz', 'cumshot', 'sexcam', 'livecam', 'webcam', 'sexchat', 'sexshow', 'sexvideo',
  'sexvid', 'sexpics', 'sexphoto', 'seximage', 'sexgif', 'pornpic', 'pornimage',
  'pornvid', 'pornvideo', 'only fan', 'only-fans', 'only_fans', 'onlyfans.com',
  'mia khalifha', 'mia khalifah', 'mia khalifaa', 'mia khalif4', 'mia khal1fa',
  'mia khalifa +18', 'mia khalifa xxx', 'mia khalifa nua', 'mia khalifa porno'
]

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseQueryAndQuantity(args = []) {
  let quantity = 1
  let mode = 'image'
  let tokens = Array.isArray(args)
    ? args.map((item) => normalizeText(item)).filter(Boolean)
    : []

  const consumeQuantity = () => {
    if (!tokens.length || !/^\d+$/.test(tokens[0])) return
    quantity = parseCountArg(tokens, MAX_SEND_IMAGES)
    tokens = tokens.slice(1)
  }

  consumeQuantity()
  if (tokens.length && GIF_MODE_PATTERN.test(tokens[0])) {
    mode = 'gif'
    tokens = tokens.slice(1)
    consumeQuantity()
  }

  const query = normalizeText(tokens.join(' '))
  if (!Number.isFinite(quantity) || quantity < 1) quantity = 1
  return { quantity, query, mode }
}

function isGifUrl(url = '') {
  const text = String(url || '').toLowerCase()
  if (!text) return false
  if (GIF_EXT_PATTERN.test(text)) return true
  if (/[?&](?:format|fm|ext|mime|type)=gif(?:[&#]|$)/i.test(text)) return true
  if (/image\/gif/i.test(text)) return true
  return false
}

function isBlockedHost(hostname = '') {
  const host = String(hostname || '').toLowerCase()
  if (!host) return false
  if (BLOCKED_IMAGE_HOSTS.has(host)) return true
  if (/^encrypted-tbn\d\.gstatic\.com$/.test(host)) return true
  return false
}

function isLikelyImageUrl(url, { gifOnly = false, allowNoExt = false } = {}) {
  const text = String(url || '').trim()
  if (!/^https?:\/\//i.test(text)) return false

  const lower = text.toLowerCase()
  const hasImageExt = IMAGE_EXT_PATTERN.test(lower)
  const hasImageHint = /[?&](?:format|fm|ext|mime|type)=(?:jpe?g|png|webp|avif|bmp|gif)(?:[&#]|$)/i.test(lower)
  const gif = isGifUrl(lower)

  if (gifOnly && !gif) return false
  if (!gifOnly && gif) return false
  if (!hasImageExt && !hasImageHint && !allowNoExt) return false

  try {
    const parsed = new URL(text)
    const host = String(parsed.hostname || '').toLowerCase()
    if (isBlockedHost(host)) return false
    if (/^www\.google\./.test(host) && /\/(?:search|imgres)/.test(parsed.pathname)) return false
  } catch (_) {
    return false
  }
  return true
}

function normalizeImageUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    parsed.hash = ''
    return parsed.toString()
  } catch (_) {
    return ''
  }
}

function extractDomain(url = '') {
  const text = String(url || '').trim()
  if (!text) return null
  try {
    return new URL(text).hostname.toLowerCase()
  } catch (_) {
    return null
  }
}

function safeDecodeURIComponent(value = '') {
  const text = String(value || '')
  try {
    return decodeURIComponent(text)
  } catch (_) {
    return text
  }
}

function decodeGoogleEscapes(text = '') {
  return String(text || '')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
}

function buildGoogleSearchUrl(query, { start = 0, gifOnly = false } = {}) {
  const parsedStart = Number.isFinite(Number(start)) ? Math.max(0, Number(start)) : 0
  const url = new URL(GOOGLE_SEARCH_BASE)
  url.searchParams.set('q', normalizeText(query))
  url.searchParams.set('tbm', 'isch')
  url.searchParams.set('hl', 'pt-BR')
  url.searchParams.set('authuser', '0')
  url.searchParams.set('ogbl', '')
  if (parsedStart > 0) url.searchParams.set('start', String(parsedStart))
  if (gifOnly) url.searchParams.set('tbs', 'itp:animated,ift:gif')
  return url.toString()
}

function extractGoogleImageCandidates(html = '', { gifOnly = false } = {}) {
  const decoded = decodeGoogleEscapes(html)
  const candidates = []
  const seen = new Set()

  const addCandidate = (rawImageUrl, rawRefUrl = '', source = 'imgurl') => {
    const imageUrl = normalizeImageUrl(safeDecodeURIComponent(rawImageUrl))
    if (!imageUrl) return

    const allowNoExt = source === 'imgurl'
    if (!isLikelyImageUrl(imageUrl, { gifOnly, allowNoExt })) return

    const imageHash = hashImageUrl(imageUrl)
    if (!imageHash || seen.has(imageHash)) return
    seen.add(imageHash)

    const refUrl = normalizeImageUrl(safeDecodeURIComponent(rawRefUrl))
    const domain = extractDomain(refUrl) || extractDomain(imageUrl)

    candidates.push({
      url: imageUrl,
      title: null,
      domain,
      resolution: null,
      source,
      mediaType: isGifUrl(imageUrl) ? 'gif' : 'image',
      resultId: imageHash.slice(0, 12)
    })
  }

  try {
    const $ = cheerio.load(decoded)
    $('a[href*="imgurl="]').each((_, element) => {
      const hrefRaw = String($(element).attr('href') || '').trim()
      if (!hrefRaw) return
      const href = hrefRaw.startsWith('/') ? `https://www.google.com${hrefRaw}` : hrefRaw
      try {
        const parsed = new URL(href)
        const imageUrl = parsed.searchParams.get('imgurl')
        if (!imageUrl) return
        addCandidate(imageUrl, parsed.searchParams.get('imgrefurl') || '', 'imgurl')
      } catch (_) {}
    })
  } catch (_) {}

  const imgurlPattern = /imgurl=(https?:\/\/[^&"'<>\\\s]+)&imgrefurl=([^&"'<>\\\s]+)/gi
  let match
  while ((match = imgurlPattern.exec(decoded)) !== null) {
    addCandidate(match[1], match[2], 'imgurl')
  }

  if (candidates.length < 80) {
    const directPattern = /https?:\/\/[^"'<>\\\s]+/gi
    while ((match = directPattern.exec(decoded)) !== null) {
      const raw = String(match[0] || '')
      if (/^https?:\/\/(?:www\.)?google\./i.test(raw)) continue
      addCandidate(raw, '', 'direct')
      if (candidates.length >= 120) break
    }
  }

  return candidates
}

function uniqueCandidates(items = [], { gifOnly = false } = {}) {
  const list = []
  const seen = new Set()

  for (const item of items) {
    const imageUrl = normalizeImageUrl(item?.url)
    const allowNoExt = item?.source === 'imgurl'
    if (!isLikelyImageUrl(imageUrl, { gifOnly, allowNoExt })) continue

    const imageHash = hashImageUrl(imageUrl)
    if (!imageHash || seen.has(imageHash)) continue
    seen.add(imageHash)

    const mediaType = item?.mediaType || (isGifUrl(imageUrl) ? 'gif' : 'image')
    if (gifOnly && mediaType !== 'gif') continue
    if (!gifOnly && mediaType === 'gif') continue

    list.push({
      url: imageUrl,
      title: item?.title || null,
      domain: item?.domain || null,
      resolution: item?.resolution || null,
      source: item?.source || null,
      mediaType,
      resultId: item?.resultId || imageHash.slice(0, 12)
    })
  }

  return list
}

function shuffle(items = []) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function pickImages(query, candidates = [], maxCount = MAX_SEND_IMAGES) {
  const termKey = normalizeTermKey(query)
  const unseen = []
  const replay = []
  const localHashes = new Set()

  for (const item of candidates) {
    const imageHash = hashImageUrl(item.url)
    if (!imageHash || localHashes.has(imageHash)) continue
    localHashes.add(imageHash)
    const row = { ...item, imageHash }
    if (hasSeenImage(termKey, imageHash)) {
      replay.push(row)
    } else {
      unseen.push(row)
    }
  }

  const selected = [...shuffle(unseen).slice(0, maxCount)]
  let usedReplay = false

  if (selected.length < maxCount && replay.length) {
    const needed = maxCount - selected.length
    selected.push(...shuffle(replay).slice(0, needed))
    usedReplay = true
  }

  return {
    termKey,
    selected,
    usedReplay
  }
}

function makeCaption(item, query) {
  const header = item?.mediaType === 'gif' ? 'GOOGLE GIFS' : 'GOOGLE IMAGENS'
  return [
    `*${header}*`,
    item?.resultId ? `ID: ${item.resultId}` : null,
    item?.title ? `Titulo: ${item.title}` : null,
    item?.domain ? `Fonte: ${item.domain}` : null,
    item?.resolution ? `Resolucao: ${item.resolution}` : null,
    `Pesquisa: ${query}`
  ].filter(Boolean).join('\n')
}

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

function randomSendDelayMs() {
  return 200 + Math.floor(Math.random() * 201)
}

async function fetchEndpoint(url, extractor) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await globalDownloadLimiter.run(() =>
        axios.get(url, {
          timeout: API_TIMEOUT_MS,
          maxContentLength: HTML_MAX_BYTES,
          maxBodyLength: HTML_MAX_BYTES,
          responseType: 'text',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            Referer: GOOGLE_REFERER,
            DNT: '1'
          },
        }),
      )
      const rows = extractor(res.data)
      return Array.isArray(rows) ? rows : []
    } catch (_) {
      if (attempt >= 1) break
      await sleep(600)
    }
  }
  return []
}

async function getImageSearchResults(query, { limit = 80, gifOnly = false } = {}) {
  const normalizedQuery = normalizeText(query).toLowerCase()
  const modeKey = gifOnly ? 'gif' : 'image'
  const cacheKey = `google-img:${modeKey}:${normalizedQuery}`
  const target = Math.max(10, Math.min(200, Number(limit) || 80))
  const cached = getShortCache(cacheKey)
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.slice(0, target)
  }

  const collected = []
  for (let page = 0; page < MAX_GOOGLE_PAGES; page += 1) {
    const start = page * GOOGLE_PAGE_SIZE
    const searchUrl = buildGoogleSearchUrl(query, { start, gifOnly })
    const rows = await fetchEndpoint(searchUrl, (html) =>
      extractGoogleImageCandidates(String(html || ''), { gifOnly })
    )
    if (!rows.length) continue
    collected.push(...rows)
    if (collected.length >= target * 2) break
    if (rows.length < 5 && page > 0) break
    await sleep(120 + Math.floor(Math.random() * 120))
  }

  const unique = uniqueCandidates(collected, { gifOnly }).slice(0, target)
  if (unique.length > 0) {
    setShortCache(cacheKey, unique, RESULTS_CACHE_TTL_MS)
  }
  return unique
}

export default {
  command: ['imagen', 'imagem', 'img', 'image'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    const { quantity, query: text, mode } = parseQueryAndQuantity(args)
    const gifOnly = mode === 'gif'
    const modeLabel = gifOnly ? 'gifs' : 'imagens'

    if (!text) {
      return client.reply(
        m.chat,
        `Use:\n${usedPrefix + command} <quantidade> <termo>\n${usedPrefix + command} gif <quantidade> <termo>\nExemplos:\n${usedPrefix + command} 3 gatinho\n${usedPrefix + command} gif 2 dancing cat`,
        m
      )
    }

    const lowerText = text.toLowerCase()
    const nsfwEnabled = global.db.data.chats[m.chat]?.nsfw === true
    if (!nsfwEnabled && bannedWords.some((word) => lowerText.includes(word))) {
      return m.reply('Este comando nao permite pesquisa NSFW (+18).')
    }

    try {
      cleanupImageSeen()
      await m.react('⏳').catch(async () => {
        await m.reply(DARK_MSG.processing).catch(() => {})
      })

      const results = await getImageSearchResults(text, {
        limit: Math.max(quantity * 8, 40),
        gifOnly
      })
      if (!results.length) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum ${modeLabel} encontrado para "${text}".`, m)
      }

      const picked = pickImages(`${mode}:${text}`, results, quantity)
      const selected = picked.selected
      if (selected.length < 1) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum ${modeLabel} valido encontrado para "${text}".`, m)
      }

      const sentItems = []
      let sendFailures = 0
      const sendOneByOne = async (items = []) => {
        for (const item of items) {
          try {
            const payload = item.mediaType === 'gif'
              ? { video: { url: item.url }, gifPlayback: true, caption: makeCaption(item, text) }
              : { image: { url: item.url }, caption: makeCaption(item, text) }
            await client.sendMessage(m.chat, payload, { quoted: m })
            sentItems.push(item)
          } catch (_) {
            if (item.mediaType === 'gif') {
              try {
                await client.sendMessage(
                  m.chat,
                  { image: { url: item.url }, caption: makeCaption(item, text) },
                  { quoted: m }
                )
                sentItems.push(item)
              } catch (_) {
                sendFailures += 1
              }
            } else {
              sendFailures += 1
            }
          }

          await sleep(randomSendDelayMs())
        }
      }
      await sendOneByOne(selected)

      if (sentItems.length < 1) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum ${modeLabel} valido encontrado para "${text}".`, m)
      }

      for (const item of sentItems) {
        markSeenImage(picked.termKey, item.imageHash)
      }

      if (picked.usedReplay) {
        await m.reply(`Sem novos ${modeLabel} no cache recente. Enviei resultados repetidos mais antigos.`)
      }
      if (sendFailures > 0 && sentItems.length < selected.length) {
        await m.reply(`Enviei ${sentItems.length}/${selected.length}. Alguns links de ${modeLabel} falharam.`)
      }

      await m.react('✅').catch(() => {})
    } catch (error) {
      await m.react('❌').catch(() => {})
      await m.reply(
        `Erro ao executar *${usedPrefix + command}*.\n${error?.message || DARK_MSG.timeout}`
      )
    }
  }
}
