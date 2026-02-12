import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['delwarn'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args) => {
    const chat = global.db.data.chats[m.chat]
    const mentioned = m.mentionedJid || []
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : false)
    if (!who2) return m.reply('《✧》 Você deve mencionar ou responder ao usuário cujo aviso deseja remover.')
    const targetId = await resolveLidToRealJid(who2, client, m.chat)
    const user = chat.users[targetId]
    if (!user) return m.reply('《✧》 O usuário não foi encontrado no banco de dados.')
    const total = user?.warnings?.length || 0
    if (total === 0) {
      return client.reply(m.chat, `《✧》 Usuário @${targetId.split('@')[0]} não tem avisos registrados.`, m, { mentions: [targetId] })
    }
    const name = global.db.data.users[targetId]?.name || 'Usuario'
    const rawIndex = mentioned.length > 0 ? args[1] : args[0]
    if (rawIndex?.toLowerCase() === 'all') {
      user.warnings = []
      return client.reply(m.chat, `✐ Todos os avisos do usuário @ foram removidos${targetId.split('@')[0]} (${name}).`, m, { mentions: [targetId] })
    }
    const index = parseInt(rawIndex)
    if (isNaN(index)) {
      return m.reply('《✧》 Você deve especificar o índice do aviso que deseja excluir ou usar all para excluir tudo.')
    }
    if (index < 1 || index > total) {
      return m.reply(`ꕥ O índice deve ser um número entre 1 e ${total}.`)
    }
    const realIndex = total - index
    user.warnings.splice(realIndex, 1)
    await client.reply(m.chat, `ꕥ O aviso # foi removido${index} do usuário @${targetId.split('@')[0]} (${name}).`, m, { mentions: [targetId] })
  },
}