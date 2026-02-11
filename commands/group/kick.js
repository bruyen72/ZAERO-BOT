export default {
  command: ['kick'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.mentionedJid[0] && !m.quoted) {
      return m.reply('《✧》 Marque ou responda a *mensagem* da *pessoa* que você deseja eliminar')
    }
    let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender
    const groupInfo = await client.groupMetadata(m.chat)
    const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    const ownerBot = global.owner[0][0] + '@s.whatsapp.net'
    const participant = groupInfo.participants.find((p) => p.phoneNumber === user || p.jid === user || p.id === user || p.lid === user)
    if (!participant) {
      return client.reply(m.chat, `《✧》 *@${user.split('@')[0]}*não está mais no grupo.`, m, { mentions: [user] })
    }
    if (user === client.decodeJid(client.user.id)) {
      return m.reply('《✧》 Não consigo remover o *bot* do grupo')
    }
    if (user === ownerGroup) {
      return m.reply('《✧》 Não consigo remover o *proprietário* do grupo')
    }
    if (user === ownerBot) {
      return m.reply('《✧》 Não consigo excluir o *proprietário* do bot')
    }
    try {
      await client.groupParticipantsUpdate(m.chat, [user], 'remove')
      client.reply(m.chat, `✎ @${user.split('@')[0]} *excluído* corretamente`, m, { mentions: [user] })
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
