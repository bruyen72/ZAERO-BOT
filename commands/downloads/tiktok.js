import { fetchWithTimeout } from '../../lib/fetch-wrapper.js';

export default {
  command: ['tiktok', 'tt', 'tiktoksearch', 'ttsearch', 'tts'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args.length) {
      return m.reply(`《✧》 Insira um termo de pesquisa ou link do TikTok.`)
    }
    const text = args.join(" ")
    const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/@?[\w.-]+\/(?:video|photo)\/\d+/i.test(text)
    const endpoint = isUrl  ? `${global.APIs.stellar.url}/dl/tiktok?url=${encodeURIComponent(text)}&key=${global.APIs.stellar.key}` : `${global.APIs.stellar.url}/search/tiktok?query=${encodeURIComponent(text)}&key=${global.APIs.stellar.key}`
    try {
      // ⚡ Timeout de 10 segundos
      const res = await fetchWithTimeout(endpoint, {}, 10000)
      if (!res.ok) throw new Error(`O servidor respondeu com ${res.status}`)
      const json = await res.json()
      if (!json.status) return m.reply('《✧》 Nenhum conteúdo válido encontrado no TikTok.')
      if (isUrl) {
        const { title, duration, dl, author, stats, created_at, type } = json.data
        if (!dl || (Array.isArray(dl) && dl.length === 0)) return m.reply('《✧》 Link inválido ou nenhum conteúdo para download.')
        const caption = `╔═══『 🎵 TIKTOK 』═══╗
║
║ 📝 *Título:* ${title || 'Sem título'}
║ 👤 *Autor:* ${author?.nickname || author?.unique_id || 'Desconhecido'}
║
║ ⏱️ *Duração:* ${duration || 'N/A'}
║ ❤️ *Likes:* ${(stats?.likes || 0).toLocaleString()}
║ 💬 *Comentários:* ${(stats?.comments || 0).toLocaleString()}
║ 👁️ *Visualizações:* ${(stats?.views || stats?.plays || 0).toLocaleString()}
║ 🔄 *Compartilhado:* ${(stats?.shares || 0).toLocaleString()}
║ 📅 *Data:* ${created_at || 'N/A'}
║
╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`.trim()
        if (type === 'image') {
          const medias = dl.map(url => ({ type: 'image', data: { url }, caption }))
          await client.sendAlbumMessage(m.chat, medias, { quoted: m })
          // ⚡ Timeout de 10 segundos para áudio
          const audioRes = await fetchWithTimeout(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`, {}, 10000)
          const audioJson = await audioRes.json()
          const audioUrl = audioJson?.data?.play
          if (audioUrl) {
            await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: 'audio/mp4', fileName: 'tiktok_audio.mp4' }, { quoted: m })
          }
        } else {
          const videoUrl = Array.isArray(dl) ? dl[0] : dl
          await client.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
        }
      } else {
        const validResults = json.data?.filter(v => v.dl)
        if (!validResults || validResults.length < 2) {
          return m.reply('《✧》 São necessários pelo menos 2 resultados válidos com conteúdo.')
        }
        const medias = validResults.filter(v => typeof v.dl === 'string' && v.dl.startsWith('http')).map(v => {
            const caption = `╔═══『 🎵 TIKTOK 』═══╗
║
║ 📝 *Título:* ${v.title || 'Sem título'}
║ 👤 *Autor:* ${v.author?.nickname || 'Desconhecido'} ${v.author?.unique_id ? `@${v.author.unique_id}` : ''}
║
║ ⏱️ *Duração:* ${v.duration || 'N/A'}
║ ❤️ *Likes:* ${(v.stats?.likes || 0).toLocaleString()}
║ 💬 *Comentários:* ${(v.stats?.comments || 0).toLocaleString()}
║ 👁️ *Visualizações:* ${(v.stats?.views || 0).toLocaleString()}
║ 🔄 *Compartilhado:* ${(v.stats?.shares || 0).toLocaleString()}
║ 🎵 *Audio:* ${v.music?.title || `[${v.author?.nickname || 'Não disponível'}] original sound - ${v.author?.unique_id || 'unknown'}`}
║
╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`.trim()
            return { type: 'video', data: { url: v.dl }, caption }
          }).slice(0, 10)
        await client.sendAlbumMessage(m.chat, medias, { quoted: m })
      }
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}