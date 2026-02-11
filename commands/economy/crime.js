export default {
  command: ['crime', 'crimen'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const monedas = global.db.data.settings[botId].currency
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    if (!user.lastcrime) user.lastcrime = 0
    const remainingTime = user.lastcrime - Date.now()
    if (remainingTime > 0) {
      return m.reply(`ꕥ Você deve esperar *${msToTime(remainingTime)}*antes de tentar novamente.`)
    }
    const éxito = Math.random() < 0.4
    let cantidad
    if (éxito) {
      cantidad = Math.floor(Math.random() * (7500 - 5500 + 1)) + 5500
      user.coins += cantidad
    } else {
      cantidad = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000
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
    }
    user.lastcrime = Date.now() + 7 * 60 * 1000
    const successMessages = [
      `Você invadiu um caixa eletrônico usando uma exploração do sistema e retirou dinheiro sem alertas, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você se infiltrou em uma mansão como técnico e roubou joias enquanto inspecionava a rede, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você simulou uma transferência bancária falsa e obteve fundos antes do cancelamento da transação, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você interceptou um pacote de luxo em uma recepção corporativa e o revendeu, ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você esvaziou uma carteira esquecida em um restaurante sem ninguém perceber, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você acessou o servidor de uma loja digital e aplicou descontos fraudulentos para obter produtos grátis, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você se passou por entregador e roubou um pacote de coleta sem levantar suspeitas, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você copiou a chave mestra de uma galeria de arte e vendeu uma escultura sem registro, ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você criou um site de caridade falso e conseguiu centenas de pessoas para doar, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você violou um leitor de cartão em uma loja local e esvaziou contas privadas, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você falsificou ingressos VIP para um evento e entrou em uma área com itens exclusivos, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você enganou um colecionador vendendo-lhe uma réplica como peça original e ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você capturou a senha de um empresário em um café e transferiu fundos para sua conta, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`,
      `Você convenceu um idoso a participar de um investimento falso e sacou suas economias, você ganhou *¥${cantidad.toLocaleString()} ${monedas}*!`
    ]
    const failMessages = [
      `Você tentou vender um relógio falso, mas o comprador percebeu o engano e denunciou você, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você invadiu uma conta bancária, mas esqueceu de ocultar seu IP e foi rastreado, perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você roubou uma mochila em um evento, mas uma câmera escondida capturou todo o ato, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você se infiltrou em uma loja de luxo, mas o sistema silencioso disparou o alarme, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você fingiu ser técnico em uma mansão, mas o dono te reconheceu e chamou a segurança, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você tentou vender documentos secretos, mas eles eram falsos e ninguém queria comprá-los, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você planejou um assalto em uma joalheria, mas o guarda noturno te descobriu, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você invadiu um servidor corporativo, mas sua conexão caiu e sua localização foi rastreada, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você tentou roubar um carro de luxo, mas o GPS alertou a polícia, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você enganou um cliente com um contrato falso, mas ele revisou e processou você, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você tentou fugir com mercadoria roubada, mas tropeçou e foi pego, perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`,
      `Você hackeou um cartão de crédito, mas o banco bloqueou a transação, você perdeu *¥${cantidad.toLocaleString()} ${monedas}*.`
    ]
    const message = éxito ? pickRandom(successMessages) : pickRandom(failMessages)
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