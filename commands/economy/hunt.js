export default {
  command: ['cazar', 'hunt'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)    
    user.lasthunt ||= 0
    if (user.coins == null) user.coins = 0
    if (user.health == null) user.health = 100
    if (user.health < 5) 
      return m.reply(`ꕥ Você não tem saúde suficiente para *caçar* novamente.\n> Use *"${usedPrefix}curar"* para curar você.`)
      if (Date.now() < user.lasthunt) {
      const restante = user.lasthunt - Date.now()
      return m.reply(`ꕥ Você deve esperar *${msToTime(restante)}* antes de caçar novamente.`)
      }
    const rand = Math.random()
    let cantidad = 0
    let salud = Math.floor(Math.random() * (15 - 10 + 1)) + 10
    let message
    if (rand < 0.4) {
      cantidad = Math.floor(Math.random() * (13000 - 10000 + 1)) + 10000
      user.coins ||= 0
      user.coins += cantidad
      user.health -= salud
      const successMessages = [
        `Com muita coragem você conseguiu caçar um Urso! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você caçou um tigre feroz! Após uma perseguição eletrizante, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você conseguiu caçar um Elefante com astúcia e persistência, ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você pegou um Panda! A caçada foi tranquila, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você caçou um Javali depois de uma caçada emocionante, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Com muita habilidade você pegou um Crocodilo e ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você caçou um cervo robusto! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Com paciência você conseguiu caçar uma Raposa Prateada, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você localizou um grupo de peixes no rio e pegou vários, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você entrou na neblina da floresta e caçou um javali, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(successMessages)
    } else if (rand < 0.7) {
      cantidad = Math.floor(Math.random() * (8000 - 6000 + 1)) + 6000
      user.coins ||= 0
      user.bank ||= 0
      const total = user.coins + user.bank
      if (total >= cantidad) {
        if (user.coins >= cantidad) {
          user.coins -= cantidad
        } else {
          const restante = cantidad - user.coins
          user.coins = 0
          user.bank -= restante
        }
      } else {
        cantidad = total
        user.coins = 0
        user.bank = 0
      }
      user.health -= salud
      if (user.health < 0) user.health = 0
      const failMessages = [
        `Sua presa escapou e você não conseguiu pegar nada, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você tropeçou enquanto mirava e a presa fugiu, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um rugido te distraiu e você não conseguiu acertar o alvo, você errou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Seu arco quebrou bem no momento crucial, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Uma chuva repentina arruinou sua rota de caça, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um javali te atacou e você teve que fugir, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um tigre te surpreendeu e você escapou com perdas, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(failMessages)
    } else {
      const neutralMessages = [
        `Você passou a tarde caçando e observando os animais se movimentando silenciosamente.`,
        `A floresta estava quieta e os animais eram esquivos.`,
        `Seu dia de caça foi tranquilo, os animais se aproximaram sem serem pegos.`,
        `Os animais eram cautelosos, mas a experiência de caça era agradável.`,
        `Você explorou novas rotas de caça e descobriu novos rastros.`
      ]
      message = pickRandom(neutralMessages)
    }
    user.lasthunt = Date.now() + 15 * 60 * 1000
    await client.sendMessage(m.chat, { text: `「✿」 ${message}` }, { quoted: m })
  },
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const min = minutes < 10 ? '0' + minutes : minutes
  const sec = seconds < 10 ? '0' + seconds : seconds
  return min === '00' ? `${sec} segundo${sec > 1 ? 's' : ''}` : `${min} minuto${min > 1 ? 's' : ''}, ${sec} segundo${sec > 1 ? 's' : ''}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}
