import axios from 'axios'
import FormData from 'form-data'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}

function generateUniqueFilename(mime) {
  const ext = mime.split('/')[1] || 'bin'
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${id}.${ext}`
}

async function uploadToStellar(buffer, mime, token) {
  const form = new FormData()
  form.append('file', buffer, { filename: generateUniqueFilename(mime) })

  const apiBase = global.APIs?.stellar?.url || 'https://api.stellarwa.xyz'
  const res = await axios.post(`${apiBase}/api/cdn/upload`, form, {
    headers: {
      ...form.getHeaders(),
      'x-upload-token': token,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })

  if (!res.data?.url) throw new Error('Resposta inválida do CDN')
  return res.data.url
}

export default {
  command: ['tourl'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || ''

    if (!mime) {
      return client.reply(
        m.chat,
        `«?» Responda a uma imagem ou vídeo com *${usedPrefix + command}* para converter em URL.`,
        m
      )
    }

    try {
      const media = q.download ? await q.download() : await client.downloadMediaMessage(q)
      const token = `${global.APIs?.stellar?.key2 || ''}`
      const link = await uploadToStellar(media, mime, token)
      const userName = global.db.data.users[m.sender]?.name || 'Usuario'
      const upload = `? *Upload To Stellar*\n\n` +
        `×…? *Link ›* ${link}\n` +
        `×…? *Peso ›* ${formatBytes(media.length)}\n` +
        `×…? *Solicitado por ›* ${userName}\n\n` +
        `${global.dev || ''}`

      await client.reply(m.chat, upload, m)
    } catch {
      await m.reply('«?» Falha ao enviar mídia para URL.')
    }
  },
}