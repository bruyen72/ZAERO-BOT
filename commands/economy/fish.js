export default {
  command: ['pescar', 'fish'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    user.lastfish ||= 0
    const remainingTime = user.lastfish - Date.now()
    if (remainingTime > 0) {
      return m.reply(`ꕥ Você deve esperar *${msToTime(remainingTime)}* antes de pescar novamente.`)
    }
    const rand = Math.random()
    let cantidad
    let message
    if (rand < 0.4) {
      cantidad = Math.floor(Math.random() * (8000 - 6000 + 1)) + 6000
      user.coins ||= 0
      user.coins += cantidad
      const successMessages = [
        `Você pegou um salmão! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou uma truta! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou um tubarão! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou uma baleia! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou um peixe-palhaço! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou uma enguia dourada! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você pegou uma garoupa gigante! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você capturou um polvo azul! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você puxou uma Carpa Real! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`,
        `Você conseguiu um Peixe Dragão! Você ganhou *¥${cantidad.toLocaleString()} ${currency}*!`
      ]
      message = pickRandom(successMessages)
    } else if (rand < 0.7) {
      cantidad = Math.floor(Math.random() * (6500 - 5000 + 1)) + 5000
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
      const failMessages = [
        `O gancho se enroscou e você perdeu parte do seu equipamento, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Uma corrente forte arrastou sua vara, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Um peixe grande quebrou sua linha e danificou seu equipamento, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Seu barco bateu nas pedras e você teve que consertar, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `O peixe escapou e estragou sua rede, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `O peixe mordeu a isca mas se soltou e danificou seu carretel, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`,
        `Seu balde tombou e os peixes capturados foram perdidos, você perdeu *¥${cantidad.toLocaleString()} ${currency}*.`
      ]
      message = pickRandom(failMessages)
    } else {
      const neutralMessages = [
        `Você passou a tarde pescando e observando os peixes nadando nas proximidades.`,
        `A água estava calma e os peixes se aproximaram sem morder a isca.`,
        `Seu dia de pesca foi sereno, os peixes nadaram sem serem pegos.`,
        `Os peixes eram esquivos, mas a experiência de pesca foi agradável.`,
        `O rio estava cheio de peixes curiosos que se aproximavam sem serem pegos.`
      ]
      message = pickRandom(neutralMessages)
    }
    user.lastfish = Date.now() + 8 * 60 * 1000
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