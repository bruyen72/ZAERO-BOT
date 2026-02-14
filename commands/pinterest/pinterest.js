import { fetchPinterestImages } from './index.js'

export default {
  command: ['pin', 'pinterest'],
  category: 'downloads',
  run: async (client, m, args, usedPrefix, command) => {
    let quantity = 1 // Padrão
    let query = ''

    if (args.length > 0) {
      // Detecta se o primeiro argumento é a quantidade
      const firstArg = args[0]
      const isNum = /^\d+$/.test(firstArg)
      
      if (isNum) {
        quantity = parseInt(firstArg)
        query = args.slice(1).join(' ').trim()
      } else {
        query = args.join(' ').trim()
      }
    }

    // Limite rigoroso de 1 a 7 fotos
    if (quantity > 7) quantity = 7
    if (quantity < 1) quantity = 1

    if (!query) {
      return m.reply(
        `╔═══『 📌 AJUDA PINTEREST 』═══╗\n` +
        `║\n` +
        `║ 💡 *Como usar:* \n` +
        `║ > *.pin <quantidade> <termo>*\n` +
        `║\n` +
        `║ 📝 *Exemplos:* \n` +
        `║ ✦ .pin anime\n` +
        `║ ✦ .pin 2 luffy\n` +
        `║ ✦ .pin 5 wallpaper pc\n` +
        `║\n` +
        `║ ⚠️ *Limite:* Máximo 7 fotos.\n` +
        `╚════════════════════════╝`
      )
    }

    try {
      await m.react('⏳').catch(() => {})

      // Chama o crawler robusto
      const result = await fetchPinterestImages({
        queryOrUrl: query,
        maxImages: quantity,
        maxPages: 3,
        requireAuth: String(process.env.PINTEREST_REQUIRE_AUTH || '').trim() === '1'
      })

      // Corta o excesso para respeitar a quantidade
      const finalImages = (result?.images || []).slice(0, quantity)

      if (!finalImages.length) {
        await m.react('❌').catch(() => {})
        return m.reply(`《✧》 Nenhum resultado encontrado para: "${query}"`)
      }

      const totalImages = finalImages.length
      const medias = finalImages.map((item, index) => {
        return {
          type: 'image',
          data: { url: item.url },
          caption: `╔═══『 📌 PINTEREST 』═══╗\n` +
                   `║\n` +
                   `║ 🔍 *Busca:* ${query}\n` +
                   `║ 📸 *Item:* ${index + 1}/${totalImages}\n` +
                   `║\n` +
                   `╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`
        }
      })

      // Envio otimizado (álbum ou sequencial)
      if (medias.length === 1 || typeof client.sendAlbumMessage !== 'function') {
        for (const media of medias) {
          await client.sendMessage(m.chat, { image: { url: media.data.url }, caption: media.caption }, { quoted: m })
        }
      } else {
        await client.sendAlbumMessage(m.chat, medias, { quoted: m })
      }

      await m.react('✅').catch(() => {})
    } catch (error) {
      await m.react('❌').catch(() => {})
      console.error(`[Pinterest Error]`, error)
      await m.reply(`> ❌ *Erro ao buscar:* ${error?.message || 'falha inesperada'}`)
    }
  }
}
