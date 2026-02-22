import { resolveLidToRealJid } from "../../lib/utils.js"

export default {
  command: ['pfp', 'getpic'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : false
    const who = await resolveLidToRealJid(who2, client, m.chat);
    if (!who2) return m.reply(`《✧》 Marque ou mencione o usuário cuja foto de perfil você deseja ver.`)
    try {
      const img = await client.profilePictureUrl(who, 'image').catch(() => null)
      if (!img)
        return client.sendMessage(m.chat, { text: `《✧》 Não foi possível obter a foto do perfil @${who.split('@')[0]}.`, mentions: [who] }, { quoted: m })
      await client.sendMessage(m.chat, { image: { url: img }, caption: null }, { quoted: m })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
