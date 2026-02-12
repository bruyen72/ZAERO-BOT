import axios from 'axios';
import cheerio from 'cheerio';
import { getBufferWithTimeout } from './fetchWithTimeout.js';

const CONFIG = {
  HEAD_TIMEOUT: 7000,
  HTML_TIMEOUT: 15000,
  DOWNLOAD_TIMEOUT: 30000,
  RETRIES_PER_URL: 3,
  RETRY_DELAYS: [1000, 2500, 5000],
  MAX_MEDIA_SIZE_BYTES: 35 * 1024 * 1024,
  MAX_QUERIES_PER_COMMAND: 3,
  MAX_RESULTS_PER_PROVIDER: 10,
  MAX_PAGES_TO_TRY_PER_QUERY: 6,
  MAX_STATIC_URLS_TO_TRY: 8,
  MAX_CANDIDATES_PER_PAGE: 8,
  DEFAULT_HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    Connection: 'keep-alive',
  },
};

const COMMAND_TO_SEARCH_TERMS = {
  // --- Orais (Boca) ---
  blowjob: 'blowjob',
  mamada: 'blowjob',
  bj: 'blowjob',
  lickdick: 'sucking dick',
  lamberpau: 'sucking dick',
  cummouth: 'cum in mouth',
  gozarnaboca: 'cum in mouth',

  // --- Penetracao ---
  anal: 'anal sex',
  violar: 'rough anal',
  fuck: 'hardcore sex',
  coger: 'hardcore sex',
  foder: 'hardcore sex',
  sixnine: '69 position',
  '69': '69 position',

  // --- Maos e Masturbacao ---
  fap: 'male masturbation',
  paja: 'male masturbation',
  punheta: 'male masturbation',
  handjob: 'handjob',
  grope: 'groping',
  apalpar: 'groping',

  // --- Seios ---
  grabboobs: 'squeezing tits',
  agarrarpeitos: 'squeezing tits',
  suckboobs: 'sucking tits',
  chuparpeitos: 'sucking tits',
  boobjob: 'titty fuck',
  espanhola: 'titty fuck',

  // --- Feminino/Lesbico ---
  lickpussy: 'eating pussy',
  lamberbuceta: 'eating pussy',
  yuri: 'lesbian scissoring',
  tijeras: 'lesbian scissoring',

  // --- Outros/Fetiches ---
  cum: 'cumshot',
  cumshot: 'cumshot compilation',
  gozar: 'cumshot',
  spank: 'spanking',
  nalgada: 'spanking',
  bater: 'spanking',
  undress: 'striptease',
  encuerar: 'striptease',
  tirarroupa: 'striptease',
  footjob: 'footjob',
  lickass: 'rimjob',
};

const URL_CACHE = new Map();
const REDGIFS_TOKEN_CACHE = {
  token: null,
  expiresAt: 0,
};

const REDGIFS_CONFIG = {
  API_BASE: 'https://api.redgifs.com/v2',
  AUTH_ENDPOINT: '/auth/temporary',
  TOKEN_FALLBACK_TTL_MS: 30 * 60 * 1000,
  TOKEN_MIN_TTL_MS: 20 * 1000,
  MIN_REQUEST_INTERVAL_MS: 180,
};

let redgifsRateGate = Promise.resolve();
let redgifsLastRequestAt = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeLower(value = '') {
  return String(value).toLowerCase().trim();
}

function uniqueStrings(items = []) {
  return [...new Set(items.filter(Boolean))];
}

const MEDIA_TYPES = ['video', 'gif', 'image'];

function normalizeAllowedMediaTypes(values = MEDIA_TYPES) {
  const list = Array.isArray(values) ? values : MEDIA_TYPES;
  const normalized = uniqueStrings(
    list
      .map((value) => safeLower(value))
      .filter((value) => MEDIA_TYPES.includes(value)),
  );

  return normalized.length > 0 ? normalized : MEDIA_TYPES;
}

function isAllowedMediaType(mediaType, allowedMediaTypes = MEDIA_TYPES) {
  return normalizeAllowedMediaTypes(allowedMediaTypes).includes(safeLower(mediaType));
}

function uniqueBy(items = [], keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

function shuffle(items = []) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function decodeEscapedUrl(value = '') {
  return String(value)
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();
}

function normalizeUrl(baseUrl, value) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function buildRefererHeaders(pageUrl = '') {
  try {
    const parsed = new URL(pageUrl);
    return {
      Referer: pageUrl,
      Origin: parsed.origin,
    };
  } catch {
    return {};
  }
}

function getCacheKey(url, extraHeaders = {}) {
  const referer = extraHeaders.Referer || extraHeaders.referer || '';
  return `${url}|${referer}`;
}

function guessMediaType(url = '', contentType = '') {
  const lowerUrl = safeLower(url);
  const lowerType = safeLower(contentType);

  if (lowerType.includes('image/gif') || /\.gif(\?|$)/i.test(lowerUrl)) return 'gif';
  if (lowerType.startsWith('video/') || /\.(mp4|webm|mov|mkv)(\?|$)/i.test(lowerUrl)) return 'video';
  if (lowerType.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)(\?|$)/i.test(lowerUrl)) return 'image';

  return 'unknown';
}

function isStreamPlaylist(url = '') {
  return /\.m3u8(\?|$)/i.test(url);
}

function isSupportedMediaUrl(url = '', contentType = '') {
  const type = guessMediaType(url, contentType);
  return type === 'video' || type === 'gif' || type === 'image';
}

function extractRegexMatches(text = '', regex) {
  return [...text.matchAll(regex)].map((match) => match[1]).filter(Boolean);
}

function scoreCandidate(candidate) {
  let score = 10;

  if (candidate.mediaType === 'video') score = 1;
  if (candidate.mediaType === 'gif') score = 2;
  if (candidate.mediaType === 'image') score = 3;
  if (candidate.mediaType === 'unknown') score = 9;

  if (isStreamPlaylist(candidate.url)) score += 20;
  if (/1080|720|high|hq/i.test(candidate.url)) score -= 0.3;
  if (/silent\.mp4|[-_]silent\b/i.test(candidate.url)) score -= 0.4;

  return score;
}

function prioritizeCandidates(candidates = []) {
  return uniqueBy(candidates.filter(Boolean), (item) => item.url)
    .filter((item) => isSupportedMediaUrl(item.url, item.contentType) || item.mediaType !== 'unknown')
    .sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
}

function createCandidate(rawUrl, pageUrl, mediaTypeHint = 'unknown', source = 'unknown') {
  const decoded = decodeEscapedUrl(rawUrl);
  const normalized = normalizeUrl(pageUrl, decoded);
  if (!normalized) return null;

  const mediaType = mediaTypeHint === 'unknown' ? guessMediaType(normalized) : mediaTypeHint;

  return {
    url: normalized,
    mediaType,
    headers: buildRefererHeaders(pageUrl),
    source,
  };
}

function normalizeProviderName(name = 'all') {
  const normalized = safeLower(name);
  if (!normalized || normalized === 'all') return 'all';
  if (normalized === 'redgifs' || normalized === 'redgif' || normalized === 'rgifs') return 'redgifs';
  if (normalized === 'xvideos') return 'xvideos';
  if (normalized === 'xnxx') return 'xnxx';
  return 'all';
}

function getProviderFromUrl(url = '') {
  try {
    const hostname = safeLower(new URL(url).hostname);
    if (hostname.includes('redgifs.com')) return 'redgifs';
    if (hostname.includes('xvideos.com')) return 'xvideos';
    if (hostname.includes('xnxx.com')) return 'xnxx';
    return null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value = '') {
  try {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function getJwtExpMs(token = '') {
  try {
    const segments = String(token).split('.');
    if (segments.length < 2) return 0;
    const payload = JSON.parse(decodeBase64Url(segments[1]));
    const exp = Number(payload?.exp || 0);
    if (!Number.isFinite(exp) || exp <= 0) return 0;
    return exp * 1000;
  } catch {
    return 0;
  }
}

async function getRedgifsToken(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    REDGIFS_TOKEN_CACHE.token &&
    REDGIFS_TOKEN_CACHE.expiresAt - now > REDGIFS_CONFIG.TOKEN_MIN_TTL_MS
  ) {
    return REDGIFS_TOKEN_CACHE.token;
  }

  const url = `${REDGIFS_CONFIG.API_BASE}${REDGIFS_CONFIG.AUTH_ENDPOINT}`;
  const response = await axios.get(url, {
    timeout: CONFIG.HTML_TIMEOUT,
    headers: {
      ...CONFIG.DEFAULT_HEADERS,
      Accept: 'application/json',
    },
    validateStatus: (status) => status < 500,
  });

  const token = String(response.data?.token || '').trim();
  if (response.status >= 400 || !token) {
    throw new Error(`Falha no auth do RedGifs (HTTP ${response.status})`);
  }

  REDGIFS_TOKEN_CACHE.token = token;
  REDGIFS_TOKEN_CACHE.expiresAt =
    getJwtExpMs(token) || now + REDGIFS_CONFIG.TOKEN_FALLBACK_TTL_MS;

  return token;
}

function waitForRedgifsRateLimit() {
  const minInterval = Math.max(
    0,
    Number(process.env.REDGIFS_MIN_REQUEST_INTERVAL_MS || REDGIFS_CONFIG.MIN_REQUEST_INTERVAL_MS),
  );

  if (minInterval <= 0) return Promise.resolve();

  const gate = redgifsRateGate.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, redgifsLastRequestAt + minInterval - now);
    if (waitMs > 0) {
      await wait(waitMs);
    }
    redgifsLastRequestAt = Date.now();
  });

  redgifsRateGate = gate.catch(() => {});
  return gate;
}

async function redgifsGet(endpoint, params = {}) {
  let token = await getRedgifsToken(false);
  const url = `${REDGIFS_CONFIG.API_BASE}${endpoint}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await waitForRedgifsRateLimit();
      const response = await axios.get(url, {
        params,
        timeout: CONFIG.HTML_TIMEOUT,
        headers: {
          ...CONFIG.DEFAULT_HEADERS,
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      const status = error?.response?.status || 0;
      if ((status === 401 || status === 403) && attempt === 0) {
        token = await getRedgifsToken(true);
        continue;
      }
      if (status === 429 && attempt === 0) {
        await wait(1200);
        continue;
      }
      throw new Error(error?.response?.data?.message || error.message || 'Erro na API RedGifs');
    }
  }

  throw new Error('Falha ao consultar API RedGifs');
}

function sanitizeQuery(query = '') {
  return String(query).replace(/\s+/g, ' ').trim();
}

function buildCommandQueries(commandName = '') {
  const normalized = safeLower(commandName);
  const mapped = COMMAND_TO_SEARCH_TERMS[normalized] || normalized;

  const variants = uniqueStrings([
    mapped,
    `${mapped} amateur`,
    `${mapped} real`,
  ]);

  return variants.slice(0, CONFIG.MAX_QUERIES_PER_COMMAND).filter((item) => item.length > 0);
}

async function getHtml(url) {
  const response = await axios.get(url, {
    timeout: CONFIG.HTML_TIMEOUT,
    headers: CONFIG.DEFAULT_HEADERS,
    responseType: 'text',
    maxRedirects: 5,
    validateStatus: (status) => status < 500,
  });

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.data;
}

async function validateUrlWithGET(url, extraHeaders = {}) {
  try {
    const response = await axios.get(url, {
      timeout: CONFIG.HEAD_TIMEOUT,
      headers: {
        ...CONFIG.DEFAULT_HEADERS,
        ...extraHeaders,
        Range: 'bytes=0-2047',
      },
      maxRedirects: 5,
      responseType: 'arraybuffer',
      validateStatus: (status) => status < 500,
    });

    const valid = response.status >= 200 && response.status < 400;
    const contentType = response.headers['content-type'] || 'unknown';

    return {
      valid,
      status: response.status,
      contentType,
      size: response.data ? response.data.length : 0,
      error: valid ? null : `HTTP ${response.status}`,
      method: 'GET (Range)',
    };
  } catch (error) {
    return {
      valid: false,
      status: error.response?.status || 0,
      contentType: 'unknown',
      size: 0,
      error: error.code || error.message,
      method: 'GET (Range)',
    };
  }
}

export async function validateUrl(url, extraHeaders = {}) {
  const cacheKey = getCacheKey(url, extraHeaders);

  if (URL_CACHE.has(cacheKey)) {
    return URL_CACHE.get(cacheKey);
  }

  try {
    const response = await axios.head(url, {
      timeout: CONFIG.HEAD_TIMEOUT,
      headers: {
        ...CONFIG.DEFAULT_HEADERS,
        ...extraHeaders,
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    const valid = response.status >= 200 && response.status < 400;
    const result = {
      valid,
      status: response.status,
      contentType: response.headers['content-type'] || 'unknown',
      size: parseInt(response.headers['content-length'] || '0', 10),
      error: valid ? null : `HTTP ${response.status}`,
      method: 'HEAD',
    };

    if (response.status === 404 || response.status === 405) {
      const fallback = await validateUrlWithGET(url, extraHeaders);
      URL_CACHE.set(cacheKey, fallback);
      return fallback;
    }

    URL_CACHE.set(cacheKey, result);
    return result;
  } catch {
    const fallback = await validateUrlWithGET(url, extraHeaders);
    URL_CACHE.set(cacheKey, fallback);
    return fallback;
  }
}

async function fetchMediaFromUrl(url, retries = CONFIG.RETRIES_PER_URL, options = {}) {
  const timeout = options.timeout || CONFIG.DOWNLOAD_TIMEOUT;
  const extraHeaders = options.headers || {};

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const buffer = await getBufferWithTimeout(
        url,
        {
          headers: {
            ...CONFIG.DEFAULT_HEADERS,
            ...extraHeaders,
          },
          maxRedirects: 5,
          maxContentLength: CONFIG.MAX_MEDIA_SIZE_BYTES,
          maxBodyLength: CONFIG.MAX_MEDIA_SIZE_BYTES,
        },
        timeout,
        0,
      );

      if (Buffer.isBuffer(buffer) && buffer.length > 0) {
        return buffer;
      }

      throw new Error('Buffer invalido ou vazio');
    } catch (error) {
      if (attempt >= retries - 1) break;
      const delay = CONFIG.RETRY_DELAYS[attempt] || CONFIG.RETRY_DELAYS[CONFIG.RETRY_DELAYS.length - 1];
      console.error(`[MediaFetcher] Falha download (${error.code || error.message}), retry em ${delay}ms`);
      await wait(delay);
    }
  }

  return null;
}

function buildResultWithMediaInfo(rawResult, explicitMediaType = null, explicitMime = null) {
  const mediaType = explicitMediaType || guessMediaType(rawResult.url, explicitMime || rawResult.mime || '');

  return {
    ...rawResult,
    mediaType,
    mime: explicitMime || rawResult.mime || 'application/octet-stream',
  };
}

export async function fetchMediaWithFallback(urls, validateFirst = true) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return null;
  }

  const uniqueUrls = uniqueStrings(urls);

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const url = uniqueUrls[index];

    let validation = {
      valid: true,
      contentType: 'unknown',
      error: null,
    };

    if (validateFirst) {
      validation = await validateUrl(url);
      if (!validation.valid) {
        continue;
      }
    }

    const buffer = await fetchMediaFromUrl(url, CONFIG.RETRIES_PER_URL);

    if (!buffer) {
      continue;
    }

    return buildResultWithMediaInfo({
      buffer,
      url,
      attempts: index + 1,
      size: buffer.length,
      source: 'fallback',
      mime: validation.contentType,
    });
  }

  return null;
}

async function searchXvideos(query, limit = CONFIG.MAX_RESULTS_PER_PROVIDER) {
  const url = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
  const html = await getHtml(url);
  const $ = cheerio.load(html);
  const rows = [];

  $('div.mozaique > div, div.mozaique div.thumb-block').each((_, element) => {
    const anchor = $(element).find('p.title a').first();
    const href = anchor.attr('href');
    const title = (anchor.attr('title') || anchor.text() || '').trim();

    if (!href || !title) return;

    const pageUrl = normalizeUrl('https://www.xvideos.com', href);
    if (!pageUrl) return;

    const thumb =
      $(element).find('img').attr('data-src') ||
      $(element).find('img').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    rows.push({
      source: 'xvideos',
      title,
      pageUrl,
      thumbnail: normalizeUrl(pageUrl, thumb),
    });
  });

  return uniqueBy(rows, (item) => item.pageUrl).slice(0, limit);
}

async function searchXnxx(query, limit = CONFIG.MAX_RESULTS_PER_PROVIDER) {
  const baseUrl = 'https://www.xnxx.com';
  const page = Math.floor(Math.random() * 2) + 1;
  const url = `${baseUrl}/search/${encodeURIComponent(query)}/${page}`;
  const html = await getHtml(url);
  const $ = cheerio.load(html);
  const rows = [];

  $('div.mozaique div.thumb-under').each((_, element) => {
    const anchor = $(element).find('a').first();
    const href = anchor.attr('href') || '';
    if (!href) return;

    const pageUrl = normalizeUrl(baseUrl, href.replace('/THUMBNUM/', '/'));
    if (!pageUrl) return;

    const title =
      (anchor.attr('title') ||
        anchor.text() ||
        $(element).find('span.title').text() ||
        $(element).find('.title').text() ||
        'Sem titulo')
        .trim();

    const thumb =
      $(element).closest('div.thumb-block').find('img').attr('data-src') ||
      $(element).closest('div.thumb-block').find('img').attr('src') ||
      null;

    rows.push({
      source: 'xnxx',
      title,
      pageUrl,
      thumbnail: normalizeUrl(pageUrl, thumb),
    });
  });

  return uniqueBy(rows, (item) => item.pageUrl).slice(0, limit);
}

async function parseXvideosPage(pageUrl) {
  const html = await getHtml(pageUrl);
  const $ = cheerio.load(html, { xmlMode: false });
  const scripts = $('script')
    .map((_, script) => $(script).html() || '')
    .get()
    .join('\n');

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    'Sem titulo';

  const durationSeconds = parseInt($('meta[property="og:duration"]').attr('content') || '0', 10);
  const views = $('span.nb_views').first().text().trim() || $('strong.mobile-hide').first().text().trim();
  const thumbnail = $('meta[property="og:image"]').attr('content') || null;

  const candidates = [];
  const regexes = [
    /setVideoUrlHigh\(['"]([^'"]+)['"]\)/g,
    /setVideoUrlLow\(['"]([^'"]+)['"]\)/g,
    /setVideoHLS\(['"]([^'"]+)['"]\)/g,
    /"contentUrl"\s*:\s*"([^"]+)"/g,
    /"url"\s*:\s*"(https?:\\\/\\\/[^\"]+\.(?:mp4|webm|gif)[^\"]*)"/g,
  ];

  for (const regex of regexes) {
    const matches = extractRegexMatches(scripts, regex);
    for (const match of matches) {
      const candidate = createCandidate(match, pageUrl, 'unknown', 'xvideos');
      if (candidate) candidates.push(candidate);
    }
  }

  $('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"], meta[property="twitter:player:stream"]').each((_, element) => {
    const value = $(element).attr('content');
    const candidate = createCandidate(value, pageUrl, 'video', 'xvideos');
    if (candidate) candidates.push(candidate);
  });

  $('video source').each((_, element) => {
    const value = $(element).attr('src');
    const candidate = createCandidate(value, pageUrl, 'video', 'xvideos');
    if (candidate) candidates.push(candidate);
  });

  if (thumbnail) {
    const thumbCandidate = createCandidate(thumbnail, pageUrl, 'image', 'xvideos');
    if (thumbCandidate) candidates.push(thumbCandidate);
  }

  return {
    source: 'xvideos',
    title,
    pageUrl,
    thumbnail: normalizeUrl(pageUrl, thumbnail),
    duration: durationSeconds,
    views,
    candidates: prioritizeCandidates(candidates),
  };
}

async function parseXnxxPage(pageUrl) {
  const html = await getHtml(pageUrl);
  const $ = cheerio.load(html, { xmlMode: false });
  const scripts = $('script')
    .map((_, script) => $(script).html() || '')
    .get()
    .join('\n');

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    'Sem titulo';

  const thumbnail = $('meta[property="og:image"]').attr('content') || null;
  const views =
    $('.nb_views').first().text().trim() ||
    $('.rating-box strong').first().text().trim() ||
    $('.metadata:contains("views")').first().text().trim();

  const candidates = [];
  const regexes = [
    /html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\);/g,
    /html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\);/g,
    /html5player\.setVideoHLS\(['"]([^'"]+)['"]\);/g,
    /"contentUrl"\s*:\s*"([^"]+)"/g,
    /"url"\s*:\s*"(https?:\\\/\\\/[^\"]+\.(?:mp4|webm|gif)[^\"]*)"/g,
  ];

  for (const regex of regexes) {
    const matches = extractRegexMatches(scripts, regex);
    for (const match of matches) {
      const candidate = createCandidate(match, pageUrl, 'unknown', 'xnxx');
      if (candidate) candidates.push(candidate);
    }
  }

  $('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"], meta[property="twitter:player:stream"]').each((_, element) => {
    const value = $(element).attr('content');
    const candidate = createCandidate(value, pageUrl, 'video', 'xnxx');
    if (candidate) candidates.push(candidate);
  });

  $('video source').each((_, element) => {
    const value = $(element).attr('src');
    const candidate = createCandidate(value, pageUrl, 'video', 'xnxx');
    if (candidate) candidates.push(candidate);
  });

  if (thumbnail) {
    const thumbCandidate = createCandidate(thumbnail, pageUrl, 'image', 'xnxx');
    if (thumbCandidate) candidates.push(thumbCandidate);
  }

  return {
    source: 'xnxx',
    title,
    pageUrl,
    thumbnail: normalizeUrl(pageUrl, thumbnail),
    duration: null,
    views,
    candidates: prioritizeCandidates(candidates),
  };
}

function extractRedgifsId(value = '') {
  const input = String(value || '').trim();
  if (!input) return null;

  if (!/^https?:\/\//i.test(input)) {
    const simple = input.match(/^[a-z0-9]+$/i)?.[0];
    return simple ? simple.toLowerCase() : null;
  }

  try {
    const parsed = new URL(input);
    const host = safeLower(parsed.hostname);

    if (host.includes('media.redgifs.com')) {
      const file = parsed.pathname.split('/').pop() || '';
      const match = file.match(/^([a-z0-9]+?)(?:-(?:silent|mobile|poster|thumbnail|vthumbnail))?\.(?:mp4|webm|gif|jpe?g|png)$/i);
      return match?.[1]?.toLowerCase() || null;
    }

    if (!host.includes('redgifs.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && ['watch', 'ifr'].includes(safeLower(parts[0]))) {
      return safeLower(parts[1]);
    }
    if (parts.length >= 1) return safeLower(parts[parts.length - 1]);
    return null;
  } catch {
    return null;
  }
}

function buildRedgifsWatchUrl(id = '') {
  const cleanId = safeLower(id);
  if (!cleanId) return null;
  return `https://www.redgifs.com/watch/${encodeURIComponent(cleanId)}`;
}

function redgifsTypeFromKey(key = '', url = '') {
  const lowerKey = safeLower(key);
  if (lowerKey.includes('poster') || lowerKey.includes('thumbnail')) return 'image';
  if (lowerKey.includes('gif')) return 'gif';
  if (['silent', 'hd', 'sd', 'mobile'].some((item) => lowerKey.includes(item))) return 'video';
  return guessMediaType(url);
}

function redgifsCandidatesFromUrls(pageUrl = '', urls = {}) {
  const list = [];
  for (const [key, value] of Object.entries(urls || {})) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue;
    const hint = redgifsTypeFromKey(key, value);
    const candidate = createCandidate(value, pageUrl, hint, 'redgifs');
    if (candidate) list.push(candidate);
  }
  return list;
}

async function searchRedgifs(query, limit = CONFIG.MAX_RESULTS_PER_PROVIDER, options = {}) {
  const normalizedQuery = sanitizeQuery(query);
  if (!normalizedQuery) return [];

  const perPage = Math.min(80, Math.max(5, Number(limit) || CONFIG.MAX_RESULTS_PER_PROVIDER));
  const page = Math.max(1, Number(options.page || 1));
  const order = options.order || 'trending';
  const payload = await redgifsGet('/gifs/search', {
    search_text: normalizedQuery,
    order,
    count: perPage,
    page,
  });

  const gifs = Array.isArray(payload?.gifs) ? payload.gifs : [];
  const rows = gifs
    .map((gif) => {
      const id = extractRedgifsId(gif?.id || gif?.urls?.html || '');
      if (!id) return null;

      const pageUrl = buildRedgifsWatchUrl(id);
      const urls = gif?.urls || {};
      const thumbnail = urls.poster || urls.thumbnail || urls.vthumbnail || null;
      const title =
        String(gif?.description || gif?.id || `RedGifs ${id}`).trim() || `RedGifs ${id}`;

      return {
        id,
        source: 'redgifs',
        title,
        pageUrl,
        thumbnail: normalizeUrl(pageUrl, thumbnail),
      };
    })
    .filter(Boolean);

  return uniqueBy(rows, (item) => item.id || item.pageUrl).slice(0, limit);
}

const NICHE_SLUGS = new Set([
  'amateur', 'anal', 'asian', 'bbc', 'bdsm', 'big-ass', 'big-tits',
  'blowjob', 'bondage', 'brunette', 'cosplay', 'creampie', 'cumshot',
  'dance', 'dildo', 'doggystyle', 'double-penetration', 'ebony',
  'feet', 'fingering', 'fitness', 'gangbang', 'hentai', 'interracial',
  'latina', 'lesbian', 'lingerie', 'masturbation', 'mature', 'milf',
  'oral', 'orgasm', 'pawg', 'petite', 'pov', 'public', 'pussy',
  'redhead', 'riding', 'rough', 'solo', 'squirt', 'stockings',
  'strapon', 'strip', 'teen', 'threesome', 'tik-tok', 'toys',
  'transgender', 'yoga',
]);

const NICHE_TERM_MAP = Object.freeze({
  bj: 'blowjob',
  mamada: 'blowjob',
  boquete: 'blowjob',
  oral: 'oral',
  lickdick: 'oral',
  lamberpau: 'oral',
  cummouth: 'oral',
  cummoth: 'oral',
  gozarnaboca: 'oral',
  'cum-in-mouth': 'oral',
  '69-position': 'oral',
  analsex: 'anal',
  violar: 'anal',
  'rough-anal': 'anal',
  cum: 'cumshot',
  gozar: 'cumshot',
  handjob: 'masturbation',
  punheta: 'masturbation',
  fap: 'masturbation',
  paja: 'masturbation',
  'male-masturbation': 'masturbation',
  yuri: 'lesbian',
  tijeras: 'lesbian',
  'lesbian-scissoring': 'lesbian',
  boobjob: 'big-tits',
  espanhola: 'big-tits',
  suckboobs: 'big-tits',
  grabboobs: 'big-tits',
  'sucking-tits': 'big-tits',
  'titty-fuck': 'big-tits',
  lickpussy: 'pussy',
  lamberbuceta: 'pussy',
  'eating-pussy': 'pussy',
  footjob: 'feet',
  lickass: 'anal',
  rimjob: 'anal',
  spank: 'bdsm',
  nalgada: 'bdsm',
  bater: 'bdsm',
  undress: 'strip',
  encuerar: 'strip',
  tirarroupa: 'strip',
  striptease: 'strip',
  hardcore: 'rough',
  'hardcore-sex': 'rough',
  doggystyle: 'doggystyle',
});

function normalizeNicheTerm(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function matchNicheSlug(query = '', mappedQuery = '') {
  const candidates = uniqueStrings([query, mappedQuery])
    .map((item) => normalizeNicheTerm(item))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (NICHE_SLUGS.has(candidate)) return candidate;
    if (NICHE_TERM_MAP[candidate]) return NICHE_TERM_MAP[candidate];

    const compact = candidate.replace(/-/g, '');
    for (const slug of NICHE_SLUGS) {
      if (slug.replace(/-/g, '') === compact) return slug;
    }

    const tokens = candidate.split('-').filter(Boolean);
    for (const token of tokens) {
      if (NICHE_SLUGS.has(token)) return token;
      if (NICHE_TERM_MAP[token]) return NICHE_TERM_MAP[token];
    }
  }

  return null;
}

export async function searchRedgifsNiches(niche, limit = CONFIG.MAX_RESULTS_PER_PROVIDER, options = {}) {
  const perPage = Math.min(80, Math.max(5, Number(limit) || CONFIG.MAX_RESULTS_PER_PROVIDER));
  const page = Math.max(1, Number(options.page || 1));
  const order = options.order || 'trending';

  const payload = await redgifsGet(`/niches/${encodeURIComponent(niche)}/gifs`, {
    order,
    count: perPage,
    page,
  });

  const gifs = Array.isArray(payload?.gifs) ? payload.gifs : [];
  const rows = gifs
    .map((gif) => {
      const id = extractRedgifsId(gif?.id || gif?.urls?.html || '');
      if (!id) return null;
      const pageUrl = buildRedgifsWatchUrl(id);
      const urls = gif?.urls || {};
      const thumbnail = urls.poster || urls.thumbnail || urls.vthumbnail || null;
      const title = String(gif?.description || gif?.id || `RedGifs ${id}`).trim() || `RedGifs ${id}`;
      return { id, source: 'redgifs', title, pageUrl, thumbnail: normalizeUrl(pageUrl, thumbnail) };
    })
    .filter(Boolean);

  return uniqueBy(rows, (item) => item.id || item.pageUrl).slice(0, limit);
}

async function parseRedgifsPage(pageUrl) {
  let parsedUrl = null;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    const idInput = extractRedgifsId(pageUrl);
    if (idInput) {
      const watchUrl = buildRedgifsWatchUrl(idInput);
      parsedUrl = watchUrl ? new URL(watchUrl) : null;
    }
  }

  if (!parsedUrl) {
    throw new Error('URL/ID do RedGifs invalido.');
  }

  const host = safeLower(parsedUrl.hostname);
  if (host.includes('media.redgifs.com')) {
    const direct = createCandidate(parsedUrl.href, parsedUrl.href, guessMediaType(parsedUrl.href), 'redgifs');
    if (!direct) throw new Error('Nao foi possivel usar a URL de midia do RedGifs.');

    const directId = extractRedgifsId(parsedUrl.href);
    const canonicalPage = directId ? buildRedgifsWatchUrl(directId) : parsedUrl.href;

    return {
      id: directId || null,
      source: 'redgifs',
      title: directId ? `RedGifs ${directId}` : 'RedGifs',
      pageUrl: canonicalPage,
      thumbnail: null,
      duration: null,
      views: null,
      candidates: prioritizeCandidates([direct]),
    };
  }

  const id = extractRedgifsId(parsedUrl.href);
  if (!id) {
    throw new Error('Nao foi possivel identificar o ID do RedGifs.');
  }

  const payload = await redgifsGet(`/gifs/${encodeURIComponent(id)}`);
  const gif = payload?.gif;
  if (!gif) {
    throw new Error('RedGifs nao retornou dados para este conteudo.');
  }

  const canonicalId = extractRedgifsId(gif?.id || id) || id;
  const canonicalPageUrl = buildRedgifsWatchUrl(canonicalId) || parsedUrl.href;
  const urls = gif?.urls || {};
  const candidates = redgifsCandidatesFromUrls(canonicalPageUrl, urls);

  return {
    id: canonicalId,
    source: 'redgifs',
    title: String(gif?.description || gif?.id || `RedGifs ${canonicalId}`).trim() || `RedGifs ${canonicalId}`,
    pageUrl: canonicalPageUrl,
    thumbnail: normalizeUrl(canonicalPageUrl, urls.poster || urls.thumbnail || null),
    duration: Number(gif?.duration || 0) || null,
    views: gif?.views || gif?.likes || null,
    candidates: prioritizeCandidates(candidates),
  };
}

function normalizeIdList(list = []) {
  if (!Array.isArray(list)) return [];
  return uniqueStrings(list.map((item) => safeLower(item)));
}

async function fetchFromRedgifsUnique(commandName, options = {}) {
  const allowedMediaTypes = normalizeAllowedMediaTypes(options.allowedMediaTypes);
  const usedIdSet = new Set(normalizeIdList(options.excludeIds || options.usedIds || []));
  const maxPages = Math.max(1, Math.min(20, Number(options.maxPages || 6)));
  const perPage = Math.max(
    CONFIG.MAX_RESULTS_PER_PROVIDER,
    Math.min(80, Number(options.perPage || 30)),
  );

  const normalizedCommand = safeLower(commandName);
  const mappedQuery = COMMAND_TO_SEARCH_TERMS[normalizedCommand] || normalizedCommand;
  const nicheSlug = matchNicheSlug(options.nicheOverride || commandName, mappedQuery);
  const queries = buildCommandQueries(commandName);

  const sources = [];
  if (nicheSlug) {
    sources.push({ type: 'niche', value: nicheSlug });
  }
  for (const q of queries) {
    sources.push({ type: 'search', value: q });
  }
  const uniqueSources = uniqueBy(sources, (item) => `${item.type}:${safeLower(item.value)}`);

  for (const src of uniqueSources) {
    for (let page = 1; page <= maxPages; page += 1) {
      let rows = [];
      try {
        if (src.type === 'niche') {
          rows = await searchRedgifsNiches(src.value, perPage, { page, order: 'trending' });
        } else {
          rows = await searchRedgifs(src.value, perPage, { page, order: 'trending' });
        }
      } catch (error) {
        console.error(`[MediaFetcher] RedGifs ${src.type} falhou (${src.value}, p=${page}): ${error.message}`);
        continue;
      }

      if (!rows.length) continue;

      // Camada 1: remove duplicados da resposta da API (por ID).
      const uniqueRows = uniqueBy(rows, (item) => item.id || item.pageUrl);
      // Camada 2: remove IDs já enviados no histórico interno.
      const unseenRows = uniqueRows.filter((item) => {
        const id = safeLower(item.id || extractRedgifsId(item.pageUrl) || '');
        return id && !usedIdSet.has(id);
      });

      if (!unseenRows.length) continue;

      // Escolhe de forma aleatória somente entre itens inéditos.
      const shuffledRows = shuffle(unseenRows);
      for (const row of shuffledRows) {
        try {
          const parsed = await parseRedgifsPage(row.pageUrl);
          const currentId = safeLower(parsed?.id || row.id || extractRedgifsId(row.pageUrl) || '');
          if (!currentId || usedIdSet.has(currentId)) continue;

          const candidates = prioritizeCandidates(parsed.candidates).slice(
            0,
            CONFIG.MAX_CANDIDATES_PER_PAGE,
          );

          for (const candidate of candidates) {
            const result = await tryDownloadCandidate(candidate, `${parsed.source}:page`, {
              allowedMediaTypes,
            });
            if (!result) continue;

            usedIdSet.add(currentId);
            return {
              ...result,
              id: currentId,
              title: parsed.title,
              pageUrl: parsed.pageUrl,
              thumbnail: parsed.thumbnail,
              duration: parsed.duration,
            };
          }
        } catch (error) {
          console.error(`[MediaFetcher] Falha RedGifs item ${row.pageUrl}: ${error.message}`);
        }
      }
    }
  }

  return null;
}

const PROVIDERS = {
  redgifs: {
    name: 'RedGifs',
    search: searchRedgifs,
    parsePage: parseRedgifsPage,
  },
  xvideos: {
    name: 'XVideos',
    search: searchXvideos,
    parsePage: parseXvideosPage,
  },
  xnxx: {
    name: 'XNXX',
    search: searchXnxx,
    parsePage: parseXnxxPage,
  },
};

function getProviderNames(source = 'all') {
  if (Array.isArray(source)) {
    return source
      .map((item) => normalizeProviderName(item))
      .filter((item) => item !== 'all' && PROVIDERS[item]);
  }

  const normalized = normalizeProviderName(source);
  if (normalized === 'all') return Object.keys(PROVIDERS);

  return PROVIDERS[normalized] ? [normalized] : Object.keys(PROVIDERS);
}

export async function searchNsfwVideos(query, options = {}) {
  const providerNames = getProviderNames(options.source || 'all');
  const limit = Math.max(1, Number(options.limit || 10));
  const normalizedQuery = sanitizeQuery(query);

  if (!normalizedQuery) return [];

  const aggregated = [];

  for (const providerName of providerNames) {
    try {
      const rows = await PROVIDERS[providerName].search(normalizedQuery, limit);
      aggregated.push(...rows.map((row) => ({ ...row, provider: providerName })));
    } catch (error) {
      console.error(`[MediaFetcher] Falha na busca ${providerName}: ${error.message}`);
    }
  }

  return uniqueBy(aggregated, (item) => item.pageUrl).slice(0, limit);
}

export async function resolveNsfwVideo(pageUrl) {
  const providerName = getProviderFromUrl(pageUrl);

  if (!providerName || !PROVIDERS[providerName]) {
    throw new Error('Fonte nao suportada. Use URL do RedGifs, XVideos ou XNXX.');
  }

  const parsed = await PROVIDERS[providerName].parsePage(pageUrl);

  if (!parsed.candidates || parsed.candidates.length === 0) {
    throw new Error('Nao foi possivel extrair links de midia desta pagina.');
  }

  return parsed;
}

function normalizeStaticKeys(commandName = '') {
  const normalized = safeLower(commandName);
  const keys = [normalized];

  if (normalized === 'cummouth') keys.push('cummoth');
  if (normalized === 'cummoth') keys.push('cummouth');
  if (normalized === 'sixnine') keys.push('69');
  if (normalized === '69') keys.push('sixnine');

  return uniqueStrings(keys);
}

async function fetchFromStaticUrls(commandName, nsfwData = {}, options = {}) {
  const allowedMediaTypes = normalizeAllowedMediaTypes(options.allowedMediaTypes);
  if (!nsfwData || typeof nsfwData !== 'object') return null;

  const keys = normalizeStaticKeys(commandName);
  const staticUrls = uniqueStrings(
    keys.flatMap((key) => (Array.isArray(nsfwData[key]) ? nsfwData[key] : [])),
  );

  if (staticUrls.length === 0) return null;

  const sample = shuffle(staticUrls).slice(0, CONFIG.MAX_STATIC_URLS_TO_TRY);

  for (const url of sample) {
    const validation = await validateUrl(url);
    if (!validation.valid || !isSupportedMediaUrl(url, validation.contentType)) {
      continue;
    }

    const mediaType = guessMediaType(url, validation.contentType);
    if (!isAllowedMediaType(mediaType, allowedMediaTypes)) {
      continue;
    }

    const buffer = await fetchMediaFromUrl(url, 2);
    if (!buffer) continue;

    return buildResultWithMediaInfo(
      {
        buffer,
        url,
        source: 'static',
        size: buffer.length,
        mime: validation.contentType,
        attempts: 1,
      },
      mediaType,
      validation.contentType,
    );
  }

  return null;
}

async function tryDownloadCandidate(candidate, fallbackSource, options = {}) {
  const allowedMediaTypes = normalizeAllowedMediaTypes(options.allowedMediaTypes);
  if (!candidate || !candidate.url) return null;
  if (isStreamPlaylist(candidate.url)) return null;

  const validation = await validateUrl(candidate.url, candidate.headers || {});

  if (!validation.valid) return null;
  if (!isSupportedMediaUrl(candidate.url, validation.contentType)) return null;
  const mediaType = guessMediaType(candidate.url, validation.contentType);
  if (!isAllowedMediaType(mediaType, allowedMediaTypes)) return null;

  const buffer = await fetchMediaFromUrl(candidate.url, 2, {
    headers: candidate.headers || {},
  });

  if (!buffer) return null;

  return buildResultWithMediaInfo(
    {
      buffer,
      url: candidate.url,
      source: fallbackSource,
      size: buffer.length,
      attempts: 1,
      mime: validation.contentType,
    },
    mediaType,
    validation.contentType,
  );
}

async function fetchFromRealProviders(commandName, options = {}) {
  const allowedMediaTypes = normalizeAllowedMediaTypes(options.allowedMediaTypes);
  const queries = buildCommandQueries(commandName);
  const providerNames = getProviderNames(options.source || 'all');

  for (const query of queries) {
    const searchRows = [];

    for (const providerName of providerNames) {
      try {
        const rows = await PROVIDERS[providerName].search(query, CONFIG.MAX_RESULTS_PER_PROVIDER);
        searchRows.push(...rows);
      } catch (error) {
        console.error(`[MediaFetcher] Busca falhou (${providerName}): ${error.message}`);
      }
    }

    if (searchRows.length === 0) continue;

    const pagesToTry = shuffle(uniqueBy(searchRows, (item) => item.pageUrl)).slice(
      0,
      CONFIG.MAX_PAGES_TO_TRY_PER_QUERY,
    );

    for (const page of pagesToTry) {
      try {
        const parsed = await resolveNsfwVideo(page.pageUrl);
        const candidates = prioritizeCandidates(parsed.candidates).slice(0, CONFIG.MAX_CANDIDATES_PER_PAGE);

        for (const candidate of candidates) {
          const result = await tryDownloadCandidate(candidate, `${parsed.source}:page`, {
            allowedMediaTypes,
          });
          if (result) {
            return {
              ...result,
              title: parsed.title,
              pageUrl: parsed.pageUrl,
              thumbnail: parsed.thumbnail,
            };
          }
        }
      } catch (error) {
        console.error(`[MediaFetcher] Falha ao resolver pagina ${page.pageUrl}: ${error.message}`);
      }
    }
  }

  return null;
}

export async function fetchNsfwMedia(commandName, nsfwData, options = {}) {
  const normalized = safeLower(commandName);
  if (!normalized) return null;
  const allowedMediaTypes = normalizeAllowedMediaTypes(options.allowedMediaTypes);
  const source = options.source || 'redgifs';
  const allowStaticFallback = options.allowStaticFallback !== false;
  const uniqueIds = options.uniqueIds === true;

  console.log(
    `[MediaFetcher] Iniciando fetch NSFW real para: ${normalized} (fonte: ${source}, tipos: ${allowedMediaTypes.join(', ')})`,
  );

  let realResult = null;
  if (source === 'redgifs' && uniqueIds) {
    realResult = await fetchFromRedgifsUnique(normalized, {
      allowedMediaTypes,
      excludeIds: options.excludeIds || [],
      maxPages: options.maxPages,
      perPage: options.perPage,
      nicheOverride: options.nicheOverride || commandName,
    });
  } else {
    realResult = await fetchFromRealProviders(normalized, { allowedMediaTypes, source });
  }

  if (realResult) {
    return realResult;
  }

  if (!allowStaticFallback) {
    console.error(`[MediaFetcher] Nenhuma fonte real disponivel para: ${normalized} (sem fallback estatico)`);
    return null;
  }

  console.log('[MediaFetcher] Fontes reais falharam, tentando urls estaticas...');

  const staticResult = await fetchFromStaticUrls(normalized, nsfwData, { allowedMediaTypes });
  if (staticResult) {
    return staticResult;
  }

  console.error(`[MediaFetcher] Nenhuma fonte disponivel para: ${normalized}`);
  return null;
}

export async function fetchMediaSafe(url, options = {}) {
  const {
    validateFirst = true,
    retries = CONFIG.RETRIES_PER_URL,
    timeout = CONFIG.DOWNLOAD_TIMEOUT,
    headers = {},
    logPrefix = '[MediaFetcher]',
  } = options;

  if (!url) return null;

  if (validateFirst) {
    const validation = await validateUrl(url, headers);
    if (!validation.valid) {
      console.error(`${logPrefix} URL invalida: ${validation.error}`);
      return null;
    }
  }

  const buffer = await fetchMediaFromUrl(url, retries, {
    timeout,
    headers,
  });

  if (!buffer) {
    console.error(`${logPrefix} Falha ao baixar: ${url}`);
    return null;
  }

  return buffer;
}

export function setConfig(key, value) {
  if (Object.prototype.hasOwnProperty.call(CONFIG, key)) {
    CONFIG[key] = value;
    console.log(`[MediaFetcher] Config atualizada: ${key}=${value}`);
  }
}

export default {
  fetchMediaWithFallback,
  fetchNsfwMedia,
  fetchMediaSafe,
  validateUrl,
  searchRedgifsNiches,
  searchNsfwVideos,
  resolveNsfwVideo,
  setConfig,
};
