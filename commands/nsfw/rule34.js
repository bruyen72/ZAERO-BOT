import fetch from 'node-fetch';
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

export default {
  command: ['r34', 'rule34', 'rule'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!globalThis.db.data.chats[m.chat]?.nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`)
      if (!args[0]) return client.reply(m.chat, `《✧》 Você deve especificar tags para pesquisar\n> Exemplo » *${usedPrefix + command} neko*`, m)
      await m.react('🕒')
      const tag = args[0].replace(/\s+/g, '_')
      let mediaList = []
      const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&api_key=a4e807dd6d4c9e55768772996946e4074030ec02c49049d291e5edb8808a97b004190660b4b36c3d21699144c823ad93491d066e73682a632a38f9b6c3cf951b&user_id=5753302`
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
      const type = res.headers.get('content-type') || ''
      if (res.ok && type.includes('json')) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json?.post || json?.data || []
        const valid = data.map(i => i?.file_url || i?.sample_url || i?.preview_url).filter(u => typeof u === 'string' && /\.(jpe?g|png|gif|mp4)$/i.test(u))
        if (valid.length) {
          mediaList = [...new Set(valid)].sort(() => Math.random() - 0.5)
        }
      }
      if (!mediaList.length)
        return client.reply(m.chat, `《✧》 Nenhum resultado encontrado para ${tag}`, m)

      // Tenta baixar com fallback (múltiplas URLs)
      let mediaBuffer = null;
      for (const mediaUrl of mediaList.slice(0, 5)) {
        mediaBuffer = await fetchMediaSafe(mediaUrl, {
          validateFirst: true,
          logPrefix: `[Rule34-${tag}]`
        });
        if (mediaBuffer) break;
      }

      if (!mediaBuffer) {
        await m.react('✖️')
        return await m.reply(`> ⚠️ *Mídia indisponível*\n\nTodas as URLs retornadas pelo Rule34 falharam ao carregar.\nTente outra tag ou tente novamente mais tarde.`)
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
      console.error(`[Rule34] Erro no comando ${command}:`, e);
      await m.reply(`> ❌ *Erro inesperado*\n\nOcorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n*Detalhes:* ${e.message}`)
    }
  }
}