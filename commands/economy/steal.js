import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['robar', 'steal', 'rob'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatData = db.chats[m.chat]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)   
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = db.settings[botId]
    const currency = bot.currency
    const user = db.chats[m.chat].users[m.sender]
    user.coins ||= 0
    user.laststeal ||= 0
    if (Date.now() < user.laststeal) {
      const restante = user.laststeal - Date.now()
      return client.reply(m.chat, `ꕥ Você deve esperar *${formatTime(restante)}*para usar*${usedPrefix + command}* de novo.`, m)
    }
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    const who = await resolveLidToRealJid(who2, client, m.chat)
    if (!who) return client.reply(m.chat, `❀ Você deve mencionar alguém para tentar roubá-lo.`, m)
    if (!(who in db.chats[m.chat].users)) {
      return client.reply(m.chat, `ꕥ O usuário não foi encontrado em meu banco de dados.`, m)
    }
    const name = db.users[who]?.name || who.split('@')[0]
    const target = db.chats[m.chat].users[who]
    const lastCmd = db.chats[m.chat].users[who]?.lastCmd || 0
    const tiempoInactivo = Date.now() - lastCmd
    if (tiempoInactivo < 3600000) {
      return client.reply(m.chat, `ꕥ Você só pode roubar dele *${currency}* para um usuário se ele estiver inativo por mais de 1 hora.`, m)
    }
    const chance = Math.random()
    if (chance < 0.3) {
      let loss = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000
      const total = user.coins + (user.bank || 0)
      if (total >= loss) {
        if (user.coins >= loss) {
          user.coins -= loss
        } else {
          const restante = loss - user.coins
          user.coins = 0
          user.bank = Math.max(0, (user.bank || 0) - restante)
        }
      } else {
        loss = total
        user.coins = 0
        user.bank = 0
      }
      user.laststeal = Date.now() + 3600000
      return client.reply(m.chat, `ꕥ O roubo deu errado e você perdeu *¥${loss.toLocaleString()} ${currency}*.`, m)
    }
    const rob = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000
    if (target.coins < rob) {
      return client.reply(m.chat, `ꕥ *${name}*não tem o suficiente*${currency}* fora do banco para valer a pena tentar roubar.`, m, { mentions: [who] })
    }
    user.coins += rob
    target.coins -= rob
    user.laststeal = Date.now() + 3600000
    client.reply(m.chat, `❀ Le robaste *¥${rob.toLocaleString()} ${currency}* a *${name}*`, m, { mentions: [who] })
  }
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const parts = []
  if (hours) parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`)
  if (minutes) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`)
  parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`)
  return parts.join(' ')
}