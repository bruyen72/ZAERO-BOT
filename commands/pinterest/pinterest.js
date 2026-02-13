import { fetchPinterestImages } from './index.js'

export default {
  command: ['pinterest', 'pin'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    let maxImages = 5
    let query = args.join(' ').trim()

    // Verifica se o primeiro argumento e um numero para definir a quantidade
    if (args.length > 1 && !isNaN(args[0])) {
      maxImages = parseInt(args[0])
      if (maxImages > 12) maxImages = 12 // Limite maximo do crawler
      if (maxImages < 1) maxImages = 1
      query = args.slice(1).join(' ').trim()
    }

    if (!query) {
      return m.reply(
        `《✧》 Use: ${usedPrefix}${command} [quantidade] <termo|link>
` +
        `Exemplo 1: ${usedPrefix}${command} 2 anime casal
` +
        `Exemplo 2: ${usedPrefix}${command} naruto
` +
        `Exemplo 3: ${usedPrefix}${command} https://br.pinterest.com/pin/99360735500167749/`
      )
    }

    // O crawler ja lida com links internamente via normalizeQueryOrUrl
    try {
      m.react('\u23F3').catch(() => {})

      const result = await fetchPinterestImages({
        queryOrUrl: query,
        maxImages: maxImages,
        maxPages: 5,
        requireAuth: String(process.env.PINTEREST_REQUIRE_AUTH || '').trim() === '1'
      })

      if (!result?.images?.length) {
        return m.reply(`《✧》 Nenhum resultado encontrado para: ${query}`)
      }

      const medias = result.images.slice(0, maxImages).map((item, index, source) => {
        return {
          type: 'image',
          data: { url: item.url },
          caption: `╔═══『 📌 PINTEREST 』═══╗
` +
            `║
` +
            `║ 🔍 *Busca:* ${query}
` +
            `║ 📸 *Item:* ${index + 1}/${source.length}
` +
            `║
` +
            `╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`
        }
      })

      if (medias.length === 1 || typeof client.sendAlbumMessage !== 'function') {
        await client.sendMessage(
          m.chat,
          {
            image: { url: medias[0].data.url },
            caption: medias[0].caption
          },
          { quoted: m }
        )
      } else {
        await client.sendAlbumMessage(m.chat, medias, { quoted: m })
      }
    } catch (error) {
      await m.reply(`> Erro ao executar ${usedPrefix}${command}: ${error?.message || 'falha inesperada'}`)
    }
  }
}
