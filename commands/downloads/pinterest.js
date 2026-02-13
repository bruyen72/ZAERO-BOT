import fetch from 'node-fetch'
import { fetchPinterestImages } from '../pinterest/index.js'

const PINTEREST_LINK_REGEX = /(?:https?:\/\/|www\.|pinterest\.|br\.pinterest\.|pt\.pinterest\.|pin\.it\/)/i

export default {
  command: ['pinterest', 'pin'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ').trim()
    if (!text) {
      return m.reply(
        `《✧》 Use: ${usedPrefix}${command} <termo|link>\n` +
        `Exemplo 1: ${usedPrefix}${command} anime casal\n` +
        `Exemplo 2: ${usedPrefix}${command} https://br.pinterest.com/pin/99360735500167749/`
      )
    }

    const looksLikeUrl = PINTEREST_LINK_REGEX.test(text)

    try {
      if (looksLikeUrl) {
        const direct = await getPinterestDownload(text)
        if (direct) {
          const caption = buildPinterestCaption(direct)
          if (direct.type === 'video') {
            await client.sendMessage(
              m.chat,
              {
                video: { url: direct.url },
                caption,
                mimetype: 'video/mp4',
                fileName: 'pinterest.mp4'
              },
              { quoted: m }
            )
            return
          }

          await client.sendMessage(
            m.chat,
            {
              image: { url: direct.url },
              caption
            },
            { quoted: m }
          )
          return
        }

        const localFallback = await getPinterestLocalResults(text, 1)
        if (localFallback.length) {
          await client.sendMessage(
            m.chat,
            {
              image: { url: localFallback[0].image },
              caption: '[ PINTEREST ]\nImagem enviada via crawler local.'
            },
            { quoted: m }
          )
          return
        }

        return m.reply('《✧》 Nao foi possivel obter conteudo para esse link do Pinterest.')
      }

      let results = await getPinterestSearch(text)
      if (!results.length) {
        results = await getPinterestLocalResults(text, 8)
      }

      if (!results.length) {
        return m.reply(`《✧》 Nenhum resultado encontrado para: ${text}`)
      }

      const medias = results
        .slice(0, 10)
        .filter(item => item?.image)
        .map((item, index, source) => {
          const withIndex = { ...item, index: index + 1, total: source.length }
          return {
            type: item.type === 'video' ? 'video' : 'image',
            data: { url: item.image },
            caption: buildPinterestCaption(withIndex)
          }
        })

      if (!medias.length) {
        return m.reply('《✧》 Nao encontrei midias validas para enviar.')
      }

      if (medias.length === 1 || typeof client.sendAlbumMessage !== 'function') {
        const first = medias[0]
        await client.sendMessage(
          m.chat,
          {
            [first.type]: first.data,
            caption: first.caption
          },
          { quoted: m }
        )
        return
      }

      await client.sendAlbumMessage(m.chat, medias, { quoted: m })
    } catch (error) {
      await m.reply(`> Erro ao executar ${usedPrefix}${command}: ${error?.message || 'falha inesperada'}`)
    }
  }
}

function buildPinterestCaption(data = {}) {
  const lines = ['[ PINTEREST ]']

  if (data.title) lines.push(`Titulo: ${cleanText(data.title, 120)}`)
  if (data.description) lines.push(`Descricao: ${cleanText(data.description, 180)}`)
  if (data.likes != null) lines.push(`Likes: ${data.likes}`)
  if (data.comments != null) lines.push(`Comentarios: ${data.comments}`)
  if (data.views != null) lines.push(`Views: ${data.views}`)
  if (data.saved != null) lines.push(`Salvos: ${data.saved}`)
  if (data.format) lines.push(`Formato: ${String(data.format).toUpperCase()}`)
  if (data.index && data.total) lines.push(`Item: ${data.index}/${data.total}`)

  return lines.join('\n')
}

function cleanText(text, maxLength = 140) {
  const normalized = String(text || '')
    .replace(/#\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

async function getPinterestDownload(url) {
  const providers = buildPinterestDownloadProviders(url)
  for (const provider of providers) {
    try {
      const data = await fetchJson(provider.endpoint)
      const parsed = provider.extractor(data)
      if (parsed?.url) return parsed
    } catch {
      // tenta o proximo provider
    }
    await sleep(350)
  }
  return null
}

function buildPinterestDownloadProviders(url) {
  const endpoints = []
  const encoded = encodeURIComponent(url)
  const apis = global?.APIs || {}

  if (apis.stellar?.url && apis.stellar?.key) {
    endpoints.push({
      endpoint: `${apis.stellar.url}/dl/pinterest?url=${encoded}&key=${apis.stellar.key}`,
      extractor: (res) => {
        if (!res?.status || !res?.data?.dl) return null
        return {
          type: res?.data?.type || 'image',
          title: res?.data?.title || null,
          author: res?.data?.author || null,
          format: res?.data?.type === 'video' ? 'mp4' : 'jpg',
          url: res.data.dl
        }
      }
    })
  }

  if (apis.vreden?.url) {
    endpoints.push({
      endpoint: `${apis.vreden.url}/api/v1/download/pinterest?url=${encoded}`,
      extractor: (res) => {
        if (!res?.status || !Array.isArray(res?.result?.media_urls) || !res.result.media_urls.length) return null
        const media = res.result.media_urls.find(item => item?.quality === 'original') || res.result.media_urls[0]
        if (!media?.url) return null
        return {
          type: media.type || 'image',
          title: res?.result?.title || null,
          description: res?.result?.description || null,
          likes: res?.result?.statistics?.likes ?? null,
          views: res?.result?.statistics?.views ?? null,
          saved: res?.result?.statistics?.saved ?? null,
          format: media.type || 'jpg',
          url: media.url
        }
      }
    })
  }

  if (apis.nekolabs?.url) {
    endpoints.push({
      endpoint: `${apis.nekolabs.url}/downloader/pinterest?url=${encoded}`,
      extractor: (res) => {
        if (!res?.success || !Array.isArray(res?.result?.medias) || !res.result.medias.length) return null
        const media = res.result.medias.find(item => ['mp4', 'jpg', 'jpeg', 'png', 'webp'].includes(String(item?.extension || '').toLowerCase()))
        if (!media?.url) return null
        const ext = String(media.extension || '').toLowerCase()
        return {
          type: ext === 'mp4' ? 'video' : 'image',
          title: res?.result?.title || null,
          format: ext || (ext === 'mp4' ? 'mp4' : 'jpg'),
          url: media.url
        }
      }
    })
  }

  if (apis.delirius?.url) {
    endpoints.push({
      endpoint: `${apis.delirius.url}/download/pinterestdl?url=${encoded}`,
      extractor: (res) => {
        if (!res?.status || !res?.data?.download?.url) return null
        return {
          type: res?.data?.download?.type || 'image',
          title: res?.data?.title || null,
          description: res?.data?.description || null,
          likes: res?.data?.likes ?? null,
          comments: res?.data?.comments ?? null,
          format: res?.data?.download?.type || 'jpg',
          url: res.data.download.url
        }
      }
    })
  }

  if (apis.ootaizumi?.url) {
    endpoints.push({
      endpoint: `${apis.ootaizumi.url}/downloader/pinterest?url=${encoded}`,
      extractor: (res) => {
        if (!res?.status || !res?.result?.download) return null
        const dl = String(res.result.download)
        const isVideo = /\.mp4(\?|$)/i.test(dl)
        return {
          type: isVideo ? 'video' : 'image',
          title: res?.result?.title || null,
          format: isVideo ? 'mp4' : 'jpg',
          url: dl
        }
      }
    })
  }

  return endpoints
}

async function getPinterestSearch(query) {
  const apis = buildPinterestSearchEndpoints(query)

  for (const endpoint of apis) {
    try {
      const res = await fetchJson(endpoint)
      const parsed = normalizeSearchResponse(res)
      if (parsed.length) return parsed
    } catch {
      // tenta o proximo endpoint
    }
    await sleep(220)
  }

  return []
}

function buildPinterestSearchEndpoints(query) {
  const encoded = encodeURIComponent(query)
  const endpoints = []
  const apis = global?.APIs || {}

  if (apis.stellar?.url && apis.stellar?.key) {
    endpoints.push(`${apis.stellar.url}/search/pinterest?query=${encoded}&key=${apis.stellar.key}`)
    endpoints.push(`${apis.stellar.url}/search/pinterestv2?query=${encoded}&key=${apis.stellar.key}`)
  }

  if (apis.delirius?.url) {
    endpoints.push(`${apis.delirius.url}/search/pinterestv2?text=${encoded}`)
    endpoints.push(`${apis.delirius.url}/search/pinterest?text=${encoded}`)
  }

  if (apis.vreden?.url) {
    endpoints.push(`${apis.vreden.url}/api/v1/search/pinterest?query=${encoded}`)
    endpoints.push(`${apis.vreden.url}/api/v2/search/pinterest?query=${encoded}&limit=10&type=videos`)
  }

  if (apis.siputzx?.url) {
    endpoints.push(`${apis.siputzx.url}/api/s/pinterest?query=${encoded}&type=image`)
  }

  return endpoints
}

function normalizeSearchResponse(res) {
  if (!res || typeof res !== 'object') return []

  if (Array.isArray(res?.data) && res.data.length) {
    if (res.data[0]?.image_url) {
      return res.data
        .map(item => ({
          type: item?.type || 'image',
          title: item?.grid_title || null,
          description: item?.description || null,
          likes: item?.reaction_counts?.[1] ?? null,
          image: item?.image_url || null
        }))
        .filter(item => item.image)
    }

    return res.data
      .map(item => ({
        type: 'image',
        title: item?.title || null,
        description: item?.description || null,
        likes: item?.likes ?? null,
        image: item?.hd || item?.image || null
      }))
      .filter(item => item.image)
  }

  if (Array.isArray(res?.response?.pins) && res.response.pins.length) {
    return res.response.pins
      .map(item => ({
        type: item?.media?.video ? 'video' : 'image',
        title: item?.title || null,
        description: item?.description || null,
        image: item?.media?.images?.orig?.url || null
      }))
      .filter(item => item.image)
  }

  if (Array.isArray(res?.results) && res.results.length) {
    return res.results
      .map(url => ({ type: 'image', image: url }))
      .filter(item => item.image)
  }

  if (Array.isArray(res?.result?.search_data) && res.result.search_data.length) {
    return res.result.search_data
      .map(url => ({ type: 'image', image: url }))
      .filter(item => item.image)
  }

  if (Array.isArray(res?.result?.result) && res.result.result.length) {
    return res.result.result
      .map(item => ({
        type: item?.media_urls?.[0]?.type || 'image',
        title: item?.title || null,
        description: item?.description || null,
        image: item?.media_urls?.[0]?.url || null
      }))
      .filter(item => item.image)
  }

  return []
}

async function getPinterestLocalResults(queryOrUrl, limit = 6) {
  try {
    const result = await fetchPinterestImages({
      queryOrUrl,
      maxImages: limit,
      maxPages: 6,
      requireAuth: String(process.env.PINTEREST_REQUIRE_AUTH || '').trim() === '1'
    })

    return (result?.images || [])
      .map(item => ({
        type: 'image',
        title: null,
        description: null,
        image: item?.url || null
      }))
      .filter(item => item.image)
  } catch {
    return []
  }
}

async function fetchJson(endpoint) {
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
