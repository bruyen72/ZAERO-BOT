export default {
  command: ['setstickermeta', 'setmeta'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const userId = m.sender
    const user = db.users[userId]
    if (!args || args.length === 0)
      return m.reply('《✧》 Insira os metadados que deseja atribuir aos seus adesivos.')
    try {
      const fullArgs = args.join(' ')
      const [metadatos01, metadatos02] = fullArgs.split(/\||•/).map((meta) => meta.trim())
      user.metadatos = metadatos01 || ''
      user.metadatos2 = metadatos02 || ''
      await client.sendMessage(m.chat, { text: `✎ Os metadados dos seus stickers foram atualizados com sucesso.` }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};