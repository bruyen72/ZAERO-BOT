export default {
  command: ['afk'],
  category: 'fun',
  run: async (client, m, args) => {
    if (!m?.chat || !m?.sender || !global.db?.data) return

    if (!global.db.data.chats || typeof global.db.data.chats !== 'object' || Array.isArray(global.db.data.chats)) {
      global.db.data.chats = {}
    }

    const chat = global.db.data.chats[m.chat] ||= {}
    if (!chat.users || typeof chat.users !== 'object' || Array.isArray(chat.users)) {
      chat.users = {}
    }

    const userData = chat.users[m.sender] ||= {}
    userData.afk = Date.now()
    userData.afkReason = args.join(' ')

    const nombre = global.db.data.users?.[m.sender]?.name || 'Usuario'
    const motivo = args.length ? `${args.join(' ')}` : 'Sem especificar!'

    return await client.reply(m.chat, `? O usuário *${nombre}* será AFK.\n> ? Motivo » *${motivo}*`, m)
  }
}