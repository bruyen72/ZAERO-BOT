export default {
  command: ['bot'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args) => {
    const chat = global.db.data.chats[m.chat]
    const estado = chat.isBanned ?? false

    if (args[0] === 'off') {
      if (estado) return m.reply('《✧》 O *Bot* já estava *desativado* neste grupo.')
      chat.isBanned = true
      return m.reply(`《✧》 Você está *Desativado* *${global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].namebot}* neste grupo.`)
    }

    if (args[0] === 'on') {
      if (!estado) return m.reply(`《✧》 *${global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].namebot}* já estava *ativado* neste grupo.`)
      chat.isBanned = false
      return m.reply(`《✧》 Você *Ativou* *${global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].namebot}* neste grupo.`)
    }

    return m.reply(`*✿ Estado ${global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].namebot} (｡•́‿•̀｡)*\n✐ *Actual ›* ${estado ? '✗ Desativado' : '✓ Ativado'}\n\n✎ Você pode alterá-lo com:\n> ● _Ativar ›_ *bot ativado*\n> ● _Desativar ›_ *bot desativado*`)
  },
};
