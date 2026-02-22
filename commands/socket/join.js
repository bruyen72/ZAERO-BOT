export default {
  command: ['join', 'unir'],
  category: 'socket',
  run: async (client, m, args) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot]
    const isOwner2 = [idBot, ...(config.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')].includes(m.sender)
    if (!isOwner2) return m.reply(mess.socket)
    if (!args[0]) return m.reply('《✧》 Entre no link do grupo para entrar no bot.')
    const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
    const match = args[0].match(linkRegex)
    if (!match || !match[1]) {
      return m.reply('《✧》 O link inserido é inválido ou incompleto.')
    }
    try {
      const inviteCode = match[1]
      await client.groupAcceptInvite(inviteCode)
      await client.reply(m.chat, `❀ ${config.botname} juntou-se com sucesso ao grupo.`, m)
    } catch (e) {
      const errMsg = String(e.message || e)
      if (errMsg.includes('not-authorized') || errMsg.includes('requires-admin')) {
        await m.reply('《✧》 A adesão requer aprovação do administrador. Espere que eles aceitem seu pedido.')
      } else if (errMsg.includes('not-in-group') || errMsg.includes('removed')) {
        await m.reply('《✧》 Não foi possível entrar no grupo porque o bot foi excluído recentemente.')
      } else {
        await m.reply('《✧》 Não foi possível entrar no grupo, verifique o link ou as permissões.')
      }
    }
  },
}