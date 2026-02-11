import * as Jimp from 'jimp'

async function resizeImage(media) {
  const jimp = await Jimp.read(media)
  const min = jimp.getWidth()
  const max = jimp.getHeight()
  const cropped = jimp.crop(0, 0, min, max)
  return {
    img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
    preview: await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG)
  }
}

function normalizeOwner(owner = '') {
  if (!owner) return ''
  return owner.endsWith('@s.whatsapp.net') ? owner : owner.replace(/\D/g, '') + '@s.whatsapp.net'
}

export default {
  command: ['setimage', 'setpfp'],
  category: 'socket',
  run: async (client, m, args) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const config = global.db.data.settings[idBot] || {}

    const isOwner2 = [
      idBot,
      ...(config.owner ? [normalizeOwner(config.owner)] : []),
      ...global.owner.map((num) => num + '@s.whatsapp.net')
    ].includes(m.sender)

    if (!isOwner2) return m.reply(mess.socket)

    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    if (!/image/g.test(mime)) {
      return m.reply('? Você deve enviar ou citar uma imagem para alterar a foto do perfil do bot.')
    }

    const media = q.download ? await q.download() : await client.downloadMediaMessage(q)
    if (!media) return m.reply('? Não foi possível baixar a imagem.')

    const jid = idBot
    if (args[1] === 'full') {
      const { img } = await resizeImage(media)
      await client.query({
        tag: 'iq',
        attrs: { to: jid, type: 'set', xmlns: 'w:profile:picture' },
        content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
      })
    } else {
      await client.updateProfilePicture(jid, media)
    }

    return m.reply(`? Foto de perfil de *${config.namebot || 'Bot'}* atualizada com sucesso!`)
  },
}