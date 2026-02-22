import yts from 'yt-search';
import {getBuffer} from '../../lib/message.js';

export default {
  command: ['ytsearch', 'search'],
  category: 'internet',
  run: async (client, m, args) => {
    if (!args || !args[0]) {
      return m.reply('《✧》 Por favor insira um título de vídeo.')
    }
    const ress = await yts(`${args[0]}`)
    const armar = ress.all
    const Ibuff = await getBuffer(armar[0].image)
    let teks2 = armar.map((v) => {
        switch (v.type) {
          case 'video':
            return `➩ *Título ›* *${v.title}*

> ⴵ *Duração ›* ${v.timestamp}
> ❖ *Enviado ›* ${v.ago}
> ✿ *Visualizações ›* ${v.views}
> ❒ *Url ›* ${v.url}`.trim()
          case 'channel':
            return `
> ❖ Canal › *${v.name}*
> ❒ Url › ${v.url}
> ❀ Subscriptores › ${v.subCountLabel} (${v.subCount})
> ✿ Total de vídeos › ${v.videoCount}`.trim()
        }}).filter((v) => v).join('\n\n╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼\n\n')
    client.sendMessage(m.chat, { image: Ibuff, caption: teks2 }, { quoted: m }).catch((e) => {
      m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    })
  },
};