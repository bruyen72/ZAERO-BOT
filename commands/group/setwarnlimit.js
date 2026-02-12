export default {
  command: ['setwarnlimit'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args, usedPrefix = '.') => {
    const chat = global.db.data.chats[m.chat] || {}
    const raw = args[0]
    const limit = parseInt(raw)

    if (isNaN(limit) || limit < 0 || limit > 10) {
      return m.reply(
        `? O limite de aviso deve ser um número entre \`1\` e \`10\`, ou \`0\` para desabilitar.\n` +
        `> Exemplo 1 › *${usedPrefix}setwarnlimit 5*\n` +
        `> Exemplo 2 › *${usedPrefix}setwarnlimit 0*\n\n` +
        `> Se você usar \`0\`, a função de expulsão automática será desativada.\n` +
        `? Status atual: ${chat.expulsar ? `\`${chat.warnLimit}\` avisos` : '`Desativado`'}`
      )
    }

    if (limit === 0) {
      chat.warnLimit = 0
      chat.expulsar = false
      return m.reply('? Você desativou a expulsão automática ao atingir o limite de avisos.')
    }

    chat.warnLimit = limit
    chat.expulsar = true
    await m.reply(`? Limite de aviso definido como \`${limit}\` para este grupo.\n> ? Os usuários serão expulsos automaticamente ao atingir esse limite.`)
  },
}