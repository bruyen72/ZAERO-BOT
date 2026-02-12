import { getDevice } from '@whiskeysockets/baileys'
import fs from 'fs'
import moment from 'moment-timezone'
import { bodyMenu, menuObject } from '../../lib/commands.js'
import { apiCache } from '../../lib/cache.js'

function normalizeBotDisplayName(name = '') {
  const fallback = 'ZARO BOT'
  const clean = String(name || '').trim()
  if (!clean) return fallback
  const legacyNames = new Set(['yuki', 'yuki suou', 'alya', 'alya san'])
  if (legacyNames.has(clean.toLowerCase())) return fallback
  return clean
}

function resolveOwnerDisplayName(owner = '') {
  const fallback = 'Administrador'
  const raw = String(owner || '').trim()
  if (!raw) return fallback

  const rawDigits = raw.replace(/\D/g, '')
  const isNumericOwner = /^\d+$/.test(raw.replace(/@s\.whatsapp\.net$/, '')) || rawDigits.length >= 8
  if (isNumericOwner) return fallback
  return raw
}

function normalize(text = '') {
  text = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
  return text.endsWith('s') ? text.slice(0, -1) : text
}

const categoryAlias = {
  anime: ['anime', 'reacciones', 'reacoes', 'animes'],
  downloads: ['downloads', 'descargas', 'download', 'baixar'],
  economia: ['economia', 'economy', 'eco', 'dinheiro'],
  gacha: ['gacha', 'rpg'],
  grupo: ['grupo', 'group', 'grupos'],
  nsfw: ['nsfw', '+18', 'adulto'],
  profile: ['profile', 'perfil'],
  sockets: ['socket', 'sockets', 'bots', 'subbots'],
  utils: ['utils', 'utilidades', 'ferramentas', 'uteis']
}

export default {
  command: ['allmenu', 'help', 'menu', 'ajuda', 'comandos'],
  category: 'info',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      // ⚡ Resposta IMEDIATA com reação para feedback instantâneo
      await m.react('⏳').catch(() => {})

      const categoryInput = normalize(args[0] || 'all')
      const cacheKey = `menu_${m.sender}_${categoryInput}`
      let menuData = apiCache.get(cacheKey)

      if (!menuData) {
        const now = new Date()
        const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        const data = saoPauloDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        const hora = moment.tz('America/Sao_Paulo').format('HH:mm')

        const botId = client?.user?.id?.split(':')[0] + '@s.whatsapp.net'
        const botSettings = global.db?.data?.settings?.[botId] || {}
        const botname = normalizeBotDisplayName(botSettings.botname || botSettings.namebot || global.botName)
        const owner = resolveOwnerDisplayName(botSettings.owner || global.owner?.[0] || '')
        const banner = botSettings.banner || global.botLogo || './ZK.png'
        const mainClientJid = global.client?.user?.id
          ? global.client.user.id.split(':')[0] + '@s.whatsapp.net'
          : botId
        const isOficialBot = botId === mainClientJid
        const botType = isOficialBot ? 'Principal' : 'SubBot'
        const users = Object.keys(global.db?.data?.users || {}).length
        const device = getDevice(m.key?.id || '')
        const senderName = global.db?.data?.users?.[m.sender]?.name || m.pushName || 'Usuario'
        const senderMention = `@${m.sender.split('@')[0]}`
        const uptime = client.uptime ? formatMs(Date.now() - client.uptime) : 'Desconhecido'

        menuData = { data, hora, botname, owner, banner, botType, users, device, senderName, senderMention, uptime }
        // ⚡ Cache de 5 minutos (300 segundos) para melhor performance
        apiCache.set(cacheKey, menuData, 300)
      }

      const { data, hora, botname, owner, banner, botType, users, device, senderName, senderMention, uptime } = menuData

      const input = normalize(args[0] || '')
      const cat = Object.keys(categoryAlias).find((key) => categoryAlias[key].map(normalize).includes(input))

      if (args[0] && !cat) {
        return m.reply(`A categoria *${args[0]}* nao existe.\n\nCategorias disponiveis:\n${Object.keys(categoryAlias).map((c) => `- ${c}`).join('\n')}\n\nComo usar:\n- *${usedPrefix}menu*\n- *${usedPrefix}menu [categoria]*\n- Exemplo: ${usedPrefix}menu anime`)
      }

      const sections = menuObject
      const content = cat
        ? String(sections[cat] || '')
        : Object.values(sections).map((s) => String(s || '')).join('\n\n')

      let menu = bodyMenu ? String(bodyMenu || '') + '\n\n' + content : content

      const replacements = {
        $owner: resolveOwnerDisplayName(owner),
        $botType: botType,
        $device: device,
        $tiempo: data,
        $tempo: hora,
        $users: users.toLocaleString('pt-BR'),
        $cat: cat ? ` para \`${cat}\`` : '',
        $sender: senderMention,
        $senderName: senderName,
        $botname: botname,
        $namebot: botname,
        $prefix: usedPrefix,
        $uptime: uptime
      }

      menu = menu.replace(/\$(owner|botType|device|tiempo|tempo|users|cat|sender|senderName|botname|namebot|prefix|uptime)/g, (match) => {
        return replacements[match] || match
      })

      const headerText = `╔═══『 ✧ ${botname} ✧ 』═══╗
║
║ 👋 *Olá, ${senderMention}!*
║ ✨ Seu assistente virtual de anime
║
╠═══『 📊 INFORMAÇÕES 』═══
║
║ 👥 *Usuários:* ${users.toLocaleString('pt-BR')}
║ 🕐 *Horário:* ${hora}
║ 🤖 *Tipo:* ${botType}
║ ⏱️ *Online:* ${uptime}
║
╚═══『 ⭐ ${botType === 'Principal' ? 'BOT OFICIAL' : 'SUBBOT'} ⭐ 』═══╝

${menu}`

      const logoPath = './ZK.png'
      const hasLogo = fs.existsSync(logoPath)
      const mentionContext = { contextInfo: { mentionedJid: [m.sender] } }

      if (typeof banner === 'string' && (banner.includes('.mp4') || banner.includes('.webm'))) {
        await client.sendMessage(m.chat, {
          video: { url: banner },
          gifPlayback: true,
          caption: headerText,
          ...mentionContext
        }, { quoted: m })
        await m.react('✅').catch(() => {})
        return
      }

      if (hasLogo) {
        await client.sendMessage(m.chat, {
          image: { url: logoPath },
          caption: headerText,
          ...mentionContext
        }, { quoted: m })
        await m.react('✅').catch(() => {})
        return
      }

      await client.sendMessage(m.chat, {
        text: headerText,
        ...mentionContext
      }, { quoted: m })
      await m.react('✅').catch(() => {})
    } catch (e) {
      await m.react('❌').catch(() => {})
      await m.reply(`❌ Erro ao executar o comando *${usedPrefix + command}*.\n\n📝 Detalhes: ${e.message}`)
    }
  }
}

function formatMs(ms) {
  const segundos = Math.floor(ms / 1000)
  const minutos = Math.floor(segundos / 60)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  return [
    dias ? `${dias}d` : null,
    `${horas % 24}h`,
    `${minutos % 60}m`,
    `${segundos % 60}s`
  ].filter(Boolean).join(' ')
}
