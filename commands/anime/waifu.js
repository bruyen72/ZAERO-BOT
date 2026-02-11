import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      await m.react('🕒')
      let mode = db.data.chats[m.chat]?.nsfw ? 'nsfw' : 'sfw'
      let res = await fetchWithTimeout(`https://api.waifu.pics/${mode}/${command}`)
      if (!res.ok) return
      let json = await res.json()
      if (!json.url) return
      let img = Buffer.from(await (await fetchWithTimeout(json.url)).arrayBuffer())
      await client.sendFile(m.chat, img, 'thumbnail.jpg', `ꕥ Aqui você tem o seu *${command.toUpperCase()}* ฅ^•ﻌ•^ฅ`, m)
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}