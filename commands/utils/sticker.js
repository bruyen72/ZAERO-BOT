import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { pipeline } from 'stream/promises'
import exif from '../../lib/exif.js'
import { runFfmpeg } from '../../lib/system/ffmpeg.js'

// Configuracoes tecnicas
const LIMIT_IMAGE_BYTES = 100 * 1024
const LIMIT_ANIM_BYTES = 500 * 1024
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024
const FETCH_TIMEOUT_MS = 30000
const FFMPEG_TIMEOUT_MS = 90000
const MAX_VIDEO_SECONDS_HD = 8
const MAX_VIDEO_SECONDS_LITE = 6

const MSG = {
  heavy: "❌ Excede o limite.\n🩸 Reduza para 6–8s.",
  timeout: "⏱️ Núcleo sem energia.\n🔥 Envie menor.",
  waitingUrl: "⚡ 𝙕Æ𝙍Ø está despertando...\n⏳ Preparando mídia...",
  invalidInput: (prefix, command) =>
    `Responda uma imagem/video ou envie uma URL.\nUse *${prefix + command} -list* para ver opcoes.`
}

export default {
  command: ['sticker', 's'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const cleanupPaths = []
    const safeUnlink = (p) => {
      try {
        if (p && fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    }
    const safeCleanupAll = () => cleanupPaths.forEach(safeUnlink)

    try {
      ensureTmp()

      if (args[0] === '-list' || args[0] === '-menu') {
        return client.reply(m.chat, getHelpText(usedPrefix), m)
      }

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''

      const fileSize = (quoted.msg || quoted).fileLength || 0
      if (fileSize > MAX_DOWNLOAD_BYTES) {
        return m.reply(MSG.heavy)
      }

      const user = global.db?.data?.users?.[m.sender] || {}
      const packDefault = user.metadatos || 'ZAERO BOT'
      const authorDefault = user.metadatos2 || ''

      const { urlArg, picked, marca, flags } = parseArgs(args)
      const pack = marca[0] || packDefault
      const author = marca.length > 1 ? marca[1] : authorDefault
      const mode = flags.hd ? 'hd' : 'lite'

      async function replyProcessing(text = '') {
        await m.react('\u23F3').catch(() => {})
        if (text) {
          await client.reply(m.chat, text, m).catch(() => {})
        }
      }

      const sendSuccess = async () => {
        await m.react('\u2705').catch(() => {})
      }

      const fetchToFileLimited = async (url, outFile) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (StickerBot/2026)' }
          })

          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          const contentType = (res.headers.get('content-type') || '').toLowerCase()
          const contentLength = Number(res.headers.get('content-length') || '0')
          if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error('Arquivo muito pesado')

          let downloadedBytes = 0
          const progressTracker = new (await import('stream')).Transform({
            transform(chunk, encoding, callback) {
              downloadedBytes += chunk.length
              if (downloadedBytes > MAX_DOWNLOAD_BYTES) {
                controller.abort()
                return callback(new Error('Download ultrapassou o limite de 12MB'))
              }
              callback(null, chunk)
            }
          })

          await pipeline(res.body, progressTracker, fs.createWriteStream(outFile))
          return { file: outFile, contentType }
        } finally {
          clearTimeout(timeout)
        }
      }

      const makeStickerFromVideoFile = async (inFile, seconds) => {
        const targetDur = mode === 'hd' ? MAX_VIDEO_SECONDS_HD : MAX_VIDEO_SECONDS_LITE
        const finalDur = Math.min(Number(seconds || targetDur) || targetDur, targetDur)
        const outWebp = tmp(`anim-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)

        // Presets lineares otimizados (Substitui os 3 loops aninhados que travavam o bot)
        const presets = mode === 'hd' 
          ? [
              { fps: 18, scale: 512, q: 55, compression: 4 },
              { fps: 15, scale: 512, q: 45, compression: 4 },
              { fps: 12, scale: 448, q: 40, compression: 3 },
              { fps: 10, scale: 384, q: 35, compression: 2 }
            ]
          : [
              { fps: 15, scale: 512, q: 45, compression: 4 },
              { fps: 12, scale: 448, q: 38, compression: 4 },
              { fps: 10, scale: 384, q: 30, compression: 3 },
              { fps: 8, scale: 320, q: 25, compression: 2 }
            ]

        let success = false
        for (let i = 0; i < presets.length; i++) {
          const p = presets[i]
          const vf = [
            `fps=${p.fps}`,
            `scale=${p.scale}:${p.scale}:force_original_aspect_ratio=decrease:flags=lanczos`,
            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
            'format=rgba'
          ].join(',')

          console.log(`[STICKER] Tentativa ${i + 1}/${presets.length} (${mode}) fps=${p.fps} scale=${p.scale} c=${p.compression}`)

          try {
            await runFfmpeg(
              [
                '-y', '-t', String(finalDur), '-i', inFile,
                '-vf', vf, '-an', '-vsync', '0', '-vcodec', 'libwebp',
                '-loop', '0', '-preset', 'default',
                '-compression_level', String(p.compression), '-q:v', String(p.q),
                outWebp
              ],
              { 
                timeoutMs: FFMPEG_TIMEOUT_MS,
                queueWaitTimeoutMs: 60000
              }
            )

            const size = fs.statSync(outWebp).size
            if (size <= LIMIT_ANIM_BYTES) {
              success = true
              break
            }
          } catch (err) {
            console.warn(`[STICKER] Falha na tentativa ${i + 1}: ${err.message}`)
            if (err.code === 'FFMPEG_TIMEOUT' || err.code === 'FFMPEG_QUEUE_FULL') throw err
            continue
          }
        }

        if (!success && fs.existsSync(outWebp)) {
          const size = fs.statSync(outWebp).size
          if (size > LIMIT_ANIM_BYTES + (100 * 1024)) {
            throw new Error(MSG.heavy)
          }
        }

        await sendSticker(outWebp, pack, author, cleanupPaths, client, m)
        await sendSuccess()
      }

      const makeStickerFromImageFile = async (inFile) => {
        const outWebp = tmp(`img-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)
        const vf = buildVF(picked)

        const qTries = mode === 'hd' ? [80, 65, 50] : [70, 55, 40]
        for (const q of qTries) {
          try {
            await runFfmpeg(
              [
                '-y', '-i', inFile, '-vf', vf, '-an', '-vcodec', 'libwebp',
                '-preset', 'picture', '-compression_level', '4', '-q:v', String(q),
                outWebp
              ],
              { timeoutMs: FFMPEG_TIMEOUT_MS }
            )

            if (fs.statSync(outWebp).size <= LIMIT_IMAGE_BYTES) break
          } catch (err) {
            console.warn(`[STICKER-IMG] Falha q=${q}: ${err.message}`)
            continue
          }
        }

        await sendSticker(outWebp, pack, author, cleanupPaths, client, m)
        await sendSuccess()
      }

      if (/image|video|webp/i.test(mime)) {
        await replyProcessing()
        const isVideo = /video/i.test(mime)
        const ext = isVideo ? '.mp4' : '.png'
        const inPath = tmp(`msg-${Date.now()}${ext}`)
        cleanupPaths.push(inPath)

        const buffer = await quoted.download()
        if (!buffer) throw new Error('Falha ao baixar midia do WhatsApp')
        fs.writeFileSync(inPath, buffer)

        if (isVideo) {
          const secs = (quoted.msg || quoted).seconds || 0
          await makeStickerFromVideoFile(inPath, secs)
        } else {
          await makeStickerFromImageFile(inPath)
        }

        return safeCleanupAll()
      }

      if (urlArg) {
        await replyProcessing(MSG.waitingUrl)
        const inPath = tmp(`url-${Date.now()}.tmp`)
        cleanupPaths.push(inPath)

        const { contentType } = await fetchToFileLimited(urlArg, inPath)
        const isVideo = contentType.includes('video') || /\.(mp4|webm|mov|mkv)/i.test(urlArg)

        if (isVideo) {
          await makeStickerFromVideoFile(inPath, MAX_VIDEO_SECONDS_HD)
        } else {
          await makeStickerFromImageFile(inPath)
        }

        return safeCleanupAll()
      }

      return client.reply(m.chat, MSG.invalidInput(usedPrefix, command), m)
    } catch (e) {
      safeCleanupAll()
      console.error('[Sticker Error]', e)

      if (e.code === 'FFMPEG_TIMEOUT') {
        return m.reply(MSG.timeout)
      }

      return m.reply(`Erro: ${e.message}`)
    }
  }
}

async function sendSticker(webpPath, pack, author, cleanupPaths, client, m) {
  const data = fs.readFileSync(webpPath)
  const metadata = { packname: pack, author, categories: [''] }
  const stickerPath = await writeExif({ mimetype: 'webp', data }, metadata)
  cleanupPaths.push(stickerPath)
  await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
}

function getHelpText(usedPrefix) {
  return [
    '*MENU STICKER*',
    '',
    `${usedPrefix}s`,
    `${usedPrefix}s -lite`,
    `${usedPrefix}s -hd`,
    `${usedPrefix}s url`,
    `${usedPrefix}s Nome do pack | Autor`,
    '',
    '*Formas:* -c -r -v -t -s -d',
    '*Efeitos:* -blur -sepia -grayscale -invert -flip -flop -rotate90',
    '',
    'Dica: responda uma imagem ou video para criar sticker.'
  ].join('\n')
}

const { writeExif } = exif
const tmp = (name) => path.join('./tmp', name)
const ensureTmp = () => {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
}
const isUrl = (text) => /https?:\/\/[^\s]+/i.test(text)

function parseArgs(args) {
  let urlArg = null
  const rest = []
  const flags = { hd: args.includes('-hd'), lite: !args.includes('-hd') }

  for (const a of args) {
    if (!urlArg && isUrl(a)) urlArg = a
    else if (!['-hd', '-lite'].includes(a)) rest.push(a)
  }

  const shapeArgs = {
    '-c': 'circle',
    '-t': 'triangle',
    '-s': 'star',
    '-r': 'roundrect',
    '-v': 'heart',
    '-d': 'diamond'
  }
  const effectArgs = {
    '-blur': 'blur',
    '-sepia': 'sepia',
    '-grayscale': 'grayscale',
    '-invert': 'invert',
    '-flip': 'flip',
    '-flop': 'flop',
    '-rotate90': 'rotate90'
  }

  const picked = []
  for (const a of rest) {
    if (shapeArgs[a]) picked.push({ type: 'shape', value: shapeArgs[a] })
    if (effectArgs[a]) picked.push({ type: 'effect', value: effectArgs[a] })
  }

  const filteredText = rest.filter((a) => !shapeArgs[a] && !effectArgs[a]).join(' ').trim()
  const marca = filteredText.split(/[•|]/).map((s) => s.trim()).filter(Boolean)

  return { urlArg, picked, marca, flags }
}

function buildVF(picked) {
  const shape = picked.find((x) => x.type === 'shape')?.value
  const effects = picked.filter((x) => x.type === 'effect').map((x) => x.value)
  const vf = [
    'scale=512:512:force_original_aspect_ratio=decrease',
    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
    'format=rgba'
  ]

  if (shape === 'circle') {
    vf.push("geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-256,Y-256),250),255,0)'")
  }
  if (shape === 'heart') {
    vf.push("geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow(pow((X-256)/170,2)+pow((Y-256)/170,2)-1,3)-pow((X-256)/170,2)*pow((Y-256)/170,3),0),255,0)'")
  }

  for (const e of effects) {
    if (e === 'blur') vf.push('gblur=sigma=5')
    if (e === 'sepia') vf.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131')
    if (e === 'grayscale') vf.push('hue=s=0')
    if (e === 'invert') vf.push('negate')
  }
  return vf.join(',')
}
