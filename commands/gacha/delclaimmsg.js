export default {
  command: ['delclaimmsg', 'resetclaimmsg'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
      }
      if (!global.db.data.users) global.db.data.users = {}
      if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {}
      delete global.db.data.users[m.sender].claimMessage
      m.reply('❀ Mensagem de reivindicação restaurada.')
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}