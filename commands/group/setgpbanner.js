export default {
  command: ['setgpbanner'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/image/.test(mime)) {
      return m.reply('«?» Faltou a imagem para alterar o perfil do grupo.')
    }

    const img = q.download ? await q.download() : await client.downloadMediaMessage(q)
    if (!img) return m.reply('«?» Não foi possível baixar a imagem.')

    try {
      await client.updateProfilePicture(m.chat, img)
      return m.reply('? A imagem do grupo foi atualizada com sucesso.')
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*.\n> [Erro: *${e.message}*]`)
    }
  },
}