import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_QUEUE_ITEMS = 500
const SAVE_DEBOUNCE_MS = 2000

const cacheDir = fs.existsSync('/data')
  ? '/data'
  : path.join(process.cwd(), 'data')
const cachePath = path.join(cacheDir, 'seen_image_search.json')

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
    return raw.split('?')[0].split('#')[0].trim()
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
  } catch (_) {}
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
      hashesQueue: [],
      updatedAt: nowMs()
    }
  }

  const entry = state.seen[key]
  if (!Array.isArray(entry.hashesQueue)) entry.hashesQueue = []
  if (!Number.isFinite(entry.updatedAt)) entry.updatedAt = nowMs()
  return entry
}

function compactQueue(queue = []) {
  const valid = []
  for (const item of queue) {
    if (!item || typeof item !== 'object') continue
    const value = String(item.value || '').trim()
    const ts = Number(item.ts)
    if (!value || !Number.isFinite(ts)) continue
    valid.push({ value, ts })
  }
  return valid
}

function cleanup(force = false) {
  loadIfNeeded()
  const now = nowMs()
  if (!force && now - lastCleanupAt < 60 * 1000) return
  lastCleanupAt = now
  const cutoff = now - TTL_MS

  for (const key of Object.keys(state.seen)) {
    const entry = ensureEntry(key)
    if (!entry) continue

    entry.hashesQueue = compactQueue(entry.hashesQueue)
      .filter((item) => item.ts >= cutoff)
      .slice(-MAX_QUEUE_ITEMS)
    entry.updatedAt = Math.max(
      Number(entry.updatedAt) || 0,
      entry.hashesQueue.at(-1)?.ts || 0
    )

    const isEmpty = entry.hashesQueue.length === 0
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

function flushNow() {
  loadIfNeeded()
  cleanup()
  ensureDirSync()
  const tempPath = `${cachePath}.tmp`
  try {
    fs.writeFileSync(tempPath, JSON.stringify(state), 'utf8')
    fs.renameSync(tempPath, cachePath)
  } catch (_) {
    try { fs.unlinkSync(tempPath) } catch {}
  }
}

function hasSeen(termKey, imgHash) {
  loadIfNeeded()
  cleanup()
  const entry = ensureEntry(termKey)
  if (!entry) return false
  const safeHash = String(imgHash || '').trim()
  if (!safeHash) return false
  return entry.hashesQueue.some((item) => item.value === safeHash)
}

function markSeen(termKey, imgHash) {
  loadIfNeeded()
  cleanup()
  const entry = ensureEntry(termKey)
  if (!entry) return
  const safeHash = String(imgHash || '').trim()
  if (!safeHash) return

  const ts = nowMs()
  if (!entry.hashesQueue.some((item) => item.value === safeHash)) {
    entry.hashesQueue.push({ value: safeHash, ts })
  }
  if (entry.hashesQueue.length > MAX_QUEUE_ITEMS) {
    entry.hashesQueue.splice(0, entry.hashesQueue.length - MAX_QUEUE_ITEMS)
  }
  entry.updatedAt = ts
  scheduleSave()
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
  normalizeTermKey,
  normalizeImageUrlForHash,
  hashImageUrl,
  hasSeen,
  markSeen,
  cleanup,
  flushNow
}

export default {
  normalizeTermKey,
  normalizeImageUrlForHash,
  hashImageUrl,
  hasSeen,
  markSeen,
  cleanup,
  flushNow
}
