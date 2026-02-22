export default {
  command: ['setgpdesc'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const newDesc = args.join(' ').trim()
    if (!newDesc)
      return m.reply('《✧》 Por favor insira a nova descrição que deseja dar ao grupo.')

    try {
      await client.groupUpdateDescription(m.chat, newDesc)
      m.reply('✿ A descrição do grupo foi modificada com sucesso.')
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
