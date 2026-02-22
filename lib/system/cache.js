const store = new Map()

function now() {
  return Date.now()
}

export function set(key, value, ttlMs) {
  const cacheKey = String(key || '').trim()
  const ttl = Number(ttlMs)
  if (!cacheKey) return false
  if (!Number.isFinite(ttl) || ttl <= 0) {
    store.delete(cacheKey)
    return false
  }

  store.set(cacheKey, {
    value,
    expiresAt: now() + ttl,
  })
  return true
}

export function get(key) {
  const cacheKey = String(key || '').trim()
  if (!cacheKey) return null

  const entry = store.get(cacheKey)
  if (!entry) return null
  if (entry.expiresAt <= now()) {
    store.delete(cacheKey)
    return null
  }

  return entry.value
}

export default {
  set,
  get,
}
