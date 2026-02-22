export default {
  command: ['revoke', 'restablecer'],
  category: 'grupo',
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await client.groupRevokeInvite(m.chat)
      const code = await client.groupInviteCode(m.chat)
      const link = `https://chat.whatsapp.com/${code}`
      const teks = `﹒⌗﹒🌿.ৎ˚₊‧ O link do grupo foi redefinido:\n\n𐚁 ֹ ִ \`NOVO LINK DO GRUPO\` ! ୧ ֹ ִ🔗\n☘️ \`Solicitado por :\` @${m.sender.split('@')[0]}\n\n🌱 \`Link:\` ${link}`
      await m.react('🕒')
      await client.reply(m.chat, teks, m, { mentions: [m.sender] })
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}