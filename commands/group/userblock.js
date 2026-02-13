export default {
  command: ['userblock', 'castigo', 'bloquear', 'unuserblock', 'desbloquear'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const isUnblock = command.includes('un') || command.includes('desbloquear')
    const mentioned = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null

    if (!mentioned) {
      return m.reply(`《 ⚠️ 》 Marque ou responda a mensagem de quem você deseja ${isUnblock ? 'desbloquear' : 'bloquear'}.`)
    }

    // Nao permitir bloquear o dono
    const ownerNumbers = global.owner.map(num => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
    if (ownerNumbers.includes(mentioned)) {
      return m.reply('《 ❌ 》 Você não pode aplicar castigo ao dono do bot.')
    }

    const user = global.db.data.users[mentioned]
    if (!user) return m.reply('《 ❌ 》 Usuário não encontrado no banco de dados.')

    if (isUnblock) {
      if (!user.banned) return m.reply('《 ⚠️ 》 Este usuário não está bloqueado.')
      user.banned = false
      m.reply(`╔═══『 ⚖️ TRIBUNAL 』═══╗
║
║ ✅ CASTIGO REVOGADO
║ 👤 Usuário: @${mentioned.split('@')[0]}
║ 🔓 Status: Liberado
║
╚════『 ✧ ZÆRØ BOT ✧ 』════╝`, null, { mentions: [mentioned] })
    } else {
      if (user.banned) return m.reply('《 ⚠️ 》 Este usuário já está em castigo.')
      user.banned = true
      m.reply(`╔═══『 ⚖️ TRIBUNAL 』═══╗
║
║ 🚫 USUÁRIO EM CASTIGO
║ 👤 Usuário: @${mentioned.split('@')[0]}
║ 🔒 Status: Bloqueado
║
╚════『 ✧ ZÆRØ BOT ✧ 』════╝`, null, { mentions: [mentioned] })
    }
  }
}
