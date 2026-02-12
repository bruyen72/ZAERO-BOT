export default {
  command: ['restart'],
  category: 'mod',
  isOwner: true,
  run: async (client, m) => {
    await client.reply(m.chat, `✎ Reiniciando o Socket...\n> *Espere um momento...*`, m)
    setTimeout(() => {
    if (process.send) {
    process.send("restart")
    } else {
    process.exit(0)
    }}, 3000)
  },
};
