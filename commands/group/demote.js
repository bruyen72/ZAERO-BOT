export default {
  command: ['demote'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const mentioned = await m.mentionedJid
    const who = mentioned.length > 0 ? mentioned[0] : m.quoted ? await m.quoted.sender : false
    if (!who) return m.reply('《✧》 Mencione o usuário que você deseja rebaixar de administrador.')
    try {
      const groupMetadata = await client.groupMetadata(m.chat)
      const participant = groupMetadata.participants.find((p) => p.phoneNumber === who || p.id === who || p.lid === who || p.jid === who)
      if (!participant?.admin) return client.sendMessage(m.chat, { text: `《✧》 *@${who.split('@')[0]}*não é administrador do grupo!`, mentions: [who] }, { quoted: m },)
      if (who === groupMetadata.owner) return m.reply('《✧》 Você não pode rebaixar o criador do grupo de administradores.')
      if (who === client.user.jid) return m.reply('《✧》 Você não pode rebaixar o bot administrador.')
      await client.groupParticipantsUpdate(m.chat, [who], 'demote')
      await client.sendMessage(m.chat, { text: `✿ *@${who.split('@')[0]}*foi rebaixado de administrador do grupo!`, mentions: [who] }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};