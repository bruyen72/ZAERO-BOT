import { delay } from "@whiskeysockets/baileys"

export default {
  command: ['slot'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chat = db.chats[m.chat]
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = db.settings[botId]
    const currency = bot.currency
    const user = db.chats[m.chat].users[m.sender]
    user.lastslot ||= 0
    if (!args[0] || isNaN(args[0]) || parseInt(args[0]) <= 0) {
      return m.reply(`❀ Insira o valor que deseja apostar.`)
    }
    const apuesta = parseInt(args[0])
    if (Date.now() - user.lastslot < 30000) {
      const restante = user.lastslot + 30000 - Date.now()
      return m.reply(`ꕥ Você deve esperar *${formatTime(restante)}*para usar*${usedPrefix + command}* de novo.`)
    }
    if (apuesta < 100) return m.reply(`ꕥ O mínimo para apostar é 100*${currency}*.`)
    if (user.coins < apuesta) return m.reply(`ꕥ Tus *${currency}* não são suficientes para apostar esse valor.`)
    const emojis = ['✾', '❃', '❁']
    const getRandomEmojis = () => {
      const x = Array.from({ length: 3 }, () => emojis[Math.floor(Math.random() * emojis.length)])
      const y = Array.from({ length: 3 }, () => emojis[Math.floor(Math.random() * emojis.length)])
      const z = Array.from({ length: 3 }, () => emojis[Math.floor(Math.random() * emojis.length)])
      return { x, y, z }
    }
    const initialText = '「✿」| *SLOTS* \n────────\n'
    let { key } = await client.sendMessage(m.chat, { text: initialText }, { quoted: m })
    const animateSlots = async () => {
      for (let i = 0; i < 5; i++) {
        const { x, y, z } = getRandomEmojis()
        const animationText = `「✿」| *SLOTS* 
────────
${x[0]} : ${y[0]} : ${z[0]}
${x[1]} : ${y[1]} : ${z[1]}
${x[2]} : ${y[2]} : ${z[2]}
────────`
        await client.sendMessage(m.chat, { text: animationText, edit: key }, { quoted: m })
        await delay(300)
      }
    }
    await animateSlots()
    const { x, y, z } = getRandomEmojis()
    let resultado
    if (x[0] === y[0] && y[0] === z[0]) {
      resultado = `❀ Você ganhou! *¥${(apuesta * 2).toLocaleString()} ${currency}*.`
      user.coins += apuesta
    } else if (x[0] === y[0] || x[0] === z[0] || y[0] === z[0]) {
      resultado = `❀ Você quase conseguiu. *Leve ¥10 ${currency}*por tentar.`
      user.coins += 10
    } else {
      resultado = `❀ Você perdeu *¥${apuesta.toLocaleString()} ${currency}*.`
      user.coins -= apuesta
    }
    user.lastslot = Date.now()
    const finalText = `「✿」| *SLOTS* 
────────
${x[0]} : ${y[0]} : ${z[0]}
${x[1]} : ${y[1]} : ${z[1]}
${x[2]} : ${y[2]} : ${z[2]}
────────
${resultado}`
    await client.sendMessage(m.chat, { text: finalText, edit: key }, { quoted: m })
  }
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const parts = []
  if (minutes > 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`)
  parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`)
  return parts.join(' ')
}