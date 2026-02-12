import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['addcoin', 'addxp'],
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const mentioned = m.mentionedJid
      const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : null)
      const who = await resolveLidToRealJid(who2, client, m.chat)
      const bot = global.db.data.settings[client.user.id.split(':')[0] + '@s.whatsapp.net']
      const currency = bot.currency || '$'     
      if (command === 'addcoin') {
        if (!who) return client.reply(m.chat, '❀ Mencione o usuário ou cite uma mensagem.', m)       
        const coinTxt = args.find(arg => !isNaN(arg) && !arg.includes('@'))
        if (!coinTxt) return client.reply(m.chat, 'ꕥ Insira o valor que deseja adicionar. \nExemplo: !addcoin @user 100', m)        
        if (isNaN(coinTxt)) return client.reply(m.chat, 'ꕥ Somente números são permitidos.', m)       
        await m.react('🕒')
        const dmt = parseInt(coinTxt)
        if (dmt < 1) {
          await m.react('✖️')
          return client.reply(m.chat, 'ꕥ O mínimo é *1*', m)
        }        
        if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = { users: {} }
        if (!global.db.data.chats[m.chat].users) global.db.data.chats[m.chat].users = {}
        const userData = global.db.data.chats[m.chat].users
        if (!userData[who]) {
          userData[who] = { coins: 0 }
        }       
        userData[who].coins += dmt
        await m.react('✔️')
        return client.reply(m.chat, `❀ *Adicionado:*\n» ${dmt} ${currency}\n@${who.split('@')[0]}, você recebeu ${dmt} ${currency}`, m, { mentions: [who] })
      }
      if (command === 'addxp') {
        if (!who) return client.reply(m.chat, '❀ Mencione o usuário ou cite uma mensagem.', m)
        const xpTxt = args.find(arg => !isNaN(arg) && !arg.includes('@'))
        if (!xpTxt) return client.reply(m.chat, 'ꕥ Insira a quantidade de experiência (XP) que deseja adicionar. \nExemplo: !addxp @usuário 50', m)
        if (isNaN(xpTxt)) return client.reply(m.chat, 'ꕥ Somente números são permitidos.', m)
        await m.react('🕒')
        const xp = parseInt(xpTxt)
        if (xp < 1) {
          await m.react('✖️')
          return client.reply(m.chat, 'ꕥ A experiência mínima (XP) é *1*', m)
        }
        if (!global.db.data.users) global.db.data.users = {}
        const userData = global.db.data.users
        if (!userData[who]) {
          userData[who] = { exp: 0 }
        }
        userData[who].exp += xp
        await m.react('✔️')
        return client.reply(m.chat, `❀ XP adicionado: *${xp}*\n@${who.split('@')[0]}, você recebeu ${xp} XP`, m, { mentions: [who] })
      }
    } catch (error) {
      console.error(error)
      await m.react('✖️')
      return client.reply(m.chat, `⚠︎ Ocorreu um problema.\n${error.message}`, m)
    }
  }
}
