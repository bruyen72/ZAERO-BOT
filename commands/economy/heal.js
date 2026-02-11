import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['heal', 'curar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatData = db.chats[m.chat]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = db.settings[botId]
    const currency = bot.currency
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    const who = await resolveLidToRealJid(who2, client, m.chat)
    const healer = chatData.users[m.sender]
    const target = who ? chatData.users[who] : healer
    if (!target) return m.reply(`ꕥ O usuário não foi encontrado no banco de dados.`)
    if (target.health >= 100) {
      const maximo = who ? `ꕥ A saúde de *${db.users[who]?.name || who.split('@')[0]}* já está no limite, Saúde Atual: ${target.health}` : `ꕥ Sua saúde já está no máximo, Saúde atual: ${target.health}`
      return m.reply(maximo)
    }
    const faltante = 100 - target.health
    const bloques = Math.ceil(faltante / 10)
    const costo = bloques * 500
    const totalFondos = healer.coins + (healer.bank || 0)
    if (totalFondos < costo) {
      const fondos = who ? `ꕥ Você não tem o suficiente ${currency} para curar a *${db.users[who]?.name || who.split('@')[0]}*.\n> Você precisa de *¥${costo.toLocaleString()} ${currency}* para curar ${faltante} pontos de saúde.` : `ꕥ Você não tem o suficiente ${currency} para curar você.\n> Você precisa de *¥${costo.toLocaleString()} ${currency}* para curar ${faltante} pontos de saúde.`
      return m.reply(fondos)
    }
    if (healer.coins >= costo) {
      healer.coins -= costo
    } else {
      const restante = costo - healer.coins
      healer.coins = 0
      healer.bank = Math.max(0, (healer.bank || 0) - restante)
    }
    target.health = 100
    const info = who ? `ꕥ Você curou *${db.users[who]?.name || who.split('@')[0]}* até o nível máximo de saúde.` : `ꕥ Você se curou ao nível máximo de saúde.`
    m.reply(info)
  },
}