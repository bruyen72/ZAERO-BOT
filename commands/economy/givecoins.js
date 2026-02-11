import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['givecoins', 'pay', 'coinsgive'],
  category: 'rpg',
  group: true,
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency || 'coins'
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const mentioned = m.mentionedJid || []
    const who2 = m.quoted ? m.quoted.sender : mentioned[0] || (args[1] ? (args[1].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : '')
    if (!who2) return m.reply(`❀ Você deve mencionar quem deseja transferir *${monedas}*.\n> Exemplo » *${usedPrefix + command} 25000 @mencion*`)
    const who = await resolveLidToRealJid(who2, client, m.chat)
    const senderData = chatData.users[m.sender]
    const targetData = chatData.users[who]
    if (!targetData) return m.reply(`ꕥ O usuário mencionado não está cadastrado no bot.`)
    const cantidadInput = args[0]?.toLowerCase()
    let cantidad = cantidadInput === 'all' ? senderData.bank : parseInt(cantidadInput)
    if (!cantidadInput || isNaN(cantidad) || cantidad <= 0) {
      return m.reply(`ꕥ Insira um valor válido de *${monedas}* para transferir.`)
    }
    if (typeof senderData.bank !== 'number') senderData.bank = 0
    if (senderData.bank < cantidad) {
      return m.reply(`ꕥ Você não tem o suficiente *${monedas}* no banco para transferência.\n> Seu saldo atual: *¥${senderData.bank.toLocaleString()} ${monedas}*`)
    }
    senderData.bank -= cantidad
    if (typeof targetData.bank !== 'number') targetData.bank = 0
    targetData.bank += cantidad
    if (isNaN(senderData.bank)) senderData.bank = 0
    let name = global.db.data.users[who]?.name || who.split('@')[0]
    await client.sendMessage(chatId, { text: `❀ Transferiste *¥${cantidad.toLocaleString()} ${monedas}* a *${name}*\n> Agora você tem *¥${senderData.bank.toLocaleString()} ${monedas}*no seu banco.`, mentions: [who], }, { quoted: m })
  }
}