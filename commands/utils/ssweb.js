import fetch from 'node-fetch'

export default {
  command: ['ssweb', 'ss'],
  category: ['tools'],
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!args[0]) return m.reply('❀ Por favor, insira o link de uma página.')
      let ss = await (await fetch(`https://image.thum.io/get/fullpage/${args[0]}`)).buffer()
      await client.sendMessage(m.chat, {
        image: ss,
        caption: args[0]
      }, { quoted: m })
    } catch (error) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}
