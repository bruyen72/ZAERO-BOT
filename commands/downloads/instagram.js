import { fetchJsonWithTimeout } from '../../lib/fetchWithTimeout.js'

export default {
  command: ['instagram', 'ig'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args[0]) {
      return m.reply('《✧》 Por favor insira um link do Instagram.')
    }
    if (!args[0].match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?instagram\.com\/(p|reels?|share|tv|stories)\/[a-zA-Z0-9_-]+/i)) {
      return m.reply('《✧》 O link não parece *válido*. Certifique-se de que seja do *Instagram*.')
    }
    try {
      const data = await getInstagramMedia(args[0])
      if (!data) return m.reply('《✧》 Não foi possível obter conteúdo.')
      const caption =
        `╔═══『 📸 INSTAGRAM 』═══╗\n` +
        `║\n` +
        `${data.title ? `║ 👤 *Usuário:* ${data.title}\n` : ''}` +
        `${data.caption ? `║ 📝 *Descrição:* ${data.caption}\n║\n` : ''}` +
        `${data.like ? `║ ❤️ *Likes:* ${data.like}\n` : ''}` +
        `${data.comment ? `║ 💬 *Comentários:* ${data.comment}\n` : ''}` +
        `${data.views ? `║ 👁️ *Visualizações:* ${data.views}\n` : ''}` +
        `${data.duration ? `║ ⏱️ *Duração:* ${data.duration}\n` : ''}` +
        `${data.resolution ? `║ 🎥 *Resolução:* ${data.resolution}\n` : ''}` +
        `${data.format ? `║ 📦 *Formato:* ${data.format.toUpperCase()}\n` : ''}` +
        `║\n` +
        `╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`
      if (data.type === 'video') {
        await client.sendMessage(m.chat, { video: { url: data.url }, caption, mimetype: 'video/mp4', fileName: 'ig.mp4' }, { quoted: m })
      } else if (data.type === 'image') {
        await client.sendMessage(m.chat, { image: { url: data.url }, caption }, { quoted: m })
      } else {
        throw new Error('Conteúdo não suportado.')
      }
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}

async function getInstagramMedia(url) {
  const apis = [
    { endpoint: `${global.APIs.stellar.url}/dl/instagram?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, extractor: res => {
        if (!res.status || !Array.isArray(res.data) || !res.data.length) return null
        const media = res.data[0]
        if (!media?.url) return null
        return { type: media.tipo === 'video' ? 'video' : 'image', title: null, caption: null, resolution: null, format: media.tipo === 'video' ? 'mp4' : 'jpg', url: media.url }
      }
    },
    { endpoint: `${global.APIs.stellar.url}/dl/instagramv2?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, extractor: res => {
        if (!res.status || !res.data?.url) return null
        const mediaUrl = res.data.mediaUrls?.[0] || res.data.url
        if (!mediaUrl) return null
        return { type: res.data.type === 'video' ? 'video' : 'image', title: res.data.username || null, caption: res.data.caption || null, resolution: null, format: res.data.type === 'video' ? 'mp4' : 'jpg', url: mediaUrl, thumbnail: res.data.thumbnail || null, duration: res.data.videoMeta?.duration ? `${Math.round(res.data.videoMeta.duration)}s` : null }
      }
    },
    { endpoint: `${global.APIs.nekolabs.url}/downloader/instagram?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.success || !res.result?.downloadUrl?.length) return null
        const mediaUrl = res.result.downloadUrl[0]
        if (!mediaUrl) return null
        return { type: res.result.metadata?.isVideo ? 'video' : 'image', title: res.result.metadata?.username || null, caption: res.result.metadata?.caption || null, like: res.result.metadata?.like || null, comment: res.result.metadata?.comment || null, resolution: null, format: res.result.metadata?.isVideo ? 'mp4' : 'jpg', url: mediaUrl }
      }
    },
    { endpoint: `${global.APIs.delirius.url}/download/instagram?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !Array.isArray(res.data) || !res.data.length) return null
        const media = res.data[0]
        if (!media?.url) return null
        return { type: media.type === 'video' ? 'video' : 'image', title: null, caption: null, resolution: null, format: media.type === 'video' ? 'mp4' : 'jpg', url: media.url }
      }
    },
    { endpoint: `${global.APIs.ootaizumi.url}/downloader/instagram/v2?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.result?.url?.length) return null
        const media = res.result.url[0]
        if (!media?.url) return null
        return { type: media.type === 'mp4' ? 'video' : 'image', title: res.result.meta?.username || null, caption: res.result.meta?.title || null, like: res.result.meta?.like_count || null, comment: res.result.meta?.comment_count || null, resolution: null, format: media.ext || null, url: media.url, thumbnail: res.result.thumb || null }
      }
    },
    { endpoint: `${global.APIs.ootaizumi.url}/downloader/instagram/v1?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.result?.media?.length) return null
        const media = res.result.media[0]
        if (!media?.url) return null
        return { type: media.isVideo ? 'video' : 'image', title: res.result.metadata?.author || null, caption: null, like: res.result.metadata?.like || null, views: res.result.metadata?.views || null, duration: res.result.metadata?.duration ? `${Math.round(res.result.metadata.duration)}s` : null, resolution: null, format: media.isVideo ? 'mp4' : 'jpg', url: media.url, thumbnail: res.result.ppc || null }
      }
    }
  ]

  for (const { endpoint, extractor } of apis) {
    try {
      // Usa fetch com timeout de 8 segundos e 1 retry
      const res = await fetchJsonWithTimeout(endpoint, {}, 8000, 1)
      const result = extractor(res)
      if (result) return result
    } catch (err) {
      // Silenciosamente continua para próxima API
    }
    // Reduz delay entre tentativas
    await new Promise(r => setTimeout(r, 200))
  }
  return null
}
