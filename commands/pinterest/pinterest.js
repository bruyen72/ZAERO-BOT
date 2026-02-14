import { buildQueryFallbacks, searchPinterestPins } from './index.js'
import { DARK_MSG } from '../../lib/system/heavyTaskManager.js'
import {
  cleanup as cleanupSeenPins,
  hashImageUrl,
  hasSeen,
  markSeen,
  normalizeTermKey
} from './dedupeCache.js'

const MAX_REQUESTED_IMAGES = 7
const COMMAND_INTERVAL_MS = 2800

let nextPinCommandAt = 0
let pinCommandQueue = Promise.resolve()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

async function waitPinCommandSlot() {
  const run = async () => {
    const waitMs = Math.max(0, nextPinCommandAt - Date.now())
    if (waitMs > 0) await sleep(waitMs)
    nextPinCommandAt = Date.now() + COMMAND_INTERVAL_MS
  }

  const chained = pinCommandQueue.then(run, run)
  pinCommandQueue = chained.catch(() => {})
  await chained
}

function shuffleList(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function parseArgs(args = []) {
  let quantity = 1
  let query = ''

  if (args.length > 0) {
    const firstArg = String(args[0] || '').trim()
    const isNumber = /^\d+$/.test(firstArg)
    if (isNumber) {
      quantity = Number.parseInt(firstArg, 10)
      query = args.slice(1).join(' ').trim()
    } else {
      query = args.join(' ').trim()
    }
  }

  if (quantity > MAX_REQUESTED_IMAGES) quantity = MAX_REQUESTED_IMAGES
  if (quantity < 1 || !Number.isFinite(quantity)) quantity = 1
  return { quantity, query }
}

function buildHelpMessage() {
  return (
    `╔═══『 AJUDA PINTEREST 』═══╗\n` +
    `║\n` +
    `║ Como usar:\n` +
    `║ > .pin <quantidade> <termo>\n` +
    `║\n` +
    `║ Exemplos:\n` +
    `║ ✦ .pin anime\n` +
    `║ ✦ .pin 2 luffy\n` +
    `║ ✦ .pin 5 wallpaper pc\n` +
    `║\n` +
    `║ Limite maximo: 7 fotos.\n` +
    `╚══════════════════════════╝`
  )
}

function buildCaption({ query, index, total, pinId, replay }) {
  const lines = [
    '╔═══『 PINTEREST 』═══╗',
    `║ Busca: ${query}`,
    `║ Item: ${index}/${total}`
  ]
  if (pinId) lines.push(`║ Pin ID: ${pinId}`)
  if (replay) lines.push('║ Aviso: sem novos, replay antigo')
  lines.push('╚═══『 ZAERO BOT 』═══╝')
  return lines.join('\n')
}

function takeFreshCandidates(pins, termKey, targetCount, matchedQuery, localPinSet, localHashSet) {
  const selected = []
  for (const pin of pins || []) {
    const pinId = String(pin?.pinId || '').trim()
    const imageUrl = String(pin?.imageUrl || '').trim()
    if (!imageUrl) continue

    const imgHash = hashImageUrl(imageUrl)
    if (!imgHash) continue

    if (pinId && localPinSet.has(pinId)) continue
    if (localHashSet.has(imgHash)) continue
    if (hasSeen(termKey, pinId, imgHash)) continue

    if (pinId) localPinSet.add(pinId)
    localHashSet.add(imgHash)
    selected.push({
      pinId,
      pinUrl: String(pin?.pinUrl || '').trim(),
      imageUrl,
      imgHash,
      matchedQuery,
      replay: false
    })

    if (selected.length >= targetCount) break
  }
  return selected
}

function takeReplayCandidates(pins, targetCount, matchedQuery, localPinSet, localHashSet) {
  const selected = []
  for (const pin of pins || []) {
    const pinId = String(pin?.pinId || '').trim()
    const imageUrl = String(pin?.imageUrl || '').trim()
    if (!imageUrl) continue

    const imgHash = hashImageUrl(imageUrl)
    if (!imgHash) continue
    if (pinId && localPinSet.has(pinId)) continue
    if (localHashSet.has(imgHash)) continue

    if (pinId) localPinSet.add(pinId)
    localHashSet.add(imgHash)
    selected.push({
      pinId,
      pinUrl: String(pin?.pinUrl || '').trim(),
      imageUrl,
      imgHash,
      matchedQuery,
      replay: true
    })

    if (selected.length >= targetCount) break
  }
  return selected
}

export default {
  command: ['pin', 'pinlink'],
  category: 'downloads',
  run: async (client, m, args) => {
    const { quantity, query } = parseArgs(args)
    if (!query) {
      return m.reply(buildHelpMessage())
    }

    await waitPinCommandSlot()

    try {
      cleanupSeenPins()
      await m.react('⏳').catch(async () => {
        await m.reply(DARK_MSG.processing).catch(() => {})
      })

      const requireAuth = String(process.env.PINTEREST_REQUIRE_AUTH || '').trim() === '1'
      const termKey = normalizeTermKey(query)
      const queryFallbacks = buildQueryFallbacks(query)

      const localPinIds = new Set()
      const localImgHashes = new Set()
      const candidatePool = []

      const queryCount = Math.max(quantity * 6, 12)
      for (const currentQuery of queryFallbacks) {
        const pins = await searchPinterestPins(currentQuery, {
          maxResults: Math.max(quantity * 14, 40),
          maxPages: 2,
          requireAuth
        })

        if (!pins.length) continue
        const fresh = takeFreshCandidates(
          pins,
          termKey,
          queryCount,
          currentQuery,
          localPinIds,
          localImgHashes
        )
        candidatePool.push(...fresh)
        if (candidatePool.length >= queryCount) break
      }

      let usingReplay = false
      if (candidatePool.length === 0) {
        for (const currentQuery of queryFallbacks) {
          const pins = await searchPinterestPins(currentQuery, {
            maxResults: Math.max(quantity * 8, 20),
            maxPages: 1,
            requireAuth
          })
          if (!pins.length) continue

          const replay = takeReplayCandidates(
            pins,
            Math.max(quantity * 4, 8),
            currentQuery,
            localPinIds,
            localImgHashes
          )
          candidatePool.push(...replay)
          if (candidatePool.length >= quantity) break
        }
        usingReplay = candidatePool.length > 0
      }

      if (candidatePool.length === 0) {
        await m.react('❌').catch(() => {})
        return m.reply(`Nenhum resultado encontrado para: "${query}"`)
      }

      shuffleList(candidatePool)

      let sentCount = 0
      let sendFailures = 0
      for (const item of candidatePool) {
        if (sentCount >= quantity) break

        const caption = buildCaption({
          query,
          index: sentCount + 1,
          total: quantity,
          pinId: item.pinId,
          replay: item.replay
        })

        try {
          await client.sendMessage(
            m.chat,
            { image: { url: item.imageUrl }, caption },
            { quoted: m }
          )
          markSeen(termKey, item.pinId, item.imgHash)
          sentCount += 1
        } catch (error) {
          sendFailures += 1
        }
      }

      if (sentCount === 0) {
        await m.react('❌').catch(() => {})
        return m.reply(`Falha ao enviar imagens para: "${query}"`)
      }

      if (usingReplay) {
        await m.reply('Sem itens novos no periodo de cache. Enviei resultados antigos.')
      }
      if (sendFailures > 0 && sentCount < quantity) {
        await m.reply(`Enviei ${sentCount}/${quantity}. Algumas imagens falharam no envio.`)
      }

      await m.react('✅').catch(() => {})
    } catch (error) {
      await m.react('❌').catch(() => {})
      console.error('[Pinterest Error]', error)
      await m.reply(`> ❌ Erro ao buscar: ${error?.message || DARK_MSG.timeout}`)
    }
  }
}
