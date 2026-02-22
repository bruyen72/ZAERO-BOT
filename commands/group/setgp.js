export default {
  command: ['setgpname'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const newName = args.join(' ').trim()
    if (!newName)
      return m.reply('《✧》 Por favor, digite o novo nome que deseja para o grupo.')
    try {
      await client.groupUpdateSubject(m.chat, newName)
      m.reply(`✿ O nome do grupo foi alterado com sucesso.`)
    } catch (e) {
     return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
