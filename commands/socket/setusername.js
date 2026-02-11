export default {
  command: ['setusername'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const isOwner2 = [idBot, ...(config.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isOwner2) return m.reply(mess.socket)
    const value = args.join(' ').trim()
    if (!value) return m.reply(`✎ Você deve inserir um nome de usuário válido.\n> Exemplo: *${usedPrefix + command} Sherry Barnet*`)
    await client.updateProfileName(value)
    return m.reply(`✿ O nome de usuário do bot foi atualizado para *${value}*!`)
  },
};