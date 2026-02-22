export default {
  command: ['delbirth'],
  category: 'rpg',
  run: async (client, m) => {
    const user = global.db.data.users[m.sender]
    if (!user.birth) return m.reply(`《✧》 Você não tem uma data de nascimento estabelecida.`)
    user.birth = ''
    return m.reply(`✎ Sua data de nascimento foi removida.`)
  },
};
