export default {
  command: ['delgenre'],
  category: 'rpg',
  run: async (client, m) => {
    const user = global.db.data.users[m.sender]
    if (!user.genre) return m.reply(`《✧》 Você não tem um gênero atribuído.`)
    user.genre = ''
    return m.reply(`✎ Seu gênero foi removido.`)
  },
};