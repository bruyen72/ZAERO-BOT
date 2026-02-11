import fetch from 'node-fetch'

export default {
  command: ['testgoodbye', 'testg'],
  category: 'grupo',
  isGroup: true,
  run: async (client, m, args) => {
    try {
      const metadata = await client.groupMetadata(m.chat)
      const chat = global?.db?.data?.chats?.[m.chat] || {}
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const botSettings = global?.db?.data?.settings?.[botId] || {}
      const memberCount = metadata?.participants?.length || 0
      const jid = m.sender
      const phone = jid.split('@')[0]
      const pp = await client.profilePictureUrl(jid, 'image').catch(_ => 'https://cdn.yuki-wabot.my.id/files/nufq.jpeg')

      // Mensagens de despedida aleatórias
      const goodbyeMessages = [
        `👋 @${phone} saiu do grupo!\n💨 Foi comprar cigarro e não voltou...`,
        `😢 @${phone} nos abandonou!\n🎭 F no chat, pessoal!`,
        `🚪 @${phone} deixou o grupo!\n💔 Mais um que caiu fora!`,
        `✈️ @${phone} decolou!\n👋 Até a próxima, aventureiro!`,
        `🌙 @${phone} saiu!\n⭐ Que a força esteja com você!`,
        `💨 @${phone} vazou!\n🎮 Desconectou do servidor!`,
        `🎪 @${phone} deixou o circo!\n🤡 Um palhaço a menos!`,
        `🏃 @${phone} correu!\n💨 Foi mais rápido que o Flash!`,
        `👻 @${phone} virou fantasma!\n🌫️ Desapareceu no mist!`,
        `🎯 @${phone} saiu!\n❌ Achievement perdido: Membro ativo!`
      ]

      const randomMessage = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)]

      // Verifica se tem mensagem personalizada
      const customMessage = chat.sGoodbye
        ? chat.sGoodbye
            .replace(/{usuario}/g, `@${phone}`)
            .replace(/{grupo}/g, `*${metadata.subject}*`)
            .replace(/{desc}/g, metadata?.desc || '✿ Sem descrição ✿')
        : null

      const caption = customMessage || randomMessage

      const fakeContext = {
        contextInfo: {
          mentionedJid: [jid]
        }
      }

      // Buscar GIF aleatório de anime goodbye/sad
      try {
        const gifResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+goodbye+sad&key=AIzaSyCY8VRFGjKZ2wpAoRTQ3faV_XcwTrYL5DA&limit=30`)
        const gifData = await gifResponse.json()
        const gifs = gifData.results || []
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)]
        const gifUrl = randomGif?.media_formats?.mp4?.url || randomGif?.media_formats?.gif?.url || pp

        await client.sendMessage(m.chat, {
          video: { url: gifUrl },
          gifPlayback: true,
          caption: `🧪 *TESTE DE GOODBYE*\n\n${caption}`,
          ...fakeContext
        })
      } catch (err) {
        await client.sendMessage(m.chat, {
          image: { url: pp },
          caption: `🧪 *TESTE DE GOODBYE*\n\n${caption}`,
          ...fakeContext
        })
      }
    } catch (e) {
      await m.reply(`❌ Erro ao testar: ${e.message}`)
    }
  }
}
