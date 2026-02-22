export default {
  command: ['wshop', 'haremshop', 'tiendawaifus'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat.sales) chat.sales = {}
    if (!chat.characters) chat.characters = {}
    if (chat.adminonly || !chat.gacha) {
    return m.reply(`ꕥ Os comandos *Gacha* estão desabilitados neste grupo.\n\nUm *administrador* pode ativá-los com:\n» *${usedPrefix}gacha on*`)
    }
    try {
      const ahora = Date.now()
      for (const [id, venta] of Object.entries(chat.sales)) {
        if (ahora - venta.time >= 3 * 864e5) delete chat.sales[id]
      }
      const ventas = Object.entries(chat.sales || {})
      if (!ventas.length) {
        const grupo = await client.groupMetadata(m.chat)
        return m.reply(`ꕥ Não há personagens à venda em *${grupo.subject || 'este grupo'}*`)
      }
      const page = parseInt(args[0]) || 1
      const porPagina = 10
      const totalPaginas = Math.ceil(ventas.length / porPagina)
      if (page < 1 || page > totalPaginas) {
        return m.reply(`ꕥ Página inválida. Existe apenas *${totalPaginas}* disponible${totalPaginas > 1 ? 's' : ''}.`)
      }
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const bot = global.db.data.settings[botId]
      const currency = bot.currency
      const listado = []
      for (const [id, venta] of ventas.slice((page - 1) * porPagina, page * porPagina)) {
        const precios = typeof venta.price === 'number' ? `¥${venta.price.toLocaleString()} ${currency}` : 'Precio no disponible'
        const tiempoRestante = 3 * 864e5 - (Date.now() - venta.time)
        const d = Math.floor(tiempoRestante / 86400000)
        const h = Math.floor(tiempoRestante % 86400000 / 3600000)
        const m_ = Math.floor(tiempoRestante % 3600000 / 60000)
        const s = Math.floor(tiempoRestante % 60000 / 1000)
        let vendedor = global.db.data.users[venta.user].name.trim() || venta.user.split('@')[0]
        const globalValue = global.db.data.characters?.[id]?.value
        const localValue = chat.characters?.[id]?.value
        const valorFinal = typeof globalValue === 'number' ? globalValue : typeof localValue === 'number' ? localValue : 0
        listado.push(`❀ *${venta.name}* (✰ ${valorFinal}):\n⛁ Precio » *${precios}*\n❖ Vendedor » *${vendedor}*\nⴵ Expira em » *${d}d ${h}h ${m_}m ${s}s*`)
      }
      m.reply(`*☆ HaremShop \`≧◠ᴥ◠≦\`*\n❏ Personagens à venda <${ventas.length}>:\n\n` + listado.join('\n\n') + `\n\n> • Paginá *${page}* de *${totalPaginas}*`)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}