import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'

export default {
  command: ['danbooru', 'dbooru'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!globalThis.db.data.chats[m.chat]?.nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`)
      if (!args[0]) return client.reply(m.chat, `《✧》 Você deve especificar tags para pesquisar\n> Exemplo » *${usedPrefix + command} neko*`, m)
      await m.react('🕒')
      const tag = args[0].replace(/\s+/g, '_')
      const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tag)}`
      const res = await fetchWithTimeout(url)
      const json = await res.json()
      const mediaList = json.map(p => p?.file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png|gif)$/.test(u))
      if (!mediaList.length) return client.reply(m.chat, `《✧》 Nenhum resultado encontrado para ${tag}`, m)
      const media = mediaList[Math.floor(Math.random() * mediaList.length)]
      const caption = `ꕥ Resultados para » ${tag}`
      await client.sendMessage(m.chat, { image: { url: media }, caption, mentions: [m.sender] })
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}