import os from 'os'

function rTime(seconds) {
  seconds = Number(seconds || 0)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const dDisplay = d > 0 ? d + (d === 1 ? ' dia, ' : ' dias, ') : ''
  const hDisplay = h > 0 ? h + (h === 1 ? ' hora, ' : ' horas, ') : ''
  const mDisplay = m > 0 ? m + (m === 1 ? ' minuto, ' : ' minutos, ') : ''
  const sDisplay = s > 0 ? s + (s === 1 ? ' segundo' : ' segundos') : ''
  return dDisplay + hDisplay + mDisplay + sDisplay
}

function normalizeBotDisplayName(name = '') {
  const fallback = 'ZÆRØ BOT'
  const clean = String(name || '').trim()
  if (!clean) return fallback
  const legacyNames = new Set(['yuki', 'yuki suou', 'alya', 'alya san'])
  if (legacyNames.has(clean.toLowerCase())) return fallback
  return clean
}

function resolveOwnerDisplayName(owner = '') {
  const fallback = 'Bruno Ruthes'
  const raw = String(owner || '').trim()
  if (!raw) return fallback

  const rawDigits = raw.replace(/\D/g, '')
  const isNumericOwner = /^\d+$/.test(raw.replace(/@s\.whatsapp\.net$/, '')) || rawDigits.length >= 8
  if (isNumericOwner) return fallback
  return raw
}

export default {
  command: ['infobot', 'infosocket'],
  category: 'info',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const botSettings = global.db?.data?.settings?.[botId] || {}

      const botname = normalizeBotDisplayName(botSettings.botname || botSettings.namebot)
      const namebot = normalizeBotDisplayName(botSettings.namebot || botSettings.botname)
      const monedas = botSettings.currency || 'Yenes'
      const banner = botSettings.banner || global.botLogo || './ZK.png'
      const prefijo = botSettings.prefix || ['.']
      const ownerName = resolveOwnerDisplayName(botSettings.owner || '')
      const link = botSettings.link || global.links?.api || 'https://api.stellarwa.xyz'

      const platform = os.type()
      const now = new Date()
      const saopauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const nodeVersion = process.version
      const sistemaUptime = rTime(os.uptime())

      const uptime = process.uptime()
      const uptimeDate = new Date(saopauloTime.getTime() - uptime * 1000)
      const formattedUptimeDate = uptimeDate.toLocaleString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/^./, (x) => x.toUpperCase())

      const mainClientJid = global.client?.user?.id
        ? global.client.user.id.split(':')[0] + '@s.whatsapp.net'
        : botId
      const isOficialBot = botId === mainClientJid
      const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot'

      const message = `? Informações do bot *${botname}*\n\n` +
        `? *Nome abreviado ›* ${namebot}\n` +
        `? *Nome longo ›* ${botname}\n` +
        `? *Moeda ›* ${monedas}\n` +
        `? *Prefixo${Array.isArray(prefijo) && prefijo.length > 1 ? 's' : ''} ›* ${(Array.isArray(prefijo) ? prefijo : [prefijo]).map((p) => `\`${p}\``).join(', ')}\n\n` +
        `? *Tipo ›* ${botType}\n` +
        `? *Plataforma ›* ${platform}\n` +
        `? *NodeJS ›* ${nodeVersion}\n` +
        `? *Ativo desde ›* ${formattedUptimeDate}\n` +
        `? *Sistema ativo ›* ${sistemaUptime}\n` +
        `? *Proprietário ›* ${ownerName}\n\n` +
        `Link: ${link}`

      await client.sendMessage(
        m.chat,
        {
          text: message,
          contextInfo: {
            mentionedJid: [m.sender],
            externalAdReply: {
              title: botname,
              body: 'Desenvolvido por Bruno Ruthes',
              showAdAttribution: false,
              thumbnailUrl: banner,
              mediaType: 1,
              previewType: 0,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: m }
      )
    } catch (e) {
      return m.reply(`> Ocorreu um erro ao executar *${usedPrefix + command}*.\n> [Erro: *${e.message}*]`)
    }
  }
}