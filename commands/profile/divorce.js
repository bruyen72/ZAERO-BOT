export default {
  command: ['divorce'],
  category: 'rpg',
  run: async (client, m) => {
    const db = global.db.data
    const userId = m.sender

    // Garantir que o usuário existe no banco de dados
    if (!db.users[userId]) db.users[userId] = {}

    const partnerId = db.users[userId]?.marry
    if (!partnerId) return m.reply('《✧》 Você não é casado com ninguém.')

    // Garantir que o parceiro existe no banco de dados
    if (!db.users[partnerId]) db.users[partnerId] = {}

    const userName = db.users[userId]?.name || userId.split('@')[0]
    const partnerName = db.users[partnerId]?.name || partnerId.split('@')[0]

    db.users[userId].marry = ''
    db.users[partnerId].marry = ''

    return m.reply(`💔 *${userName}* se divorciou de *${partnerName}*.\n\n😢 Relacionamento encerrado.`)
  },
};