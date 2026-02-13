import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['warn'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : false
    const targetId = await resolveLidToRealJid(who2, client, m.chat);
    const reason = mentioned.length > 0 ? args.slice(1).join(' ') || 'Sin razón.' : args.slice(0).join(' ') || 'Sin razón.'
    try {
      if (!who2) return m.reply('《✧》 Você deve mencionar ou responder ao usuário que deseja avisar.')
      if (!chat.users[targetId]) chat.users[targetId] = {}
      const user = chat.users[targetId]
      if (!user.warnings) user.warnings = []
      const now = new Date()
      const timestamp = now.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      user.warnings.unshift({ reason, timestamp, by: m.sender })
      const total = user.warnings.length
      const name = global.db.data.users[targetId]?.name || 'Usuario'
      const warningList = user.warnings.map((w, i) => {
          const index = total - i
          return `\`#${index}\` » ${w.reason}\n> » Fecha: ${w.timestamp}`
        }).join('\n')
      let message = `✐ Adicionado aviso para @${targetId.split('@')[0]}.\n✿ Total de avisos \`(${total})\`:\n\n${warningList}`
      const warnLimit = chat.warnLimit || 3
      const expulsar = chat.expulsar === true
      if (total >= warnLimit && expulsar) {
        try {
          await client.groupParticipantsUpdate(m.chat, [targetId], 'remove')
          delete chat.users[targetId]
          delete global.db.data.users[targetId]
          message += `\n\n> ❖ O usuário atingiu o limite de avisos e foi expulso do grupo.`
        } catch {
          message += `\n\n> ❖ O usuário atingiu o limite, mas não pôde ser expulso automaticamente.`
        }
      } else if (total >= warnLimit && !expulsar) {
        message += `\n\n> ❖ O usuário atingiu o limite de avisos.`
      }
      await client.reply(m.chat, message, m, { mentions: [targetId] })
    } catch (e) {
     return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};