export default {
  command: ['infoeconomy', 'cooldowns', 'economyinfo', 'einfo'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const chatData = db.chats[chatId]

    if (chatData.adminonly || !chatData.economy) {
      return m.reply(
        `ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`
      )
    }

    const user = chatData.users[m.sender]
    const name = db.users[m.sender]?.name || m.sender.split('@')[0]
    const coins = user.coins || 0
    const cooldownSteal = Math.max(0, (user.laststeal || 0) - Date.now())

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const parts = []
      if (days > 0) parts.push(`${days} d`)
      if (hours > 0) parts.push(`${hours} h`)
      if (minutes > 0) parts.push(`${minutes} m`)
      if (seconds > 0) parts.push(`${seconds} s`)
      return parts.length ? parts.join(', ') : 'Agora.'
    }

    const message = `✿ Usuário \`<${name}>\`

ⴵ Steal » *${formatTime(cooldownSteal)}*

⟁ Coins totais » ¥${coins.toLocaleString()} ${global.db.data.settings[botId].currency}`

    await client.sendMessage(chatId, { text: message }, { quoted: m })
  }
}
