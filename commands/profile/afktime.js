import { resolveLidToRealJid } from "../../lib/utils.js"

function ensureObject(container, key) {
  if (!container || typeof container !== 'object') return {}
  const value = container[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    container[key] = {}
  }
  return container[key]
}

function formatTiempo(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) return 'desconhecido'
  const h = Math.floor(ms / 3600000)
  const min = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const parts = []
  if (h) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`)
  if (min) parts.push(`${min} ${min === 1 ? 'minuto' : 'minutos'}`)
  if (s || (!h && !min)) parts.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`)
  return parts.join(' ')
}

export async function before(m, { client }) {
  if (!m?.chat || !m?.sender || !client?.user?.id || !global.db?.data) return

  if (!global.db.data.chats || typeof global.db.data.chats !== 'object' || Array.isArray(global.db.data.chats)) {
    global.db.data.chats = {}
  }
  if (!global.db.data.users || typeof global.db.data.users !== 'object' || Array.isArray(global.db.data.users)) {
    global.db.data.users = {}
  }

  const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const chat = ensureObject(global.db.data.chats, m.chat)
  if (!chat.users || typeof chat.users !== 'object' || Array.isArray(chat.users)) {
    chat.users = {}
  }

  const primaryBot = chat.primaryBot
  if (primaryBot && botJid !== primaryBot) return

  const currency = global.db.data.settings?.[botJid]?.currency || 'coins'
  const user = ensureObject(chat.users, m.sender)
  user.coins = Number.isFinite(user.coins) ? user.coins : 0

  if (typeof user.afk === 'number' && user.afk > -1) {
    const ms = Date.now() - user.afk
    const minutos = Math.floor(ms / 60000)
    const horas = Math.floor(ms / 3600000)

    let coins = minutos * 8
    const bonos = Math.floor(horas / 3)
    for (let i = 0; i < bonos; i++) {
      coins += Math.floor(Math.random() * (1500 - 300 + 1)) + 300
    }

    user.coins += coins

    const tiempo = formatTiempo(ms)
    const recompensa = coins > 0 ? `\n> ? Recompensa » *${coins} ${currency}*` : ''
    const senderName = global.db.data.users[m.sender]?.name || 'Usuario'

    await client.reply(
      m.chat,
      `? *${senderName}* Você deixou de ficar inativo.\n> ? Motivo » *${user.afkReason || 'não especificado'}*\n> ? Tempo ocioso » *${tiempo}* ${recompensa}`,
      m
    )

    user.afk = -1
    user.afkReason = ''
  }

  const mentioned = m.mentionedJid || []
  const quoted = m.quoted ? m.quoted.sender : null

  let jids = []

  if (mentioned.length) {
    for (const id of mentioned) {
      const real = await resolveLidToRealJid(id, client, m.chat)
      if (real) jids.push(real)
    }
  }

  if (quoted) {
    const real = await resolveLidToRealJid(quoted, client, m.chat)
    if (real) jids.push(real)
  }

  jids = [...new Set(jids.filter((j) => j && j.endsWith('@s.whatsapp.net') && j !== 'status@broadcast'))]

  for (const jid of jids) {
    const target = chat.users[jid]
    if (!target || typeof target.afk !== 'number' || target.afk < 0) continue

    const ms = Date.now() - target.afk
    const tiempo = formatTiempo(ms)
    const targetName = global.db.data.users[jid]?.name || 'Usuario'

    await client.reply(
      m.chat,
      `? O usuário *${targetName}* é AFK.\n> ? Motivo » *${target.afkReason || 'não especificado'}*\n> ? Tempo ocioso » *${tiempo}*`,
      m
    )
  }
}