import { promises as fs } from 'fs'

const charactersFilePath = './lib/characters.json'
async function loadCharacters() {
  const data = await fs.readFile(charactersFilePath, 'utf-8')
  return JSON.parse(data)
}
function flattenCharacters(structure) {
  return Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : [])
}
function getSeriesNameByCharacter(structure, characterId) {
  return Object.values(structure).find(s => Array.isArray(s.characters) && s.characters.some(c => String(c.id) === String(characterId)))?.name || 'Desconhecido'
}

export default {
  command: ['vote', 'votar'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const chat = global.db.data.chats[m.chat]
      if (!chat.users) chat.users = {}
      if (!chat.users[m.sender]) chat.users[m.sender] = {}
      const me = chat.users[m.sender]
      const globalUser = global.db.data.users[m.sender]
      if (!global.db.data.characters) global.db.data.characters = {}
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
      }
      const now = Date.now()
      const cooldown = 1 * 60 * 60 * 1000
      if (globalUser.lastVote && now < globalUser.lastVote) {
        const timeLeft = Math.ceil((globalUser.lastVote - now) / 1000)
        const hours = Math.floor(timeLeft / 3600)
        const minutes = Math.floor((timeLeft % 3600) / 60)
        const seconds = timeLeft % 60
        let timeText = ''
        if (hours > 0) timeText += `${hours} hora${hours !== 1 ? 's' : ''} `
        if (minutes > 0) timeText += `${minutes} minuto${minutes !== 1 ? 's' : ''} `
        if (seconds > 0 || timeText === '') timeText += `${seconds} segundo${seconds !== 1 ? 's' : ''}`
        return m.reply(`ꕥ Você deve esperar *${timeText.trim()}*para usar*${command}* de novo.`)
      }
      const name = args.join(' ').trim()
      if (!name) return m.reply('❀ Você deve especificar um personagem para votar neles.')
      const structure = await loadCharacters()
      const allCharacters = flattenCharacters(structure)
      const character = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase())
      if (!character) {
        return m.reply(`ꕥ Personagem não encontrado. Certifique-se de que o nome esteja correto.`)
      }
      if (!global.db.data.characters[character.id]) {
        global.db.data.characters[character.id] = {}
      }
      const record = global.db.data.characters[character.id]
      if (!record.name) record.name = character.name
      if (typeof record.value !== 'number') record.value = Number(character.value || 0)
      if (typeof record.votes !== 'number') record.votes = 0
      if (record.lastVotedAt && now < record.lastVotedAt + cooldown) {
        const remaining = record.lastVotedAt + cooldown - now
        const totalSec = Math.ceil(remaining / 1000)
        const h = Math.floor(totalSec / 3600)
        const m_ = Math.floor((totalSec % 3600) / 60)
        const s = totalSec % 60
        let timeText = ''
        if (h > 0) timeText += `${h} hora${h !== 1 ? 's' : ''} `
        if (m_ > 0) timeText += `${m_} minuto${m_ !== 1 ? 's' : ''} `
        if (s > 0 || timeText === '') timeText += `${s} segundo${s !== 1 ? 's' : ''}`
        return m.reply(`ꕥ *${record.name}* foi votado recentemente.\n> Você deve esperar *${timeText.trim()}* para votar novamente.`)
      }
      if (!record.dailyIncrement) record.dailyIncrement = {}
      const today = new Date().toISOString().slice(0, 10)
      const currentValue = record.dailyIncrement[today] || 0
      if (currentValue >= 900) {
        return m.reply(`ꕥ O personagem *${record.name}* já possui o valor máximo.`)
      }
      const increment = Math.min(900 - currentValue, Math.floor(Math.random() * 201) + 50)
      record.value = (record.value || 0) + increment
      record.votes += 1
      record.lastVotedAt = now
      record.dailyIncrement[today] = currentValue + increment
      globalUser.lastVote = now + cooldown
      const source = getSeriesNameByCharacter(structure, character.id)
      await client.reply(m.chat, `❀ Você votou em *${record.name}* (*${source}*)\n> Seu novo valor é *${record.value.toLocaleString()}*`, m)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}
