export default {
  command: ['d', 'delete', 'del', 'apagar'],
  category: 'utils',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.quoted) {
      return m.reply(`《 ⚠️ 》 Responda à mensagem que você deseja apagar com *${usedPrefix + command}*`)
    }

    try {
      const key = {
        remoteJid: m.chat,
        fromMe: m.quoted.fromMe,
        id: m.quoted.id,
        participant: m.quoted.sender
      }

      await client.sendMessage(m.chat, { delete: key })
    } catch (e) {
      // Se falhar, pode ser que o bot nao tenha permissao ou a mensagem seja muito antiga
      await m.reply('《 ❌ 》 Não foi possível apagar a mensagem. Verifique se o bot é administrador.')
    }
  }
}
