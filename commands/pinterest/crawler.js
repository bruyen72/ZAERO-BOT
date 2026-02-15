const REQUEST_TIMEOUT_MS = 22000
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const AUTH_SESSION_TTL_MS = 20 * 60 * 1000
const BASE_BACKOFF_MS = 2000
const MAX_RETRIES = 4
const RETRYABLE_STATUS = new Set([403, 429, 500, 502, 503, 504])
const KNOWN_BAD_PINIMG_IDS = new Set(['d53b014d86a6b6761bf649a0ed813c2b'])

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache'
}

const authSessionCache = new Map()

let requestQueue = Promise.resolve()
let nextRequestAt = 0

function clamp(value, min, max) {
  const num = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(num)) return min
  if (num < min) return min
  if (num > max) return max
  return num
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

function getMinRequestIntervalMs() {
  const raw = Number.parseInt(String(process.env.PINTEREST_MIN_INTERVAL_MS || ''), 10)
  if (Number.isFinite(raw)) {
    return clamp(raw, 2000, 4000)
  }
  return 2500
}

async function enqueueRequest(task) {
  const run = async () => {
    const waitMs = Math.max(0, nextRequestAt - Date.now())
    if (waitMs > 0) await sleep(waitMs)
    nextRequestAt = Date.now() + getMinRequestIntervalMs()
    return task()
  }

  const chained = requestQueue.then(run, run)
  requestQueue = chained.catch(() => {})
  return chained
}

function getBackoffMs(attempt) {
  return BASE_BACKOFF_MS * (2 ** attempt)
}

function looksLikeUrl(value) {
  const text = String(value || '').trim()
  return /^(https?:\/\/|www\.|pinterest\.|br\.pinterest\.|pt\.pinterest\.|pin\.it\/)/i.test(text)
}

function normalizePinterestTerm(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeToken(value) {
  return String(value || '')
    .replace(/["'`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueStrings(values = []) {
  const out = []
  const seen = new Set()
  for (const item of values) {
    const clean = normalizePinterestTerm(item)
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function buildQueryFallbacks(rawQuery) {
  const term = normalizePinterestTerm(rawQuery)
  if (!term) return []
  if (looksLikeUrl(term)) return [term]

  const stripped = term
    .replace(/\b(wallpaper|lockscreen|background|aesthetic|papel\s+de\s+parede|fundo)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const baseTerm = stripped || term

  const entities = baseTerm
    .split(/\s+(?:and|e|&)\s+/i)
    .map(sanitizeToken)
    .filter(Boolean)

  if (entities.length >= 2) {
    const first = entities[0]
    const second = entities[1]
    return uniqueStrings([
      `"${first}" "${second}" wallpaper`,
      `"${first}" "${second}" lockscreen`,
      `"${first}" "${second}" background`,
      `${first} ${second} wallpaper aesthetic`
    ])
  }

  const clean = sanitizeToken(baseTerm) || sanitizeToken(term)
  return uniqueStrings([
    `"${clean}" wallpaper`,
    `"${clean}" lockscreen`,
    `"${clean}" background`,
    `${clean} wallpaper aesthetic`
  ])
}

function buildSearchUrl(query, page = 1, host = 'br.pinterest.com') {
  const encoded = encodeURIComponent(String(query || '').trim())
  const base = `https://${host}/search/pins/?q=${encoded}&rs=typed`
  if (page <= 1) return base
  return `${base}&page=${page}`
}

function normalizeQueryOrUrl(queryOrUrl) {
  const raw = normalizePinterestTerm(queryOrUrl)
  if (!raw) {
    throw new Error('Termo ou link do Pinterest vazio.')
  }

  if (!looksLikeUrl(raw)) {
    return {
      kind: 'query',
      query: raw,
      searchUrl: buildSearchUrl(raw, 1, 'br.pinterest.com')
    }
  }

  let candidate = raw
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`
  }

  let parsed
  try {
    parsed = new URL(candidate)
  } catch (_) {
    return {
      kind: 'query',
      query: raw,
      searchUrl: buildSearchUrl(raw, 1, 'br.pinterest.com')
    }
  }

  const host = String(parsed.hostname || '').toLowerCase()
  const isPinterestHost = host.includes('pinterest.') || host === 'pin.it'
  if (!isPinterestHost) {
    return {
      kind: 'query',
      query: raw,
      searchUrl: buildSearchUrl(raw, 1, 'br.pinterest.com')
    }
  }

  return {
    kind: 'url',
    query: '',
    searchUrl: parsed.toString()
  }
}

function cleanupEscapedUrl(text) {
  return String(text || '')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003A/gi, ':')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/\\/g, '')
    .trim()
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function parseBingCardMetadata(rawAttribute) {
  const decoded = decodeHtmlEntities(rawAttribute)
  if (!decoded || !decoded.includes('"murl"')) return null
  try {
    return JSON.parse(decoded)
  } catch (_) {
    return null
  }
}

async function collectPinimgUrlsFromBing(queryText, maxUrls = 120) {
  const query = String(queryText || '').trim()
  if (!query) return []

  const searchQueries = [
    `${query} pinterest`,
    `${query} site:pinterest.com`
  ]
  const collected = []
  const seen = new Set()

  for (const item of searchQueries) {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(item)}`
    let html = ''
    try {
      const response = await requestWithRetry(url, {
        headers: {
          ...DEFAULT_HEADERS,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow'
      })
      if (!response.ok) continue
      html = await response.text()
    } catch (_) {
      continue
    }

    const attrMatches = [...html.matchAll(/\sm="([^"]+)"/gi)]
    for (const attrMatch of attrMatches) {
      const metadata = parseBingCardMetadata(attrMatch[1])
      if (!metadata || typeof metadata.murl !== 'string') continue
      const normalized = normalizePinimgUrl(metadata.murl)
      if (!normalized || isKnownBadPinimgUrl(normalized) || seen.has(normalized)) continue
      seen.add(normalized)
      collected.push(normalized)
      if (collected.length >= maxUrls) break
    }

    if (collected.length >= maxUrls) break
  }

  return collected.sort((left, right) => scorePinimgUrl(right) - scorePinimgUrl(left))
}

function normalizePinimgUrl(input) {
  const cleaned = cleanupEscapedUrl(input).replace(/[)\]}>,]+$/, '')
  if (!cleaned) return ''

  let parsed
  try {
    parsed = new URL(cleaned)
  } catch (_) {
    return ''
  }

  const host = String(parsed.hostname || '').toLowerCase()
  if (host !== 'i.pinimg.com' && !host.endsWith('.pinimg.com')) {
    return ''
  }

  parsed.protocol = 'https:'
  parsed.hash = ''
  return parsed.toString()
}

function normalizePinimgKey(input) {
  const normalized = normalizePinimgUrl(input)
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch (_) {
    return normalized.split('?')[0].trim()
  }
}

function extractPinimgImageId(url) {
  const text = String(url || '')
  const match = text.match(/\/([a-f0-9]{32})\.(?:jpg|jpeg|png|webp|gif)(?:$|\?)/i)
  return match ? match[1].toLowerCase() : ''
}

function isKnownBadPinimgUrl(url) {
  const id = extractPinimgImageId(url)
  return Boolean(id && KNOWN_BAD_PINIMG_IDS.has(id))
}

function scorePinimgUrl(url) {
  const text = String(url || '').toLowerCase()
  let score = 0

  if (text.includes('/originals/')) score += 60
  if (text.includes('/736x/')) score += 50
  if (text.includes('/564x/')) score += 45
  if (text.includes('/474x/')) score += 35
  if (text.includes('/236x/')) score += 20
  if (/\.(jpg|jpeg|webp)(\?|$)/i.test(text)) score += 12
  if (/\/(logo|favicon)\b/i.test(text)) score -= 200
  if (isKnownBadPinimgUrl(text)) score -= 10000

  return score
}

function normalizePinId(value) {
  const raw = String(value || '')
  const match = raw.match(/(\d{5,})/)
  return match ? match[1] : ''
}

function extractPinIdFromPinUrl(value) {
  const text = cleanupEscapedUrl(value)
  const match = text.match(/\/pin\/(\d{5,})\/?/i)
  return match ? match[1] : ''
}

function buildCanonicalPinUrl(pinId, sourceUrl = 'https://www.pinterest.com/') {
  const safePinId = normalizePinId(pinId)
  if (!safePinId) return ''
  try {
    const base = new URL(sourceUrl)
    return `${base.origin}/pin/${safePinId}/`
  } catch (_) {
    return `https://www.pinterest.com/pin/${safePinId}/`
  }
}

function normalizePinUrl(pinUrl, pinId, sourceUrl) {
  const raw = cleanupEscapedUrl(pinUrl)
  if (raw) {
    try {
      const parsed = raw.startsWith('/')
        ? new URL(raw, sourceUrl || 'https://www.pinterest.com/')
        : new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      const host = String(parsed.hostname || '').toLowerCase()
      if (host.includes('pinterest.')) {
        parsed.protocol = 'https:'
        parsed.hash = ''
        return parsed.toString()
      }
    } catch (_) {
      // Ignora URL invalida e gera URL canonica abaixo.
    }
  }
  return buildCanonicalPinUrl(pinId, sourceUrl)
}

function collectPinimgUrlsFromText(text) {
  const content = String(text || '')
  if (!content) return []

  const matches = []
  const regexes = [
    /https?:\/\/i\.pinimg\.com\/[a-z0-9_%/.\-]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[a-z0-9\-._~!$&'()*+,;=:@/?%]*)?/gi,
    /https?:\\\/\\\/i\.pinimg\.com\\\/[a-z0-9_%/.\-]+?\.(?:jpg|jpeg|png|webp|gif)(?:\\\?[a-z0-9\\\-._~!$&'()*+,;=:@/?%]*)?/gi
  ]

  for (const regex of regexes) {
    let match
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[0])
    }
  }

  const unique = new Set()
  for (const raw of matches) {
    const normalized = normalizePinimgUrl(raw)
    if (!normalized) continue
    if (isKnownBadPinimgUrl(normalized)) continue
    unique.add(normalized)
  }

  return [...unique].sort((left, right) => scorePinimgUrl(right) - scorePinimgUrl(left))
}

function collectPinIdsFromText(text) {
  const content = String(text || '')
  const regexes = [
    /\/pin\/(\d{5,})\/?/gi,
    /\\\/pin\\\/(\d{5,})\\\/?/gi,
    /https?:\/\/(?:[a-z]{2,3}\.)?pinterest\.[a-z.]+\/pin\/(\d{5,})\/?/gi
  ]
  const found = new Set()

  for (const regex of regexes) {
    let match
    while ((match = regex.exec(content)) !== null) {
      const pinId = normalizePinId(match[1])
      if (pinId) found.add(pinId)
    }
  }

  return [...found]
}

function pushCandidate(candidates, payload = {}) {
  const imageUrl = normalizePinimgUrl(payload.imageUrl)
  if (!imageUrl || isKnownBadPinimgUrl(imageUrl)) return

  const pinId = normalizePinId(payload.pinId || extractPinIdFromPinUrl(payload.pinUrl))
  const pinUrl = normalizePinUrl(payload.pinUrl, pinId, payload.sourceUrl)

  candidates.push({
    pinId,
    pinUrl,
    imageUrl,
    score: scorePinimgUrl(imageUrl) + (pinId ? 100 : 0) + (Number(payload.scoreBoost) || 0)
  })
}

function extractStructuredCandidates(text, sourceUrl) {
  const content = String(text || '')
  const candidates = []
  if (!content) return candidates

  const patterns = [
    {
      regex: /"id":"(\d{5,})"[\s\S]{0,2500}?"images":\{[\s\S]{0,2500}?"orig":\{"url":"(https?:\\\/\\\/i\.pinimg\.com[^"]+)"/gi,
      boost: 50
    },
    {
      regex: /"id":"(\d{5,})"[\s\S]{0,2500}?"images":\{[\s\S]{0,2500}?"736x":\{"url":"(https?:\\\/\\\/i\.pinimg\.com[^"]+)"/gi,
      boost: 40
    },
    {
      regex: /"id":"(\d{5,})"[\s\S]{0,2500}?"images":\{[\s\S]{0,2500}?"564x":\{"url":"(https?:\\\/\\\/i\.pinimg\.com[^"]+)"/gi,
      boost: 30
    },
    {
      regex: /"pin_id":"?(\d{5,})"?[\s\S]{0,1200}?"url":"(https?:\\\/\\\/i\.pinimg\.com[^"]+)"/gi,
      boost: 20
    },
    {
      regex: /"link":"(\\\/pin\\\/(\d{5,})\\\/[^"]*)"[\s\S]{0,1200}?"url":"(https?:\\\/\\\/i\.pinimg\.com[^"]+)"/gi,
      boost: 20,
      custom: true
    }
  ]

  for (const item of patterns) {
    let match
    while ((match = item.regex.exec(content)) !== null) {
      if (item.custom) {
        pushCandidate(candidates, {
          pinId: match[2],
          pinUrl: match[1],
          imageUrl: match[3],
          sourceUrl,
          scoreBoost: item.boost
        })
      } else {
        pushCandidate(candidates, {
          pinId: match[1],
          pinUrl: '',
          imageUrl: match[2],
          sourceUrl,
          scoreBoost: item.boost
        })
      }
    }
  }

  return candidates
}

function extractCandidatesFromHtml(html, sourceUrl) {
  const text = decodeHtmlEntities(String(html || ''))
  const candidates = []
  if (!text) return candidates

  const structured = extractStructuredCandidates(text, sourceUrl)
  for (const item of structured) {
    candidates.push(item)
  }

  const pinIds = collectPinIdsFromText(text)
  const imageUrls = collectPinimgUrlsFromText(text)
  const maxPairs = Math.min(imageUrls.length, Math.max(pinIds.length, imageUrls.length))

  for (let index = 0; index < maxPairs; index += 1) {
    const imageUrl = imageUrls[index]
    if (!imageUrl) continue
    const pinId = pinIds[index] || ''
    pushCandidate(candidates, {
      pinId,
      pinUrl: pinId ? buildCanonicalPinUrl(pinId, sourceUrl) : '',
      imageUrl,
      sourceUrl,
      scoreBoost: pinId ? 5 : 0
    })
  }

  return candidates
}

function consolidateCandidates(candidates = [], maxResults = 120) {
  const byKey = new Map()

  for (const item of candidates) {
    const pinId = normalizePinId(item?.pinId)
    const imageUrl = normalizePinimgUrl(item?.imageUrl)
    if (!imageUrl) continue

    const pinUrl = normalizePinUrl(item?.pinUrl, pinId, item?.pinUrl || 'https://www.pinterest.com/')
    const score = Number(item?.score) || 0
    const key = pinId ? `pin:${pinId}` : `img:${normalizePinimgKey(imageUrl)}`

    const existing = byKey.get(key)
    if (!existing || score > existing.score) {
      byKey.set(key, {
        pinId,
        pinUrl: pinUrl || (pinId ? buildCanonicalPinUrl(pinId) : ''),
        imageUrl,
        score
      })
    }
  }

  return [...byKey.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults)
    .map(({ pinId, pinUrl, imageUrl }) => ({ pinId, pinUrl, imageUrl }))
}

function mimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 12) return ''
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (buffer.slice(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  return ''
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function getSetCookieValues(response) {
  try {
    if (response?.headers && typeof response.headers.getSetCookie === 'function') {
      const values = response.headers.getSetCookie()
      if (Array.isArray(values)) return values
    }
  } catch (_) {
    // Ignora APIs indisponiveis.
  }

  const raw = String(response?.headers?.get?.('set-cookie') || '').trim()
  if (!raw) return []
  return raw
    .split(/,(?=[^;,=\s]+=[^;,]+)/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

function applySetCookiesToJar(cookieJar, setCookieValues) {
  if (!cookieJar || !(cookieJar instanceof Map)) return
  for (const rawCookie of setCookieValues || []) {
    const first = String(rawCookie || '').split(';')[0]
    const eqIndex = first.indexOf('=')
    if (eqIndex <= 0) continue
    const name = first.slice(0, eqIndex).trim()
    const value = first.slice(eqIndex + 1).trim()
    if (!name) continue
    if (!value || value.toLowerCase() === 'deleted') {
      cookieJar.delete(name)
      continue
    }
    cookieJar.set(name, value)
  }
}

function cookieJarToHeader(cookieJar) {
  if (!cookieJar || cookieJar.size === 0) return ''
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

async function requestWithRetry(url, init = {}, cookieJar = null) {
  let lastError = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const headers = {
        ...DEFAULT_HEADERS,
        ...(init.headers || {})
      }

      const cookieHeader = cookieJarToHeader(cookieJar)
      if (cookieHeader && !headers.cookie) {
        headers.cookie = cookieHeader
      }

      const response = await enqueueRequest(() =>
        fetchWithTimeout(url, {
          ...init,
          headers,
          redirect: init.redirect || 'follow'
        })
      )

      applySetCookiesToJar(cookieJar, getSetCookieValues(response))

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES - 1) {
        await sleep(getBackoffMs(attempt))
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt >= MAX_RETRIES - 1) break
      await sleep(getBackoffMs(attempt))
    }
  }

  if (lastError) throw lastError
  throw new Error('Falha de rede ao acessar Pinterest.')
}

async function createAuthenticatedCookieJar(email, password) {
  const cleanEmail = String(email || '').trim()
  const cleanPassword = String(password || '').trim()
  if (!cleanEmail || !cleanPassword) return null

  const cacheKey = cleanEmail.toLowerCase()
  const cached = authSessionCache.get(cacheKey)
  if (cached && Number(cached.expiresAt) > Date.now()) {
    return new Map(Array.isArray(cached.cookies) ? cached.cookies : [])
  }

  const cookieJar = new Map()
  const loginPageUrl = 'https://www.pinterest.com/login/'
  const loginPageResponse = await requestWithRetry(loginPageUrl, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow'
  }, cookieJar)
  if (!loginPageResponse.ok) {
    throw new Error(`Falha ao abrir login do Pinterest (HTTP ${loginPageResponse.status})`)
  }
  await loginPageResponse.text()

  const csrfToken = cookieJar.get('csrftoken')
  if (!csrfToken) {
    throw new Error('CSRF token ausente no Pinterest')
  }

  const loginPayload = {
    options: {
      username_or_email: cleanEmail,
      password: cleanPassword,
      referrer: 'https://www.pinterest.com/'
    },
    context: {}
  }

  const loginBody = [
    'source_url=%2Flogin%2F',
    `data=${encodeURIComponent(JSON.stringify(loginPayload))}`,
    `_= ${Date.now()}`.replace(' ', '')
  ].join('&')

  const loginResponse = await requestWithRetry('https://www.pinterest.com/resource/UserSessionResource/create/', {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      accept: 'application/json, text/javascript, */*; q=0.01',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrftoken': csrfToken,
      origin: 'https://www.pinterest.com',
      referer: loginPageUrl
    },
    body: loginBody,
    redirect: 'follow'
  }, cookieJar)

  const loginText = await loginResponse.text()
  const hasSessionCookie = cookieJar.has('_pinterest_sess')
  const authRejected = /invalid|incorrect|unauthorized|challenge|captcha|2fa|two[- ]factor/i.test(loginText)
  if (!loginResponse.ok || (!hasSessionCookie && authRejected)) {
    throw new Error(`Falha de autenticacao Pinterest (HTTP ${loginResponse.status})`)
  }

  authSessionCache.set(cacheKey, {
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
    cookies: [...cookieJar.entries()]
  })

  return cookieJar
}

async function resolveCookieJar(options = {}) {
  const pinterestEmail = String(options.pinterestEmail || process.env.PINTEREST_EMAIL || '').trim()
  const pinterestPassword = String(options.pinterestPassword || process.env.PINTEREST_PASSWORD || '').trim()
  const requireAuth = options.requireAuth === true || String(process.env.PINTEREST_REQUIRE_AUTH || '').trim() === '1'

  if (!pinterestEmail && !pinterestPassword && !requireAuth) return null
  if (requireAuth && (!pinterestEmail || !pinterestPassword)) {
    throw new Error('Defina PINTEREST_EMAIL e PINTEREST_PASSWORD no .env.')
  }
  if (!pinterestEmail || !pinterestPassword) return null

  try {
    return await createAuthenticatedCookieJar(pinterestEmail, pinterestPassword)
  } catch (error) {
    if (requireAuth) throw error
    return null
  }
}

async function fetchText(url, cookieJar) {
  const response = await requestWithRetry(url, {}, cookieJar)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return {
    finalUrl: response.url || url,
    text: await response.text()
  }
}

function buildPageUrls(normalized, maxPages = 3, host = 'br.pinterest.com') {
  if (normalized.kind === 'url') {
    return [normalized.searchUrl]
  }

  const urls = []
  for (let page = 1; page <= maxPages; page += 1) {
    urls.push(buildSearchUrl(normalized.query, page, host))
  }

  return uniqueStrings(urls)
}

async function searchPinterestPinsInternal(queryOrUrl, options = {}) {
  const normalized = normalizeQueryOrUrl(queryOrUrl)
  const maxResults = clamp(options.maxResults, 1, 300)
  const maxPages = clamp(options.maxPages, 1, 6)
  const cookieJar = await resolveCookieJar(options)

  const pageUrls = buildPageUrls(normalized, maxPages, 'br.pinterest.com')
  let resolvedSearchUrl = pageUrls[0] || normalized.searchUrl
  const rawCandidates = []
  const enoughCandidates = Math.max(maxResults, Math.min(60, maxResults * 2))

  const collectFromPageUrls = async (urls = []) => {
    for (const pageUrl of urls) {
      let htmlResponse
      try {
        htmlResponse = await fetchText(pageUrl, cookieJar)
      } catch (_) {
        continue
      }

      resolvedSearchUrl = htmlResponse.finalUrl || resolvedSearchUrl
      const extracted = extractCandidatesFromHtml(htmlResponse.text, resolvedSearchUrl)
      rawCandidates.push(...extracted)

      if (rawCandidates.length >= enoughCandidates) return true
    }
    return rawCandidates.length >= enoughCandidates
  }

  await collectFromPageUrls(pageUrls)

  if (rawCandidates.length === 0 && normalized.kind === 'query') {
    const enableWwwFallback = String(process.env.PINTEREST_WWW_FALLBACK || '1') !== '0'
    if (enableWwwFallback) {
      const wwwPages = Math.max(1, Math.min(maxPages, 2))
      const wwwUrls = buildPageUrls(normalized, wwwPages, 'www.pinterest.com')
      await collectFromPageUrls(wwwUrls)
    }
  }

  if (rawCandidates.length === 0 && normalized.kind === 'query') {
    const bingCandidates = await collectPinimgUrlsFromBing(normalized.query, Math.max(maxResults * 2, 30))
    for (const imageUrl of bingCandidates) {
      rawCandidates.push({
        pinId: '',
        pinUrl: '',
        imageUrl,
        score: scorePinimgUrl(imageUrl) + 15
      })
      if (rawCandidates.length >= enoughCandidates) break
    }
  }

  if (rawCandidates.length === 0 && normalized.kind === 'url') {
    const imageFromUrl = normalizePinimgUrl(normalized.searchUrl)
    if (imageFromUrl) {
      const pinId = extractPinIdFromPinUrl(normalized.searchUrl)
      rawCandidates.push({
        pinId,
        pinUrl: pinId ? buildCanonicalPinUrl(pinId, normalized.searchUrl) : normalized.searchUrl,
        imageUrl: imageFromUrl,
        score: scorePinimgUrl(imageFromUrl) + 100
      })
    }
  }

  const pins = consolidateCandidates(rawCandidates, maxResults)
  return {
    searchUrl: resolvedSearchUrl,
    pins,
    cookieJar
  }
}

async function searchPinterestPins(queryOrUrl, options = {}) {
  const result = await searchPinterestPinsInternal(queryOrUrl, options)
  return result.pins
}

async function fetchImageBuffer(url, cookieJar) {
  const response = await requestWithRetry(url, {
    headers: {
      ...DEFAULT_HEADERS,
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }
  }, cookieJar)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const declaredLength = Number.parseInt(response.headers.get('content-length') || '0', 10)
  if (declaredLength > MAX_IMAGE_BYTES) {
    throw new Error('Imagem muito grande.')
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Imagem acima do limite.')
  }

  const headerMimeType = String(response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const sniffed = mimeFromBuffer(buffer)
  const mimeType = headerMimeType.startsWith('image/') ? headerMimeType : sniffed
  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error('Resposta nao e imagem.')
  }

  return {
    buffer,
    mimeType,
    url: response.url || url
  }
}

async function fetchPinterestImages(options = {}) {
  const queryOrUrl = normalizePinterestTerm(options.queryOrUrl)
  if (!queryOrUrl) {
    throw new Error('Termo ou link do Pinterest vazio.')
  }

  const maxImages = clamp(options.maxImages, 1, 12)
  const searchResult = await searchPinterestPinsInternal(queryOrUrl, {
    ...options,
    maxResults: Math.max(maxImages * 16, 60)
  })

  const images = []
  for (const pin of searchResult.pins) {
    if (images.length >= maxImages) break
    try {
      const image = await fetchImageBuffer(pin.imageUrl, searchResult.cookieJar)
      images.push({
        buffer: image.buffer,
        mimeType: image.mimeType,
        url: image.url,
        pinId: pin.pinId,
        pinUrl: pin.pinUrl
      })
    } catch (_) {
      // Ignora imagem invalida e tenta o proximo candidato.
    }
  }

  return {
    searchUrl: searchResult.searchUrl,
    images,
    pins: searchResult.pins
  }
}

export {
  buildQueryFallbacks,
  fetchPinterestImages,
  searchPinterestPins
}

export default {
  buildQueryFallbacks,
  fetchPinterestImages,
  searchPinterestPins
}
