export default {
  command: [
    'welcome', 'bienvenida',
    'goodbye', 'despedida',
    'alerts', 'alertas',
    'nsfw',
    'antilink', 'antienlaces', 'antilinks',
    'rpg', 'economy', 'economia',
    'gacha',
    'adminonly', 'onlyadmin'
  ],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chatData = global.db.data.chats[m.chat]
    const botname = global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].botname 
    const stateArg = args[0]?.toLowerCase()
    const validStates = ['on', 'off', 'enable', 'disable']
    const mapTerms = {
      antilinks: 'antilinks',
      antienlaces: 'antilinks',
      antilink: 'antilinks',
      welcome: 'welcome',
      bienvenida: 'welcome',
      goodbye: 'goodbye',
      despedida: 'goodbye',
      alerts: 'alerts',
      alertas: 'alerts',
      economy: 'economy',      
      economia: 'economy',
      adminonly: 'adminonly',
      onlyadmin: 'adminonly',
      nsfw: 'nsfw',
      rpg: 'gacha',
      gacha: 'gacha'
    }
    const featureNames = {
      antilinks: 'o *AntiLink*',
      welcome: 'a mensagem de *boas-vindas*',
      goodbye: 'a mensagem de *despedida*',
      alerts: 'os *Alertas*',
      economy: 'Comandos de *Economia*',
      gacha: '*Gacha* comandos',
      adminonly: 'Modo *somente administrador*',
      nsfw: 'Comandos *NSFW*'
    }
    const featureTitles = {
      antilinks: 'AntiEnlace',
      welcome: 'Bienvenida',
      goodbye: 'Despedida',
      alerts: 'Alertas',
      economy: 'Economía',
      gacha: 'Gacha',
      adminonly: 'AdminOnly',
      nsfw: 'NSFW'
    }
    const normalizedKey = mapTerms[command] || command
    const current = chatData[normalizedKey] === true
    const estado = current ? '✓ Ativado' : '✗ Desativado'
    const nombreBonito = featureNames[normalizedKey] || `a função *${normalizedKey}*`
    const titulo = featureTitles[normalizedKey] || normalizedKey
    if (!stateArg) {
      return client.reply(m.chat, `*✩ ${titulo} (✿❛◡❛)*\n\nꕥ Um administrador pode ativar ou desativar ${nombreBonito} usando:\n\n● _Ativar ›_ *${usedPrefix + normalizedKey} ativar*\n● _Desativar ›_ *${usedPrefix + normalizedKey} desativar*\n\n❒ *Status atual ›* ${estado}`, m)
    }
    if (!validStates.includes(stateArg)) {
      return m.reply(`✎ Status inválido. Use *on*, *off*, *enable* ou *disable*\n\nExemplo:\n${usedPrefix}${normalizedKey} enable`)
    }
    const enabled = ['on', 'enable'].includes(stateArg)
    if (chatData[normalizedKey] === enabled) {
      return m.reply(`✎ *${titulo}* já estava *${enabled ? 'ativado' : 'desativado'}*.`)
    }
    chatData[normalizedKey] = enabled
    return m.reply(`✅ Você *${enabled ? 'ativou' : 'desativou'}* ${nombreBonito}.`)
  }
};