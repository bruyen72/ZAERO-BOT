import fetch from 'node-fetch'
import FormData from 'form-data'

function normalizeOwner(owner = '') {
  if (!owner) return ''
  return owner.endsWith('@s.whatsapp.net') ? owner : owner.replace(/\D/g, '') + '@s.whatsapp.net'
}

export default {
  command: ['seticon', 'setboticon'],
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

    const value = args.join(' ').trim()
    const msg = m.message || {}
    const hasMediaOnMessage = !!msg.imageMessage

    if (!value && !m.quoted && !hasMediaOnMessage) {
      return m.reply('? Você deve enviar ou citar uma imagem para alterar o ícone do bot.')
    }

    if (value.startsWith('http')) {
      config.icon = value
      return m.reply(`? Ícone de *${config.namebot || 'Bot'}* atualizado com sucesso!`)
    }

    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    if (!/image\/(png|jpe?g)/.test(mime)) {
      return m.reply('? Responda com uma imagem válida.')
    }

    const buffer = q.download ? await q.download() : await client.downloadMediaMessage(q)
    if (!buffer) return m.reply('? Não foi possível baixar a imagem.')

    const url = await uploadImage(buffer, mime)
    if (!url) return m.reply('? Não foi possível subir a imagem.')

    config.icon = url
    return m.reply(`? Ícone de *${config.namebot || 'Bot'}* atualizado com sucesso!`)
  },
}

async function uploadImage(buffer, mime) {
  const body = new FormData()
  body.append('files[]', buffer, `file.${(mime.split('/')[1] || 'bin')}`)
  const res = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body,
    headers: body.getHeaders(),
  })
  const json = await res.json()
  return json.files?.[0]?.url || null
}