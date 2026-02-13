import axios from 'axios';
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

export default {
  command: ['gelbooru', 'gbooru'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!globalThis.db.data.chats[m.chat]?.nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`)
      if (!args[0]) return client.reply(m.chat, `《✧》 Você deve especificar tags para pesquisar\n> Exemplo » *${usedPrefix + command} neko*`, m)
      await m.react('🕒')
      const tag = args[0].replace(/\s+/g, '_')
      const url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tag)}&api_key=f965be362e70972902e69652a472b8b2df2c5d876cee2dc9aebc7d5935d128db98e9f30ea4f1a7d497e762f8a82f132da65bc4e56b6add0f6283eb9b16974a1a&user_id=1862243`
      const res = await axios.get(url)
      const data = res.data?.post || []
      const valid = data.map(i => i?.file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png|gif|mp4)$/.test(u))
      const mediaList = [...new Set(valid)].sort(() => Math.random() - 0.5)
      if (!mediaList.length) return client.reply(m.chat, `《✧》 Nenhum resultado encontrado para ${tag}`, m)

      // Tenta baixar com fallback (múltiplas URLs)
      let mediaBuffer = null;
      for (const mediaUrl of mediaList.slice(0, 5)) {
        mediaBuffer = await fetchMediaSafe(mediaUrl, {
          validateFirst: true,
          logPrefix: `[Gelbooru-${tag}]`
        });
        if (mediaBuffer) break;
      }

      if (!mediaBuffer) {
        await m.react('✖️')
        return await m.reply(`> ⚠️ *Mídia indisponível*\n\nTodas as URLs retornadas pelo Gelbooru falharam ao carregar.\nTente outra tag ou tente novamente mais tarde.`)
      }

      const caption = `ꕥ Resultados para » ${tag}`
      const isVideo = mediaList[0].endsWith('.mp4')

      if (isVideo) {
        await client.sendMessage(m.chat, { video: mediaBuffer, caption, mentions: [m.sender] })
      } else {
        await client.sendMessage(m.chat, { image: mediaBuffer, caption, mentions: [m.sender] })
      }
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      console.error(`[Gelbooru] Erro no comando ${command}:`, e);
      await m.reply(`> ❌ *Erro inesperado*\n\nOcorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n*Detalhes:* ${e.message}`)
    }
  }
}