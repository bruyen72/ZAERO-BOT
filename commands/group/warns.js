import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['warns'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args) => {
    const chat = global.db.data.chats[m.chat]
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : false
   const userId = await resolveLidToRealJid(who2, client, m.chat);
    if (!who2 || !chat.users[userId]) {
      return m.reply('《✧》 Mencione ou responda a um usuário válido para ver seus avisos.')
    }
    const user = chat.users[userId]
    const total = user.warnings?.length || 0
    if (total === 0) {
      return client.reply(m.chat, `《✧》 @${userId.split('@')[0]} não tem avisos registrados.`, m, { mentions: [userId] })
    }
    const name = (global.db.data.users[userId].name) || 'Usuario'
    const warningList = user.warnings.map((w, i) => {
        const index = total - i
        const author = w.by ? `\n> » Por: @${w.by.split('@')[0]}` : ''
        return `\`#${index}\` » ${w.reason}\n> » Fecha: ${w.timestamp}${author}`
      }).join('\n')
    await client.reply(m.chat, `✐ Avisos de @${userId.split('@')[0]} (${name}):\n> ✧ Total de avisos: \`${total}\`\n\n${warningList}`, m, { mentions: [userId, ...user.warnings.map(w => w.by).filter(Boolean)] })
  },
};