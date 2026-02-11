import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'

export default {
  command: ['testwelcome', 'testw'],
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

      // Mensagens de boas-vindas aleatórias
      const welcomeMessages = [
        `🎉 Opa! @${phone} chegou!\n✨ Seja bem-vindo(a) ao caos organizado!`,
        `🌟 Eita! @${phone} entrou na área!\n💫 Preparem as pipocas, galera!`,
        `🎊 Olha quem apareceu: @${phone}!\n🎭 Bem-vindo ao circo, digo, grupo!`,
        `✨ @${phone} entrou no chat!\n🎮 GG! Mais um player no servidor!`,
        `🎪 Atenção! @${phone} chegou!\n🎉 Senta que lá vem história boa!`,
        `🌈 Chegou gente nova! @${phone}\n💝 Seja bem-vindo à família!`,
        `🎨 @${phone} entrou no grupo!\n🎭 Que comecem os memes!`,
        `⭐ E aí, @${phone}!\n🔥 Bem-vindo ao melhor grupo!`,
        `🎯 @${phone} desbloqueou: *${metadata.subject}*\n✅ Achievement: Novo membro!`,
        `🚀 @${phone} aterrissou no grupo!\n🌟 Houston, temos um novo tripulante!`
      ]

      const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]

      // Verifica se tem mensagem personalizada
      const customMessage = chat.sWelcome
        ? chat.sWelcome
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

      // Buscar GIF aleatório de anime welcome
      try {
        const gifResponse = await fetchWithTimeout(`https://tenor.googleapis.com/v2/search?q=anime+welcome&key=AIzaSyCY8VRFGjKZ2wpAoRTQ3faV_XcwTrYL5DA&limit=30`)
        const gifData = await gifResponse.json()
        const gifs = gifData.results || []
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)]
        const gifUrl = randomGif?.media_formats?.mp4?.url || randomGif?.media_formats?.gif?.url || pp

        await client.sendMessage(m.chat, {
          video: { url: gifUrl },
          gifPlayback: true,
          caption: `🧪 *TESTE DE WELCOME*\n\n${caption}`,
          ...fakeContext
        })
      } catch (err) {
        await client.sendMessage(m.chat, {
          image: { url: pp },
          caption: `🧪 *TESTE DE WELCOME*\n\n${caption}`,
          ...fakeContext
        })
      }
    } catch (e) {
      await m.reply(`❌ Erro ao testar: ${e.message}`)
    }
  }
}
