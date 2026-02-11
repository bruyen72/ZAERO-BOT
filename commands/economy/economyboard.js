export default {
  command: ['economyboard', 'eboard', 'baltop'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    try {
      const users = Object.entries(chatData.users || {}).filter(([_, data]) => {
          const total = (data.coins || 0) + (data.bank || 0)
          return total >= 1000
        }).map(([key, data]) => {
          const name = db.users[key]?.name || data.name || 'Usuario'
          return { ...data, jid: key, name }
        })
      if (users.length === 0) return m.reply(`ꕥ Não há usuários no grupo com mais de 1.000 ${monedas}.`)
      const sorted = users.sort((a, b) => (b.coins || 0) + (b.bank || 0) - ((a.coins || 0) + (a.bank || 0)))
      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)
      if (isNaN(page) || page < 1 || page > totalPages) return m.reply(`《✧》 A página *${page}*não existe. Há *${totalPages}* páginas.`)
      const start = (page - 1) * pageSize
      const end = start + pageSize
      let text = `*✩ EconomyBoard (✿◡‿◡)*\n\n`
      text += sorted.slice(start, end).map(({ name, coins, bank }, i) => {
          const total = (coins || 0) + (bank || 0)
          return `✩ ${start + i + 1} › *${name}*\n     Total → *¥${total.toLocaleString()} ${monedas}*`
        }).join('\n')
      text += `\n\n> ⌦ Página *${page}* de *${totalPages}*`
      if (page < totalPages)
        text += `\n> Para ver a próxima página › *${usedPrefix + command} ${page + 1}*`
      await client.sendMessage(chatId, { text }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}
