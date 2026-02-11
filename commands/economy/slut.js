export default {
  command: ['slut', 'prostituirse'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const user = chatData.users[m.sender]
    const cooldown = 5 * 60 * 1000
    const now = Date.now()
    const remaining = (user.lastslut || 0) - now
    const currency = botSettings.currency || 'Monedas'
    if (remaining > 0)
      return m.reply(`✿ Você deve esperar *${msToTime(remaining)}*antes de tentar novamente.`)
    const success = Math.random() < 0.5
    const amount = success ? Math.floor(Math.random() * (6000 - 3500 + 1)) + 3500 : Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000
    user.lastslut = now + cooldown
    const winMessages = [
      `Você acariciou o pênis de um cliente regular e ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `O administrador entra na sua boca, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `O administrador apalpa seus peitos, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Eles vestiram você como Neko Kwai em público, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Você se torna a Loli do administrador por um dia, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Você deixou um estranho te apalpar por dinheiro, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Você é empregada do administrador por um dia, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Um gay paga para você fazer isso com ele, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Sua SugarMommy morre, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Seu SuggarDaddy morre, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Você deixou um estranho tocar sua bunda por dinheiro, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Alguém coloca uma coleira em você e você é seu animal de estimação sexual por uma hora, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Eles te vestiram como uma colegial em público, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Eles te vestiram de milf em público, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Os membros do grupo usaram você como saco de porra, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Você é a vadia dos administradores por um dia, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Alguns Aliens te sequestraram e te usaram como objeto sexual, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
      `Um anão fodeu sua perna, você ganhou *¥${amount.toLocaleString()} ${currency}*!`,
    ]
    const loseMessages = [
      `Sua energia acabou e você não brilhou, perdendo *¥${amount.toLocaleString()} ${currency}*.`,
      `Você cometeu um erro no seu desempenho e perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Um cliente mal-humorado lhe causou problemas e você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Sua roupa não foi bem recebida e você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `O som falhou no meio da sua apresentação e você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Um dia ruim no clube resultou na perda de *¥${amount.toLocaleString()} ${currency}*.`,
      `Você tentou cobrar do cliente errado e eles denunciaram, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `O administrador bloqueou você após o serviço, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Você se vestiu sem ninguém pagar, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `SuggarMommy trocou você por uma nova waifu, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Um estranho roubou seu cosplay antes do evento, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Te apalparam sem pagar nada, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `O gay se arrependeu no último segundo, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
      `Os Aliens te devolveram com trauma, você perdeu *¥${amount.toLocaleString()} ${currency}*.`,
    ]
    const message = success ? winMessages[Math.floor(Math.random() * winMessages.length)] : loseMessages[Math.floor(Math.random() * loseMessages.length)]
    if (success) {
      user.coins = (user.coins || 0) + amount
    } else {
      const total = (user.coins || 0) + (user.bank || 0)
      if (total >= amount) {
        if (user.coins >= amount) {
          user.coins -= amount
        } else {
          const remainingLoss = amount - user.coins
          user.coins = 0
          user.bank -= remainingLoss
        }
      } else {
        user.coins = 0
        user.bank = 0
      }
    }
    await client.sendMessage(chatId, { text: `「✿」 ${message}`, mentions: [senderId] }, { quoted: m })
  },
}

const msToTime = (duration) => {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const pad = (n) => n.toString().padStart(2, '0')
  if (minutes === 0) return `${pad(seconds)} segundo${seconds !== 1 ? 's' : ''}`
  return `${pad(minutes)} minuto${minutes !== 1 ? 's' : ''}, ${pad(seconds)} segundo${seconds !== 1 ? 's' : ''}`
}