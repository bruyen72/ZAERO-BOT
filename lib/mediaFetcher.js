import axios from 'axios';
import cheerio from 'cheerio';
import { getBufferWithTimeout } from './fetchWithTimeout.js';

const CONFIG = {
  HEAD_TIMEOUT: 7000,
  HTML_TIMEOUT: 15000,
  DOWNLOAD_TIMEOUT: 30000,
  RETRIES_PER_URL: 3,
  RETRY_DELAYS: [1000, 2500, 5000],
  MAX_MEDIA_SIZE_BYTES: 50 * 1024 * 1024,
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
  blowjob: 'blowjob deepthroat',
  mamada: 'blowjob deepthroat',
  bj: 'blowjob deepthroat',
  boquete: 'blowjob deepthroat',
  chupar: 'blowjob deepthroat',
  chupada: 'blowjob deepthroat',
  lickdick: 'blowjob licking cock',
  lamberpau: 'blowjob licking cock',
  chuparpau: 'blowjob licking cock',
  cummouth: 'cum in mouth swallow',
  gozarnaboca: 'cum in mouth swallow',
  engolir: 'cum in mouth swallow',
  leitinho: 'cum in mouth swallow',

  // --- Penetracao ---
  anal: 'anal sex',
  violar: 'rough anal hardcore',
  cuzinho: 'anal sex amateur',
  fuck: 'fucking doggystyle hardcore',
  coger: 'fucking doggystyle hardcore',
  foder: 'fucking doggystyle hardcore',
  transar: 'fucking sex hardcore',
  trepar: 'fucking sex hardcore',
  sixnine: '69 oral mutual',
  '69': '69 oral mutual',

  // --- Maos e Masturbacao ---
  fap: 'male masturbation jerking off',
  paja: 'male masturbation jerking off',
  punheta: 'male masturbation jerking off',
  bronha: 'male masturbation jerking off',
  handjob: 'handjob stroking cock',
  siririca: 'female masturbation fingering',
  grope: 'groping tits grabbing',
  apalpar: 'groping tits grabbing',

  // --- Seios ---
  grabboobs: 'grabbing squeezing tits boobs',
  agarrarpeitos: 'grabbing squeezing tits boobs',
  peitos: 'big tits boobs bouncing',
  tetas: 'big tits boobs bouncing',
  suckboobs: 'sucking tits nipple licking boobs',
  chuparpeitos: 'sucking tits nipple licking boobs',
  chupartetas: 'sucking tits nipple licking boobs',
  boobjob: 'titfuck titty fuck boobs',
  espanhola: 'titfuck titty fuck boobs',

  // --- Feminino/Lesbico ---
  lickpussy: 'pussy licking eating pussy oral',
  lamberbuceta: 'pussy licking eating pussy oral',
  chuparbuceta: 'pussy licking eating pussy oral',
  yuri: 'lesbian scissoring tribbing',
  tijeras: 'lesbian scissoring tribbing',
  tesoura: 'lesbian scissoring tribbing',
  lesbica: 'lesbian scissoring tribbing',

  // --- Bunda / Ass ---
  bunda: 'big ass pawg twerking',
  bunduda: 'big ass pawg twerking',
  bundao: 'big ass pawg twerking',
  raba: 'big ass pawg twerking',
  rabuda: 'big ass pawg twerking',
  rabao: 'big ass pawg twerking',
  lickass: 'rimjob ass licking eating ass',
  lamberbunda: 'rimjob ass licking eating ass',
  chuparbunda: 'rimjob ass licking eating ass',

  // --- Cavalgar / Riding ---
  cavalgar: 'riding cowgirl reverse cowgirl',
  cavalgada: 'riding cowgirl reverse cowgirl',
  cavalgando: 'riding cowgirl reverse cowgirl',
  montar: 'riding cowgirl reverse cowgirl',

  // --- Facesitting ---
  sentarnacara: 'facesitting face sitting pussy',
  sentanacara: 'facesitting face sitting pussy',
  facesitting: 'facesitting face sitting pussy',

  // --- Creampie ---
  creampie: 'creampie cum inside',
  gozardentro: 'creampie cum inside',
  gozoudentro: 'creampie cum inside',
  leitinhodentro: 'creampie cum inside',

  // --- Outros/Fetiches ---
  cum: 'cumshot compilation',
  cumshot: 'cumshot facial compilation',
  gozar: 'cumshot compilation',
  gozada: 'cumshot facial compilation',
  spank: 'spanking slapping ass',
  nalgada: 'spanking slapping ass',
  bater: 'spanking slapping ass',
  tapa: 'spanking slapping ass',
  palmada: 'spanking slapping ass',
  undress: 'striptease stripping nude',
  encuerar: 'striptease stripping nude',
  tirarroupa: 'striptease stripping nude',
  pelada: 'striptease stripping nude',
  pelado: 'striptease stripping nude',
  footjob: 'footjob feet',
  pezinho: 'footjob feet',
};

const COMMAND_TO_REDGIFS_TAGS = {
  // --- Orais ---
  blowjob: 'blowjob,deepthroat,oral,sucking,facial',
  mamada: 'blowjob,deepthroat,oral,facial',
  bj: 'blowjob,deepthroat,oral',
  boquete: 'blowjob,deepthroat,oral',
  chupar: 'blowjob,deepthroat,oral,sucking',
  chupada: 'blowjob,deepthroat,oral',
  lickdick: 'blowjob,oral,deepthroat,licking cock',
  lamberpau: 'blowjob,oral,deepthroat,licking cock',
  chuparpau: 'blowjob,oral,deepthroat,sucking cock',
  cummouth: 'cum in mouth,cum swallow,blowjob,facial',
  gozarnaboca: 'cum in mouth,cum swallow,blowjob,facial',
  engolir: 'cum in mouth,cum swallow,blowjob',
  leitinho: 'cum in mouth,cum swallow,blowjob',

  // --- Anal ---
  anal: 'anal,anal creampie,rough anal',
  violar: 'anal,rough,hardcore,aggressive',
  cuzinho: 'anal,amateur,small ass',

  // --- Fuck ---
  fuck: 'fuck,doggystyle,sex,hardcore',
  coger: 'fuck,doggystyle,sex',
  foder: 'fuck,doggystyle,sex,hardcore',
  transar: 'fuck,sex,doggystyle,hardcore',
  trepar: 'fuck,sex,doggystyle',

  // --- 69 ---
  sixnine: '69 position,oral mutual',
  '69': '69 position,oral mutual',

  // --- Masturbacao ---
  fap: 'male masturbation,masturbating,solo male',
  paja: 'male masturbation,masturbating,solo',
  punheta: 'male masturbation,masturbating,jerking off',
  bronha: 'male masturbation,masturbating,solo',
  handjob: 'handjob,cock milking,stroking',
  siririca: 'fingering,masturbating,solo female',
  grope: 'groping,big tits,boobs,squeezing',
  apalpar: 'groping,big tits,boobs',

  // --- Seios ---
  grabboobs: 'big tits,boobs,groping,squeezing',
  agarrarpeitos: 'big tits,boobs,groping,squeezing',
  peitos: 'big tits,boobs,bouncing tits,natural tits',
  tetas: 'big tits,boobs,bouncing tits',
  suckboobs: 'sucking tits,big tits,boobs,nipple licking',
  chuparpeitos: 'sucking tits,big tits,boobs',
  chupartetas: 'sucking tits,big tits,boobs',
  boobjob: 'titfuck,titty fuck,big tits,espanhola',
  espanhola: 'titfuck,titty fuck,big tits,espanhola',

  // --- Pussy ---
  lickpussy: 'pussy licking,pussy eating,oral',
  lamberbuceta: 'pussy licking,pussy eating,oral',
  chuparbuceta: 'pussy licking,pussy eating,oral',

  // --- Lesbico ---
  yuri: 'lesbian,scissoring,tribbing,girl on girl',
  tijeras: 'lesbian,scissoring,tribbing',
  tesoura: 'lesbian,scissoring,tribbing',
  lesbica: 'lesbian,scissoring,tribbing',

  // --- Bunda / Ass ---
  bunda: 'big ass,pawg,ass,twerking,thick',
  bunduda: 'big ass,pawg,ass,twerking',
  bundao: 'big ass,pawg,ass,twerking',
  raba: 'big ass,pawg,ass,twerking',
  rabuda: 'big ass,pawg,ass,twerking',
  rabao: 'big ass,pawg,ass,twerking',
  lickass: 'rimjob,ass eating,asslicking',
  lamberbunda: 'rimjob,ass eating,asslicking',
  chuparbunda: 'rimjob,ass eating,asslicking',

  // --- Cavalgar / Riding ---
  cavalgar: 'riding,cowgirl,reverse cowgirl',
  cavalgada: 'riding,cowgirl,reverse cowgirl',
  cavalgando: 'riding,cowgirl,reverse cowgirl',
  montar: 'riding,cowgirl,reverse cowgirl',

  // --- Facesitting ---
  sentarnacara: 'facesitting,pussy,ass',
  sentanacara: 'facesitting,pussy,ass',
  facesitting: 'facesitting,pussy,ass',

  // --- Creampie ---
  creampie: 'creampie,cum,anal creampie,cum inside',
  gozardentro: 'creampie,cum,anal creampie',
  gozoudentro: 'creampie,cum,anal creampie',
  leitinhodentro: 'creampie,cum,anal creampie',

  // --- Cum ---
  cum: 'cumshot,cum,compilation',
  cumshot: 'cumshot,cum,facial,heavy cum',
  gozar: 'cumshot,cum',
  gozada: 'cumshot,cum,facial',

  // --- Spank ---
  spank: 'spanking,spanked,slapping,ass slap',
  nalgada: 'spanking,spanked,slapping',
  bater: 'spanking,spanked,slapping',
  tapa: 'spanking,spanked,slapping',
  palmada: 'spanking,spanked,slapping',

  // --- Strip ---
  undress: 'striptease,stripping,strip,nude',
  encuerar: 'striptease,stripping,strip',
  tirarroupa: 'striptease,stripping,strip',
  pelada: 'striptease,stripping,strip',
  pelado: 'striptease,stripping,strip',

  // --- Feet ---
  footjob: 'footjob,feet,feet fetish,toes',
  pezinho: 'footjob,feet,feet fetish',
};

const URL_CACHE = new Map();
const REDGIFS_TOKEN_CACHE = {
  token: null,
  expiresAt: 0,
};
const REDGIFS_NICHE_FAIL_CACHE = new Map();

const REDGIFS_CONFIG = {
  API_BASE: 'https://api.redgifs.com/v2',
  AUTH_ENDPOINT: '/auth/temporary',
  TOKEN_FALLBACK_TTL_MS: 30 * 60 * 1000,
  TOKEN_MIN_TTL_MS: 20 * 1000,
  MIN_REQUEST_INTERVAL_MS: 600,
  NICHE_COOLDOWN_MS: 10 * 60 * 1000,
};

let redgifsRateGate = Promise.resolve();
let redgifsLastRequestAt = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRedgifsNicheCooldownMs() {
  const raw = Number(process.env.REDGIFS_NICHE_COOLDOWN_MS || REDGIFS_CONFIG.NICHE_COOLDOWN_MS);
  if (!Number.isFinite(raw) || raw <= 0) return REDGIFS_CONFIG.NICHE_COOLDOWN_MS;
  return Math.floor(raw);
}

function isRedgifsNicheCoolingDown(niche = '') {
  const key = safeLower(niche);
  if (!key) return false;
  const until = Number(REDGIFS_NICHE_FAIL_CACHE.get(key) || 0);
  return until > Date.now();
}

function markRedgifsNicheFailure(niche = '') {
  const key = safeLower(niche);
  if (!key) return;
  const cooldownMs = getRedgifsNicheCooldownMs();
  REDGIFS_NICHE_FAIL_CACHE.set(key, Date.now() + cooldownMs);
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
  const url = safeLower(candidate.url);

  if (candidate.mediaType === 'video') {
    score = 5;
    if (url.includes('.mp4')) score -= 2;
    if (url.includes('-mobile.mp4')) score += 1;
    if (url.includes('-silent.mp4')) score += 2;
    if (url.includes('hd.mp4') || url.includes('-hd')) score -= 1;
  }
  
  if (candidate.mediaType === 'gif') score = 8;
  if (candidate.mediaType === 'image') score = 12;
  if (candidate.mediaType === 'unknown') score = 15;

  if (isStreamPlaylist(url)) score += 50;
  
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
  return 'all';
}

function getProviderFromUrl(url = '') {
  try {
    const hostname = safeLower(new URL(url).hostname);
    if (hostname.includes('redgifs.com')) return 'redgifs';
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
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      await waitForRedgifsRateLimit();
      const response = await axios.get(url, {
        params,
        timeout: CONFIG.HTML_TIMEOUT,
        maxRedirects: 5,
        headers: {
          ...CONFIG.DEFAULT_HEADERS,
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status < 500,
      });

      if (response.status === 301 || response.status === 302) {
        console.warn(`[RedGifs] Redirect ${response.status} for ${endpoint}`);
        return response.data || { gifs: [] };
      }

      if (response.status === 404) {
        console.warn(`[RedGifs] 404 Not Found for ${endpoint}`);
        return { gifs: [] };
      }

      if ((response.status === 401 || response.status === 403) && attempt === 0) {
        token = await getRedgifsToken(true);
        continue;
      }

      if (response.status === 429) {
        const backoffMs = 2000 * Math.pow(2, attempt);
        console.warn(`[RedGifs] Rate limited (429), backoff ${backoffMs}ms (attempt ${attempt + 1})`);
        await wait(backoffMs);
        continue;
      }

      if (response.status >= 400) {
        throw new Error(`RedGifs API HTTP ${response.status} for ${endpoint}`);
      }

      return response.data;
    } catch (error) {
      const status = error?.response?.status || 0;

      if ((status === 401 || status === 403) && attempt === 0) {
        token = await getRedgifsToken(true);
        continue;
      }
      if (status === 429) {
        const backoffMs = 2000 * Math.pow(2, attempt);
        console.warn(`[RedGifs] Rate limited (429 error), backoff ${backoffMs}ms`);
        await wait(backoffMs);
        continue;
      }
      if (status === 404) {
        return { gifs: [] };
      }

      if (attempt >= MAX_ATTEMPTS - 1) {
        throw new Error(error?.response?.data?.message || error.message || 'Erro na API RedGifs');
      }
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
      const errorText = `${error?.code || ''} ${error?.message || ''}`;
      if (/max(Content|Body)Length/i.test(errorText)) {
        console.warn(`[MediaFetcher] Download abortado por limite de tamanho: ${error?.message || error?.code}`);
        break;
      }

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
  const normalizedTags = sanitizeQuery(options.tags || '');
  if (!normalizedQuery && !normalizedTags) return [];

  const perPage = Math.min(80, Math.max(5, Number(limit) || CONFIG.MAX_RESULTS_PER_PROVIDER));
  const page = Math.max(1, Number(options.page || 1));
  const order = options.order || 'trending';
  const payload = await redgifsGet('/gifs/search', {
    type: 'g',
    order,
    count: perPage,
    page,
    ...(normalizedTags ? { tags: normalizedTags } : {}),
    ...(normalizedQuery ? { search_text: normalizedQuery } : {}),
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
        tags: normalizeRedgifsTagList(gif?.tags),
      };
    })
    .filter(Boolean);

  return uniqueBy(rows, (item) => item.id || item.pageUrl).slice(0, limit);
}

const NICHE_SLUGS = new Set([
  'amateur', 'anal', 'asian', 'bbc', 'bdsm', 'big-ass', 'big-tits',
  'blowjob', 'bondage', 'brunette', 'cosplay', 'creampie', 'cumshot',
  'dance', 'deepthroat', 'dildo', 'doggystyle', 'double-penetration', 'ebony',
  'facesitting', 'feet', 'fingering', 'fitness', 'gangbang', 'handjob',
  'hentai', 'interracial',
  'latina', 'lesbian', 'lingerie', 'massage', 'masturbation', 'mature', 'milf',
  'oral', 'orgasm', 'pawg', 'petite', 'pov', 'public', 'pussy',
  'redhead', 'riding', 'rimjob', 'rough', 'solo', 'spanking', 'squirt',
  'stockings', 'strapon', 'strip', 'teen', 'threesome', 'tik-tok', 'titfuck',
  'toys', 'transgender', 'twerking', 'yoga',
]);

const NICHE_TERM_MAP = Object.freeze({
  // --- Oral/Blowjob ---
  bj: 'blowjob',
  mamada: 'blowjob',
  boquete: 'blowjob',
  chupar: 'blowjob',
  chupada: 'blowjob',
  chuparpau: 'blowjob',
  'sucking-dick': 'blowjob',
  oral: 'oral',
  lickdick: 'blowjob',
  lamberpau: 'blowjob',
  deepthroat: 'deepthroat',
  'deep-throat': 'deepthroat',
  gagging: 'deepthroat',

  // --- Cum ---
  cummouth: 'cumshot',
  cummoth: 'cumshot',
  gozarnaboca: 'cumshot',
  engolir: 'cumshot',
  leitinho: 'cumshot',
  'cum-in-mouth': 'cumshot',
  cum: 'cumshot',
  gozar: 'cumshot',
  gozada: 'cumshot',
  'cumshot-compilation': 'cumshot',
  facial: 'cumshot',

  // --- 69 ---
  '69-position': 'oral',
  sixnine: 'oral',

  // --- Anal ---
  analsex: 'anal',
  violar: 'anal',
  cuzinho: 'anal',
  'rough-anal': 'anal',
  'anal-sex': 'anal',
  lickass: 'rimjob',
  lamberbunda: 'rimjob',
  chuparbunda: 'rimjob',
  rimjob: 'rimjob',
  'ass-eating': 'rimjob',
  asslicking: 'rimjob',

  // --- Handjob ---
  handjob: 'handjob',
  punheta: 'handjob',
  'cock-milking': 'handjob',

  // --- Masturbacao ---
  fap: 'masturbation',
  paja: 'masturbation',
  bronha: 'masturbation',
  siririca: 'masturbation',
  'male-masturbation': 'masturbation',
  'jerking-off': 'masturbation',

  // --- Lesbico ---
  yuri: 'lesbian',
  tijeras: 'lesbian',
  tesoura: 'lesbian',
  lesbica: 'lesbian',
  'lesbian-scissoring': 'lesbian',
  scissoring: 'lesbian',
  tribbing: 'lesbian',

  // --- Seios ---
  boobjob: 'titfuck',
  espanhola: 'titfuck',
  'titty-fuck': 'titfuck',
  titfuck: 'titfuck',
  suckboobs: 'big-tits',
  grabboobs: 'big-tits',
  peitos: 'big-tits',
  tetas: 'big-tits',
  chuparpeitos: 'big-tits',
  chupartetas: 'big-tits',
  agarrarpeitos: 'big-tits',
  'squeezing-tits': 'big-tits',
  'sucking-tits': 'big-tits',

  // --- Pussy ---
  lickpussy: 'pussy',
  lamberbuceta: 'pussy',
  chuparbuceta: 'pussy',
  'eating-pussy': 'pussy',
  'pussy-licking': 'pussy',
  'pussy-eating': 'pussy',

  // --- Facesitting ---
  facesitting: 'facesitting',
  sentarnacara: 'facesitting',
  sentanacara: 'facesitting',

  // --- Bunda / Big Ass ---
  bunda: 'big-ass',
  bunduda: 'big-ass',
  bundao: 'big-ass',
  raba: 'big-ass',
  rabuda: 'big-ass',
  rabao: 'big-ass',
  'big-ass': 'big-ass',
  pawg: 'pawg',

  // --- Feet ---
  footjob: 'feet',
  pezinho: 'feet',
  'feet-fetish': 'feet',

  // --- Spanking/BDSM ---
  spank: 'spanking',
  nalgada: 'spanking',
  bater: 'spanking',
  tapa: 'spanking',
  palmada: 'spanking',
  spanking: 'spanking',
  'belt-spanking': 'spanking',
  slapping: 'spanking',
  bdsm: 'bdsm',
  bondage: 'bondage',
  choking: 'bdsm',

  // --- Strip ---
  undress: 'strip',
  encuerar: 'strip',
  tirarroupa: 'strip',
  pelada: 'strip',
  pelado: 'strip',
  striptease: 'strip',
  stripping: 'strip',

  // --- Fuck/Hardcore ---
  'hardcore-sex': 'rough',
  hardcore: 'rough',
  fuck: 'doggystyle',
  foder: 'doggystyle',
  coger: 'doggystyle',
  transar: 'doggystyle',
  trepar: 'doggystyle',
  doggystyle: 'doggystyle',

  // --- Riding ---
  riding: 'riding',
  cavalgar: 'riding',
  cavalgada: 'riding',
  cavalgando: 'riding',
  montar: 'riding',
  cowgirl: 'riding',
  'reverse-cowgirl': 'riding',

  // --- Groping ---
  grope: 'big-tits',
  apalpar: 'big-tits',
  groping: 'big-tits',

  // --- Massage ---
  massage: 'massage',
  'erotic-massage': 'massage',

  // --- Twerking ---
  twerking: 'twerking',
  'ass-shaking': 'twerking',

  // --- Creampie ---
  creampie: 'creampie',
  gozardentro: 'creampie',
  gozoudentro: 'creampie',
  leitinhodentro: 'creampie',
  'cream-pie': 'creampie',

  // --- Squirt ---
  squirt: 'squirt',
  squirting: 'squirt',
});

function normalizeNicheTerm(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const REDGIFS_QUERY_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'with', 'sem', 'com', 'de', 'do', 'da', 'dos', 'das',
  'e', 'para', 'por', 'na', 'no', 'nas', 'nos', 'em', 'in', 'on', 'of', 'to',
  'redgif', 'redgifs', 'gif', 'gifs', 'video', 'videos',
]);

function normalizeRedgifsTag(value = '') {
  return normalizeNicheTerm(value);
}

function normalizeRedgifsTagList(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return uniqueStrings(
    list
      .map((entry) => {
        if (typeof entry === 'string') return normalizeRedgifsTag(entry);
        if (entry && typeof entry === 'object') {
          return normalizeRedgifsTag(entry.name || entry.text || entry.tag || entry.value || '');
        }
        return '';
      })
      .filter(Boolean),
  );
}

function splitQueryTerms(value = '') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return [];
  return uniqueStrings(normalized.split(/\s+/).filter(Boolean));
}

function mapRedgifsTermToCanonical(value = '') {
  const normalized = normalizeNicheTerm(value);
  if (!normalized) return null;

  if (NICHE_TERM_MAP[normalized]) return NICHE_TERM_MAP[normalized];
  if (NICHE_SLUGS.has(normalized)) return normalized;

  const mapped = COMMAND_TO_SEARCH_TERMS[normalized];
  if (mapped) {
    const normalizedMapped = normalizeNicheTerm(mapped);
    if (NICHE_TERM_MAP[normalizedMapped]) return NICHE_TERM_MAP[normalizedMapped];
    if (NICHE_SLUGS.has(normalizedMapped)) return normalizedMapped;
  }

  return null;
}

function buildRedgifsIntent(query = '', mappedQuery = '') {
  const cleanQuery = sanitizeQuery(query);
  const cleanMapped = sanitizeQuery(mappedQuery);
  const phraseCandidates = uniqueStrings([cleanQuery, cleanMapped].filter(Boolean));

  const phraseMatches = phraseCandidates.map((value) => ({
    value,
    canonical: mapRedgifsTermToCanonical(value),
  }));

  const tokenSourcePhrases = phraseMatches
    .filter((entry) => !entry.canonical)
    .map((entry) => entry.value);

  const tokenCandidates = uniqueStrings(tokenSourcePhrases.flatMap((item) => splitQueryTerms(item)));

  const canonicalTerms = uniqueStrings([
    ...phraseMatches.map((entry) => entry.canonical).filter(Boolean),
    ...tokenCandidates
      .filter((token) => token.length >= 2 && !REDGIFS_QUERY_STOPWORDS.has(token))
      .map((token) => mapRedgifsTermToCanonical(token))
      .filter(Boolean),
  ]);

  return {
    cleanQuery,
    cleanMapped,
    requiredTerms: canonicalTerms,
    niches: canonicalTerms.filter((term) => NICHE_SLUGS.has(term)),
  };
}

function buildRedgifsTagsQuery(intent = {}) {
  const canonicalTags = uniqueStrings(intent.requiredTerms || []).slice(0, 6);
  if (canonicalTags.length) return canonicalTags.join(',');

  const fallbackTokens = splitQueryTerms(intent.cleanQuery || intent.cleanMapped || '')
    .filter((token) => token.length >= 2 && !REDGIFS_QUERY_STOPWORDS.has(token))
    .slice(0, 6);
  return fallbackTokens.length ? fallbackTokens.join(',') : '';
}

function matchesRequiredRedgifsTerms(item = {}, requiredTerms = []) {
  if (!Array.isArray(requiredTerms) || requiredTerms.length === 0) return true;

  const normalizedTags = new Set(normalizeRedgifsTagList(item.tags || []));
  const normalizedText = normalizeNicheTerm(`${item.title || ''} ${item.pageUrl || ''}`);
  const normalizedTextTokens = new Set(normalizedText.split('-').filter(Boolean));

  return requiredTerms.every((term) => {
    if (normalizedTags.has(term)) return true;
    if (term.includes('-')) return normalizedText.includes(term);
    return normalizedTextTokens.has(term);
  });
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
  const cooldownMs = getRedgifsNicheCooldownMs();

  if (isRedgifsNicheCoolingDown(niche)) {
    return searchRedgifs(niche, limit, options);
  }

  let payload;
  try {
    payload = await redgifsGet(`/niches/${encodeURIComponent(niche)}/gifs`, {
      order,
      count: perPage,
      page,
    });
  } catch (error) {
    markRedgifsNicheFailure(niche);
    const status = Number(error?.response?.status || 0);
    const code = status > 0 ? `HTTP ${status}` : error?.message || 'erro desconhecido';
    console.warn(
      `[RedGifs] Rota /niches falhou para "${niche}" (${code}), fallback por ${Math.floor(cooldownMs / 1000)}s via /gifs/search...`,
    );
    try {
      return await searchRedgifs(niche, limit, options);
    } catch (fallbackErr) {
      console.error(`[RedGifs] Fallback de busca também falhou: ${fallbackErr.message}`);
      return [];
    }
  }

  const gifs = Array.isArray(payload?.gifs) ? payload.gifs : [];
  const rows = gifs
    .map((gif) => {
      const id = extractRedgifsId(gif?.id || gif?.urls?.html || '');
      if (!id) return null;
      const pageUrl = buildRedgifsWatchUrl(id);
      const urls = gif?.urls || {};
      const thumbnail = urls.poster || urls.thumbnail || urls.vthumbnail || null;
      const title = String(gif?.description || gif?.id || `RedGifs ${id}`).trim() || `RedGifs ${id}`;
      return {
        id,
        source: 'redgifs',
        title,
        pageUrl,
        thumbnail: normalizeUrl(pageUrl, thumbnail),
        tags: normalizeRedgifsTagList(gif?.tags),
      };
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
    tags: normalizeRedgifsTagList(gif?.tags),
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
  const maxPages = Math.max(1, Math.min(3, Number(options.maxPages || 2)));
  const perPage = Math.max(
    CONFIG.MAX_RESULTS_PER_PROVIDER,
    Math.min(80, Number(options.perPage || 30)),
  );

  const normalizedCommand = safeLower(commandName);
  const mappedQuery = COMMAND_TO_SEARCH_TERMS[normalizedCommand] || normalizedCommand;
  const intent = buildRedgifsIntent(options.nicheOverride || commandName, mappedQuery);
  const strictQuery = options.strictQuery === true;
  const nicheSlug = matchNicheSlug(options.nicheOverride || commandName, mappedQuery);
  const queries = strictQuery
    ? uniqueStrings([intent.cleanQuery, intent.cleanMapped]).filter(Boolean)
    : buildCommandQueries(commandName);

  const commandTags = COMMAND_TO_REDGIFS_TAGS[normalizedCommand] || '';
  const intentTags = buildRedgifsTagsQuery(intent);
  const tagsQuery = commandTags || intentTags;
  const requiredTerms = intent.requiredTerms;

  const sources = [];
  for (const niche of uniqueStrings([...(intent.niches || []), nicheSlug].filter(Boolean))) {
    sources.push({ type: 'niche', value: niche });
  }
  if (commandTags) {
    sources.push({
      type: 'search',
      value: mappedQuery || normalizedCommand,
      tags: commandTags,
    });
  }
  if (intentTags && intentTags !== commandTags) {
    sources.push({
      type: 'search',
      value: intent.cleanQuery || intent.cleanMapped || normalizedCommand,
      tags: intentTags,
    });
  }
  for (const q of queries) {
    sources.push({ type: 'search', value: q, tags: strictQuery ? tagsQuery : '' });
  }
  const uniqueSources = uniqueBy(
    sources,
    (item) => `${item.type}:${safeLower(item.value)}:${safeLower(item.tags || '')}`,
  );

  for (const src of uniqueSources) {
    for (let page = 1; page <= maxPages; page += 1) {
      let rows = [];
      try {
        if (src.type === 'niche') {
          rows = await searchRedgifsNiches(src.value, perPage, { page, order: 'trending' });
        } else {
          rows = await searchRedgifs(src.value, perPage, {
            page,
            order: 'trending',
            tags: src.tags || '',
          });
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

      const rowsMatchingTerms =
        requiredTerms.length > 0
          ? unseenRows.filter((item) => matchesRequiredRedgifsTerms(item, requiredTerms))
          : unseenRows;

      const rowsToUse = rowsMatchingTerms.length > 0 || strictQuery ? rowsMatchingTerms : unseenRows;
      if (!rowsToUse.length) continue;

      // Escolhe de forma aleatória somente entre itens inéditos.
      const shuffledRows = shuffle(rowsToUse);
      for (const row of shuffledRows) {
        try {
          const parsed = await parseRedgifsPage(row.pageUrl);
          const parsedTags = uniqueStrings([...(parsed?.tags || []), ...(row?.tags || [])]);
          const parsedWithTags = { ...parsed, tags: parsedTags, title: parsed?.title || row?.title };
          if (requiredTerms.length > 0 && !matchesRequiredRedgifsTerms(parsedWithTags, requiredTerms)) {
            continue;
          }
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
              tags: parsedTags,
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

  if (validation.size > 0 && validation.size > CONFIG.MAX_MEDIA_SIZE_BYTES) {
    console.warn(
      `[MediaFetcher] Candidate pulado: ${(validation.size / 1024 / 1024).toFixed(1)}MB > ${(CONFIG.MAX_MEDIA_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB`,
    );
    return null;
  }

  if (validation.size > 0 && validation.size > 18 * 1024 * 1024) {
    console.log(
      `[MediaFetcher] Candidate grande (${(validation.size / 1024 / 1024).toFixed(1)}MB), baixando para compressao posterior...`,
    );
  }

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
      strictQuery: options.strictQuery === true,
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
