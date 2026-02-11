export default {
  command: ['ritual', 'invoke', 'invocar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId]
    const monedas = botSettings?.currency || 'Coins'
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const user = chat.users[m.sender]
    const remaining = user.lastinvoke - Date.now()
    if (remaining > 0) {
      return m.reply(`ꕥ Você deve esperar *${msToTime(remaining)}* para invocar outro ritual.`)
    }
    user.lastinvoke = Date.now() + 12 * 60 * 1000
    const roll = Math.random()
    let reward = 0
    let narration = ''
    let bonusMsg = ''
    if (roll < 0.05) {
      reward = Math.floor(Math.random() * (13000 - 11000 + 1)) + 11000
      narration = pickRandom(legendaryInvocations)
      bonusMsg = '\nꕥ Recompensa LENDÁRIA obtida!'
    } else {
      reward = Math.floor(Math.random() * (11000 - 8000 + 1)) + 8000
      narration = pickRandom(normalInvocations)
      if (Math.random() < 0.15) {
        const bonus = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500
        reward += bonus
        bonusMsg = `\n「✿」 Energia extra! Você ganhou *${bonus.toLocaleString()}* ${monedas} adicionales`
      }
    }
    user.coins += reward
    let msg = `「✿」 ${narration}\nGanaste *${reward.toLocaleString()} ${monedas}*`
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

const normalInvocations = [
  'Seu ritual abre um portal e riquezas ardentes caem do vazio',
  'As velas se apagam e revelam um baú cheio de moedas antigas.',
  'O círculo de invocação brilha e gemas cintilantes aparecem',
  'Um espírito menor lhe dá um saco de ouro como oferenda',
  'As músicas atraem um espectro que deixa riquezas aos seus pés',
  'A lua ilumina seu altar e revela um tesouro escondido',
  'Um demônio amigável surge e paga pela sua invocação',
  'A fumaça do incenso se transforma em moedas brilhantes',
  'Símbolos arcanos vibram e materializam riquezas inesperadas',
  'Um guardião espiritual aparece e recompensa você por sua fé'
]

const legendaryInvocations = [
  'Você convocou um espírito antigo que lhe dá um tesouro lendário!',
  'Um dragão cósmico emerge do ritual e concede riquezas infinitas',
  'Os deuses antigos respondem e derramam ouro celestial sobre você',
  'Um anjo da guarda desce e coloca um baú sagrado em suas mãos',
  'O portal dimensional se abre e um tesouro proibido cai diante de você',
  'A terra treme e um espírito titânico lhe dá riquezas escondidas',
  'Uma fênix ressuscitada deixa joias em chamas como recompensa',
  'As estrelas se alinham e um tesouro cósmico aparece no seu altar'
]