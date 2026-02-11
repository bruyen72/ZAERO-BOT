export default {
  command: ['toimg', 'toimage'],
  category: 'tools',
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!m.quoted) return client.reply(m.chat, `《✧》 Você deve citar um adesivo para converter em imagem.`, m)
    await m.react('🕒')
    let xx = m.quoted
    let imgBuffer = await xx.download()
    if (!imgBuffer) {
      await m.react('✖️')
      return client.reply(m.chat, `《✧》 Não foi possível baixar o adesivo.`, m)
    }
    await client.sendMessage(m.chat, { image: imgBuffer, caption: '✅ *Convertido para imagem!*' }, { quoted: m })
    await m.react('✔️')
  }
}