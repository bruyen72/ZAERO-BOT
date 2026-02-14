import fs from 'fs'
import path from 'path'
import os from 'os'
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js'
import { getHeavyTaskStats } from '../../lib/system/heavyTaskManager.js'
import { getFfmpegQueueStats, resolveFfmpegPath, runFfmpeg } from '../../lib/system/ffmpeg.js'

const BENCH_LOCK_TTL_MS = 20 * 60 * 1000
let activeHeavyBenchRun = null

function toNumber(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

function clampInt(value, min, max, fallback) {
  const n = Math.floor(toNumber(value, fallback))
  if (!Number.isFinite(n)) return fallback
  if (n < min) return min
  if (n > max) return max
  return n
}

function mb(bytes = 0) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)}MB`
}

function withTimeout(taskFn, timeoutMs = 60000) {
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

function parseInput(args = []) {
  const options = {
    jobs: 3,
    durationSec: 2,
    mode: 'video',
    query: 'ass',
    runRedTest: true,
  }

  const free = []
  for (const raw of args) {
    const item = String(raw || '').trim()
    const lower = item.toLowerCase()
    if (!item) continue

    if (lower.startsWith('-n=')) {
      options.jobs = clampInt(lower.slice(3), 1, 4, options.jobs)
      continue
    }
    if (lower.startsWith('-dur=')) {
      options.durationSec = clampInt(lower.slice(5), 1, 6, options.durationSec)
      continue
    }
    if (lower === '-nored') {
      options.runRedTest = false
      continue
    }
    if (lower === '-red') {
      options.runRedTest = true
      continue
    }
    if (lower === 'video' || lower === 'gif' || lower === 'both') {
      options.mode = lower
      continue
    }
    free.push(item)
  }

  if (free.length > 0) options.query = free.join(' ')
  return options
}

function resolveEffectiveMode(mode = 'video') {
  // RedGifs responde melhor em MP4; gif puro costuma reduzir disponibilidade.
  if (mode === 'gif') return 'both'
  return mode
}

function allowedMediaTypes(mode = 'video') {
  if (mode === 'gif') return ['gif']
  if (mode === 'both') return ['video', 'gif']
  return ['video']
}

function ensureTmp() {
  const tmpDir = path.resolve('./tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  return tmpDir
}

async function runFfmpegBench(jobs = 3, durationSec = 2) {
  ensureTmp()
  const startedAt = Date.now()
  const tasks = Array.from({ length: jobs }).map((_, index) => {
    const output = path.resolve('./tmp', `bench-${Date.now()}-${index}.mp4`)
    const taskStartedAt = Date.now()
    const args = [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=24',
      '-t',
      String(durationSec),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-an',
      output,
    ]

    const ffTimeoutMs = 60000
    const queueWaitTimeoutMs = 30000
    return runFfmpeg(args, { timeoutMs: ffTimeoutMs, queueWaitTimeoutMs })
      .then(() => {
        const elapsedMs = Date.now() - taskStartedAt
        const size = fs.existsSync(output) ? fs.statSync(output).size : 0
        try {
          if (fs.existsSync(output)) fs.unlinkSync(output)
        } catch {}
        return { ok: true, elapsedMs, size }
      })
      .catch((error) => {
        const elapsedMs = Date.now() - taskStartedAt
        try {
          if (fs.existsSync(output)) fs.unlinkSync(output)
        } catch {}
        return { ok: false, elapsedMs, size: 0, error: error?.message || String(error) }
      })
  })

  const settled = await Promise.all(tasks)
  const ok = settled.filter((item) => item.ok)
  const fail = settled.filter((item) => !item.ok)
  const avgMs = ok.length > 0 ? ok.reduce((acc, item) => acc + item.elapsedMs, 0) / ok.length : 0

  return {
    totalMs: Date.now() - startedAt,
    jobs,
    okCount: ok.length,
    failCount: fail.length,
    avgMs,
    maxMs: settled.reduce((acc, item) => Math.max(acc, item.elapsedMs), 0),
    minMs: settled.reduce((acc, item) => Math.min(acc, item.elapsedMs), Number.POSITIVE_INFINITY),
    totalOutputBytes: ok.reduce((acc, item) => acc + (item.size || 0), 0),
    errors: fail.map((item) => item.error).filter(Boolean),
  }
}

function memorySnapshot() {
  const usage = process.memoryUsage()
  const totalMem = os.totalmem()
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    hostUsedPct: totalMem > 0 ? ((usage.rss / totalMem) * 100).toFixed(2) : '0.00',
  }
}

function buildVerdict(ffBench, redResult, memAfter) {
  const successRate = ffBench.jobs > 0 ? ffBench.okCount / ffBench.jobs : 0
  const avgMs = ffBench.avgMs || 0
  const rssMb = memAfter.rss / 1024 / 1024
  const redOk = redResult?.status === 'ok' || redResult?.status === 'skipped'

  if (successRate === 1 && avgMs <= 4500 && rssMb < 850 && redOk) return 'FORTE'
  if (successRate >= 0.8 && avgMs <= 8000 && rssMb < 950) return 'ESTAVEL'
  return 'LIMITADO'
}

export default {
  command: ['testpesado', 'testheavy', 'heavytest'],
  category: 'mod',
  isOwner: true,
  timeoutMs: 180000,
  run: async (client, m, args, usedPrefix) => {
    if (activeHeavyBenchRun && Date.now() - activeHeavyBenchRun.startedAt < BENCH_LOCK_TTL_MS) {
      const elapsedSec = Math.max(1, Math.round((Date.now() - activeHeavyBenchRun.startedAt) / 1000))
      return client.reply(
        m.chat,
        `Ja existe teste pesado em execucao (${elapsedSec}s): query="${activeHeavyBenchRun.query}".\nAguarde finalizar para evitar fila zumbi.`,
        m,
      )
    }

    activeHeavyBenchRun = {
      startedAt: Date.now(),
      query: 'ass',
      chat: m.chat,
    }

    try {
      const opts = parseInput(args)
      activeHeavyBenchRun.query = opts.query
      const requestedMode = opts.mode
      const effectiveMode = resolveEffectiveMode(requestedMode)
      const redAllowedMediaTypes = allowedMediaTypes(effectiveMode)
      const ffmpegPath = resolveFfmpegPath()
      const heavyBefore = getHeavyTaskStats()
      const ffBefore = getFfmpegQueueStats()
      const memBefore = memorySnapshot()

      await m.react('\u23F3').catch(() => {})
      await client.reply(
        m.chat,
        `Iniciando teste pesado...\njobs=${opts.jobs} dur=${opts.durationSec}s modo=${requestedMode} (efetivo=${effectiveMode}) red=${opts.runRedTest ? 'on' : 'off'}`,
        m,
      )

      const ffBench = await runFfmpegBench(opts.jobs, opts.durationSec)

      let redResult = { status: 'skipped', reason: 'desativado' }
      if (opts.runRedTest) {
        if (m.isGroup && !globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
          redResult = { status: 'skipped', reason: 'nsfw-off-no-grupo' }
        } else {
          const startedAt = Date.now()
          try {
            const media = await withTimeout(
              () =>
                fetchNsfwMedia(opts.query, null, {
                  allowedMediaTypes: redAllowedMediaTypes,
                  source: 'redgifs',
                  allowStaticFallback: false,
                  uniqueIds: true,
                  maxPages: 2,
                  perPage: 30,
                  nicheOverride: opts.query,
                  strictQuery: true,
                }),
              60000,
            )

            redResult = {
              status: media ? 'ok' : 'empty',
              elapsedMs: Date.now() - startedAt,
              mediaType: media?.mediaType || 'none',
              sizeBytes: media?.size || 0,
            }
          } catch (error) {
            redResult = {
              status: 'error',
              elapsedMs: Date.now() - startedAt,
              error: error?.message || String(error),
            }
          }
        }
      }

      const heavyAfter = getHeavyTaskStats()
      const ffAfter = getFfmpegQueueStats()
      const memAfter = memorySnapshot()
      const verdict = buildVerdict(ffBench, redResult, memAfter)

      const lines = [
        '*TESTE PESADO*',
        `veredito: ${verdict}`,
        '',
        '[ffmpeg bench]',
        `jobs=${ffBench.jobs} ok=${ffBench.okCount} fail=${ffBench.failCount}`,
        `tempo total=${ffBench.totalMs}ms avg=${ffBench.avgMs.toFixed(0)}ms min=${ffBench.minMs === Number.POSITIVE_INFINITY ? 0 : ffBench.minMs}ms max=${ffBench.maxMs}ms`,
        `saida total=${mb(ffBench.totalOutputBytes)} binario=${ffmpegPath}`,
        ffBench.errors[0] ? `erro exemplo=${ffBench.errors[0]}` : 'erro exemplo=none',
        '',
        '[redgifs real]',
        redResult.status === 'ok'
          ? `status=ok tempo=${redResult.elapsedMs}ms type=${redResult.mediaType} size=${mb(redResult.sizeBytes)} query="${opts.query}" modo=${requestedMode} (efetivo=${effectiveMode})`
          : redResult.status === 'skipped'
            ? `status=skipped motivo=${redResult.reason}`
            : redResult.status === 'empty'
              ? `status=empty tempo=${redResult.elapsedMs}ms`
              : `status=error tempo=${redResult.elapsedMs || 0}ms erro=${redResult.error || 'desconhecido'}`,
        requestedMode !== effectiveMode ? 'nota: "gif" foi ajustado para "both" para maior disponibilidade.' : '',
        '',
        '[filas]',
        `heavy antes: limit=${heavyBefore.limit} active=${heavyBefore.active} waiting=${heavyBefore.waiting}`,
        `heavy depois: limit=${heavyAfter.limit} active=${heavyAfter.active} waiting=${heavyAfter.waiting}`,
        `ffmpeg antes: limit=${ffBefore.limit} active=${ffBefore.active} waiting=${ffBefore.waiting}`,
        `ffmpeg depois: limit=${ffAfter.limit} active=${ffAfter.active} waiting=${ffAfter.waiting}`,
        '',
        '[memoria]',
        `antes: rss=${mb(memBefore.rss)} heap=${mb(memBefore.heapUsed)}/${mb(memBefore.heapTotal)} host=${memBefore.hostUsedPct}%`,
        `depois: rss=${mb(memAfter.rss)} heap=${mb(memAfter.heapUsed)}/${mb(memAfter.heapTotal)} host=${memAfter.hostUsedPct}%`,
        '',
        '[metodo recomendado]',
        '1) redgifs: use .red <termo> (fluxo real de entrega)',
        '2) sticker: prefira .s -lite e video <= 6s para manter estabilidade',
        '3) carga alta: manter ffmpeg concorrencia=1 e usar fila pesada',
        '',
        `uso: ${usedPrefix}testpesado [video|gif|both] [termo] [-n=3] [-dur=2] [-nored]`,
      ]

      await client.reply(m.chat, lines.join('\n'), m)
      await m.react('\u2705').catch(() => {})
    } finally {
      activeHeavyBenchRun = null
    }
  },
}
