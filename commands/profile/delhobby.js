export default {
  command: ['delpasatiempo', 'removehobby'],
  category: 'rpg',
  run: async (client, m, args) => {
    const user = global.db.data.users[m.sender]
    if (!user.pasatiempo || user.pasatiempo === 'Não definido') {
      return m.reply('《✧》 Você não tem nenhum hobby estabelecido.')
    }
    const pasatiempoAnterior = user.pasatiempo
    user.pasatiempo = 'Não definido'    
    return m.reply(`✎ Seu hobby foi removido.`)
  },
};
