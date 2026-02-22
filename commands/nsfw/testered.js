import { fetchNsfwMedia, resolveNsfwVideo, searchNsfwVideos, searchRedgifsNiches } from '../../lib/mediaFetcher.js'

const MODE_ALIASES = {
  video: 'video',
  v: 'video',
  gif: 'gif',
  g: 'gif',
  both: 'both',
  ambos: 'both',
  todos: 'both',
}

const QUERY_TO_NICHE = {
  ass: 'big-ass',
  bunda: 'big-ass',
  bunduda: 'big-ass',
  bigass: 'big-ass',
  'big-ass': 'big-ass',
  pawg: 'pawg',
  blowjob: 'blowjob',
  bj: 'blowjob',
  mamada: 'blowjob',
  lickpussy: 'pussy',
  lickass: 'rimjob',
  lickdick: 'blowjob',
  anal: 'anal',
  sixnine: 'oral',
  '69': 'oral',
  cum: 'cumshot',
  cumshot: 'cumshot',
  cummouth: 'cumshot',
  footjob: 'feet',
  handjob: 'handjob',
  spank: 'spanking',
  creampie: 'creampie',
  yuri: 'lesbian',
  fuck: 'doggystyle',
  foder: 'doggystyle',
  cavalgar: 'riding',
  bunda: 'big-ass',
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function inferNiche(query = '') {
  const normalized = normalizeText(query).replace(/\s+/g, '-')
  const compact = normalized.replace(/-/g, '')
  if (QUERY_TO_NICHE[normalized]) return QUERY_TO_NICHE[normalized]
  if (QUERY_TO_NICHE[compact]) return QUERY_TO_NICHE[compact]

  const tokens = normalized.split('-').filter(Boolean)
  for (const token of tokens) {
    if (QUERY_TO_NICHE[token]) return QUERY_TO_NICHE[token]
  }

  // Heuristicas simples para termos livres comuns.
  if (tokens.includes('ass')) return 'big-ass'
  if (tokens.includes('girl') && tokens.includes('ass')) return 'big-ass'
  if (tokens.includes('cum')) return 'cumshot'
  if (tokens.includes('blowjob') || tokens.includes('bj')) return 'blowjob'
  if (tokens.includes('anal')) return 'anal'

  return 'blowjob'
}

function parseInput(args = []) {
  const clean = args.map((item) => String(item || '').trim()).filter(Boolean)
  let mode = 'video'
  let sample = 6
  const queryParts = []

  for (let index = 0; index < clean.length; index += 1) {
    const item = clean[index]
    const normalized = normalizeText(item)
    if (index === 0 && MODE_ALIASES[normalized]) {
      mode = MODE_ALIASES[normalized]
      continue
    }

    if (normalized.startsWith('-sample=')) {
      const value = Number(normalized.split('=')[1] || 0)
      if (Number.isFinite(value) && value > 0) sample = Math.min(12, Math.max(2, Math.floor(value)))
      continue
    }

    queryParts.push(item)
  }

  const query = queryParts.join(' ').trim() || 'lickass'
  return { mode, sample, query }
}

function resolveEffectiveMode(mode = 'video') {
  // RedGifs entrega melhor em MP4; pedir gif puro tende a retornar vazio.
  if (mode === 'gif') return 'both'
  return mode
}

function allowedTypesForMode(mode) {
  if (mode === 'gif') return ['gif']
  if (mode === 'both') return ['video', 'gif']
  return ['video']
}

function scoreByMode(stats = {}, mode = 'video') {
  if (mode === 'gif') return stats.gif || 0
  if (mode === 'both') return (stats.video || 0) + (stats.gif || 0)
  return stats.video || 0
}

function formatMs(ms = 0) {
  return `${(Number(ms) || 0).toFixed(0)}ms`
}

async function profileRows(rows = [], sample = 6) {
  const selected = rows.filter((row) => row?.pageUrl).slice(0, sample)
  const stats = {
    rows: rows.length,
    sampled: selected.length,
    parsed: 0,
    failed: 0,
    video: 0,
    gif: 0,
    image: 0,
    unknown: 0,
    candidates: 0,
  }

  for (const row of selected) {
    try {
      const parsed = await resolveNsfwVideo(row.pageUrl)
      const candidates = Array.isArray(parsed?.candidates) ? parsed.candidates : []
      stats.parsed += 1
      stats.candidates += candidates.length

      for (const candidate of candidates) {
        const type = String(candidate?.mediaType || 'unknown').toLowerCase()
        if (type === 'video') stats.video += 1
        else if (type === 'gif') stats.gif += 1
        else if (type === 'image') stats.image += 1
        else stats.unknown += 1
      }
    } catch {
      stats.failed += 1
    }
  }

  return stats
}

function buildMethodLine(label, elapsedMs, stats = {}) {
  return (
    `${label}: ${formatMs(elapsedMs)} | rows=${stats.rows || 0} | sample=${stats.sampled || 0} | ` +
    `video=${stats.video || 0} gif=${stats.gif || 0} | parsed=${stats.parsed || 0} fail=${stats.failed || 0}`
  )
}

export default {
  command: ['testered', 'testeredgifs', 'testredgifs'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix) => {
    const isGroup = String(m.chat || '').endsWith('@g.us')
    if (isGroup && !globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply(`O conteudo *NSFW* esta desabilitado neste grupo.\nAtive com: *${usedPrefix}nsfw on*`)
    }

    const { mode, sample, query } = parseInput(args)
    const effectiveMode = resolveEffectiveMode(mode)
    const allowedMediaTypes = allowedTypesForMode(effectiveMode)
    const niche = inferNiche(query)

    await m.react('\u23F3').catch(() => {})
    console.log(
      `[TestRed] inicio query="${query}" mode=${mode} effectiveMode=${effectiveMode} sample=${sample} niche=${niche}`,
    )

    const startedAt = Date.now()
    const report = {
      methodA: { elapsed: 0, stats: null, error: null },
      methodB: { elapsed: 0, stats: null, error: null },
      methodC: { elapsed: 0, media: null, error: null },
    }

    try {
      const tA = Date.now()
      const rowsA = await searchNsfwVideos(query, { source: 'redgifs', limit: 20 })
      report.methodA.stats = await profileRows(rowsA, sample)
      report.methodA.elapsed = Date.now() - tA
      console.log(`[TestRed] metodo A rows=${rowsA.length} elapsed=${report.methodA.elapsed}ms`)
    } catch (error) {
      report.methodA.error = error.message
      report.methodA.elapsed = Date.now() - startedAt
      console.error(`[TestRed] metodo A erro: ${error.message}`)
    }

    try {
      const tB = Date.now()
      const rowsB = await searchRedgifsNiches(niche, 20, { order: 'trending', page: 1 })
      report.methodB.stats = await profileRows(rowsB, sample)
      report.methodB.elapsed = Date.now() - tB
      console.log(`[TestRed] metodo B rows=${rowsB.length} elapsed=${report.methodB.elapsed}ms`)
    } catch (error) {
      report.methodB.error = error.message
      report.methodB.elapsed = Date.now() - startedAt
      console.error(`[TestRed] metodo B erro: ${error.message}`)
    }

    try {
      const tC = Date.now()
      report.methodC.media = await fetchNsfwMedia(query, null, {
        allowedMediaTypes,
        source: 'redgifs',
        allowStaticFallback: false,
        uniqueIds: true,
        maxPages: 3,
        perPage: 40,
        nicheOverride: query,
        strictQuery: true,
      })
      report.methodC.elapsed = Date.now() - tC
      console.log(
        `[TestRed] metodo C ok=${Boolean(report.methodC.media)} elapsed=${report.methodC.elapsed}ms type=${report.methodC.media?.mediaType || 'none'}`,
      )
    } catch (error) {
      report.methodC.error = error.message
      report.methodC.elapsed = Date.now() - startedAt
      console.error(`[TestRed] metodo C erro: ${error.message}`)
    }

    const scoreA = scoreByMode(report.methodA.stats || {}, effectiveMode)
    const scoreB = scoreByMode(report.methodB.stats || {}, effectiveMode)
    const bestDiscovery = scoreA >= scoreB ? 'A(search)' : 'B(niche)'
    const totalMs = Date.now() - startedAt
    const media = report.methodC.media

    const lines = [
      '*TESTE REDGIFS*',
      `query: ${query}`,
      `modo solicitado: ${mode} | modo efetivo: ${effectiveMode} | niche inferido: ${niche}`,
      `tipos alvo: ${allowedMediaTypes.join(', ')}`,
      mode !== effectiveMode ? 'nota: "gif" foi ajustado para "both" para evitar vazio/latencia.' : '',
      '',
      report.methodA.error
        ? `A(search): erro=${report.methodA.error}`
        : buildMethodLine('A(search)', report.methodA.elapsed, report.methodA.stats || {}),
      report.methodB.error
        ? `B(niche): erro=${report.methodB.error}`
        : buildMethodLine('B(niche)', report.methodB.elapsed, report.methodB.stats || {}),
      report.methodC.error
        ? `C(fetch real): erro=${report.methodC.error}`
        : `C(fetch real): ${formatMs(report.methodC.elapsed)} | ok=${Boolean(media)} | type=${media?.mediaType || 'none'} | size=${(((media?.size || 0) / 1024 / 1024) || 0).toFixed(2)}MB`,
      '',
      `melhor para descoberta (${effectiveMode}): ${bestDiscovery}`,
      `melhor para comando final: C(fetch real)`,
      `tempo total: ${formatMs(totalMs)}`,
      '',
      `uso: ${usedPrefix}testered <video|gif|both> <termo> [-sample=6]`,
    ]

    await client.reply(m.chat, lines.join('\n'), m)
    await m.react('\u2705').catch(() => {})
  },
}
