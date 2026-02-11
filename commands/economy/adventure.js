export default {
  command: ['adventure', 'aventura'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    if (chat.adminonly || !chat.economy) return client.reply(m.chat, `ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`, m)    
    user.lastadventure ||= 0
    if (user.coins == null) user.coins = 0
    if (user.health == null) user.health = 100
    if (user.health < 5) return m.reply(`ꕥ Você não tem saúde suficiente para *aventurar-se* novamente.\n> Use *"${usedPrefix}curar"* para curar você.`)
    const remainingTime = user.lastadventure - Date.now()
    if (remainingTime > 0) {
      return client.reply(m.chat, `ꕥ Você deve esperar *${msToTime(remainingTime)}*antes de se aventurar novamente.`, m)
    }
    const rand = Math.random()
    let cantidad = 0
    let salud = Math.floor(Math.random() * (20 - 10 + 1)) + 10
    let message
    if (rand < 0.4) {
      cantidad = Math.floor(Math.random() * (18000 - 14000 + 1)) + 14000
      user.coins ||= 0
      user.coins += cantidad
      user.health -= salud
      const successMessages = [
        `Derrotou um ogro emboscado entre as árvores de Drakonia, ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você se tornou campeão do torneio de gladiadores Valoria, ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você resgatou um livro mágico do altar dos Sussurros, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você libertou os aldeões presos nas minas de Ulderan após derrotar os trolls, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você derrota um jovem dragão em Flamear Cliffs e ganha *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você encontra um relicário sagrado nas ruínas de Iskaria e o protege de saqueadores, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você triunfou no duelo contra o cavaleiro corrupto do Invalion, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você conquistou a fortaleza amaldiçoada das Sombras Vermelhas sem sofrer baixas, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você se infiltra no Templo do Vazio e recupera o Cristal do Equilíbrio, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você resolve o quebra-cabeça da cripta eterna e ganha um tesouro lendário, você ganhou *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(successMessages)
    } else if (rand < 0.7) {
      cantidad = Math.floor(Math.random() * (11000 - 9000 + 1)) + 9000
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
        `O feiticeiro das trevas amaldiçoou você e você fugiu perdendo *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você se perde na selva de Zarkelia e alguns bandidos te atacam, você perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um basilisco ataca você e você escapa ferido sem saque, você perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Falha em seu ataque à torre de gelo quando você cai em uma armadilha mágica, você perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Você perde a orientação entre os portais da floresta de espelhos e acaba sem recompensa, perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um grupo de trolls te embosca e leva seus pertences, você perde *¥${cantidad.toLocaleString()} ${currency}*.`,
        `O dragão mais velho te derrota e te força a fugir, você perde *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(failMessages)
    } else {
      const neutralMessages = [
        `Você explora ruínas antigas e aprende segredos escondidos.`,
        `Você segue a trilha de um espectro, mas ele desaparece na neblina.`,
        `Você acompanha uma princesa pelos desertos de Thaloria sem contratempos.`,
        `Você caminha por uma floresta encantada e descobre novos caminhos.`,
        `Você visita uma vila remota e ouve histórias de antigas batalhas.`
      ]
      message = pickRandom(neutralMessages)
    }
    user.lastadventure = Date.now() + 20 * 60 * 1000
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
