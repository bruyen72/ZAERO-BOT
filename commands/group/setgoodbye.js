export default {
  command: ['setgoodbye'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!global?.db?.data?.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    const value = text ? text.trim() : ''
    if (!value) {
      return m.reply(`ꕥ Você deve enviar uma mensagem para defini-la como uma mensagem de despedida.\n> Você pode usar {user}, {group} e {desc} como variáveis ​​dinâmicas.\n\n✐ Exemplo:\n${usedPrefix + command} Adeus {usuário}, sentiremos sua falta em {grupo}!`)
    }
    chat.sGoodbye = value
    return m.reply(`ꕥ Você definiu a mensagem de despedida corretamente.`)
  }
}