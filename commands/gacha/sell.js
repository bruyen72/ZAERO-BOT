export default {
  command: ['sell', 'vender'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat.characters) chat.characters = {}
    if (!chat.sales) chat.sales = {}
    if (!chat.users) chat.users = {}
    if (chat.adminonly || !chat.gacha) {
    return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
    }
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = global.db.data.settings[botId]
    const currency = bot.currency
    try {
      if (args.length < 2) {
        return m.reply(`❀ Você deve especificar um preço para leiloar o personagem.\n> Exemplo » *${usedPrefix + command} 5000 Yuki Suou*`)
      }
      const price = parseInt(args[0])
      if (isNaN(price) || price < 2000) return m.reply(`ꕥ O preço mínimo para leiloar um personagem é *¥2.000 ${currency}*.`)
      if (price > 100_000_000) return m.reply(`ꕥ O preço máximo permitido para leiloar um personagem é *¥100.000.000 ${currency}*.`)
      const name = args.slice(1).join(' ').toLowerCase()
      const idSell = Object.keys(chat.characters).find(id => (chat.characters[id]?.name || '').toLowerCase() === name)
      if (!idSell) return m.reply(`ꕥ Personagem não encontrado *${args.slice(1).join(' ')}*.`)
      const charSell = chat.characters[idSell]
      if (charSell.user !== m.sender) return m.reply(`ꕥ *${charSell.name}* deve ser reivindicado por você para vendê-lo.`)
      chat.sales[idSell] = { name: charSell.name, user: m.sender, price, time: Date.now() }
      let sellerName = global.db.data.users[m.sender].name.trim() || m.sender.split('@')[0]
      m.reply(`✎ *${charSell.name}* foi colocado à venda!\n❀ Vendedor » *${sellerName}*\n⛁ Valor » *¥${price.toLocaleString()} ${currency}*\nⴵ Expira em » *3 dias*\n> Você pode ver os personagens à venda usando *${usedPrefix}wshop*`)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}