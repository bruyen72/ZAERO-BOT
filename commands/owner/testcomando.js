import fs from 'fs'
import path from 'path'
import os from 'os'
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js'
import { getHeavyTaskStats } from '../../lib/system/heavyTaskManager.js'
import { getFfmpegQueueStats, runFfmpeg } from '../../lib/system/ffmpeg.js'

function clampInt(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const n = Math.floor(parsed)
  if (n < min) return min
  if (n > max) return max
  return n
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase()
}

function mb(bytes = 0) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)}MB`
}

function percentile(list = [], p = 95) {
  if (!Array.isArray(list) || list.length === 0) return 0
  const sorted = [...list].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

function parseInput(args = []) {
  const cfg = {
    profile: 'mix', // mix | sticker | red
    users: 4,
    rounds: 1,
    durationSec: 3,
    query: 'ass',
    redMode: 'video', // video | gif | both
    timeoutMs: 90000,
  }

  const free = []
  for (const raw of args) {
    const token = String(raw || '').trim()
    const lower = normalizeText(token)
    if (!token) continue

    if (lower.startsWith('-users=') || lower.startsWith('-u=')) {
      const value = lower.includes('-users=') ? lower.slice(7) : lower.slice(3)
      cfg.users = clampInt(value, 1, 8, cfg.users)
      continue
    }
    if (lower.startsWith('-rounds=') || lower.startsWith('-r=')) {
      const value = lower.includes('-rounds=') ? lower.slice(8) : lower.slice(3)
      cfg.rounds = clampInt(value, 1, 5, cfg.rounds)
      continue
    }
    if (lower.startsWith('-dur=')) {
      cfg.durationSec = clampInt(lower.slice(5), 1, 8, cfg.durationSec)
      continue
    }
    if (lower.startsWith('-mode=')) {
      const mode = lower.slice(6)
      if (['video', 'gif', 'both'].includes(mode)) cfg.redMode = mode
      continue
    }
    if (lower.startsWith('-timeout=')) {
      cfg.timeoutMs = clampInt(lower.slice(9), 10000, 240000, cfg.timeoutMs)
      continue
    }
    if (lower.startsWith('-q=')) {
      cfg.query = token.slice(3).trim() || cfg.query
      continue
    }

    if (['mix', 'sticker', 'red', 'video'].includes(lower)) {
      cfg.profile = lower === 'video' ? 'red' : lower
      continue
    }

    free.push(token)
  }

  if (free.length > 0) cfg.query = free.join(' ').trim() || cfg.query
  return cfg
}

function resolveEffectiveRedMode(mode = 'video') {
  // RedGifs quase sempre entrega MP4; gif puro tende a esvaziar.
  if (mode === 'gif') return 'both'
  return mode
}

function allowedMediaTypesForMode(mode = 'video') {
  if (mode === 'gif') return ['gif']
  if (mode === 'both') return ['video', 'gif']
  return ['video']
}

function withTimeout(taskFn, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const err = new Error(`timeout after ${timeoutMs}ms`)
      err.code = 'BENCH_TIMEOUT'
      reject(err)
    }, timeoutMs)

    Promise.resolve()
      .then(taskFn)
      .then((result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error)
      })
  })
}

function ensureTmp() {
  const tmpDir = path.resolve('./tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  return tmpDir
}

async function runStickerLikeJob(jobId, durationSec, timeoutMs) {
  ensureTmp()
  const outPath = path.resolve('./tmp', `bench-sticker-${Date.now()}-${jobId}.webp`)
  const startedAt = Date.now()

  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=720x720:rate=24',
    '-t',
    String(durationSec),
    '-vf',
    "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba",
    '-an',
    '-vcodec',
    'libwebp',
    '-loop',
    '0',
    '-preset',
    'default',
    '-compression_level',
    '6',
    '-q:v',
    '42',
    outPath,
  ]

  try {
    await withTimeout(() => runFfmpeg(args, { timeoutMs }), timeoutMs + 2000)
    const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0
    return {
      ok: true,
      kind: 'sticker',
      elapsedMs: Date.now() - startedAt,
      sizeBytes: size,
    }
  } catch (error) {
    return {
      ok: false,
      kind: 'sticker',
      elapsedMs: Date.now() - startedAt,
      sizeBytes: 0,
      timeout: error?.code === 'BENCH_TIMEOUT' || error?.code === 'FFMPEG_TIMEOUT',
      error: error?.message || String(error),
    }
  } finally {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    } catch {}
  }
}

async function runRedLikeJob(jobId, query, mode, timeoutMs) {
  const startedAt = Date.now()
  const effectiveMode = resolveEffectiveRedMode(mode)
  const allowedMediaTypes = allowedMediaTypesForMode(effectiveMode)

  try {
    const media = await withTimeout(
      () =>
        fetchNsfwMedia(query, null, {
          allowedMediaTypes,
          source: 'redgifs',
          allowStaticFallback: false,
          uniqueIds: true,
          maxPages: 2,
          perPage: 30,
          nicheOverride: query,
          strictQuery: true,
        }),
      timeoutMs,
    )

    return {
      ok: Boolean(media),
      kind: 'red',
      elapsedMs: Date.now() - startedAt,
      mediaType: media?.mediaType || 'none',
      sizeBytes: media?.size || 0,
      timeout: false,
      error: media ? null : 'empty',
    }
  } catch (error) {
    return {
      ok: false,
      kind: 'red',
      elapsedMs: Date.now() - startedAt,
      mediaType: 'none',
      sizeBytes: 0,
      timeout: error?.code === 'BENCH_TIMEOUT',
      error: error?.message || String(error),
    }
  }
}

function pickJobKind(profile = 'mix', userIndex = 0, round = 1) {
  if (profile === 'sticker') return 'sticker'
  if (profile === 'red') return 'red'
  // mix: alterna para simular pessoas pedindo .s e video pesado ao mesmo tempo
  return (userIndex + round) % 2 === 0 ? 'sticker' : 'red'
}

function memorySnapshot() {
  const usage = process.memoryUsage()
  const total = os.totalmem()
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    hostPct: total > 0 ? ((usage.rss / total) * 100).toFixed(2) : '0.00',
  }
}

function summarizeResults(results = []) {
  const total = results.length
  const ok = results.filter((r) => r.ok).length
  const fail = total - ok
  const timeout = results.filter((r) => r.timeout).length
  const elapsed = results.map((r) => r.elapsedMs || 0)
  const avgMs = elapsed.length ? elapsed.reduce((a, b) => a + b, 0) / elapsed.length : 0
  const p95 = percentile(elapsed, 95)

  const byKind = {}
  for (const row of results) {
    const key = row.kind || 'unknown'
    if (!byKind[key]) byKind[key] = []
    byKind[key].push(row)
  }

  return { total, ok, fail, timeout, avgMs, p95, byKind }
}

function kindLine(kind = 'unknown', items = []) {
  const total = items.length
  const ok = items.filter((r) => r.ok).length
  const fail = total - ok
  const elapsed = items.map((r) => r.elapsedMs || 0)
  const avg = elapsed.length ? elapsed.reduce((a, b) => a + b, 0) / elapsed.length : 0
  const p95 = percentile(elapsed, 95)
  const size = items.reduce((acc, item) => acc + (item.sizeBytes || 0), 0)
  return `${kind}: total=${total} ok=${ok} fail=${fail} avg=${avg.toFixed(0)}ms p95=${p95.toFixed(0)}ms out=${mb(size)}`
}

export default {
  command: ['testcomando', 'testcmd', 'benchcomando'],
  category: 'mod',
  isOwner: true,
  timeoutMs: 300000,
  run: async (client, m, args, usedPrefix) => {
    const cfg = parseInput(args)
    const redModeEffective = resolveEffectiveRedMode(cfg.redMode)
    const heavyBefore = getHeavyTaskStats()
    const ffBefore = getFfmpegQueueStats()
    const memBefore = memorySnapshot()

    await m.react('\u23F3').catch(() => {})
    await client.reply(
      m.chat,
      `Bench iniciado...\nperfil=${cfg.profile} users=${cfg.users} rounds=${cfg.rounds} redMode=${cfg.redMode} (efetivo=${redModeEffective}) query="${cfg.query}"`,
      m,
    )

    const startedAt = Date.now()
    const results = []
    let ffPeakActive = ffBefore.active
    let ffPeakWaiting = ffBefore.waiting
    const monitor = setInterval(() => {
      const stats = getFfmpegQueueStats()
      ffPeakActive = Math.max(ffPeakActive, stats.active)
      ffPeakWaiting = Math.max(ffPeakWaiting, stats.waiting)
    }, 100)

    try {
      for (let round = 1; round <= cfg.rounds; round += 1) {
        const wave = []
        for (let user = 1; user <= cfg.users; user += 1) {
          const jobKind = pickJobKind(cfg.profile, user, round)
          const jobId = `r${round}u${user}`

          if (jobKind === 'sticker') {
            wave.push(runStickerLikeJob(jobId, cfg.durationSec, cfg.timeoutMs))
          } else {
            wave.push(runRedLikeJob(jobId, cfg.query, redModeEffective, cfg.timeoutMs))
          }
        }

        const settled = await Promise.all(wave)
        results.push(...settled)
      }
    } finally {
      clearInterval(monitor)
    }

    const totalMs = Date.now() - startedAt
    const summary = summarizeResults(results)
    const heavyAfter = getHeavyTaskStats()
    const ffAfter = getFfmpegQueueStats()
    const memAfter = memorySnapshot()

    const failRate = summary.total > 0 ? summary.fail / summary.total : 1
    const travou = summary.timeout > 0 || failRate >= 0.25
    const status = travou ? 'SIM' : 'NAO'

    const lines = [
      '*BENCH COMANDO*',
      `travou: ${status}`,
      `perfil=${cfg.profile} users=${cfg.users} rounds=${cfg.rounds} totalJobs=${summary.total}`,
      `redMode solicitado=${cfg.redMode} efetivo=${redModeEffective}`,
      `query="${cfg.query}"`,
      '',
      '[resultado geral]',
      `ok=${summary.ok} fail=${summary.fail} timeout=${summary.timeout}`,
      `tempo total=${totalMs}ms avg=${summary.avgMs.toFixed(0)}ms p95=${summary.p95.toFixed(0)}ms`,
      '',
      '[por tipo]',
      kindLine('sticker', summary.byKind.sticker || []),
      kindLine('red', summary.byKind.red || []),
      '',
      '[filas]',
      `heavy antes: limit=${heavyBefore.limit} active=${heavyBefore.active} waiting=${heavyBefore.waiting}`,
      `heavy depois: limit=${heavyAfter.limit} active=${heavyAfter.active} waiting=${heavyAfter.waiting}`,
      `ffmpeg antes: limit=${ffBefore.limit} active=${ffBefore.active} waiting=${ffBefore.waiting}`,
      `ffmpeg pico: active=${ffPeakActive} waiting=${ffPeakWaiting}`,
      `ffmpeg depois: limit=${ffAfter.limit} active=${ffAfter.active} waiting=${ffAfter.waiting}`,
      '',
      '[memoria]',
      `antes: rss=${mb(memBefore.rss)} heap=${mb(memBefore.heapUsed)}/${mb(memBefore.heapTotal)} host=${memBefore.hostPct}%`,
      `depois: rss=${mb(memAfter.rss)} heap=${mb(memAfter.heapUsed)}/${mb(memAfter.heapTotal)} host=${memAfter.hostPct}%`,
      '',
      '[metodo melhor]',
      '1) Para entrega rapida: .red <termo> (video mp4 com gifPlayback)',
      '2) Para sticker sob carga: .s -lite e video <= 6s',
      '3) Em pico: manter ffmpeg concorrencia=1',
      '',
      `uso: ${usedPrefix}testcomando [mix|sticker|red] [termo] [-users=4] [-rounds=1] [-dur=3] [-mode=video|gif|both]`,
    ]

    await client.reply(m.chat, lines.join('\n'), m)
    await m.react('\u2705').catch(() => {})
  },
}
