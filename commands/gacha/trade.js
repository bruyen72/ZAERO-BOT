export default {
  command: ['trade', 'intercambiar'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const db = global.db.data
      const chatId = m.chat
      const userId = m.sender
      const chatData = db.chats[chatId] ||= {}
      chatData.users ||= {}
      chatData.characters ||= {}
      if (chatData.adminonly || !chatData.gacha) return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
      if (chatData.timeTrade && chatData.timeTrade - Date.now() > 0)
        return m.reply('《✧》 Já existe uma troca em andamento. Aguarde a conclusão ou a expiração.')
      if (!args.length || !m.text.includes('/'))
        return m.reply(`❀ Você deve especificar dois caracteres para trocá-los.\n> ✐ Exemplo: *${usedPrefix + command} Personagem1 / Personagem2*`)
      const raw = m.text.slice(m.text.indexOf(' ') + 1).trim()
      const [nameA, nameB] = raw.split('/').map(s => s.trim().toLowerCase())
      const idA = Object.keys(chatData.characters).find(id => (chatData.characters[id]?.name || '').toLowerCase() === nameA)
      const idB = Object.keys(chatData.characters).find(id => (chatData.characters[id]?.name || '').toLowerCase() === nameB)
      if (!idA || !idB) {
        const missing = !idA ? nameA : nameB
        return m.reply(`ꕥ Personagem não encontrado *${missing}*.`)
      }
      const pA = chatData.characters[idA]
      const pB = chatData.characters[idB]
      const globalA = global.db.data.characters?.[idA] || {}
      const globalB = global.db.data.characters?.[idB] || {}
      const valueA = typeof globalA.value === 'number' ? globalA.value : typeof pA.value === 'number' ? pA.value : 0
      const valueB = typeof globalB.value === 'number' ? globalB.value : typeof pB.value === 'number' ? pB.value : 0
      if (pB.user === userId) return m.reply(`ꕥ O personagem *${pB.name}* já foi reivindicado por você.`)
      if (!pB.user) return m.reply(`ꕥ O personagem *${pB.name}*não é reivindicado por ninguém.`)
      if (!pA.user || pA.user !== userId) return m.reply(`ꕥ *${pA.name}* não é reivindicado por você.`)
      const receiverId = pB.user
      chatData.intercambios ||= []
      chatData.intercambios.push({ solicitante: userId, personaje1: { id: idA, name: pA.name, value: valueA }, personaje2: { id: idB, name: pB.name, value: valueB }, destinatario: receiverId, expiracion: Date.now() + 60000 })
      chatData.timeTrade = Date.now() + 60000
      const solicitudMessage = `「✿」 ${db.users[receiverId].name || receiverId.split('@')[0]}, ${db.users[userId].name || userId.split('@')[0]} enviou a você uma solicitação de troca.\n\n✦ [${db.users[receiverId].name || receiverId.split('@')[0]}] *${pB.name}* (${valueB})\n✦ [${db.users[userId].name || userId.split('@')[0]}] *${pA.name}* (${valueA})\n\n✐ Para aceitar a troca, responda a esta mensagem com "${usedPrefix}aceitar", a solicitação expira em 60 segundos.`
      await client.sendMessage(chatId, { text: solicitudMessage, mentions: [userId, receiverId] }, { quoted: m })
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}