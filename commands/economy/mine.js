export default {
  command: ['mine', 'minar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId]
    const monedas = botSettings?.currency || 'Coins'
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const user = chat.users[m.sender]
    if (user.health < 5) return m.reply(`ꕥ Você não tem saúde suficiente para *caçar* novamente.\n> Use *"${usedPrefix}curar"* para curar você.`)
    const remaining = user.lastmine - Date.now()
    if (remaining > 0) {
      return m.reply(`ꕥ Você deve esperar *${msToTime(remaining)}* para o meu novamente.`)
    }
    user.lastmine = Date.now() + 10 * 60 * 1000
    let isLegendary = Math.random() < 0.02
    let reward, narration, bonusMsg = ''
    if (isLegendary) {
      reward = Math.floor(Math.random() * (13000 - 11000 + 1)) + 11000
      narration = 'VOCÊ DESCOBRIU UM TESOURO LENDÁRIO!\n\n'
      bonusMsg = '\nꕥRecompensa ÉPICA obtida!'
    } else {
      reward = Math.floor(Math.random() * (9500 - 7000 + 1)) + 7000
      const scenario = pickRandom(escenarios)
      narration = `En ${scenario}, ${pickRandom(mineria)}`
      if (Math.random() < 0.1) {
        const bonus = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500
        reward += bonus
        bonusMsg = `\n「✿」 Bônus de mineração! Você ganhou *${bonus.toLocaleString()}* ${monedas} extra`
      }
    }
    user.coins += reward
    const salud = Math.floor(Math.random() * (15 - 5 + 1)) + 5
    user.health = (user.health || 100) - salud
    if (user.health < 0) user.health = 0
    let msg = `「✿」 ${narration} *${reward.toLocaleString()} ${monedas}*`
    if (bonusMsg) msg += `\n${bonusMsg}`
    await client.reply(m.chat, msg, m)
  },
};

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds
  if (minutes === '00') return `${seconds} segundo${seconds > 1 ? 's' : ''}`
  return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

const escenarios = [
  'uma caverna escura e úmida',
  'o topo de uma montanha nevada',
  'uma floresta misteriosa cheia de raízes',
  'um rio cristalino e poderoso',
  'uma mina de carvão abandonada',
  'as ruínas de um antigo castelo',
  'uma praia deserta com areia dourada',
  'um vale escondido entre colinas',
  'um arbusto espinhoso na beira da estrada',
  'um tronco oco no meio da floresta',
]

const mineria = [
  'você encontrou um baú velho com',
  'você encontrou uma sacola cheia de',
  'você descobriu um saco de',
  'você desenterrou moedas antigas contendo',
  'você quebrou uma pedra e dentro dela estava',
  'cavando fundo, você encontrou',
  'entre as raízes, você encontrou',
  'dentro de uma caixa esquecida, você encontrou',
  'sob algumas pedras, você descobriu',
  'entre os escombros de um lugar antigo, você encontrou',
]
