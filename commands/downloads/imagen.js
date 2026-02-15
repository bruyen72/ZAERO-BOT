import axios from 'axios'
import { DARK_MSG } from '../../lib/system/heavyTaskManager.js'
import {
  cleanup as cleanupImageSeen,
  hashImageUrl,
  hasSeen as hasSeenImage,
  markSeen as markSeenImage,
  normalizeTermKey
} from './imageDedupeCache.js'

const MAX_SEND_IMAGES = 10
const MIN_SEND_IMAGES = 2
const API_TIMEOUT_MS = 12000
const BLOCKED_IMAGE_HOSTS = new Set(['mediaproxy.tvtropes.org'])

const bannedWords = [
  '+18', '18+', 'conteudo adulto', 'conteudo explicito', 'conteudo sexual',
  'atriz porno', 'ator porno', 'estrela porno', 'pornstar', 'video xxx', 'xxx', 'x x x',
  'pornhub', 'xvideos', 'xnxx', 'redtube', 'brazzers', 'onlyfans', 'cam4', 'chaturbate',
  'myfreecams', 'bongacams', 'livejasmin', 'spankbang', 'tnaflix', 'hclips', 'fapello',
  'mia khalifa', 'lana rhoades', 'riley reid', 'abella danger', 'brandi love',
  'eva elfie', 'nicole aniston', 'janice griffith', 'alexis texas', 'lela star',
  'gianna michaels', 'adriana chechik', 'asa akira', 'mandy muse', 'kendra lust',
  'jordi el nino polla', 'johnny sins', 'danny d', 'manuel ferrara', 'mark rockwell',
  'porno', 'porn', 'sexo', 'sex', 'desnudo', 'desnuda', 'erotico', 'erotika',
  'tetas', 'pechos', 'boobs', 'boob', 'nalgas', 'culo', 'culos', 'qlos', 'trasero',
  'pene', 'verga', 'vergota', 'pito', 'chocha', 'vagina', 'vaginas', 'bichano', 'concha',
  'genital', 'genitales', 'masturbar', 'masturbacao', 'masturbacion', 'gemidos',
  'gemir', 'orgia', 'orgy', 'trio', 'gangbang', 'creampie', 'facial', 'cum',
  'milf', 'teen', 'incesto', 'incest', 'estupro', 'violacion', 'rape', 'bdsm',
  'hentai', 'tentacle', 'tentaculos', 'fetish', 'fetiche', 'sado', 'sadomaso',
  'camgirl', 'camsex', 'camshow', 'playboy', 'playgirl', 'playmate', 'striptease',
  'striptis', 'slut', 'puta', 'putas', 'perra', 'perras', 'whore', 'fuck', 'fucking',
  'fucked', 'cock', 'dick', 'pussy', 'ass', 'shemale', 'trans', 'transgenero',
  'lesbian', 'lesbiana', 'gay', 'lgbt', 'explicit', 'hardcore',
  'softcore', 'nudista', 'nudismo', 'nudity', 'deepthroat', 'dp', 'double penetration',
  'analplay', 'analplug', 'rimjob', 'spank', 'spanking', 'lick', 'licking', '69',
  'doggystyle', 'reverse cowgirl', 'cowgirl', 'blowjob', 'bj', 'handjob', 'hj',
  'p0rn', 's3x', 'v@gina', 'c0ck', 'd1ck', 'fuk', 'fuking', 'fak', 'boobz', 'pusy',
  'azz', 'cumshot', 'sexcam', 'livecam', 'webcam', 'sexchat', 'sexshow', 'sexvideo',
  'sexvid', 'sexpics', 'sexphoto', 'seximage', 'sexgif', 'pornpic', 'pornimage',
  'pornvid', 'pornvideo', 'only fan', 'only-fans', 'only_fans', 'onlyfans.com',
  'mia khalifha', 'mia khalifah', 'mia khalifaa', 'mia khalif4', 'mia khal1fa',
  'mia khalifa +18', 'mia khalifa xxx', 'mia khalifa nua', 'mia khalifa porno'
]

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseQueryAndQuantity(args = []) {
  let quantity = 1
  let query = ''

  if (Array.isArray(args) && args.length > 0) {
    const firstArg = normalizeText(args[0])
    if (/^\d+$/.test(firstArg)) {
      quantity = Number.parseInt(firstArg, 10)
      query = normalizeText(args.slice(1).join(' '))
    } else {
      query = normalizeText(args.join(' '))
    }
  }

  if (!Number.isFinite(quantity) || quantity < 1) quantity = 1
  if (quantity > MAX_SEND_IMAGES) quantity = MAX_SEND_IMAGES
  return { quantity, query }
}

function isLikelyImageUrl(url) {
  const text = String(url || '').trim()
  if (!/^https?:\/\//i.test(text)) return false
  if (!/\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(text)) return false
  try {
    const parsed = new URL(text)
    const host = String(parsed.hostname || '').toLowerCase()
    if (BLOCKED_IMAGE_HOSTS.has(host)) return false
  } catch (_) {
    return false
  }
  return true
}

function normalizeImageUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    parsed.hash = ''
    parsed.protocol = 'https:'
    return parsed.toString()
  } catch (_) {
    return ''
  }
}

function uniqueCandidates(items = []) {
  const list = []
  const seen = new Set()
  for (const item of items) {
    const imageUrl = normalizeImageUrl(item?.url)
    if (!isLikelyImageUrl(imageUrl)) continue
    const key = imageUrl.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    list.push({
      url: imageUrl,
      title: item?.title || null,
      domain: item?.domain || null,
      resolution: item?.resolution || null
    })
  }
  return list
}

function shuffle(items = []) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function pickImages(query, candidates = [], maxCount = MAX_SEND_IMAGES) {
  const termKey = normalizeTermKey(query)
  const unseen = []
  const replay = []
  const localHashes = new Set()

  for (const item of candidates) {
    const imageHash = hashImageUrl(item.url)
    if (!imageHash || localHashes.has(imageHash)) continue
    localHashes.add(imageHash)
    const row = { ...item, imageHash }
    if (hasSeenImage(termKey, imageHash)) {
      replay.push(row)
    } else {
      unseen.push(row)
    }
  }

  const selected = [...shuffle(unseen).slice(0, maxCount)]
  let usedReplay = false

  if (selected.length < maxCount && replay.length) {
    const needed = maxCount - selected.length
    selected.push(...shuffle(replay).slice(0, needed))
    usedReplay = true
  }

  return {
    termKey,
    selected,
    usedReplay
  }
}

function makeCaption(item, query) {
  return (
    `╔═══『 GOOGLE IMAGENS 』═══╗\n` +
    `║\n` +
    `${item.title ? `║ Titulo: ${item.title}\n` : ''}` +
    `${item.domain ? `║ Fonte: ${item.domain}\n` : ''}` +
    `${item.resolution ? `║ Resolucao: ${item.resolution}\n` : ''}` +
    `║ Pesquisa: ${query}\n` +
    `║\n` +
    `╚═══『 ZAERO BOT 』═══╝`
  )
}

async function fetchEndpoint(url, extractor) {
  try {
    const res = await axios.get(url, { timeout: API_TIMEOUT_MS })
    const rows = extractor(res.data)
    return Array.isArray(rows) ? rows : []
  } catch (_) {
    return []
  }
}

async function getImageSearchResults(query, limit = 80) {
  const endpoints = [
    {
      url: `${global.APIs.stellar.url}/search/googleimagen?query=${encodeURIComponent(query)}&key=${global.APIs.stellar.key}`,
      extractor: (payload) =>
        (Array.isArray(payload?.data) ? payload.data : []).map((item) => ({
          url: item?.url,
          title: item?.title || null,
          domain: item?.domain || null,
          resolution: item?.width && item?.height ? `${item.width}x${item.height}` : null
        }))
    },
    {
      url: `${global.APIs.siputzx.url}/api/images?query=${encodeURIComponent(query)}`,
      extractor: (payload) =>
        (Array.isArray(payload?.data) ? payload.data : []).map((item) => ({
          url: item?.url,
          title: null,
          domain: null,
          resolution: item?.width && item?.height ? `${item.width}x${item.height}` : null
        }))
    },
    {
      url: `${global.APIs.delirius.url}/search/gimage?query=${encodeURIComponent(query)}`,
      extractor: (payload) =>
        (Array.isArray(payload?.data) ? payload.data : []).map((item) => ({
          url: item?.url,
          title: item?.origin?.title || null,
          domain: item?.origin?.website?.domain || null,
          resolution: item?.width && item?.height ? `${item.width}x${item.height}` : null
        }))
    },
    {
      url: `${global.APIs.apifaa.url}/faa/google-image?query=${encodeURIComponent(query)}`,
      extractor: (payload) =>
        (Array.isArray(payload?.result) ? payload.result : []).map((url) => ({
          url,
          title: null,
          domain: null,
          resolution: null
        }))
    }
  ]

  const collected = []
  for (const endpoint of endpoints) {
    const rows = await fetchEndpoint(endpoint.url, endpoint.extractor)
    if (!rows.length) continue
    collected.push(...rows)
    if (collected.length >= limit) break
  }

  return uniqueCandidates(collected).slice(0, limit)
}

export default {
  command: ['imagen', 'imagem', 'img', 'image'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    const { quantity, query: text } = parseQueryAndQuantity(args)
    if (!text) {
      return client.reply(m.chat, `Use: ${usedPrefix + command} <quantidade> <termo>`, m)
    }

    const lowerText = text.toLowerCase()
    const nsfwEnabled = global.db.data.chats[m.chat]?.nsfw === true
    if (!nsfwEnabled && bannedWords.some((word) => lowerText.includes(word))) {
      return m.reply('Este comando nao permite pesquisa NSFW (+18).')
    }

    try {
      cleanupImageSeen()
      await m.react('⏳').catch(async () => {
        await m.reply(DARK_MSG.processing).catch(() => {})
      })

      const results = await getImageSearchResults(text, Math.max(quantity * 8, 40))
      if (!results.length) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum resultado encontrado para "${text}".`, m)
      }

      const picked = pickImages(text, results, quantity)
      const selected = picked.selected
      if (selected.length < 1) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum resultado valido encontrado para "${text}".`, m)
      }

      const sentItems = []
      let sendFailures = 0
      const sendOneByOne = async (items = []) => {
        for (const item of items) {
          try {
            await client.sendMessage(
              m.chat,
              { image: { url: item.url }, caption: makeCaption(item, text) },
              { quoted: m }
            )
            sentItems.push(item)
          } catch (_) {
            sendFailures += 1
          }
        }
      }

      if (selected.length >= MIN_SEND_IMAGES && typeof client.sendAlbumMessage === 'function') {
        const album = selected.map((item) => ({
          type: 'image',
          data: { url: item.url },
          caption: makeCaption(item, text)
        }))

        try {
          await client.sendAlbumMessage(m.chat, album, { quoted: m })
          sentItems.push(...selected)
        } catch (_) {
          await sendOneByOne(selected)
        }
      } else {
        await sendOneByOne(selected)
      }

      if (sentItems.length < 1) {
        await m.react('❌').catch(() => {})
        return client.reply(m.chat, `Nenhum resultado valido encontrado para "${text}".`, m)
      }

      for (const item of sentItems) {
        markSeenImage(picked.termKey, item.imageHash)
      }

      if (picked.usedReplay) {
        await m.reply('Sem novas imagens no cache recente. Enviei resultados repetidos mais antigos.')
      }
      if (sendFailures > 0 && sentItems.length < selected.length) {
        await m.reply(`Enviei ${sentItems.length}/${selected.length}. Alguns links de imagem falharam.`)
      }

      await m.react('✅').catch(() => {})
    } catch (error) {
      await m.react('❌').catch(() => {})
      await m.reply(
        `Erro ao executar *${usedPrefix + command}*.\n${error?.message || DARK_MSG.timeout}`
      )
    }
  }
}

