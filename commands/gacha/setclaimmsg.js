export default {
  command: ['setclaim', 'setclaimmsg'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
      }
      if (!global.db.data.users) global.db.data.users = {}
      if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {}
      if (!args[0]) {
        return m.reply(`❀ Você deve especificar uma mensagem para reivindicar um personagem.\n> Exemplos:\n> ${usedPrefix + command} €user reivindicou o personagem €character!\n> ${usedPrefix + command} €personagem foi reivindicado por €user`)
      }
      const customMsg = args.join(' ')
      if (!customMsg.includes('€user') || !customMsg.includes('€character')) {
        return m.reply(`ꕥ Sua mensagem deve incluir *€usuário* e *€caractere* para funcionar corretamente.`)
      }
      global.db.data.users[m.sender].claimMessage = customMsg
      m.reply('❀ Mensagem de reclamação modificada.')
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}