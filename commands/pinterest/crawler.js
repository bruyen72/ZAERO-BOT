const REQUEST_TIMEOUT_MS = 20000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const AUTH_SESSION_TTL_MS = 20 * 60 * 1000;
const KNOWN_BAD_PINIMG_IDS = new Set(["d53b014d86a6b6761bf649a0ed813c2b"]);

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache",
};
const authSessionCache = new Map();

function clamp(value, min, max) {
  const num = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(num)) return min;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function looksLikeUrl(value) {
  const text = String(value || "").trim();
  return /^(https?:\/\/|www\.|pinterest\.|br\.pinterest\.|pt\.pinterest\.|pin\.it\/)/i.test(text);
}

function normalizeQueryOrUrl(queryOrUrl) {
  const raw = String(queryOrUrl || "").trim();
  if (!raw) {
    throw new Error("Termo ou link do Pinterest vazio.");
  }

  if (!looksLikeUrl(raw)) {
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(raw)}`;
    return { kind: "query", searchUrl, query: raw };
  }

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    const fallbackSearchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(raw)}`;
    return { kind: "query", searchUrl: fallbackSearchUrl, query: raw };
  }

  return {
    kind: "url",
    searchUrl: parsed.toString(),
    query: "",
  };
}

function cleanupEscapedUrl(text) {
  return String(text || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&")
    .replace(/\\/g, "")
    .trim();
}

function normalizePinimgUrl(input) {
  const cleaned = cleanupEscapedUrl(input).replace(/[)\]}>,]+$/, "");
  if (!cleaned) return "";

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch (_) {
    return "";
  }

  const host = String(parsed.hostname || "").toLowerCase();
  if (host !== "i.pinimg.com" && !host.endsWith(".pinimg.com")) {
    return "";
  }

  parsed.protocol = "https:";
  return parsed.toString();
}

function extractPinimgImageId(url) {
  const text = String(url || "");
  const match = text.match(/\/([a-f0-9]{32})\.(?:jpg|jpeg|png|webp|gif)(?:$|\?)/i);
  return match ? match[1].toLowerCase() : "";
}

function isKnownBadPinimgUrl(url) {
  const id = extractPinimgImageId(url);
  return Boolean(id && KNOWN_BAD_PINIMG_IDS.has(id));
}

function scorePinimgUrl(url) {
  const text = String(url || "").toLowerCase();
  let score = 0;

  if (text.includes("/originals/")) score += 60;
  if (text.includes("/736x/")) score += 50;
  if (text.includes("/564x/")) score += 45;
  if (text.includes("/474x/")) score += 35;
  if (text.includes("/236x/")) score += 20;
  if (/\.(jpg|jpeg|webp)(\?|$)/i.test(text)) score += 12;
  if (/\/(logo|favicon)\b/i.test(text)) score -= 200;
  if (isKnownBadPinimgUrl(text)) score -= 10000;

  return score;
}

function collectPinimgUrlsFromHtml(html) {
  const text = String(html || "");
  if (!text) return [];

  const matches = [];
  const regexes = [
    /https?:\/\/i\.pinimg\.com\/[a-z0-9_%/.\-]+?\.(?:jpg|jpeg|png|webp|gif)(?:\?[a-z0-9\-._~!$&'()*+,;=:@/?%]*)?/gi,
    /https?:\\\/\\\/i\.pinimg\.com\\\/[a-z0-9_%/.\-]+?\.(?:jpg|jpeg|png|webp|gif)(?:\\\?[a-z0-9\\\-._~!$&'()*+,;=:@/?%]*)?/gi,
  ];

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }
  }

  const unique = new Set();
  for (const raw of matches) {
    const normalized = normalizePinimgUrl(raw);
    if (!normalized) continue;
    if (isKnownBadPinimgUrl(normalized)) continue;
    unique.add(normalized);
  }

  return [...unique].sort((left, right) => scorePinimgUrl(right) - scorePinimgUrl(left));
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function parseBingCardMetadata(rawAttribute) {
  const decoded = decodeHtmlEntities(rawAttribute);
  if (!decoded || !decoded.includes('"murl"')) return null;
  try {
    return JSON.parse(decoded);
  } catch (_) {
    return null;
  }
}

async function collectPinimgUrlsFromBing(queryText, maxUrls = 120) {
  const query = String(queryText || "").trim();
  if (!query) return [];

  const searchQueries = [
    `${query} pinterest`,
    `${query} site:pinterest.com`,
  ];
  const collected = [];
  const seen = new Set();

  for (const item of searchQueries) {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(item)}`;
    let html = "";
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          ...DEFAULT_HEADERS,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!response.ok) continue;
      html = await response.text();
    } catch (_) {
      continue;
    }

    const attrMatches = [...html.matchAll(/\sm=\"([^\"]+)\"/gi)];
    for (const attrMatch of attrMatches) {
      const metadata = parseBingCardMetadata(attrMatch[1]);
      if (!metadata || typeof metadata.murl !== "string") continue;
      const normalized = normalizePinimgUrl(metadata.murl);
      if (!normalized || isKnownBadPinimgUrl(normalized) || seen.has(normalized)) continue;
      seen.add(normalized);
      collected.push(normalized);
      if (collected.length >= maxUrls) break;
    }

    if (collected.length >= maxUrls) break;
  }

  return collected.sort((left, right) => scorePinimgUrl(right) - scorePinimgUrl(left));
}

function mimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
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
    return "image/png";
  }
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.slice(0, 3).toString("ascii") === "GIF") return "image/gif";
  return "";
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getSetCookieValues(response) {
  try {
    if (response?.headers && typeof response.headers.getSetCookie === "function") {
      const values = response.headers.getSetCookie();
      if (Array.isArray(values)) return values;
    }
  } catch (_) {
    // Ignora APIs de header indisponiveis e usa fallback.
  }

  const raw = String(response?.headers?.get?.("set-cookie") || "").trim();
  if (!raw) return [];
  return raw
    .split(/,(?=[^;,=\s]+=[^;,]+)/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function applySetCookiesToJar(cookieJar, setCookieValues) {
  if (!cookieJar || !(cookieJar instanceof Map)) return;
  for (const rawCookie of setCookieValues || []) {
    const first = String(rawCookie || "").split(";")[0];
    const eqIndex = first.indexOf("=");
    if (eqIndex <= 0) continue;
    const name = first.slice(0, eqIndex).trim();
    const value = first.slice(eqIndex + 1).trim();
    if (!name) continue;
    if (!value || value.toLowerCase() === "deleted") {
      cookieJar.delete(name);
      continue;
    }
    cookieJar.set(name, value);
  }
}

function cookieJarToHeader(cookieJar) {
  if (!cookieJar || cookieJar.size === 0) return "";
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function createAuthenticatedCookieJar(email, password) {
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "").trim();
  if (!cleanEmail || !cleanPassword) return null;

  const cacheKey = cleanEmail.toLowerCase();
  const cached = authSessionCache.get(cacheKey);
  if (cached && Number(cached.expiresAt) > Date.now()) {
    return new Map(Array.isArray(cached.cookies) ? cached.cookies : []);
  }

  const cookieJar = new Map();
  const loginPageUrl = "https://www.pinterest.com/login/";
  const loginPageResponse = await fetchWithTimeout(loginPageUrl, {
    headers: DEFAULT_HEADERS,
    redirect: "follow",
  });
  applySetCookiesToJar(cookieJar, getSetCookieValues(loginPageResponse));
  if (!loginPageResponse.ok) {
    throw new Error(`falha ao abrir login do Pinterest (HTTP ${loginPageResponse.status})`);
  }
  await loginPageResponse.text();

  const csrfToken = cookieJar.get("csrftoken");
  if (!csrfToken) {
    throw new Error("csrf token ausente no Pinterest");
  }

  const loginPayload = {
    options: {
      username_or_email: cleanEmail,
      password: cleanPassword,
      referrer: "https://www.pinterest.com/",
    },
    context: {},
  };

  const loginBody = [
    "source_url=%2Flogin%2F",
    `data=${encodeURIComponent(JSON.stringify(loginPayload))}`,
    `_= ${Date.now()}`.replace(" ", ""),
  ].join("&");

  const loginResponse = await fetchWithTimeout("https://www.pinterest.com/resource/UserSessionResource/create/", {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      "x-csrftoken": csrfToken,
      origin: "https://www.pinterest.com",
      referer: loginPageUrl,
      cookie: cookieJarToHeader(cookieJar),
    },
    body: loginBody,
    redirect: "follow",
  });
  applySetCookiesToJar(cookieJar, getSetCookieValues(loginResponse));

  const loginText = await loginResponse.text();
  const hasSessionCookie = cookieJar.has("_pinterest_sess");
  const authRejected = /invalid|incorrect|unauthorized|challenge|captcha|2fa|two[- ]factor/i.test(loginText);
  if (!loginResponse.ok || (!hasSessionCookie && authRejected)) {
    throw new Error(`falha de autenticacao Pinterest (HTTP ${loginResponse.status})`);
  }

  authSessionCache.set(cacheKey, {
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
    cookies: [...cookieJar.entries()],
  });

  return cookieJar;
}

async function fetchText(url, cookieJar) {
  const headers = { ...DEFAULT_HEADERS };
  const cookieHeader = cookieJarToHeader(cookieJar);
  if (cookieHeader) headers.cookie = cookieHeader;

  const response = await fetchWithTimeout(url, {
    headers,
    redirect: "follow",
  });
  applySetCookiesToJar(cookieJar, getSetCookieValues(response));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return {
    finalUrl: response.url || url,
    text: await response.text(),
  };
}

async function fetchImageBuffer(url, cookieJar) {
  const headers = { ...DEFAULT_HEADERS };
  const cookieHeader = cookieJarToHeader(cookieJar);
  if (cookieHeader) headers.cookie = cookieHeader;

  const response = await fetchWithTimeout(url, {
    headers,
    redirect: "follow",
  });
  applySetCookiesToJar(cookieJar, getSetCookieValues(response));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const declaredLength = Number.parseInt(response.headers.get("content-length") || "0", 10);
  if (declaredLength > MAX_IMAGE_BYTES) {
    throw new Error("Imagem muito grande.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Imagem acima do limite.");
  }

  const headerMimeType = String(response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const sniffed = mimeFromBuffer(buffer);
  const mimeType = headerMimeType.startsWith("image/") ? headerMimeType : sniffed;
  if (!mimeType || !mimeType.startsWith("image/")) {
    throw new Error("Resposta nao e imagem.");
  }

  return {
    buffer,
    mimeType,
    url: response.url || url,
  };
}

async function fetchPinterestImages(options = {}) {
  const normalized = normalizeQueryOrUrl(options.queryOrUrl);
  const maxImages = clamp(options.maxImages, 1, 12);
  const maxPages = clamp(options.maxPages, 1, 10);
  const pinterestEmail = String(options.pinterestEmail || process.env.PINTEREST_EMAIL || "").trim();
  const pinterestPassword = String(options.pinterestPassword || process.env.PINTEREST_PASSWORD || "").trim();
  const requireAuth =
    options.requireAuth === true || String(process.env.PINTEREST_REQUIRE_AUTH || "").trim() === "1";
  let cookieJar = null;

  if (pinterestEmail || pinterestPassword || requireAuth) {
    if (!pinterestEmail || !pinterestPassword) {
      if (requireAuth) {
        throw new Error("Defina PINTEREST_EMAIL e PINTEREST_PASSWORD no .env.");
      }
    } else {
      try {
        cookieJar = await createAuthenticatedCookieJar(pinterestEmail, pinterestPassword);
      } catch (error) {
        if (requireAuth) {
          throw error;
        }
      }
    }
  }

  const pageUrls = [normalized.searchUrl];
  if (normalized.kind === "query") {
    const base = normalized.searchUrl;
    for (let page = 2; page <= maxPages; page += 1) {
      pageUrls.push(`${base}&page=${page}`);
    }
    pageUrls.push(`https://br.pinterest.com/search/pins/?q=${encodeURIComponent(normalized.query)}`);
  }

  const candidateImageUrls = [];
  const seenImageUrls = new Set();
  let resolvedSearchUrl = normalized.searchUrl;
  const pushCandidate = (url) => {
    const normalizedUrl = normalizePinimgUrl(url);
    if (!normalizedUrl) return;
    if (seenImageUrls.has(normalizedUrl)) return;
    if (isKnownBadPinimgUrl(normalizedUrl)) return;
    seenImageUrls.add(normalizedUrl);
    candidateImageUrls.push(normalizedUrl);
  };

  if (normalized.kind === "query") {
    const bingCandidates = await collectPinimgUrlsFromBing(normalized.query, Math.max(maxImages * 18, 60));
    for (const item of bingCandidates) {
      pushCandidate(item);
      if (candidateImageUrls.length >= Math.max(maxImages * 10, 30)) break;
    }
  }

  for (const pageUrl of pageUrls) {
    let htmlResponse;
    try {
      htmlResponse = await fetchText(pageUrl, cookieJar);
    } catch (_) {
      continue;
    }

    resolvedSearchUrl = htmlResponse.finalUrl || resolvedSearchUrl;
    const extracted = collectPinimgUrlsFromHtml(htmlResponse.text);
    for (const item of extracted) {
      pushCandidate(item);
      if (candidateImageUrls.length >= Math.max(maxImages * 25, 30)) break;
    }

    if (candidateImageUrls.length >= Math.max(maxImages * 8, 10)) {
      break;
    }
  }

  if (candidateImageUrls.length === 0 && normalized.kind === "url") {
    const directImage = normalizePinimgUrl(normalized.searchUrl);
    if (directImage) {
      pushCandidate(directImage);
    }
  }

  candidateImageUrls.sort((left, right) => scorePinimgUrl(right) - scorePinimgUrl(left));

  const images = [];
  for (const imageUrl of candidateImageUrls) {
    if (images.length >= maxImages) break;
    try {
      const image = await fetchImageBuffer(imageUrl, cookieJar);
      images.push({
        buffer: image.buffer,
        mimeType: image.mimeType,
        url: image.url,
      });
    } catch (_) {
      // Ignora imagem invalida e tenta a proxima URL.
    }
  }

  return {
    searchUrl: resolvedSearchUrl,
    images,
  };
}

export {
  fetchPinterestImages
}

export default {
  fetchPinterestImages
}
