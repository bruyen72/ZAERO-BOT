export default {
  command: ['d', 'delete', 'del', 'apagar'],
  category: 'utils',
  run: async (client, m, args, usedPrefix) => {
    if (!m.quoted) {
      return m.reply(`Use *${usedPrefix}d* respondendo a mensagem que voce quer apagar.`)
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
      await m.reply('Nao foi possivel apagar a mensagem. Verifique se o bot e administrador.')
    }
  }
}
