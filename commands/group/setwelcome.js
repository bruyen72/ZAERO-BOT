export default {
  command: ['setwelcome'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!global?.db?.data?.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    const value = text ? text.trim() : ''
    if (!value) {
      return m.reply(`ꕥ Você deve enviar uma mensagem para defini-la como uma mensagem de boas-vindas.\n> Você pode usar {user}, {group} e {desc} como variáveis ​​dinâmicas.\n\n✐ Exemplo:\n${usedPrefix}setwelcome Bem-vindo {usuário} ao {grupo}!`)
    }
    chat.sWelcome = value
    return m.reply(`ꕥ Você configurou a mensagem de boas-vindas corretamente.`)
  }
}