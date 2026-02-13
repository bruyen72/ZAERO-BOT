import fetch from 'node-fetch';
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      await m.react('🕒')
      let mode = db.data.chats[m.chat]?.nsfw ? 'nsfw' : 'sfw'
      let res = await fetch(`https://api.waifu.pics/${mode}/${command}`)

      if (!res.ok) {
        await m.react('✖️')
        return await m.reply(`> ⚠️ API temporariamente indisponível. Tente novamente.`)
      }

      let json = await res.json()

      if (!json.url) {
        await m.react('✖️')
        return await m.reply(`> ⚠️ Nenhuma imagem encontrada.`)
      }

      // Usa sistema robusto para baixar a imagem
      let img = await fetchMediaSafe(json.url, {
        validateFirst: false, // API já validada, pula HEAD
        logPrefix: `[Waifu-${command}]`
      });

      if (!img) {
        await m.react('✖️')
        return await m.reply(`> ⚠️ Falha ao baixar a imagem. Tente novamente.`)
      }

      await client.sendFile(m.chat, img, 'thumbnail.jpg', `ꕥ Aqui você tem o seu *${command.toUpperCase()}* ฅ^•ﻌ•^ฅ`, m)
      await m.react('✔️')

    } catch (e) {
      await m.react('✖️')
      console.error(`[Waifu] Erro no comando ${command}:`, e);
      await m.reply(`> ❌ *Erro inesperado*\n\nOcorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n*Detalhes:* ${e.message}`)
    }
  },
}