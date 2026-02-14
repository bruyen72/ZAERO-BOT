import exif from '../../lib/exif.js'
import { searchTenor, toStickerWebp } from '../../lib/tenorSticker.js'
import fs from 'fs'

const { writeExif } = exif

export default {
  command: ['gif', 'tenor'],
  category: 'utils',
  info: {
    desc: 'Busca um GIF no Tenor e envia como FIGURINHA. Ex: /gif happy'
  },
  run: async (client, m, args, usedPrefix) => {
    const term = args.join(' ').trim()
    
    if (!term) {
      return m.reply(`Por favor, digite o que deseja buscar. Ex: ${usedPrefix}gif dança`)
    }

    await m.react('🔍').catch(() => {})
    
    try {
      // searchTenor agora usa o Scraper automaticamente se não houver API KEY
      const urls = await searchTenor(term, 1)
      
      if (!urls || urls.length === 0) {
        await m.react('❌').catch(() => {})
        return m.reply(`Não encontrei nenhum resultado para: "${term}"`)
      }

      const mediaUrl = urls[0]
      console.log(`[GIF-STICKER] Convertendo: ${mediaUrl}`)
      
      await m.react('⏳').catch(() => {})

      // Converte para WebP Sticker
      const webpBuffer = await toStickerWebp(mediaUrl, {
        downloadTimeoutMs: 25000,
        timeoutMs: 25000,
        trimSeconds: 6,
        maxOutputBytes: 850 * 1024
      })

      // Adiciona Metadados (Exif)
      const stickerPath = await writeExif(
        { mimetype: 'webp', data: webpBuffer },
        { packname: 'ZAERO GIF', author: 'Tenor Scraper', categories: [''] }
      )

      try {
        await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
        await m.react('✅').catch(() => {})
      } finally {
        if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath)
      }
      
    } catch (error) {
      console.error(`[GIF-STICKER] Erro: ${error.message}`)
      await m.react('❌').catch(() => {})
      m.reply('Ocorreu um erro ao converter o GIF em figurinha.')
    }
  }
}
