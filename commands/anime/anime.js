import fetch from 'node-fetch'
import translate from '@vitalets/google-translate-api'

export default {
  command: ['anime', 'anisearch'],
  category: 'anime',
  info: {
    desc: 'Info rápida de anime no estilo ZÆRØ.'
  },
  run: async (client, m, args, usedPrefix) => {
    const query = args.join(' ').trim()
    if (!query) return m.reply(`🏮 *ZÆRØ ANIME* 🏮\n\nQual anime deseja buscar?`)

    await m.react('✨').catch(() => {})

    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`)
      const json = await response.json()

      if (!json.data?.[0]) {
        await m.react('❌').catch(() => {})
        return m.reply(`🏮 *ZÆRØ* | Anime não encontrado.`)
      }

      const anime = json.data[0]
      
      // Tradução ultra-curta
      let synopsisPt = 'Sem sinopse.'
      if (anime.synopsis) {
        try {
          const tr = await translate(anime.synopsis, { to: 'pt' })
          synopsisPt = tr.text.length > 180 ? tr.text.substring(0, 180) + '...' : tr.text
        } catch {
          synopsisPt = anime.synopsis.substring(0, 180) + '...'
        }
      }

      const text = `
⛩️ *${anime.title.toUpperCase()}*

⭐ *NOTA:* ${anime.score || '7.0'}
📺 *EPS:* ${anime.episodes || '?'}
📡 *STATUS:* ${anime.status === 'Finished Airing' ? 'Finalizado' : 'Em lançamento'}

📝 ${synopsisPt}

✨ *𝙕Æ𝙍Ø 𝘼𝙉𝙄𝙈𝙀* ✨
`.trim()

      await m.react('✅').catch(() => {})

      await client.sendMessage(m.chat, {
        image: { url: anime.images.jpg.large_image_url },
        caption: text
      }, { quoted: m })

    } catch (error) {
      m.reply('🏮 *ZÆRØ* | Erro na conexão.')
    }
  }
}
