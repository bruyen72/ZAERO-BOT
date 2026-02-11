import { resolveLidToRealJid } from "../../lib/utils.js"
import { promises as fs } from 'fs'

const charactersFilePath = './lib/characters.json'
async function loadCharacters() {
  const data = await fs.readFile(charactersFilePath, 'utf-8')
  return JSON.parse(data)
}
function flattenCharacters(structure) {
  return Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : [])
}

export default {
  command: ['robwaifu', 'robarwaifu'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
      }
      if (!chat.users) chat.users = {}
      if (!chat.characters) chat.characters = {}
      if (!chat.users[m.sender]) chat.users[m.sender] = {}
      const userData = chat.users[m.sender]
      if (!Array.isArray(userData.characters)) userData.characters = []
      if (userData.lastrobwaifu == null) userData.lastrobwaifu = 0
      const now = Date.now()
      const cooldown = 3 * 60 * 60 * 1000
      const nextAllowed = userData.lastrobwaifu
      if (userData.lastrobwaifu > 0 && now < nextAllowed) {
        const timeLeft = Math.ceil((nextAllowed - now) / 1000)
        const h = Math.floor(timeLeft / 3600)
        const m_ = Math.floor((timeLeft % 3600) / 60)
        const s = timeLeft % 60
        let timeText = ''
        if (h > 0) timeText += `${h} hora${h !== 1 ? 's' : ''} `
        if (m_ > 0) timeText += `${m_} minuto${m_ !== 1 ? 's' : ''} `
        if (s > 0 || timeText === '') timeText += `${s} segundo${s !== 1 ? 's' : ''}`
        return m.reply(`ꕥ Você deve esperar ${timeText.trim()} usar *${usedPrefix + command}* de novo.`)
      }
      const mentioned = m.mentionedJid || []
      const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : null
      const target = await resolveLidToRealJid(who2, client, m.chat)
      if (!target) return m.reply(`❀ Por favor, cite ou mencione o usuário do qual deseja roubar uma waifu.`)
      if (!chat.users[target]) return m.reply('ꕥ O usuário mencionado não está cadastrado.')
      if (!userData.robVictims) userData.robVictims = {}
      const last = userData.robVictims[target]
      if (last && now - last < 24 * 60 * 60 * 1000) {
        let targetName = global.db.data.users[target].name.trim() || target.split('@')[0]
        return m.reply(`ꕥ Ya robaste a *${targetName}* hoje. Você só pode roubar alguém uma vez a cada 24 horas.`)
      }
      let targetName = global.db.data.users[target].name.trim() || target.split('@')[0]
      let robberName = global.db.data.users[m.sender].name.trim() || m.sender.split('@')[0]
      if (target === m.sender) {
        return m.reply(`ꕥVocê não pode roubar de si mesmo,*${robberName}*.`)
      }
      if (!chat.users[target]) chat.users[target] = {}
      const victim = chat.users[target]
      if (!Array.isArray(victim.characters)) victim.characters = []
      if (victim.characters.length === 0) {
        return m.reply(`ꕥ *${targetName}* não tem waifus que você possa roubar.`)
      }
      const success = Math.random() < 0.4
      userData.lastrobwaifu = now + cooldown
      userData.robVictims[target] = now
      if (!success) {
        return m.reply(`ꕥ A tentativa de roubo falhou. *${targetName}*defendeu seu waifu heroicamente.`)
      }
      const victimFavorite = chat.users[target]?.favorite || global.db.data.users[target]?.favorite
      const stealableCharacters = victim.characters.filter(id => id !== victimFavorite)
      if (stealableCharacters.length === 0) {
        return m.reply(`ꕥ *${targetName}*Ele só tem seu favorito protegido, você não pode roubá-lo.`)
      }
      const stolenId = stealableCharacters[Math.floor(Math.random() * stealableCharacters.length)]
      const character = chat.characters?.[stolenId] || {}
      const charName = typeof character.name === 'string' ? character.name : `ID:${stolenId}`
      character.user = m.sender
      victim.characters = victim.characters.filter(id => id !== stolenId)
      if (!userData.characters.includes(stolenId)) {
        userData.characters.push(stolenId)
      }
      if (chat.sales?.[stolenId] && chat.sales[stolenId].user === target) {
        delete chat.sales[stolenId]
      }
      if (chat.users[target]?.favorite === stolenId) {
        delete chat.users[target].favorite
      }
      if (global.db.data.users?.[target]?.favorite === stolenId) {
        delete global.db.data.users[target].favorite
      }
      await m.reply(`❀ *${robberName}*roubou de*${charName}*do harém de*${targetName}*.`)
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}
