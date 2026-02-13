import { resolveLidToRealJid } from "../../lib/utils.js"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const getBotsFromFolder = (folderName) => {
  const basePath = path.join(dirname, '../../Sessions', folderName)
  if (!fs.existsSync(basePath)) return []
  return fs.readdirSync(basePath).filter((dir) => fs.existsSync(path.join(basePath, dir, 'creds.json'))).map((id) => id.replace(/\D/g, '') + '@s.whatsapp.net')
}

const getAllowedBots = (mainBotJid) => {
  const subs = getBotsFromFolder('Subs')
  return [...new Set([...subs, mainBotJid])]
}

export default {
  command: ['setprimary'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      const mentioned = m.mentionedJid
      const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted?.sender || false
     const who = await resolveLidToRealJid(who2, client, m.chat);
      if (!who2) {
        return client.reply(m.chat, `《✧》 Por favor mencione um bot para torná-lo primário.`, m)
      }
      const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch(() => {}) : ''
      const groupParticipants = groupMetadata?.participants?.map((p) => p.phoneNumber || p.jid || p.id || p.lid) || []
      const mainBotJid = global.client.user.id.split(':')[0] + '@s.whatsapp.net'
      const allowedBots = getAllowedBots(mainBotJid)
      if (!allowedBots.includes(who)) {
        return client.reply(m.chat, `《✧》 O usuário mencionado não é uma instância de Sub-Bot.`, m)
      }
      if (!groupParticipants.includes(who)) {
        return client.reply(m.chat, `《✧》 O bot mencionado não está presente neste grupo.`, m)
      }
      if (chat.primaryBot === who) {
        return client.reply(m.chat, `「✿」 @${who.split('@')[0]} Já é o principal Bot do Grupo.`, m, { mentions: [who] })
      }
      chat.primaryBot = who
      await client.reply(m.chat, `ꕥ Foi definido como @${who.split('@')[0]} como o bot principal deste grupo.\n> Agora todos os comandos deste grupo serão executados por @${who.split('@')[0]}.`, m, { mentions: [who] })
    } catch (e) {
      console.error(e)
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};