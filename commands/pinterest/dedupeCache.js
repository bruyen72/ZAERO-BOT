import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_QUEUE_ITEMS = 500
const SAVE_DEBOUNCE_MS = 2000

const cacheDir = fs.existsSync('/data')
  ? '/data'
  : path.join(process.cwd(), 'data')
const cachePath = path.join(cacheDir, 'seen_pins.json')

const state = {
  version: 1,
  seen: {}
}

let loaded = false
let saveTimer = null
let lastCleanupAt = 0

function nowMs() {
  return Date.now()
}

function normalizeTermKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeImageUrlForHash(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    parsed.search = ''
    parsed.hash = ''
    parsed.protocol = 'https:'
    return parsed.toString()
  } catch (_) {
    const withoutQuery = raw.split('?')[0].split('#')[0]
    return withoutQuery.trim()
  }
}

function hashImageUrl(url) {
  const normalized = normalizeImageUrlForHash(url)
  if (!normalized) return ''
  return crypto.createHash('sha1').update(normalized).digest('hex')
}

function ensureDirSync() {
  try {
    fs.mkdirSync(cacheDir, { recursive: true })
  } catch (_) {
    // No-op.
  }
}

function loadIfNeeded() {
  if (loaded) return
  loaded = true

  try {
    if (!fs.existsSync(cachePath)) return
    const raw = fs.readFileSync(cachePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    const seen = parsed.seen
    if (!seen || typeof seen !== 'object' || Array.isArray(seen)) return
    state.seen = seen
    cleanup(true)
  } catch (_) {
    state.seen = {}
  }
}

function ensureEntry(termKey) {
  const key = normalizeTermKey(termKey)
  if (!key) return null
  if (!state.seen[key] || typeof state.seen[key] !== 'object') {
    state.seen[key] = {
      pinIdsQueue: [],
      imgHashQueue: [],
      updatedAt: nowMs()
    }
  }

  const entry = state.seen[key]
  if (!Array.isArray(entry.pinIdsQueue)) entry.pinIdsQueue = []
  if (!Array.isArray(entry.imgHashQueue)) entry.imgHashQueue = []
  if (!Number.isFinite(entry.updatedAt)) entry.updatedAt = nowMs()

  return entry
}

function compactQueue(queue) {
  const valid = []
  for (const item of queue || []) {
    if (!item || typeof item !== 'object') continue
    const value = String(item.value || '').trim()
    const ts = Number(item.ts)
    if (!value || !Number.isFinite(ts)) continue
    valid.push({ value, ts })
  }
  return valid
}

function removeExpiredFromQueue(queue, cutoff) {
  const valid = compactQueue(queue).filter((item) => item.ts >= cutoff)
  if (valid.length <= MAX_QUEUE_ITEMS) return valid
  return valid.slice(valid.length - MAX_QUEUE_ITEMS)
}

function cleanup(force = false) {
  loadIfNeeded()
  const now = nowMs()
  if (!force && now - lastCleanupAt < 60 * 1000) return
  lastCleanupAt = now

  const cutoff = now - TTL_MS
  const keys = Object.keys(state.seen)
  for (const key of keys) {
    const entry = ensureEntry(key)
    if (!entry) continue

    entry.pinIdsQueue = removeExpiredFromQueue(entry.pinIdsQueue, cutoff)
    entry.imgHashQueue = removeExpiredFromQueue(entry.imgHashQueue, cutoff)
    entry.updatedAt = Math.max(
      entry.updatedAt || 0,
      entry.pinIdsQueue.at(-1)?.ts || 0,
      entry.imgHashQueue.at(-1)?.ts || 0
    )

    const isEmpty = entry.pinIdsQueue.length === 0 && entry.imgHashQueue.length === 0
    const stale = (entry.updatedAt || 0) < cutoff
    if (isEmpty || stale) {
      delete state.seen[key]
    }
  }
}

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    flushNow()
  }, SAVE_DEBOUNCE_MS)
}

function serializeState() {
  return JSON.stringify({
    version: state.version,
    seen: state.seen
  })
}

function flushNow() {
  loadIfNeeded()
  cleanup()
  ensureDirSync()
  const tempPath = `${cachePath}.tmp`
  try {
    fs.writeFileSync(tempPath, serializeState(), 'utf8')
    fs.renameSync(tempPath, cachePath)
  } catch (_) {
    try { fs.unlinkSync(tempPath) } catch {}
  }
}

function hasSeen(termKey, pinId, imgHash) {
  loadIfNeeded()
  cleanup()
  const entry = ensureEntry(termKey)
  if (!entry) return false

  const safePinId = String(pinId || '').trim()
  const safeImgHash = String(imgHash || '').trim()

  if (safePinId && entry.pinIdsQueue.some((item) => item.value === safePinId)) {
    return true
  }
  if (safeImgHash && entry.imgHashQueue.some((item) => item.value === safeImgHash)) {
    return true
  }
  return false
}

function pushQueueItem(queue, value, ts) {
  if (!value) return
  if (!queue.some((item) => item.value === value)) {
    queue.push({ value, ts })
  }
  if (queue.length > MAX_QUEUE_ITEMS) {
    queue.splice(0, queue.length - MAX_QUEUE_ITEMS)
  }
}

function markSeen(termKey, pinId, imgHash) {
  loadIfNeeded()
  cleanup()
  const entry = ensureEntry(termKey)
  if (!entry) return

  const ts = nowMs()
  const safePinId = String(pinId || '').trim()
  const safeImgHash = String(imgHash || '').trim()

  pushQueueItem(entry.pinIdsQueue, safePinId, ts)
  pushQueueItem(entry.imgHashQueue, safeImgHash, ts)
  entry.updatedAt = ts
  scheduleSave()
}

function getCachePath() {
  return cachePath
}

function getStats() {
  loadIfNeeded()
  cleanup()
  const terms = Object.keys(state.seen)
  let pinIds = 0
  let imgHashes = 0
  for (const key of terms) {
    const entry = ensureEntry(key)
    if (!entry) continue
    pinIds += entry.pinIdsQueue.length
    imgHashes += entry.imgHashQueue.length
  }
  return {
    terms: terms.length,
    pinIds,
    imgHashes,
    cachePath
  }
}

loadIfNeeded()

process.on('beforeExit', () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  flushNow()
})

export {
  TTL_MS,
  MAX_QUEUE_ITEMS,
  normalizeTermKey,
  normalizeImageUrlForHash,
  hashImageUrl,
  hasSeen,
  markSeen,
  cleanup,
  flushNow,
  getCachePath,
  getStats
}

export default {
  normalizeTermKey,
  normalizeImageUrlForHash,
  hashImageUrl,
  hasSeen,
  markSeen,
  cleanup,
  flushNow,
  getCachePath,
  getStats
}
