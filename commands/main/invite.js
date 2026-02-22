const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})(?:\s+[0-9]{1,3})?/i

async function getGroupName(client, chatId) {
  try {
    const metadata = await client.groupMetadata(chatId)
    return metadata.subject || 'Grupo desconhecido'
  } catch {
    return 'Bate-papo privado'
  }
}

export default {
  command: ['invite', 'invitar'],
  category: 'info',
  run: async (client, m, args) => {
    if (!m?.chat || !m?.sender || !global.db?.data) return

    const chat = global.db.data.chats?.[m.chat]
    const user = chat?.users?.[m.sender]
    if (!user) {
      return m.reply('?? Dados do usuário não inicializados. Tente novamente em alguns segundos.')
    }

    const grupo = m.isGroup ? await getGroupName(client, m.chat) : 'Bate-papo privado'
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings?.[botId] || {}
    const botname = botSettings.botname || 'ZÆRØ BOT'
    const dono = botSettings.owner

    const cooldown = 600000
    const lastJoin = Number.isFinite(user.jointime) ? user.jointime : 0
    const nextTime = lastJoin + cooldown

    if (Date.now() - lastJoin < cooldown) {
      return m.reply(`? Espere *${msToTime(nextTime - Date.now())}* para reenviar outro convite.`)
    }

    if (!args || !args.length) {
      return m.reply('«?» Digite o link para convidar o bot para o seu grupo.')
    }

    const link = args.join(' ')
    const match = link.match(linkRegex)
    if (!match || !match[1]) {
      return m.reply('«?» O link inserido é inválido ou incompleto.')
    }

    const mainClientJid = global.client?.user?.id
      ? global.client.user.id.split(':')[0] + '@s.whatsapp.net'
      : botId
    const isOficialBot = botId === mainClientJid
    const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot'

    const pp = await client.profilePictureUrl(m.sender, 'image').catch(() => 'https://cdn.yuki-wabot.my.id/files/nufq.jpeg')
    const senderName = global.db.data.users?.[m.sender]?.name || m.pushName || m.sender.split('@')[0]

    const message = `? SOLICITUD RECIBIDA\n\n` +
      `? *Usuário ›* ${senderName}\n` +
      `? *Link ›* ${link}\n` +
      `? *Chat ›* ${grupo}\n\n` +
      `? INFO BOT\n` +
      `? *Socket ›* ${botType}\n` +
      `? *Nome ›* ${botname}\n` +
      `? *Versão ›* ${global.version}`

    const relayClient = global.client || client
    const relayLink = botSettings.link || global.links?.api || ''

    if (typeof relayClient.sendContextInfoIndex === 'function') {
      if (isOficialBot) {
        const lista = dono ? [dono] : global.owner.map((num) => `${num}@s.whatsapp.net`)
        for (const destino of lista) {
          try {
            await relayClient.sendContextInfoIndex(destino, message, {}, null, false, null, {
              banner: pp,
              title: '? Convite',
              body: 'Novo convite recebido.',
              redes: relayLink
            })
          } catch {}
        }
      } else {
        const destino = dono || botId
        try {
          await relayClient.sendContextInfoIndex(destino, message, {}, null, false, null, {
            banner: pp,
            title: '? Convite',
            body: 'Novo convite recebido.',
            redes: relayLink
          })
        } catch {}
      }
    }

    await client.reply(m.chat, '? O link foi enviado corretamente. Obrigado pelo convite!', m)
    user.jointime = Date.now()
  }
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds
  if (minutes === '00') return `${seconds} segundo${seconds > 1 ? 's' : ''}`
  return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
}