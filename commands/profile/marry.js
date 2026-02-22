let proposals = {}
import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['marry', 'casarse'],
  category: 'rpg',
  run: async (client, m, args) => {
    const db = global.db.data
    const chatId = m.chat
    const proposer = m.sender
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : false)
    const proposee = await resolveLidToRealJid(who2, client, m.chat);

    if (!who2) return m.reply('《✧》 Mencione o usuário a quem você deseja propor casamento.')
    if (proposer === proposee) return m.reply('《✧》 Você não pode propor a si mesmo.')

    // Garantir que os usuários existem no banco de dados
    if (!db.users[proposer]) db.users[proposer] = {}
    if (!db.users[proposee]) db.users[proposee] = {}

    const proposerName = db.users[proposer]?.name || proposer.split('@')[0]
    const proposeeName = db.users[proposee]?.name || proposee.split('@')[0]

    if (db.users[proposer]?.marry) {
      const spouseName = db.users[db.users[proposer].marry]?.name || 'alguém'
      return m.reply(`《✧》 Você já é casado com *${spouseName}*.`)
    }

    if (db.users[proposee]?.marry) {
      const spouseName = db.users[db.users[proposee].marry]?.name || 'alguém'
      return m.reply(`《✧》 *${proposeeName}* já é casado com *${spouseName}*.`)
    }

    setTimeout(() => {
      delete proposals[proposer]
    }, 120000)

    if (proposals[proposee] === proposer) {
      delete proposals[proposee]
      db.users[proposer].marry = proposee
      db.users[proposee].marry = proposer
      return m.reply(`💍 Parabéns! *${proposerName}* e *${proposeeName}* agora estão casados! 🎉`)
    } else {
      proposals[proposer] = proposee
      return client.sendMessage(chatId, {
        text: `💌 ${proposeeName}, o usuário *${proposerName}* enviou uma proposta de casamento!\n\n⚘ *Responda com:*\n> 💍 *.marry ${proposerName}* para aceitar\n> ⏰ A proposta expira em 2 minutos.`,
        mentions: [proposer, proposee]
      }, { quoted: m })
    }
  }
};