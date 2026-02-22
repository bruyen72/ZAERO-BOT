import { promises as fs } from 'fs'

const charactersFilePath = './lib/characters.json'
async function loadCharacters() {
  const data = await fs.readFile(charactersFilePath, 'utf-8')
  return JSON.parse(data)
}

function getCharacterById(id, structure) {
  return Object.values(structure).flatMap(s => s.characters).find(c => String(c.id) === String(id))
}

export default {
  command: ['claim', 'c', 'reclamar'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      if (!chat.users) chat.users = {}
      if (!chat.users[m.sender]) chat.users[m.sender] = {}
      if (!chat.characters) chat.characters = {}
      chat.rolls ||= {}
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com:\n» *${usedPrefix}gacha on*`)
      }
      const me = chat.users[m.sender]
      const now = Date.now()
      const claimCooldown = 30 * 60 * 1000
      if (me.lastClaim && now < me.lastClaim) {
        const remaining = Math.ceil((me.lastClaim - now) / 1000)
        const minutes = Math.floor(remaining / 60)
        const seconds = remaining % 60
        let timeText = ''
        if (minutes > 0) timeText += `${minutes} minuto${minutes !== 1 ? 's' : ''} `
        if (seconds > 0 || timeText === '') timeText += `${seconds} segundo${seconds !== 1 ? 's' : ''}`
        return m.reply(`ꕥ Você deve esperar *${timeText.trim()}*para usar*${command}* de novo.`)
      }
      const quotedId = m.quoted?.id
      if (!quotedId || !chat.rolls[quotedId]) {
        return m.reply(`❀ Você deve citar um personagem válido para reivindicar.`)
      }
      const rollData = chat.rolls[quotedId]
      const id = rollData.id
      const structure = await loadCharacters()
      const sourceData = getCharacterById(id, structure)
      if (!sourceData) return m.reply('ꕥ Caractere não encontrado em caracteres.json')
      if (!chat.characters[id]) chat.characters[id] = {}
      const record = chat.characters[id]
      const globalRec = global.db.data.characters?.[id] || {}
      record.name = record.name || sourceData.name
      record.value = typeof globalRec.value === 'number' ? globalRec.value : (sourceData.value || 0)
      record.votes = record.votes || 0
      if (record.reservedBy && record.reservedBy !== m.sender && now < record.reservedUntil) {
        const reserverName = global.db.data.users[record.reservedBy]?.name || record.reservedBy.split('@')[0]
        const remaining = ((record.reservedUntil - now) / 1000).toFixed(1)
        return m.reply(`ꕥ Este personagem é protegido por *${reserverName}* durante *${remaining}s.*`)
      }
      if (record.expiresAt && now > record.expiresAt && !record.user && !(record.reservedBy && now < record.reservedUntil)) {
        const expiredTime = ((now - record.expiresAt) / 1000).toFixed(1)
        return m.reply(`ꕥO personagem expirou » ${expiredTime}s.`)
      }
      if (record.user) {
        const ownerName = global.db.data.users[record.user]?.name || `@${record.user.split('@')[0]}`
        return m.reply(`ꕥ O personagem *${record.name}*já foi reivindicado por*${ownerName}*`)
      }
      record.user = m.sender
      record.claimedAt = now
      delete record.reservedBy
      delete record.reservedUntil
      me.lastClaim = now + claimCooldown
      if (!Array.isArray(me.characters)) me.characters = []
      if (!me.characters.includes(id)) me.characters.push(id)
      const displayName = global.db.data.users[m.sender]?.name || m.sender.split('@')[0]
      const custom = global.db.data.users?.[m.sender]?.claimMessage
      const duration = ((now - record.expiresAt + 60000) / 1000).toFixed(1)
      const finalMessage = custom ? custom.replace(/€user/g, `*${displayName}*`).replace(/€character/g, `*${record.name}*`) : `*${record.name}*foi reivindicado por*${displayName}*`
      await client.sendMessage(m.chat, { text: `❀ ${finalMessage} (${duration}s)` }, { quoted: m })
      chat.rolls[quotedId].claimed = true
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}