import fetch from 'node-fetch'

export default {
  command: ['anime', 'anisearch'],
  category: 'anime',
  info: {
    desc: 'Busca informações detalhadas de um anime via Jikan. Ex: .anime solo leveling'
  },
  run: async (client, m, args, usedPrefix) => {
    const query = args.join(' ').trim()
    
    if (!query) {
      return m.reply(`🏮 *ZAERO ANIME* 🏮\n\nPor favor, digite o nome de um anime.\nEx: *${usedPrefix}anime naruto*`)
    }

    await m.react('🌸').catch(() => {})

    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`)
      const json = await response.json()

      if (!json.data || json.data.length === 0) {
        await m.react('❌').catch(() => {})
        return m.reply(`🏮 *ZAERO ANIME* 🏮\n\nNão encontrei nenhum resultado para: "${query}"`)
      }

      const anime = json.data[0]
      
      // Tradução de Status
      const statusMap = {
        'Finished Airing': 'Finalizado ✅',
        'Currently Airing': 'Em Lançamento 📡',
        'Not yet aired': 'Ainda não lançado ⏳'
      }

      // Mapear Gêneros
      const genres = anime.genres.map(g => g.name).join(', ')

      const infoText = `
┏━━━━━━ ✨ *𝘼𝙉𝙄𝙈𝙀 𝙄𝙉𝙁𝙊* ✨ ━━━━━━┓
┃
┃ 🏷️ *Título:* ${anime.title}
┃ 🇯🇵 *Japonês:* ${anime.title_japanese || 'N/A'}
┃ ⭐ *Nota:* ${anime.score || 'Sem nota'}
┃ 🎞️ *Tipo:* ${anime.type || 'N/A'}
┃ 📺 *Episódios:* ${anime.episodes || 'Desconhecido'}
┃ 📊 *Status:* ${statusMap[anime.status] || anime.status}
┃ 📅 *Temporada:* ${anime.season ? anime.season.toUpperCase() : ''} ${anime.year || ''}
┃ 🔞 *Classif:* ${anime.rating || 'N/A'}
┃ 🧬 *Gêneros:* ${genres || 'N/A'}
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📝 *𝙎𝙄𝙉𝙊𝙋𝙎𝙀:*
${anime.synopsis ? anime.synopsis.substring(0, 500) + '...' : 'Sem sinopse disponível.'}

🔗 *Link:*
${anime.url}
`.trim()

      await m.react('✅').catch(() => {})

      // Envia a imagem com o texto formatado
      await client.sendMessage(m.chat, {
        image: { url: anime.images.jpg.large_image_url },
        caption: infoText
      }, { quoted: m })

    } catch (error) {
      console.error(`[JIKAN-SEARCH] Erro: ${error.message}`)
      await m.react('❌').catch(() => {})
      m.reply('🏮 *ZAERO ANIME* 🏮\n\nOcorreu uma falha ao processar sua busca no Jikan.')
    }
  }
}
