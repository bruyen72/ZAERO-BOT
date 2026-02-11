import fetch from "node-fetch"
import cheerio from "cheerio"
import { getBuffer } from "../../lib/message.js"

export default {
  command: ["xvideos"],
  run: async (client, m, args, usedPrefix, command) => {
    if (!db.data.chats[m.chat].nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`)
    try {
      const query = args.join(" ")
      if (!query) return m.reply("《✧》 Por favor insira o título ou URL do vídeo XVIDEOS.")
      const isUrl = query.includes("xvideos.com")
      if (isUrl) {
        const res = await xvideosdl(query)
        const { duration, views, likes, deslikes } = res.result
        const dll = res.result.url
        const thumbBuffer = await getBuffer(res.result.thumb)
        const videoBuffer = await getBuffer(dll)
        let mensaje = { document: videoBuffer, mimetype: "video/mp4", fileName: `${res.result.title}.mp4`, caption: `乂 XVIDEOS - DOWNLOAD! 乂

≡ Título: ${res.result.title}
≡ Duração : ${duration || "Desconocida"}
≡ Likes : ${likes || "Desconhecidos"}
≡ Des-Likes : ${deslikes || "Desconhecidos"}
≡ Visualizações: ${views || "Desconocidas"}` }
        await client.sendMessage(m.chat, mensaje, { quoted: m })
        return
      }
      const res = await search(encodeURIComponent(query))
      if (!res.length) return m.reply("《✧》 Nenhum resultado encontrado.")
      const list = res.slice(0, 10).map((v, i) => `${i + 1}\n≡ Título : ${v.title}\n≡ Link : ${v.url}`).join("\n\n")
      const caption = `乂XVÍDEOS - PESQUISA! 乂\n\n${list}\n\n> » Use diretamente a URL de um dos vídeos para baixá-lo.`
      await client.sendMessage(m.chat, { text: caption }, { quoted: m })
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}

async function search(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`
      const res = await fetch(url)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results = []
      $("div.mozaique > div").each((index, element) => {
        const title = $(element).find("p.title a").attr("title")
        const videoUrl = "https://www.xvideos.com" + $(element).find("p.title a").attr("href")
        const quality = $(element).find("span.video-hd-mark").text().trim()
        if (title && videoUrl) results.push({ title, url: videoUrl, quality })
      })
      resolve(results)
    } catch (error) {
      reject(error)
    }
  })
}

async function xvideosdl(url) {
  return new Promise((resolve, reject) => {
    fetch(url, { method: "get" }).then(res => res.text()).then(res => {
        const $ = cheerio.load(res, { xmlMode: false })
        const title = $("meta[property='og:title']").attr("content")
        const duration = (() => { 
          const s = parseInt($('meta[property="og:duration"]').attr("content"), 10) || 0
          return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s` 
               : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` 
               : `${s}s` 
        })()
        const views = $("span.nb_views").text().trim() || $("strong.mobile-hide").text().trim()
        const likes = $("span.rating-good-nbr").text().trim()
        const deslikes = $("span.rating-bad-nbr").text().trim()
        const thumb = $("meta[property='og:image']").attr("content")
        const videoUrl = $("#html5video > #html5video_base > div > a").attr("href")
        resolve({ status: 200, result: { title, duration, url: videoUrl, views, likes, deslikes, thumb }})
      }).catch(err => reject(err))
  })
}