import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import exif from '../../lib/exif.js'
import { runFfmpeg } from '../../lib/system/ffmpeg.js'
import { globalJobQueue } from '../../lib/jobQueue.js'
import { getMediaCache, setMediaCache } from '../../lib/cache.js'
import { fetchToFileLimited } from '../../lib/fetchFile.js'
import { sendStatus } from '../../lib/status.js'

/**
 * ZÆRØ BOT - Sticker Command Ultra Optimized (2026 Full-Fill Edition)
 * Estratégia: COVER (Crop) para preencher todo o 512x512 + Unsharp + Fila Global.
 */

const LIMIT_IMAGE_BYTES = 100 * 1024
const LIMIT_ANIM_BYTES = 500 * 1024
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
const FFMPEG_TIMEOUT_MS = 60000 

export default {
  command: ['sticker', 's'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const cleanupPaths = []
    const safeUnlink = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch {} }
    const safeCleanupAll = () => cleanupPaths.forEach(safeUnlink)

    try {
      ensureTmp()

      if (args[0] === '-list') return client.reply(m.chat, getHelpText(usedPrefix, command), m)

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''
      const isVideo = /video/i.test(mime)
      const user = global.db?.data?.users?.[m.sender] || {}
      const texto1 = user.metadatos || '✧ ZÆRØ BOT ✧'
      const author = user.metadatos2 || ''

      const parsed = parseArgs(args)
      const { urlArg, picked, marca, flags } = parsed
      const pack = marca[0] || texto1
      const packAuthor = marca.length > 1 ? marca[1] : author
      
      let profile = flags.hd ? 'hd' : (flags.lite ? 'lite' : 'auto')

      // Feedback imediato com posição na fila
      const pos = globalJobQueue.getPosition(m.sender)
      await sendStatus(client, m, pos > 1 ? 'queue' : 'processing', { pos })

      // --- CACHE CHECK ---
      const cacheKey = crypto.createHash('md5').update(urlArg || (quoted.id + profile + JSON.stringify(picked))).digest('hex')
      const cached = getMediaCache(cacheKey)
      if (cached) {
        await sendSticker(cached, pack, packAuthor, cleanupPaths, client, m)
        return safeCleanupAll()
      }

      // --- LOGICA DE PROCESSAMENTO ---
      const task = async () => {
        let inPath = ''
        if (urlArg) {
          inPath = tmp(`url-${Date.now()}.tmp`)
          cleanupPaths.push(inPath)
          const { contentType } = await fetchToFileLimited(urlArg, inPath)
          const isUrlVideo = contentType.includes('video') || /\.(mp4|webm|mov|mkv)/i.test(urlArg)
          return isUrlVideo ? await makeStickerFromVideo(inPath, 8, profile, cacheKey) : await makeStickerFromImage(inPath, profile, picked, cacheKey)
        } else if (/image|video|webp/i.test(mime)) {
          inPath = tmp(`msg-${Date.now()}${isVideo ? '.mp4' : '.png'}`)
          cleanupPaths.push(inPath)
          const buffer = await quoted.download()
          if (!buffer) throw new Error('Falha ao baixar mídia do WhatsApp.')
          fs.writeFileSync(inPath, buffer)
          return isVideo ? await makeStickerFromVideo(inPath, (quoted.msg || quoted).seconds || 0, profile, cacheKey) : await makeStickerFromImage(inPath, profile, picked, cacheKey)
        }
        throw new Error('Marque uma imagem/vídeo ou envie uma URL.')
      }

      const makeStickerFromVideo = async (inFile, seconds, profile, cacheKey) => {
        const outWebp = tmp(`anim-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)

        // TENTATIVAS INTELIGENTES: COVER (CROP) para preencher todo o 512x512
        // Otimizado para não estourar 500KB e manter o "Tela Cheia"
        const attempts = [
          { t: 7, fps: 12, q: 40 }, // T1: Equilíbrio
          { t: 5, fps: 10, q: 35 }, // T2: Mais curto
          { t: 4, fps: 10, q: 25 }  // T3: Limite extremo
        ]

        let success = false
        for (const att of attempts) {
          const vf = [
            `fps=${att.fps}`,
            `scale=512:512:force_original_aspect_ratio=increase:flags=lanczos`,
            `crop=512:512`,
            `unsharp=3:3:0.5:3:3:0.0`, // Nitidez leve
            `format=rgba`
          ].join(',')

          try {
            await runFfmpeg([
              '-y', '-t', String(att.t), '-i', inFile,
              '-vf', vf, '-an', '-vcodec', 'libwebp',
              '-loop', '0', '-preset', 'default',
              '-compression_level', '6', 
              '-q:v', String(att.q),
              '-threads', '1', // Estabilidade no Fly
              outWebp
            ], { timeoutMs: FFMPEG_TIMEOUT_MS })

            const finalSize = fs.statSync(outWebp).size
            if (finalSize <= LIMIT_ANIM_BYTES && finalSize > 0) {
              success = true
              console.log(`[Sticker Anim] Sucesso: ${att.t}s, Q:${att.q}, Tamanho: ${(finalSize/1024).toFixed(1)}KB`)
              break
            }
          } catch (err) { continue }
        }

        if (!success) throw new Error('Mídia muito pesada. Tente um vídeo mais curto ou menos complexo.')
        if (fs.existsSync(outWebp)) setMediaCache(cacheKey, outWebp)
        return outWebp
      }

      const makeStickerFromImage = async (inFile, profile, picked, cacheKey) => {
        const outWebp = tmp(`img-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)
        const q = profile === 'hd' ? 80 : 70 // Reduzido levemente para garantir fluidez
        const vf = buildVF(picked)

        await runFfmpeg([
          '-y', '-i', inFile, '-vf', vf, '-an', '-vcodec', 'libwebp',
          '-preset', 'picture', '-q:v', String(q), 
          '-threads', '1', outWebp
        ], { timeoutMs: FFMPEG_TIMEOUT_MS })

        const finalSize = fs.statSync(outWebp).size
        console.log(`[Sticker Estático] Sucesso: Q:${q}, Tamanho: ${(finalSize/1024).toFixed(1)}KB`)

        if (fs.existsSync(outWebp)) setMediaCache(cacheKey, outWebp)
        return outWebp
      }

      const finalPath = await globalJobQueue.enqueue(task, { 
        priority: isVideo ? 2 : 1, 
        label: `sticker-${profile}`,
        userId: m.sender 
      })
      
      await sendSticker(finalPath, pack, packAuthor, cleanupPaths, client, m)
      return safeCleanupAll()

    } catch (e) {
      safeCleanupAll()
      console.error('[Sticker Error]', e)
      return m.reply(`> ❌ *Erro:* ${e.message}`)
    }
  }
}

async function sendSticker(webpPath, pack, author, cleanupPaths, client, m) {
  const data = fs.readFileSync(webpPath)
  const stickerPath = await exif.writeExif({ mimetype: 'webp', data }, { packname: pack, author })
  cleanupPaths.push(stickerPath)
  await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
}

const tmp = (name) => path.join('./tmp', name)
const ensureTmp = () => { 
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true }) 
  if (!fs.existsSync('./tmp/media_cache')) fs.mkdirSync('./tmp/media_cache', { recursive: true })
}

function parseArgs(args) {
  const isUrl = (text) => /https?:\/\/[^\s]+/i.test(text)
  return {
    urlArg: args.find(isUrl),
    flags: { hd: args.includes('-hd'), lite: args.includes('-lite') },
    marca: args.filter(a => !a.startsWith('-') && !isUrl(a)).join(' ').split(/[•|]/).map(s => s.trim()).filter(Boolean),
    picked: []
  }
}

function buildVF(picked) {
  return 'scale=512:512:force_original_aspect_ratio=increase:flags=lanczos,crop=512:512,unsharp=3:3:0.6:3:3:0.0,format=rgba'
}

function getHelpText(usedPrefix, command) {
  return `╔═══『 ✧ STICKER PRO ✧ 』═══╗
║
║ ✨ *$prefixsticker* <mídia|url>
║
╠══ 🛠️ OPÇÕES ══
║
║ 🚀 *Padrão*: Tela Cheia (COVER)
║ 💎 *-hd*: Alta qualidade
║ 🍃 *-lite*: Mais rápido
║
╚═══『 ⭐ 2026 EDITION ⭐ 』═══╝`.replace(/\$prefix/g, usedPrefix)
}
