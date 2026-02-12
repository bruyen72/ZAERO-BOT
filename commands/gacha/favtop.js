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
  command: ['favtop', 'favoritetop', 'favboard'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.gacha) {
      return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
    }
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.characters) global.db.data.characters = {}
    try {
      const structure = await loadCharacters()
      const allCharacters = flattenCharacters(structure)
      const counts = {}
      for (const [id, user] of Object.entries(global.db.data.users)) {
        const favId = user.favorite
        if (favId) counts[favId] = (counts[favId] || 0) + 1
      }
      const enriched = allCharacters.map(c => ({ name: c.name, favorites: counts[c.id] || 0 })).filter(e => e.favorites > 0)
      const page = parseInt(args[0]) || 1
      const perPage = 10
      const totalPages = Math.max(1, Math.ceil(enriched.length / perPage))
      if (page < 1 || page > totalPages) {
        return m.reply(`ꕥ Página inválida. Há um total de *${totalPages}* páginas.`)
      }
      const sorted = enriched.sort((a, b) => b.favorites - a.favorites)
      const sliced = sorted.slice((page - 1) * perPage, page * perPage)
      let msg = '✰ Principais personagens favoritos:\n\n'
      sliced.forEach((char, i) => {
        msg += `#${(page - 1) * perPage + i + 1} » *${char.name}*\n`
        msg += `   ♡ ${char.favorites} favorito${char.favorites !== 1 ? 's' : ''}.\n`
      })
      msg += `\n> Página ${page} de ${totalPages}`
      await client.reply(m.chat, msg.trim(), m)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}