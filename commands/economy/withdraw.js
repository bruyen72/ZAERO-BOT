export default {
  command: ['withdraw', 'with', 'retirar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const user = chatData.users[m.sender]
    const currency = botSettings.currency || 'Monedas'
    if (!args[0]) return m.reply(`《✧》 Insira a quantidade de *${currency}* que você deseja retirar.`)
    if (args[0].toLowerCase() === 'all') {
      if ((user.bank || 0) <= 0)
        return m.reply(`Você não tem o suficiente *${currency}*no seu banco para poder sacar.`)
      const amount = user.bank
      user.bank = 0
      user.coins = (user.coins || 0) + amount
      return m.reply(`✎ Você retirou *¥${amount.toLocaleString()} ${currency}* do banco, agora você pode usar, mas eles também podem roubar.`)
    }
    const count = parseInt(args[0])
    if (isNaN(count) || count < 1) return m.reply(`《✧》 Você deve sacar um valor válido.\n > Exemplo 1 » *${usedPrefix + command} ¥25000*\n> Exemplo 2 » *${usedPrefix + command} all*`)
    if ((user.bank || 0) < count)
      return m.reply(`《✧》 Você não tem o suficiente *${currency}* em seu banco para sacar esse valor.\n> Você só tem *¥${user.bank.toLocaleString()} ${currency}*na sua conta.`)
    user.bank -= count
    user.coins = (user.coins || 0) + count
    await m.reply(`✎ Você retirou *¥${count.toLocaleString()} ${currency}* do banco, agora você pode usar, mas eles também podem roubar.`)
  },
};