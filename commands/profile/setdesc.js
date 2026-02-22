export default {
  command: ['setdescription', 'setdesc'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const user = global.db.data.users[m.sender]
    const input = args.join(' ')
    if (!input) return m.reply(`《✧》 Você deve especificar uma descrição válida para o seu perfil.\n\n> ✐ Exemplo » *${usedPrefix + command} Hola, uso WhatsApp!*`)
    user.description = input
    return m.reply(`✎ Sua descrição foi estabelecida, você pode revisá-la com ${usedPrefix}profile ฅ^•ﻌ•^ฅ`)
  },
};