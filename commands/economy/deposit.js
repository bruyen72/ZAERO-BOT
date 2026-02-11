export default {
  command: ['dep', 'deposit', 'd'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const chatData = global.db.data.chats[m.chat]
    const user = chatData.users[m.sender]
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const settings = global.db.data.settings[idBot]
    const monedas = settings.currency
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    if (!args[0]) {
      return m.reply(`《✧》 Insira a quantidade de *${monedas}* que você deseja *depositar*.`)
    }
    if (args[0] < 1 && args[0].toLowerCase() !== 'all') {
      return m.reply('✎ Insira um valor *válido* para depositar')
    }
    if (args[0].toLowerCase() === 'all') {
      if (user.coins <= 0) return m.reply(`✎ Você não tem *${monedas}* para depositar em seu *banco*`)
      const count = user.coins
      user.coins = 0
      user.bank += count
      await m.reply(`ꕥ Você depositou *¥${count.toLocaleString()} ${monedas}*no seu banco`)
      return true
    }
    if (!Number(args[0]) || parseInt(args[0]) < 1) {
      return m.reply('《✧》 Insira um valor *válido* para depositar')
    }
    const count = parseInt(args[0])
    if (user.coins <= 0 || user.coins < count) {
      return m.reply('❀ Você não tem *${moedas}* suficientes para depositar')
    }
    user.coins -= count
    user.bank += count
    await m.reply(`ꕥ Você depositou *¥${count.toLocaleString()} ${monedas}*no seu banco`)
  },
};