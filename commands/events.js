import fetch from 'node-fetch'
let WAMessageStubType = (await import('@whiskeysockets/baileys')).default
import chalk from 'chalk'
import { fetchMediaSafe } from '../lib/mediaFetcher.js'

export default async (client, m) => {
  client.ev.on('group-participants.update', async (anu) => {
    try {
      const metadata = await client.groupMetadata(anu.id).catch(() => null)
      if (!metadata) return
      const groupAdmins = metadata?.participants?.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
      const chat = global?.db?.data?.chats?.[anu.id] || {}
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const botSettings = global?.db?.data?.settings?.[botId] || {}
      const primaryBotId = chat?.primaryBot
      const memberCount = metadata?.participants?.length || 0
      const isSelf = botSettings.self ?? false
      if (isSelf) return
      for (const p of (anu.participants || [])) {
        const jid = typeof p === 'string' ? p : (p?.id || p?.jid || p?.phoneNumber || '')
        if (!jid) continue
        const phone = jid.split('@')[0]
        const pp = await client.profilePictureUrl(jid, 'image').catch(_ => 'https://cdn.yuki-wabot.my.id/files/nufq.jpeg')       
        const mensajes = { add: chat.sWelcome ? `\n┊➤ ${chat.sWelcome.replace(/{usuario}/g, `@${phone}`).replace(/{grupo}/g, `*${metadata.subject}*`).replace(/{desc}/g, metadata?.desc || '✿ Sin Desc ✿')}` : '', remove: chat.sGoodbye ? `\n┊➤ ${chat.sGoodbye.replace(/{usuario}/g, `@${phone}`).replace(/{grupo}/g, `*${metadata.subject}*`).replace(/{desc}/g, metadata?.desc || '✿ Sin Desc ✿')}` : '', leave: chat.sGoodbye ? `\n┊➤ ${chat.sGoodbye.replace(/{usuario}/g, `@${phone}`).replace(/{grupo}/g, `*${metadata.subject}*`).replace(/{desc}/g, metadata?.desc || '✿ Sin Desc ✿')}` : '' }
        if (anu.action === 'add' && chat?.welcome && (!primaryBotId || primaryBotId === botId)) {
          // Mensagens de boas-vindas aleatórias e engraçadas
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
          const customMessage = mensajes[anu.action] || ''
          const caption = customMessage || randomMessage

          // Buscar GIF aleatório de anime welcome
          try {
            const gifResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+welcome&key=AIzaSyCY8VRFGjKZ2wpAoRTQ3faV_XcwTrYL5DA&limit=30`)
            const gifData = await gifResponse.json()
            const gifs = gifData.results || []
            if (gifs.length === 0) throw new Error('No GIFs found')

            // Tenta baixar múltiplos GIFs (fallback)
            let gifBuffer = null
            for (let i = 0; i < Math.min(gifs.length, 3); i++) {
              const randomGif = gifs[Math.floor(Math.random() * gifs.length)]
              const gifUrl = randomGif?.media_formats?.mp4?.url || randomGif?.media_formats?.gif?.url
              if (!gifUrl) continue

              gifBuffer = await fetchMediaSafe(gifUrl, {
                validateFirst: false,
                logPrefix: '[Event-Welcome]'
              })
              if (gifBuffer) break
            }

            if (gifBuffer) {
              await client.sendMessage(anu.id, { video: gifBuffer, gifPlayback: true, caption, mentions: [jid] })
            } else {
              throw new Error('Failed to download GIF')
            }
          } catch (err) {
            // Se falhar ao buscar GIF, usa a foto de perfil
            await client.sendMessage(anu.id, { image: { url: pp }, caption, mentions: [jid] })
          }
        }
        if ((anu.action === 'remove' || anu.action === 'leave') && chat?.goodbye && (!primaryBotId || primaryBotId === botId)) {
          // Mensagens de despedida aleatórias e engraçadas
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
          const customMessage = mensajes[anu.action] || ''
          const caption = customMessage || randomMessage

          // Buscar GIF aleatório de anime goodbye/sad
          try {
            const gifResponse = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+goodbye+sad&key=AIzaSyCY8VRFGjKZ2wpAoRTQ3faV_XcwTrYL5DA&limit=30`)
            const gifData = await gifResponse.json()
            const gifs = gifData.results || []
            if (gifs.length === 0) throw new Error('No GIFs found')

            // Tenta baixar múltiplos GIFs (fallback)
            let gifBuffer = null
            for (let i = 0; i < Math.min(gifs.length, 3); i++) {
              const randomGif = gifs[Math.floor(Math.random() * gifs.length)]
              const gifUrl = randomGif?.media_formats?.mp4?.url || randomGif?.media_formats?.gif?.url
              if (!gifUrl) continue

              gifBuffer = await fetchMediaSafe(gifUrl, {
                validateFirst: false,
                logPrefix: '[Event-Goodbye]'
              })
              if (gifBuffer) break
            }

            if (gifBuffer) {
              await client.sendMessage(anu.id, { video: gifBuffer, gifPlayback: true, caption, mentions: [jid] })
            } else {
              throw new Error('Failed to download GIF')
            }
          } catch (err) {
            // Se falhar ao buscar GIF, usa a foto de perfil
            await client.sendMessage(anu.id, { image: { url: pp }, caption, mentions: [jid] })
          }
        }
        if (anu.action === 'promote' && chat?.alerts && (!primaryBotId || primaryBotId === botId)) {
          const usuario = anu.author
          await client.sendMessage(anu.id, { text: `「✎」 *@${phone}* foi promovido a Administrador por *@${usuario.split('@')[0]}.*`, mentions: [jid, usuario, ...groupAdmins.map(v => v.id)] })
        }
        if (anu.action === 'demote' && chat?.alerts && (!primaryBotId || primaryBotId === botId)) {
          const usuario = anu.author
          await client.sendMessage(anu.id, { text: `「✎」 *@${phone}* foi rebaixado de Administrador por *@${usuario.split('@')[0]}.*`, mentions: [jid, usuario, ...groupAdmins.map(v => v.id)] })
        }
      }
    } catch (err) {
      console.log(chalk.gray(`[ BOT  ]  → ${err}`))
    }
  })
  client.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages?.[0]
  if (!m?.messageStubType) return
  const id = m.key?.remoteJid
  if (!id) return
  const chat = global?.db?.data?.chats?.[id] || {}
  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const primaryBotId = chat?.primaryBot
  if (!chat?.alerts || (primaryBotId && primaryBotId !== botId)) return
  const isSelf = (global?.db?.data?.settings?.[botId] || {}).self ?? false
  if (isSelf) return
  const actor = m.key?.participant || m.participant || m.key?.remoteJid
  if (!actor) return
  const phone = actor.split('@')[0]
  const groupMetadata = await client.groupMetadata(id).catch(() => null)
  const groupAdmins = groupMetadata?.participants?.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
  if (m.messageStubType == 21) {
    await client.sendMessage(id, { text: `「✎」 @${phone} alterou o nome do grupo para *${m.messageStubParameters?.[0]}*`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
  if (m.messageStubType == 22) {
    await client.sendMessage(id, { text: `「✎」 @${phone} mudou o ícone do grupo.`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
  if (m.messageStubType == 23) {
    await client.sendMessage(id, { text: `「✎」 @${phone} restabeleceu o vínculo do grupo.`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
  if (m.messageStubType == 24) {
    await client.sendMessage(id, { text: `「✎」 @${phone} alterou a descrição do grupo.`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
  if (m.messageStubType == 25) {
    await client.sendMessage(id, { text: `「✎」 @${phone} alterou as configurações do grupo para permitir ${m.messageStubParameters?.[0] == 'on' ? 'apenas administradores' : 'todos'} pode configurar o grupo.`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
  if (m.messageStubType == 26) {
    await client.sendMessage(id, { text: `「✎」 @${phone} alterou as configurações do grupo para permitir ${m.messageStubParameters?.[0] === 'on' ? 'Somente administradores podem enviar mensagens ao grupo.' : 'Todos os membros podem enviar mensagens para o grupo.'}`, mentions: [actor, ...groupAdmins.map(v => v.id)] })
  }
})
}
