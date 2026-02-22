export function clampInt(n, min, max, fallback) {
  const parsed = Number.parseInt(String(n ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export function parseCountArg(args, max = 5) {
  const raw = Array.isArray(args) ? args[0] : undefined
  return clampInt(raw, 1, Math.max(1, Number(max) || 5), 1)
}

export default {
  clampInt,
  parseCountArg,
}
