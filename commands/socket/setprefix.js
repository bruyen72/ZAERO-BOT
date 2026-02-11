import GraphemeSplitter from 'grapheme-splitter'

export default {
  command: ['setprefix', 'setbotprefix'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const isOwner2 = [idBot, ...(config.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isOwner2) return client.reply(m.chat, mess.socket, m)
    const value = args.join(' ').trim()
    const defaultPrefix = ["#", "/", "!", "."]
    if (!value) {
    const lista = config.prefix === null ? '`sem prefixos`' : (Array.isArray(config.prefix) ? config.prefix : [config.prefix || '/']).map(p => `\`${p}\``).join(', ')
    return m.reply(`❀ Escolha qualquer um dos seguintes métodos de prefixo.\n\n> *○ Only-Prefix* » ${usedPrefix + command} *.*\n> *○ Multi-Prefix* » ${usedPrefix + command} *!/.#*\n> *○ No-Prefix* » ${usedPrefix + command} *noprefix*\n\nꕥ Actualmente se está usando: ${lista}`)
    }
    if (value.toLowerCase() === 'reset') {
    config.prefix = defaultPrefix
    return client.reply(m.chat, `❀ Se han restaurado los prefijos predeterminados: *${defaultPrefix.join(' ')}*`, m)
    }
    if (value.toLowerCase() === 'noprefix') {
    config.prefix = true 
    return m.reply(`❀ Mudou corretamente para o modo de prefixo sem soquete\n> Agora o bot responderá aos comandos *sem prefixos*.`)
    }
    const splitter = new GraphemeSplitter()
    const graphemes = splitter.splitGraphemes(value)
    const lista = []
    for (const g of graphemes) {
    if (/^[a-zA-Z]+$/.test(g)) continue
    if (!lista.includes(g)) lista.push(g)
    }
    if (lista.length === 0) return client.reply(m.chat, 'ꕥ Nenhum prefixo válido detectado. Você deve incluir pelo menos um símbolo ou emoji.', m)
    if (lista.length > 6) return client.reply(m.chat, 'ꕥ Máximo 6 prefijos permitidos.', m)
    config.prefix = lista
    return client.reply(m.chat, `❀ Se cambió el prefijo del Socket a *${lista.join(' ')}* correctamente.`, m)
  },
}
