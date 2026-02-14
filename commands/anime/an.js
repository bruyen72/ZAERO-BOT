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
    desc: 'Busca e baixa um episódio de anime em SD (480p) otimizado.'
  },
  run: async (client, m, args, usedPrefix) => {
    let text = args.join(" ").trim()
    if (!text) return m.reply(`❌ Uso: *${usedPrefix}an nome do anime*`)

    await m.react("🕑")
    await m.reply(`🔍 Buscando e otimizando *${text}* no servidor SD...`)

    try {
      const base = "https://otariplay.web.id"
      const searchUrl = `${base}/?s=${encodeURIComponent(text)}`
      
      const res = await fetch(searchUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
      })
      const html = await res.text()
      const $ = cheerio.load(html)

      let animePage = ""
      
      // Seletores mais amplos para encontrar o post do anime
      // Procura em artigos, títulos e links comuns
      $("article a, .post-title a, .entry-title a, .archive-post a, a").each((_, el) => {
        const href = $(el).attr("href")
        const title = $(el).text().toLowerCase()
        
        if (href && !animePage) {
          // Prioriza links que contenham o nome do anime ou termos de assistir
          if (href.includes("/watch/") || href.includes("/anime/") || title.includes(text.toLowerCase())) {
             if (href.startsWith("http")) {
               animePage = href
             } else {
               animePage = base + (href.startsWith("/") ? href : "/" + href)
             }
          }
        }
      })

      if (!animePage) throw "Não encontrei nenhum anime com esse nome no Otariplay."

      console.log(`[AN-SD] Página encontrada: ${animePage}`)

      const res2 = await fetch(animePage, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      })
      const html2 = await res2.text()
      const $$ = cheerio.load(html2)

      // Tenta encontrar o vídeo em várias tags diferentes
      let videoUrl = $$("video source").attr("src") || 
                     $$("video").attr("src") || 
                     $$("iframe[src*='google']").attr("src") || 
                     $$("iframe").attr("src")

      if (!videoUrl) throw "Não foi possível encontrar o link do vídeo dentro da página."
      
      // Se for um iframe, tentamos pegar a URL real (lógica básica)
      if (videoUrl.includes("drive.google.com") || videoUrl.includes("file")) {
         // Se for link externo, mantemos
      } else if (!videoUrl.startsWith("http")) {
         videoUrl = base + (videoUrl.startsWith("/") ? videoUrl : "/" + videoUrl)
      }

      const id = Date.now()
      const outPath = path.join(os.tmpdir(), `anime_sd_${id}.mp4`)
      const headers = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nReferer: ${base}\r\n`

      await m.reply(`📥 Iniciando compressão SD... isso pode demorar dependendo da duração do anime.`)

      await runFfmpeg([
        '-headers', headers,
        '-i', videoUrl,
        '-vf', 'scale=640:-2,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '30', // Um pouco mais de compressão para garantir velocidade
        '-maxrate', '500k',
        '-bufsize', '1000k',
        '-c:a', 'aac',
        '-b:a', '64k',
        '-ac', '1',
        '-movflags', '+faststart',
        outPath
      ], {
        timeoutMs: 900000, // 15 minutos para animes muito grandes
        queueWaitTimeoutMs: 180000
      })

      if (!fs.existsSync(outPath)) throw "O FFmpeg falhou ao processar o vídeo."

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
      m.reply(`💥 Erro: ${typeof e === 'string' ? e : e.message}`)
    }
  }
}
