export default {
  command: ['removesale', 'removerventa'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat.sales) chat.sales = {}
    if (chat.adminonly || !chat.gacha) {
    return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com:\n» *${usedPrefix}gacha on*`)
    }
    if (!args.length) {
      return m.reply(`❀ Você deve especificar um caractere para excluir.\n> Exemplo » *${usedPrefix + command} Yuki Suou*`)
    }
    try {
      const nameRemove = args.join(' ').toLowerCase()
      const idRemove = Object.keys(chat.sales).find(id => (chat.sales[id]?.name || '').toLowerCase() === nameRemove)
      if (!idRemove || chat.sales[idRemove].user !== m.sender) {
        return m.reply(`ꕥ O personagem *${args.join(' ')}*não está à venda por você.`)
      }
      delete chat.sales[idRemove]
      m.reply(`❀ *${args.join(' ')}*foi removido da lista de vendas.`)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}