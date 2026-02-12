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
  command: ['deletefav', 'delfav'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.gacha) {
      return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com o comando:\n» *${usedPrefix}gacha on*`)
    }
    if (!chat.users) chat.users = {}
    if (!chat.users[m.sender]) chat.users[m.sender] = {}
    const user = chat.users[m.sender]
    if (!user.favorite) {
      return m.reply('❀ Você não tem nenhum personagem marcado como favorito.')
    }
    const id = user.favorite
    let name = global.db.data.characters?.[id]?.name
    try {
      if (!name) {
        const structure = await loadCharacters()
        const all = flattenCharacters(structure)
        const original = all.find(c => c.id === id)
        name = original?.name || 'personagem desconhecido'
      }
      delete user.favorite
      if (global.db.data.users?.[m.sender]?.favorite === id) {
        delete global.db.data.users[m.sender].favorite
      }
      m.reply(`✎ *${name}* não é mais seu personagem favorito.`)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}