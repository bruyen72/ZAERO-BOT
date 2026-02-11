export default {
  command: ['setchannel', 'setbotchannel'],
  category: 'socket',
  run: async (client, m, args) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const isOwner2 = [idBot, ...(config.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isOwner2) return m.reply(mess.socket)
    const value = args.join(' ').trim()
    if (!value) {
      return m.reply(`❀ Insira o link de um canal do WhatsApp.\n\nExemplo:\n*${m.usedPrefix}setchannel* https://whatsapp.com/channel/XXXXXXXXXXXXXX`)
    }
    const channelUrl = value.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/channel\/([0-9A-Za-z]{22,24})/i)?.[1]
    if (!channelUrl) return m.reply('ꕥ O link fornecido é inválido.')
    const info = await client.newsletterMetadata("invite", channelUrl)
    if (!info) return m.reply('ꕥ Não foi possível obter informações do canal.')
    config.link = value
    config.id = info.id
    config.nameid = info.thread_metadata?.name?.text || "Canal sin nombre"
    return m.reply(`❀ Se cambió el canal del Socket a *"${config.nameid}"* correctamente.`)
  },
}