import exif from '../../lib/exif.js'
import { searchTenor, toStickerWebp } from '../../lib/tenorSticker.js'
import fs from 'fs'

const { writeExif } = exif

const MAX_QTY = 10
const DEFAULT_QTY = 1

function clampQty(value, fallback = DEFAULT_QTY) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 1) return fallback
  return Math.min(parsed, MAX_QTY)
}

export default {
  command: ['gif', 'tenor'],
  category: 'utils',
  info: {
    desc: 'Busca GIFs no Tenor e envia como FIGURINHA. Ex: .gif 2 anime'
  },
  run: async (client, m, args, usedPrefix) => {
    let qty = DEFAULT_QTY
    let termParts = [...args]

    // Verifica se o primeiro argumento é um número (quantidade)
    if (args.length > 0 && /^\d+$/.test(String(args[0]))) {
      qty = clampQty(args[0], DEFAULT_QTY)
      termParts = args.slice(1)
    }

    const term = termParts.join(' ').trim()
    
    if (!term) {
      return m.reply(`Por favor, digite o que deseja buscar. Ex: ${usedPrefix}gif 2 dança`)
    }

    await m.react('🔍').catch(() => {})
    
    try {
      // Busca a quantidade solicitada (mais uma margem de erro)
      const urls = await searchTenor(term, qty)
      
      if (!urls || urls.length === 0) {
        await m.react('❌').catch(() => {})
        return m.reply(`Não encontrei nenhum resultado para: "${term}"`)
      }

      await m.react('⏳').catch(() => {})
      
      let sent = 0
      for (let i = 0; i < Math.min(urls.length, qty); i++) {
        try {
          const mediaUrl = urls[i]
          const webpBuffer = await toStickerWebp(mediaUrl, {
            downloadTimeoutMs: 25000,
            timeoutMs: 25000,
            trimSeconds: 6,
            maxOutputBytes: 850 * 1024
          })

          const stickerPath = await writeExif(
            { mimetype: 'webp', data: webpBuffer },
            { packname: 'ZAERO GIF', author: 'Tenor Scraper', categories: [''] }
          )

          await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
          if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath)
          sent++
        } catch (err) {
          console.error(`[GIF] Erro ao enviar item ${i}:`, err.message)
        }
      }

      if (sent > 0) {
        await m.react('✅').catch(() => {})
      } else {
        m.reply('Falha ao converter os GIFs em figurinha.')
      }
      
    } catch (error) {
      console.error(`[GIF] Erro: ${error.message}`)
      await m.react('❌').catch(() => {})
      m.reply('Ocorreu um erro ao buscar o GIF.')
    }
  }
}
