export default {
  command: ['dungeon', 'mazmorra'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    if (chat.adminonly || !chat.economy) 
      return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)   
    user.lastdungeon ||= 0
    if (user.coins == null) user.coins = 0
    if (user.health == null) user.health = 100
    if (user.health < 5) 
      return m.reply(`ꕥ Você não tem saúde suficiente para retornar à *masmorra*.\n> Use *"${usedPrefix}curar"* para curar você.`)
      if (Date.now() < user.lastdungeon) {
      const restante = user.lastdungeon - Date.now()
      return m.reply(`ꕥ Você deve esperar *${msToTime(restante)}*antes de retornar para a masmorra.`)
      }
    const rand = Math.random()
    let cantidad = 0
    let salud = Math.floor(Math.random() * (18 - 10 + 1)) + 10
    let message
    if (rand < 0.4) {
      cantidad = Math.floor(Math.random() * (15000 - 12000 + 1)) + 12000
      user.coins ||= 0
      user.coins += cantidad
      user.health -= salud
      const successMessages = [
        `Você derrotou o guardião das ruínas e reivindicou o tesouro antigo, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você decifrou os símbolos das runas e obteve recompensas ocultas, ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você encontra o sábio da masmorra, que o recompensa por sua sabedoria, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `O espírito da antiga rainha abençoa você com uma joia de poder, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você passa no teste do espelho escuro e recebe um artefato único, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você derrotou um golem de obsidiana e desbloqueou um acesso secreto, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você salva um grupo de exploradores perdidos e eles te recompensam, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você consegue abrir a porta do julgamento e extrair um orbe de mil anos, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você triunfa sobre um demônio ilusório que guarda o selo perdido e ganha *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você purifica o altar corrompido e recebe uma bênção ancestral, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(successMessages)
    } else if (rand < 0.7) {
      cantidad = Math.floor(Math.random() * (9000 - 7500 + 1)) + 7500
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
        `Um espectro amaldiçoado drena sua energia antes que você possa escapar, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um basilisco te surpreende na câmara escondida, você foge ferido, você perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Uma criatura disforme rouba parte do seu saque no escuro, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você não consegue invocar um portal e fica preso entre as dimensões, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você perde o controle de uma relíquia e causa sua própria queda, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um grupo de fantasmas te cerca e te obriga a largar seu tesouro, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `O demônio das sombras te derrota e você escapa com perdas, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(failMessages)
    } else {
      const neutralMessages = [
        `Você acionou uma armadilha, mas consegue evitar danos e aprender algo novo.`,
        `A sala muda de forma e você perde tempo explorando em círculos.`,
        `Você cai numa ilusão, fortalece sua mente sem obter riquezas.`,
        `Você explora passagens escondidas e descobre símbolos misteriosos.`,
        `Você encontra um mural antigo que revela os segredos da masmorra.`
      ]
      message = pickRandom(neutralMessages)
    }
    user.lastdungeon = Date.now() + 17 * 60 * 1000
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
