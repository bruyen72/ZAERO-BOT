export default {
  command: ['deldescription', 'deldesc'],
  category: 'rpg',
  run: async (client, m) => {
    const user = global.db.data.users[m.sender]
    if (!user.description) return m.reply(`《✧》 Você não tem uma descrição estabelecida.`)
    user.description = ''
    return m.reply(`✎ Sua descrição foi removida.`)
  },
};
