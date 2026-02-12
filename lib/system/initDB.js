let isNumber = (x) => typeof x === 'number' && !isNaN(x)

function ensureObject(container, key) {
  if (!container || typeof container !== 'object') return {}
  const value = container[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    container[key] = {}
  }
  return container[key]
}

function initDB(m, client) {
  if (!global.db?.data || !m?.sender || !m?.chat || !client?.user?.id) return

  if (!global.db.data.users || typeof global.db.data.users !== 'object' || Array.isArray(global.db.data.users)) {
    global.db.data.users = {}
  }
  if (!global.db.data.chats || typeof global.db.data.chats !== 'object' || Array.isArray(global.db.data.chats)) {
    global.db.data.chats = {}
  }
  if (!global.db.data.settings || typeof global.db.data.settings !== 'object' || Array.isArray(global.db.data.settings)) {
    global.db.data.settings = {}
  }

  const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'

  const settings = ensureObject(global.db.data.settings, jid)
  settings.self ??= false
  settings.prefix ??= ['/', '!', '.', '#']
  settings.commandsejecut = isNumber(settings.commandsejecut) ? settings.commandsejecut : 0
  settings.id ??= '120363401404146384@newsletter'
  settings.nameid ??= "'ೃ࿔ ყµҡเ ωαɓσƭ'ร - σƒƒเ૮เαℓ ૮ɦαɳɳεℓ .ೃ࿐"
  settings.type ??= 'Owner'
  settings.link ??= 'https://api.stellarwa.xyz'
  settings.banner ??= 'https://cdn.yuki-wabot.my.id/files/07jW.jpeg'
  settings.icon ??= 'https://cdn.yuki-wabot.my.id/files/6Z4w.jpeg'
  settings.currency ??= 'Yenes'
  settings.namebot ??= 'ZÆRØ BOT'
  settings.botname ??= 'ZÆRØ BOT'
  settings.owner ??= ''
  if (['yuki', 'alya'].includes(String(settings.namebot).toLowerCase())) {
    settings.namebot = 'ZÆRØ BOT'
  }
  if (['yuki suou', 'alya san'].includes(String(settings.botname).toLowerCase())) {
    settings.botname = 'ZÆRØ BOT'
  }

  const user = ensureObject(global.db.data.users, m.sender)
  user.name = user.name || m.pushName || 'Usuario'
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null

  const chat = ensureObject(global.db.data.chats, m.chat)
  if (!chat.users || typeof chat.users !== 'object' || Array.isArray(chat.users)) {
    chat.users = {}
  }
  chat.isBanned ??= false
  chat.welcome ??= false
  chat.goodbye ??= false
  chat.sWelcome ??= ''
  chat.sGoodbye ??= ''
  chat.nsfw ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.economy ??= true
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true
  chat.nsfwRedgifsSentIds = Array.isArray(chat.nsfwRedgifsSentIds)
    ? chat.nsfwRedgifsSentIds
    : []

  const chatUser = ensureObject(chat.users, m.sender)
  if (!chatUser.stats || typeof chatUser.stats !== 'object' || Array.isArray(chatUser.stats)) {
    chatUser.stats = {}
  }
  chatUser.usedTime ??= null
  chatUser.lastCmd = isNumber(chatUser.lastCmd) ? chatUser.lastCmd : 0
  chatUser.coins = isNumber(chatUser.coins) ? chatUser.coins : 0
  chatUser.bank = isNumber(chatUser.bank) ? chatUser.bank : 0
  chatUser.afk = isNumber(chatUser.afk) ? chatUser.afk : -1
  chatUser.afkReason ??= ''
  chatUser.characters = Array.isArray(chatUser.characters) ? chatUser.characters : []
}

export default initDB;
