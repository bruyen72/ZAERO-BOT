export default {
  command: ['setbotname', 'setname'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const isOwner2 = [idBot, ...(config.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isOwner2) return m.reply(mess.socket)
    const value = args.join(' ').trim()
    if (!value) return m.reply(`✐ Você deve escrever um nome curto e um nome longo válidos.\n> Exemplo: *${usedPrefix + command} Sherry / Sherry Barnet*`)
    const formatted = value.replace(/\s*\/\s*/g, '/')
    let [short, long] = formatted.includes('/') ? formatted.split('/') : [value, value]
    if (!short || !long) return m.reply('✎ Usa el formato: Nombre Corto / Nombre Largo')
    if (/\s/.test(short)) return m.reply('❖ O nome abreviado não pode conter espaços.')
    config.namebot = short.trim()
    config.botname = long.trim()
    return m.reply(`✿ O nome do bot foi atualizado!\n\n❒ Nome abreviado: *${short.trim()}*\n❒ Nombre largo: *${long.trim()}*`)
  },
};