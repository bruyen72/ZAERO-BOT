export default {
  command: ['setstatus'],
  category: 'socket',
  run: async (client, m, args, usedPrefix = '.', command = 'setstatus') => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot] || {}
    const ownerJids = [
      idBot,
      ...(config.owner ? [config.owner] : []),
      ...global.owner.map((num) => num + '@s.whatsapp.net')
    ]
    const isOwner2 = ownerJids.includes(m.sender)

    if (!isOwner2) return m.reply(mess.socket)

    const value = args.join(' ').trim()
    if (!value) {
      return m.reply(`? Você deve escrever um status válido.\n> Exemplo: *${usedPrefix + command} Olá! eu sou o ZÆRØ BOT*`)
    }

    await client.updateProfileStatus(value)
    return m.reply(`? O status do bot foi atualizado para *${value}*!`)
  },
}