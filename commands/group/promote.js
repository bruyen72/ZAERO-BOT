export default {
  command: ['promote'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const mentioned = await m.mentionedJid
    const who = mentioned.length > 0 ? mentioned[0] : m.quoted ? await m.quoted.sender : false
    if (!who) return m.reply('《✧》 Mencione o usuário que você deseja promover a administrador.')
    try {
      const groupMetadata = await client.groupMetadata(m.chat)
      const participant = groupMetadata.participants.find((p) => p.phoneNumber === who || p.id === who || p.lid === who || p.jid === who)
      if (participant?.admin)
        return client.sendMessage(m.chat, { text: `《✧》 *@${who.split('@')[0]}*Você já é administrador do grupo!`, mentions: [who] }, { quoted: m })
      await client.groupParticipantsUpdate(m.chat, [who], 'promote')
      await client.sendMessage(m.chat, { text: `✿ *@${who.split('@')[0]}*foi promovido a administrador do grupo!`, mentions: [who] }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
