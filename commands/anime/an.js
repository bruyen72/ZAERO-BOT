import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runFfmpeg } from '../../lib/system/ffmpeg.js'

export default {
  command: ['an', 'getanime', 'descargar'],
  category: 'anime',
  info: {
    desc: 'Busca e baixa um episódio de anime em SD (480p) otimizado para WhatsApp.'
  },
  run: async (client, m, args, usedPrefix) => {
    let text = args.join(" ")
    if (!text) return m.reply(`❌ Uso: *${usedPrefix}an nome do anime*`)

    await m.react("🕑")
    await m.reply(`🔍 Buscando e otimizando *${text}* no servidor SD...`)

    try {
      const base = "https://otariplay.web.id"
      const searchUrl = `${base}/?s=${encodeURIComponent(text)}`
      
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      })
      const html = await res.text()
      const $ = cheerio.load(html)

      let animePage = ""
      $(".archive-post a, .result-item a, a").each((_, el) => {
        const href = $(el).attr("href")
        if (href && href.includes("/watch/") && !animePage) {
          animePage = href.startsWith("http") ? href : base + href
        }
      })

      if (!animePage) throw "Nenhum resultado encontrado para esse nome."

      const res2 = await fetch(animePage, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      })
      const html2 = await res2.text()
      const $$ = cheerio.load(html2)

      let videoUrl = $$("video source").attr("src") || $$("video").attr("src") || $$("iframe").attr("src")
      if (!videoUrl) throw "Não foi possível extrair o link de vídeo direto."
      if (!videoUrl.startsWith("http")) videoUrl = base + videoUrl

      const id = Date.now()
      const outPath = path.join(os.tmpdir(), `anime_sd_${id}.mp4`)
      const headers = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nReferer: ${base}\r\n`

      console.log(`[AN-SD] Iniciando compressão SD para: ${videoUrl}`)

      // Lógica de compressão SD:
      // scale=640:-2 -> Reduz resolução para SD
      // preset ultrafast -> Menor uso de CPU possível
      // crf 28 -> Equilíbrio entre qualidade e peso
      await runFfmpeg([
        '-headers', headers,
        '-i', videoUrl,
        '-vf', 'scale=640:-2,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-maxrate', '600k',
        '-bufsize', '1200k',
        '-c:a', 'aac',
        '-b:a', '64k',
        '-ac', '1',
        '-movflags', '+faststart',
        outPath
      ], {
        timeoutMs: 600000, // 10 minutos
        queueWaitTimeoutMs: 120000
      })

      if (!fs.existsSync(outPath)) throw "Falha ao gerar arquivo de vídeo otimizado."

      const stats = fs.statSync(outPath)
      const fileSizeMB = stats.size / (1024 * 1024)

      await client.sendMessage(m.chat, {
        document: fs.readFileSync(outPath),
        mimetype: 'video/mp4',
        fileName: `${text.replace(/\s+/g, '_')}_SD.mp4`,
        caption: `✅ *ANIME:* ${text}\n⚖️ *TAMANHO:* ${fileSizeMB.toFixed(2)} MB\n📺 *QUALIDADE:* SD 480p\n🚀 *SERVIDOR:* Otariplay`
      }, { quoted: m })

      await m.react("✅")
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath)

    } catch (e) {
      console.error("ERROR AN-SD:", e)
      await m.react("❌")
      m.reply(`💥 Erro: ${e.message || e}`)
    }
  }
}
