import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default {
  command: ['bots', 'sockets'],
  category: 'socket',
  disabled: true, // Comando desabilitado
  run: async (client, m) => {
    // Comando desabilitado - retorna mensagem informativa
    return client.reply(
      m.chat,
      `❌ *Comando Desabilitado*\n\n` +
      `Este comando foi desativado temporariamente.\n\n` +
      `*Motivo:* Segurança e estabilidade do bot\n\n` +
      `Para mais informações, entre em contato com o suporte.`,
      m
    );

    /* CÓDIGO ORIGINAL DESABILITADO:
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = global.db.data.settings[botId] || {}

    const from = m.key.remoteJid
    const groupMetadata = m.isGroup ? await client.groupMetadata(from).catch(() => null) : null
    const groupParticipants = groupMetadata?.participants?.map((p) => p.phoneNumber || p.jid || p.lid || p.id) || []

    const rootClient = global.client?.user?.id ? global.client : client
    const mainBotJid = rootClient.user.id.split(':')[0] + '@s.whatsapp.net'
    const isMainBotInGroup = groupParticipants.includes(mainBotJid)

    const basePath = path.join(dirname, '../../Sessions')
    const getBotsFromFolder = (folderName) => {
      const folderPath = path.join(basePath, folderName)
      if (!fs.existsSync(folderPath)) return []
      return fs.readdirSync(folderPath)
        .filter((dir) => fs.existsSync(path.join(folderPath, dir, 'creds.json')))
        .map((id) => id.replace(/\D/g, ''))
    }

    const subs = getBotsFromFolder('Subs')
    const categorizedBots = { Owner: [], Sub: [] }
    const mentionedJid = []

    const formatBot = (number, label) => {
      const jid = number + '@s.whatsapp.net'
      if (m.isGroup && !groupParticipants.includes(jid)) return null
      mentionedJid.push(jid)
      const data = global.db.data.settings[jid]
      const name = data?.namebot || 'Bot'
      const handle = `@${number}`
      return `- [${label} *${name}*] � ${handle}`
    }

    if (global.db.data.settings[mainBotJid]) {
      const name = global.db.data.settings[mainBotJid].namebot || 'Principal'
      const handle = `@${mainBotJid.split('@')[0]}`
      if (!m.isGroup || isMainBotInGroup) {
        mentionedJid.push(mainBotJid)
        categorizedBots.Owner.push(`- [Owner *${name}*] � ${handle}`)
      }
    }

    subs.forEach((num) => {
      const line = formatBot(num, 'Sub')
      if (line) categorizedBots.Sub.push(line)
    })

    const totalCounts = {
      Owner: global.db.data.settings[mainBotJid] ? 1 : 0,
      Sub: subs.length,
    }
    const totalBots = totalCounts.Owner + totalCounts.Sub
    const totalInGroup = categorizedBots.Owner.length + categorizedBots.Sub.length

    let message = `? N�meros de Sockets ativos *(${totalBots})*\n\n`
    message += `? Principais � *${totalCounts.Owner}*\n`
    message += `? Subs � *${totalCounts.Sub}*\n\n`
    message += `? *Bots vis�veis neste chat �* ${totalInGroup}\n`

    for (const category of ['Owner', 'Sub']) {
      if (categorizedBots[category].length) {
        message += categorizedBots[category].join('\n') + '\n'
      }
    }

    await client.sendContextInfoIndex(m.chat, message.trim(), {}, m, true, [...new Set(mentionedJid)])
    */
  },
}