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
  command: ['waifusboard', 'waifustop', 'topwaifus', 'wtop'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.gacha) {
      return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
    }
    if (!global.db.data.characters) global.db.data.characters = {}
    try {
      const structure = await loadCharacters()
      const allCharacters = flattenCharacters(structure)
      const enriched = allCharacters.map(c => {
        if (!global.db.data.characters[c.id]) global.db.data.characters[c.id] = {}
        const record = global.db.data.characters[c.id]
        const value = typeof record.value === 'number' ? record.value : Number(c.value || 0)
        return { name: c.name, value }
      })
      const page = parseInt(args[0]) || 1
      const perPage = 10
      const totalPages = Math.ceil(enriched.length / perPage)
      if (page < 1 || page > totalPages) {
        return m.reply(`ꕥ Página inválida. Há um total de *${totalPages}* páginas.`)
      }
      const sorted = enriched.sort((a, b) => b.value - a.value)
      const sliced = sorted.slice((page - 1) * perPage, page * perPage)
      let message = '❀ *Personagens com mais valor:*\n\n'
      sliced.forEach((char, i) => {
        message += `✰ ${((page - 1) * perPage) + i + 1} » *${char.name}*\n`
        message += `   → Valor: *${char.value.toLocaleString()}*\n`
      })
      message += `\n⌦ Página *${page}* de *${totalPages}*`
      if (page < totalPages) {
        message += `\n> Para ver a próxima página › *waifusboard ${page + 1}*`
      }
      await client.sendMessage(m.chat, { text: message.trim() }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}
