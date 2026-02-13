export default {
  command: ['leave'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const isOwner = db.settings[botId]?.owner
    const isSocketOwner = [botId, ...(isOwner ? [isOwner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isSocketOwner) return m.reply(mess.socket)
    const groupId = args[0] || m.chat
    try {
      await client.groupLeave(groupId)
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
