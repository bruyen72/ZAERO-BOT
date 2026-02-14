import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { pipeline } from 'stream/promises'
import exif from '../../lib/exif.js'
import { runFfmpeg } from '../../lib/system/ffmpeg.js'

/**
 * ZÆRØ BOT - Sticker Command Professional (2026 Edition)
 * Optimized for Fly.io (Low RAM) and high stability.
 */

// --- CONFIGURAÇÕES TÉCNICAS PROFISSIONAIS ---
const LIMIT_IMAGE_BYTES = 100 * 1024          // 100KB (WhatsApp Standard)
const LIMIT_ANIM_BYTES = 500 * 1024           // 500KB (WhatsApp Standard)
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024    // 12MB (Strict Limit)
const FETCH_TIMEOUT_MS = 30000                // 30s
const FFMPEG_TIMEOUT_MS = 90000               // 90s
const MAX_VIDEO_SECONDS_HD = 8                // Reduzido para 8s conforme pedido
const MAX_VIDEO_SECONDS_LITE = 6              // Reduzido para 6s conforme pedido

const DARK_MSG = {
  heavy: "❌ *Excede o limite.*\n🩸 Reduza para 6–8s.",
  success: "🔥 *Poder materializado.*"
};

export default {
  command: ['sticker', 's'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const cleanupPaths = []
    const safeUnlink = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch {} }
    const safeCleanupAll = () => cleanupPaths.forEach(safeUnlink)

    try {
      ensureTmp()

      if (args[0] === '-list') {
        return client.reply(m.chat, getHelpText(usedPrefix, command), m)
      }

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''
      
      // Validação Estrita de Tamanho (ZÆRØ DARK)
      const fileSize = (quoted.msg || quoted).fileLength || 0
      if (fileSize > MAX_DOWNLOAD_BYTES) {
        return m.reply(DARK_MSG.heavy)
      }

      const user = global.db?.data?.users?.[m.sender] || {}
      const texto1 = user.metadatos || '✧ ZÆRØ BOT ✧'
      const texto2 = user.metadatos2 || ''

      const parsed = parseArgs(args)
      const { urlArg, picked, marca, flags } = parsed
      const pack = marca[0] || texto1
      const author = marca.length > 1 ? marca[1] : texto2
      const mode = flags.hd ? 'hd' : 'lite'

      // Mensagem de sucesso ao final (opcional, conforme pedido)
      const sendSuccess = async () => {
         // await client.sendMessage(m.chat, { text: DARK_MSG.success }, { quoted: m }).catch(() => {})
         await m.react('🔥').catch(() => {})
      }

      // --- A) DOWNLOAD POR STREAMING (Anti-OOM) ---
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
          // Pipeline com verificação manual de tamanho para segurança extra
          const progressTracker = new (await import('stream')).Transform({
            transform(chunk, encoding, callback) {
              downloadedBytes += chunk.length
              if (downloadedBytes > MAX_DOWNLOAD_BYTES) {
                controller.abort()
                return callback(new Error('Download ultrapassou limite de 25MB'))
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

      // --- B) PROCESSAMENTO DE VÍDEO (Iterativo p/ Caber em 500KB) ---
      const makeStickerFromVideoFile = async (inFile, seconds) => {
        const targetDur = mode === 'hd' ? MAX_VIDEO_SECONDS_HD : MAX_VIDEO_SECONDS_LITE
        const finalDur = Math.min(Number(seconds || targetDur) || targetDur, targetDur)
        const outWebp = tmp(`anim-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)

        // Configurações de tentativa (Loop Profissional)
        const fpsTries = mode === 'hd' ? [20, 18, 15] : [15, 12, 10]
        const qTries = mode === 'hd' ? [60, 52, 46, 40] : [42, 36, 30, 26]
        const scales = [512, 384] // Fallback de escala se q falhar

        let success = false
        for (const scale of scales) {
          for (const fps of fpsTries) {
            for (const q of qTries) {
              const vf = [
                `fps=${fps}`,
                `scale=${scale}:${scale}:force_original_aspect_ratio=decrease`,
                `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
                `format=rgba`
              ].join(',')

              try {
                await runFfmpeg([
                  '-y', '-t', String(finalDur), '-i', inFile,
                  '-vf', vf, '-an', '-vsync', '0', '-vcodec', 'libwebp',
                  '-loop', '0', '-preset', 'default',
                  '-compression_level', '6', '-q:v', String(q),
                  outWebp
                ], { timeoutMs: FFMPEG_TIMEOUT_MS })

                const size = fs.statSync(outWebp).size
                if (size <= LIMIT_ANIM_BYTES) {
                  success = true
                  break
                }
              } catch (err) {
                if (err.code === 'FFMPEG_TIMEOUT') throw err
                continue // tenta proximo q
              }
            }
            if (success) break
          }
          if (success) break
        }

        if (!success && fs.existsSync(outWebp)) {
           // Se apos todas as tentativas ainda for maior, mas existir, envia o menor gerado (ou erro)
           if (fs.statSync(outWebp).size > LIMIT_ANIM_BYTES + (50 * 1024)) {
             throw new Error(DARK_MSG.heavy)
           }
        }

        await sendSticker(outWebp, pack, author, cleanupPaths, client, m)
        await sendSuccess()
        return
      }

      // --- C) PROCESSAMENTO DE IMAGEM (Até 100KB) ---
      const makeStickerFromImageFile = async (inFile) => {
        const outWebp = tmp(`img-${Date.now()}.webp`)
        cleanupPaths.push(outWebp)
        const vf = buildVF(picked)

        const qTries = mode === 'hd' ? [80, 70, 60] : [70, 60, 50, 40]
        
        let success = false
        for (const q of qTries) {
          await runFfmpeg([
            '-y', '-i', inFile, '-vf', vf, '-an', '-vcodec', 'libwebp',
            '-preset', 'picture', '-compression_level', '6', '-q:v', String(q),
            outWebp
          ], { timeoutMs: FFMPEG_TIMEOUT_MS })

          if (fs.statSync(outWebp).size <= LIMIT_IMAGE_BYTES) {
            success = true
            break
          }
        }

        await sendSticker(outWebp, pack, author, cleanupPaths, client, m)
        await sendSuccess()
        return
      }

      // --- LOGICA PRINCIPAL DE EXECUÇÃO ---

      // 1) Midia enviada diretamente (WhatsApp)
      if (/image|video|webp/i.test(mime)) {
        await replyProcessing()
        const isVideo = /video/i.test(mime)
        const ext = isVideo ? '.mp4' : '.png'
        const inPath = tmp(`msg-${Date.now()}${ext}`)
        cleanupPaths.push(inPath)

        // Usamos streaming do quoted.download se possivel, ou salvamos buffer
        const buffer = await quoted.download()
        if (!buffer) throw new Error('Falha ao baixar mídia do WhatsApp')
        fs.writeFileSync(inPath, buffer)

        if (isVideo) {
          const secs = (quoted.msg || quoted).seconds || 0
          await makeStickerFromVideoFile(inPath, secs)
        } else {
          await makeStickerFromImageFile(inPath)
        }
        return safeCleanupAll()
      }

      // 2) URL
      if (urlArg) {
        await replyProcessing('《✧》 Baixando e processando mídia da URL...')
        const inPath = tmp(`url-${Date.now()}.tmp`)
        cleanupPaths.push(inPath)
        
        const { contentType } = await fetchToFileLimited(urlArg, inPath)
        const isVideo = contentType.includes('video') || /\.(mp4|webm|mov|mkv)/i.test(urlArg)
        
        if (isVideo) {
          await makeStickerFromVideoFile(inPath, MAX_VIDEO_SECONDS_HD)
        } else {
          await makeStickerFromImageFile(inPath)
        }
        await sendSuccess()
        return safeCleanupAll()
      }

      return client.reply(m.chat, `《✧》 Marque uma imagem/vídeo ou envie uma URL.\nUse *${usedPrefix + command} -list* para opções.`, m)

    } catch (e) {
      safeCleanupAll()
      console.error('[Sticker Error]', e)
      
      if (e.code === 'FFMPEG_TIMEOUT') {
        return m.reply('❌ *Erro de Timeout:* O vídeo é muito pesado para processar em 2026.\n\n*Dicas:*\n- Use um vídeo de no máximo 8 segundos\n- Adicione a flag *-lite*\n- Reduza a resolução do vídeo original')
      }

      return m.reply(`> ❌ *Erro:* ${e.message}`)
    }
  }
}

// --- HELPERS ---

async function sendSticker(webpPath, pack, author, cleanupPaths, client, m) {
  const data = fs.readFileSync(webpPath)
  const metadata = { packname: pack, author, categories: [''] }
  const stickerPath = await writeExif({ mimetype: 'webp', data }, metadata)
  cleanupPaths.push(stickerPath)
  await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
}

function getHelpText(usedPrefix, command) {
  return `╔═══『 ✧ STICKER PRO ✧ 』═══╗
║
║ ✨ *$prefixsticker* <mídia|url>
║
╠══ 🛠️ OPÇÕES ══
║
║ 🚀 *-lite* (Padrão: Máxima estabilidade)
║ 💎 *-hd* (Alta qualidade, pode falhar)
║ 📦 *Pack • Autor* (Separado por •)
║
╠══ 🎨 FORMAS ══
║
║ -c (Círculo), -r (Arredondado), -v (Coração)
║ -t (Triângulo), -s (Estrela), -d (Diamante)
║
╠══ 🎭 EFEITOS ══
║
║ -blur, -sepia, -grayscale, -invert
║ -flip, -flop, -rotate90
║
╚═══『 ⭐ 2026 EDITION ⭐ 』═══╝`.replace(/\$prefix/g, usedPrefix)
}

const { writeExif } = exif
const tmp = (name) => path.join('./tmp', name)
const ensureTmp = () => { if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true }) }
const isUrl = (text) => /https?:\/\/[^\s]+/i.test(text)

function parseArgs(args) {
  let urlArg = null
  const rest = []
  const flags = { hd: args.includes('-hd'), lite: !args.includes('-hd') }

  for (const a of args) {
    if (!urlArg && isUrl(a)) urlArg = a
    else if (!['-hd', '-lite'].includes(a)) rest.push(a)
  }

  const shapeArgs = { '-c': 'circle', '-t': 'triangle', '-s': 'star', '-r': 'roundrect', '-v': 'heart', '-d': 'diamond' }
  const effectArgs = { '-blur': 'blur', '-sepia': 'sepia', '-grayscale': 'grayscale', '-invert': 'invert', '-flip': 'flip', '-flop': 'flop', '-rotate90': 'rotate90' }

  const picked = []
  for (const a of rest) {
    if (shapeArgs[a]) picked.push({ type: 'shape', value: shapeArgs[a] })
    if (effectArgs[a]) picked.push({ type: 'effect', value: effectArgs[a] })
  }

  const filteredText = rest.filter(a => !shapeArgs[a] && !effectArgs[a]).join(' ').trim()
  const marca = filteredText.split(/[•|]/).map(s => s.trim()).filter(Boolean)

  return { urlArg, picked, marca, flags }
}

function buildVF(picked) {
  const shape = picked.find(x => x.type === 'shape')?.value
  const effects = picked.filter(x => x.type === 'effect').map(x => x.value)
  let vf = ['scale=512:512:force_original_aspect_ratio=decrease', 'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000', 'format=rgba']

  if (shape === 'circle') vf.push('geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'if(lte(hypot(X-256,Y-256),250),255,0)\'')
  if (shape === 'heart') vf.push('geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'if(lte(pow(pow((X-256)/170,2)+pow((Y-256)/170,2)-1,3)-pow((X-256)/170,2)*pow((Y-256)/170,3),0),255,0)\'')
  
  for (const e of effects) {
    if (e === 'blur') vf.push('gblur=sigma=5')
    if (e === 'sepia') vf.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131')
    if (e === 'grayscale') vf.push('hue=s=0')
    if (e === 'invert') vf.push('negate')
  }
  return vf.join(',')
}
