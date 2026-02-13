import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import exif from '../../lib/exif.js'
import { runFfmpeg } from '../../lib/system/ffmpeg.js'

export default {
  command: ['sticker', 's'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const cleanupPaths = []
    const safeUnlink = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch {} }
    const safeCleanupAll = () => cleanupPaths.forEach(safeUnlink)

    try {
      ensureTmp()

      // Ajuda/lista
      if (args[0] === '-list') {
        const helpText =
          `ꕥ Lista de formas e efeitos disponíveis para *imagem*:\n\n` +
          `✦ *Formas:*\n` +
          `- -c: Circular\n` +
          `- -t: Triangular\n` +
          `- -s: Estrela\n` +
          `- -r: Cantos arredondados\n` +
          `- -h: Hexágono\n` +
          `- -d: Diamante\n` +
          `- -f: Moldura\n` +
          `- -b: Borda\n` +
          `- -w: Onda\n` +
          `- -m: Espelho\n` +
          `- -o: Octógono\n` +
          `- -y: Pentágono\n` +
          `- -e: Elipse\n` +
          `- -z: Cruz\n` +
          `- -v: Coração\n` +
          `- -x: Capa (cover)\n` +
          `- -i: Contenha (contain)\n\n` +
          `✧ *Efeitos:*\n` +
          `- -blur: Desfoque\n` +
          `- -sepia: Sépia\n` +
          `- -sharpen: Nitidez\n` +
          `- -brighten: Mais brilho\n` +
          `- -dark: Menos brilho\n` +
          `- -invert: Inverter cores\n` +
          `- -grayscale: Preto e branco\n` +
          `- -rotate90: Girar 90°\n` +
          `- -rotate180: Girar 180°\n` +
          `- -flip: Espelhar horizontal\n` +
          `- -flop: Espelhar vertical\n` +
          `- -normalize: Normalizar\n` +
          `- -negate: Negar\n` +
          `- -tint: Tonalidade (vermelho padrão)\n\n` +
          `✧ *Qualidade 2026:*\n` +
          `- -lite: sempre tenta ficar leve (menos falhas)\n` +
          `- -hd: tenta manter mais qualidade (pode pesar)\n\n` +
          `> Exemplo: *${usedPrefix + command} -c -blur -lite Pack • Autor*`
        return client.reply(m.chat, helpText, m)
      }

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''

      // Metadados padrão
      const user = global.db?.data?.users?.[m.sender] || {}
      const texto1 = user.metadatos || '✧ ZÆRØ BOT ✧'
      const texto2 = user.metadatos2 || ''

      // Parse args
      const parsed = parseArgs(args)
      const urlArg = parsed.urlArg
      const picked = parsed.picked
      const marca = parsed.marca
      const flags = parsed.flags

      const pack = marca[0] || texto1
      const author = marca.length > 1 ? marca[1] : texto2

      // Limites “profissionais”
      const LIMIT_IMAGE_BYTES = 100 * 1024          // ~100KB (sticker estatico)
      const LIMIT_ANIM_BYTES = 500 * 1024           // ~500KB (sticker animado)
      const MAX_VIDEO_SECONDS = 10                  // pratico p/ sticker animado
      const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024    // 8MB protecao (reduzido)
      const FETCH_TIMEOUT_MS = 25_000               // 25s
      const FFMPEG_TIMEOUT_MS = 60_000              // 60s timeout FFmpeg (reduzido de 120s)

      // Qualidade: lite / hd
      const mode = flags.hd ? 'hd' : 'lite' // default lite
      // Lite = menos falha/mais compatível, HD = melhor qualidade porém pode ficar grande

      const replyProcessing = async (text = '《✧》 Processando figurinha...') => {
        try { await client.reply(m.chat, text, m) } catch {}
      }

      // Funções de IO seguras
      const saveBufferToTmp = (buffer, ext) => {
        const file = tmp(`in-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`)
        fs.writeFileSync(file, buffer)
        cleanupPaths.push(file)
        return file
      }

      const fetchToBufferLimited = async (url) => {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            // ajuda a evitar alguns bloqueios
            'User-Agent': 'Mozilla/5.0 (StickerBot)',
            'Accept': '*/*'
          }
        }).finally(() => clearTimeout(t))

        if (!res.ok) throw new Error(`Falha ao baixar URL (HTTP ${res.status})`)

        const ct = (res.headers.get('content-type') || '').toLowerCase()
        const len = Number(res.headers.get('content-length') || '0')
        if (len && len > MAX_DOWNLOAD_BYTES) throw new Error('Arquivo muito grande (limite de download excedido)')

        const ab = await res.arrayBuffer()
        const buffer = Buffer.from(ab)
        if (buffer.length > MAX_DOWNLOAD_BYTES) throw new Error('Arquivo muito grande (limite de download excedido)')

        return { buffer, contentType: ct }
      }

      const guessKindFromContentTypeOrUrl = (contentType, url) => {
        const ct = (contentType || '').toLowerCase()
        if (ct.includes('image/')) return 'image'
        if (ct.includes('video/')) return 'video'
        // fallback por URL
        if (/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url)) return 'image'
        if (/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url)) return 'video'
        return 'unknown'
      }

      // Sticker imagem com controle de tamanho
      const makeStickerFromImageFile = async (inFile) => {
        const vf = buildVF(picked)
        // Estratégia: tenta compressão, se ficar >100KB, reduz q e aplica leve blur/denoise no final
        const outWebp = tmp(`sticker-${Date.now()}-${Math.random().toString(16).slice(2)}.webp`)
        cleanupPaths.push(outWebp)

        const baseQ = mode === 'hd' ? 78 : 70
        const tries = mode === 'hd' ? [baseQ, 72, 66, 60, 54] : [baseQ, 64, 58, 52, 46]

        let finalWebp = null
        for (let i = 0; i < tries.length; i++) {
          const q = tries[i]
          const extra = i >= 2 ? ',hqdn3d=1.5:1.5:6:6' : '' // ajuda a comprimir sem destruir muito
          const vfTry = vf + extra

          await runFfmpeg([
            '-y',
            '-i', inFile,
            '-vf', vfTry,
            '-an',
            '-vsync', '0',
            '-vcodec', 'libwebp',
            '-loop', '0',
            '-preset', 'picture',
            '-compression_level', mode === 'hd' ? '5' : '6',
            '-q:v', String(q),
            outWebp
          ], { timeoutMs: FFMPEG_TIMEOUT_MS })

          const size = fs.statSync(outWebp).size
          if (size <= LIMIT_IMAGE_BYTES || i === tries.length - 1) {
            finalWebp = outWebp
            break
          }
        }

        const data = fs.readFileSync(finalWebp)
        const media = { mimetype: 'webp', data }
        const metadata = { packname: pack, author, categories: [''] }
        const stickerPath = await writeExif(media, metadata)
        cleanupPaths.push(stickerPath)

        await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
      }

      // Sticker animado (vídeo -> webp) com controle de tamanho
      const makeStickerFromVideoFile = async (inFile, seconds) => {
        // Limita duração real para “competitivo”
        const targetDur = Math.min(Number(seconds || 0) || MAX_VIDEO_SECONDS, MAX_VIDEO_SECONDS)

        const outWebp = tmp(`anim-${Date.now()}-${Math.random().toString(16).slice(2)}.webp`)
        cleanupPaths.push(outWebp)

        // Estratégia: reduzir FPS/qualidade até caber em 500KB
        const fpsTries = mode === 'hd' ? [20, 18, 15] : [15, 12, 10]
        const qTries = mode === 'hd' ? [60, 52, 46, 40] : [50, 44, 38, 32]

        let ok = false
        for (const fps of fpsTries) {
          for (const q of qTries) {
            // vf: corta duração, escala, pad, mantém alpha e otimiza
            const vf = [
              `fps=${fps}`,
              `scale=512:512:force_original_aspect_ratio=decrease`,
              `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
              `format=rgba`
            ].join(',')

            await runFfmpeg([
              '-y',
              '-t', String(targetDur),
              '-i', inFile,
              '-vf', vf,
              '-an',
              '-vsync', '0',
              '-vcodec', 'libwebp',
              '-loop', '0',
              '-preset', 'default',
              '-compression_level', mode === 'hd' ? '5' : '6',
              '-q:v', String(q),
              outWebp
            ], { timeoutMs: FFMPEG_TIMEOUT_MS })

            const size = fs.statSync(outWebp).size
            if (size <= LIMIT_ANIM_BYTES) { ok = true; break }
          }
          if (ok) break
        }

        // Se ainda estiver grande, manda mesmo (alguns clientes aceitam um pouco acima),
        // mas normalmente já vai caber por causa do loop acima.

        const data = fs.readFileSync(outWebp)
        const media = { mimetype: 'webp', data }
        const metadata = { packname: pack, author, categories: [''] }
        const stickerPath = await writeExif(media, metadata)
        cleanupPaths.push(stickerPath)

        await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
      }

      // 1) Mensagem com mídia (imagem)
      if (/image|webp/i.test(mime)) {
        await replyProcessing()
        const buffer = await quoted.download()
        if (!buffer || !buffer.length) return client.reply(m.chat, '《✧》 Não consegui baixar a imagem.', m)

        const inFile = saveBufferToTmp(buffer, extFromMime(mime, '.img'))
        await makeStickerFromImageFile(inFile)
        safeCleanupAll()
        return
      }

      // 2) Mensagem com midia (video)
      if (/video/i.test(mime)) {
        const secs = (quoted.msg || quoted).seconds || 0
        if (secs > 12) return m.reply('O video e muito longo (maximo 12s para sticker). Envie um mais curto.')
        await replyProcessing()

        const buffer = await quoted.download()
        if (!buffer || !buffer.length) return client.reply(m.chat, 'Nao consegui baixar o video.', m)

        // Rejeitar videos muito grandes antes de processar
        if (buffer.length > MAX_DOWNLOAD_BYTES) {
          return client.reply(m.chat, `Video muito pesado (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Envie um menor que ${(MAX_DOWNLOAD_BYTES / 1024 / 1024).toFixed(0)}MB.`, m)
        }

        const inFile = saveBufferToTmp(buffer, '.mp4')
        await makeStickerFromVideoFile(inFile, secs)
        safeCleanupAll()
        return
      }

      // 3) URL
      if (urlArg) {
        await replyProcessing('《✧》 Baixando pela URL e gerando figurinha...')
        const { buffer, contentType } = await fetchToBufferLimited(urlArg)
        let kind = guessKindFromContentTypeOrUrl(contentType, urlArg)
        if (kind === 'unknown') kind = guessKindFromBuffer(buffer)

        if (kind === 'image') {
          const ext = extFromContentType(contentType) || '.img'
          const inFile = saveBufferToTmp(buffer, ext)
          await makeStickerFromImageFile(inFile)
          safeCleanupAll()
          return
        }

        if (kind === 'video') {
          const inFile = saveBufferToTmp(buffer, '.mp4')
          // Para URL não temos seconds confiável; usa limite seguro
          await makeStickerFromVideoFile(inFile, MAX_VIDEO_SECONDS)
          safeCleanupAll()
          return
        }

        return client.reply(
          m.chat,
          '《✧》 Não consegui identificar se a URL é imagem ou vídeo. Envie uma URL direta de mídia (imagem/vídeo).',
          m
        )
      }

      // 4) Sem mídia
      return client.reply(
        m.chat,
        `《✧》 Envie uma imagem, vídeo, adesivo ou URL para fazer figurinha.\n> Use *${usedPrefix + command} -list* para ver formas e efeitos.`,
        m
      )
    } catch (e) {
      safeCleanupAll()
      const isTimeout = /timeout/i.test(e.message)
      if (isTimeout) {
        return m.reply(
          `O video e muito pesado para converter em figurinha.\n` +
          `Dicas:\n- Envie um video mais curto (max 10s)\n- Reduza a resolucao\n- Use o modo -lite`
        )
      }
      return m.reply(
        `> Erro ao executar *${usedPrefix + command}*.\n` +
        `> [Erro: *${e.message}*]`
      )
    }
  }
}

const { writeExif } = exif

const tmp = (name) => path.join('./tmp', name)

const ensureTmp = () => {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
}

const isUrl = (text) => /https?:\/\/[^\s]+/i.test(text)

const parseArgs = (args) => {
  let urlArg = null
  const rest = []
  const flags = { lite: false, hd: false }

  for (const a of args) {
    if (!urlArg && isUrl(a)) urlArg = a
    else rest.push(a)
  }

  // flags de qualidade
  if (rest.includes('-hd')) flags.hd = true
  if (rest.includes('-lite')) flags.lite = true
  if (!flags.hd && !flags.lite) flags.lite = true // default 2026: menos falha

  const shapeArgs = {
    '-c': 'circle',
    '-t': 'triangle',
    '-s': 'star',
    '-r': 'roundrect',
    '-h': 'hexagon',
    '-d': 'diamond',
    '-f': 'frame',
    '-b': 'border',
    '-w': 'wave',
    '-m': 'mirror',
    '-o': 'octagon',
    '-y': 'pentagon',
    '-e': 'ellipse',
    '-z': 'cross',
    '-v': 'heart',
    '-x': 'cover',
    '-i': 'contain'
  }

  const effectArgs = {
    '-blur': 'blur',
    '-sepia': 'sepia',
    '-sharpen': 'sharpen',
    '-brighten': 'brighten',
    '-dark': 'darken',        // corrigido: help usava -dark
    '-darken': 'darken',
    '-invert': 'invert',
    '-grayscale': 'grayscale',
    '-rotate90': 'rotate90',
    '-rotate180': 'rotate180',
    '-flip': 'flip',
    '-flop': 'flop',
    '-normalize': 'normalise', // corrigido (antes estava -normalice)
    '-negate': 'negate',
    '-tint': 'tint'
  }

  const picked = []
  for (const a of rest) {
    const lower = String(a || '').toLowerCase()
    if (shapeArgs[lower]) picked.push({ type: 'shape', value: shapeArgs[lower] })
    else if (effectArgs[lower]) picked.push({ type: 'effect', value: effectArgs[lower] })
  }

  // Remove flags/args e extrai "Pack • Autor"
  const optionKeys = new Set([
    ...Object.keys(shapeArgs),
    ...Object.keys(effectArgs),
    '-hd',
    '-lite'
  ])
  const filteredText = rest
    .filter((token) => !optionKeys.has(String(token || '').toLowerCase()))
    .join(' ')
    .trim()

  const marca = filteredText
    .split(/[\u2022|]/)
    .map((s) => s.trim())
    .filter(Boolean)

  return { urlArg, picked, marca, flags }
}

const buildVF = (picked) => {
  const W = 512
  const H = 512

  const shape = picked.find((x) => x.type === 'shape')?.value || null
  const effects = picked.filter((x) => x.type === 'effect').map((x) => x.value)

  const vf = []

  const useCover = shape === 'cover'
  const useContain = shape === 'contain' || !useCover

  if (useCover) {
    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`)
  } else if (useContain) {
    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`)
    vf.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`)
  }

  vf.push('format=rgba')

  for (const e of effects) {
    if (e === 'blur') vf.push('gblur=sigma=6:steps=2')
    else if (e === 'sepia') vf.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131')
    else if (e === 'sharpen') vf.push('unsharp=5:5:1.2:5:5:0.0')
    else if (e === 'brighten') vf.push('eq=brightness=0.08')
    else if (e === 'darken') vf.push('eq=brightness=-0.10')
    else if (e === 'invert') vf.push('negate')
    else if (e === 'grayscale') vf.push('hue=s=0')
    else if (e === 'rotate90') vf.push('transpose=1')
    else if (e === 'rotate180') vf.push('rotate=PI')
    else if (e === 'flip') vf.push('hflip')
    else if (e === 'flop') vf.push('vflip')
    else if (e === 'normalise') vf.push('normalize')
    else if (e === 'negate') vf.push('negate')
    else if (e === 'tint') vf.push('colorchannelmixer=1:0:0:0:0:0.85:0:0:0:0:0.85')
  }

  if (shape === 'mirror') vf.push('hflip')

  const hasBorder = shape === 'border'
  const hasFrame = shape === 'frame'
  if (hasBorder) vf.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.90:t=14`)
  if (hasFrame) vf.push(`drawbox=x=18:y=18:w=${W - 36}:h=${H - 36}:color=white@0.55:t=10`)

  const cx = `${W}/2`
  const cy = `${H}/2`
  const minwh = `min(${W},${H})`
  const r = `(${minwh}/2)`

  const clamp255 = (expr) => `if(${expr},255,0)`

  const alphaExpr = (() => {
    if (!shape || shape === 'cover' || shape === 'contain' || shape === 'mirror' || shape === 'border' || shape === 'frame') return null

    if (shape === 'circle') {
      return clamp255(`lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),(${r}-6)*(${r}-6))`)
    }

    if (shape === 'ellipse') {
      const rx = `(${W}*0.46)`
      const ry = `(${H}*0.40)`
      return clamp255(`lte(((X-${cx})*(X-${cx}))/((${rx})*(${rx}))+((Y-${cy})*(Y-${cy}))/((${ry})*(${ry})),1)`)
    }

    if (shape === 'diamond') {
      return clamp255(`lte(abs(X-${cx})+abs(Y-${cy}),(${r}-6))`)
    }

    if (shape === 'triangle') {
      const topY = `${H}*0.08`
      const botY = `${H}*0.94`
      return clamp255(`gte(Y,${topY})*lte(Y,${botY})*lte(abs(X-${cx}), ((${botY}-Y)*0.58))`)
    }

    if (shape === 'roundrect') {
      const pad = 28
      const cr = 64
      const x0 = pad
      const y0 = pad
      const x1 = W - pad
      const y1 = H - pad
      const inCore = `(X>=${x0}+${cr})*(X<=${x1}-${cr})*(Y>=${y0})*(Y<=${y1})+(X>=${x0})*(X<=${x1})*(Y>=${y0}+${cr})*(Y<=${y1}-${cr})`
      const c1 = `lte((X-(${x0}+${cr}))*(X-(${x0}+${cr}))+(Y-(${y0}+${cr}))*(Y-(${y0}+${cr})),(${cr})*(${cr}))`
      const c2 = `lte((X-(${x1}-${cr}))*(X-(${x1}-${cr}))+(Y-(${y0}+${cr}))*(Y-(${y0}+${cr})),(${cr})*(${cr}))`
      const c3 = `lte((X-(${x0}+${cr}))*(X-(${x0}+${cr}))+(Y-(${y1}-${cr}))*(Y-(${y1}-${cr})),(${cr})*(${cr}))`
      const c4 = `lte((X-(${x1}-${cr}))*(X-(${x1}-${cr}))+(Y-(${y1}-${cr}))*(Y-(${y1}-${cr})),(${cr})*(${cr}))`
      return clamp255(`gt(${inCore}+${c1}+${c2}+${c3}+${c4},0)`)
    }

    if (shape === 'cross') {
      const w = `${W}*0.28`
      const h = `${H}*0.28`
      const v = `(abs(X-${cx})<=${w}/2)*(abs(Y-${cy})<=${H}*0.46)`
      const hbar = `(abs(Y-${cy})<=${h}/2)*(abs(X-${cx})<=${W}*0.46)`
      return clamp255(`gt(${v}+${hbar},0)`)
    }

    if (shape === 'heart') {
      const xn = `(X-${cx})/(${W}*0.33)`
      const yn = `(Y-${cy})/(${H}*0.33)`
      const eq = `lte(pow(${xn}*${xn}+${yn}*${yn}-1,3)-(${xn}*${xn})*pow(${yn},3),0)`
      return clamp255(eq)
    }

    if (shape === 'star') {
      const dx = `(X-${cx})`
      const dy = `(Y-${cy})`
      const theta = `atan2(${dy},${dx})`
      const rad = `hypot(${dx},${dy})`
      const base = `(${W}*0.20)`
      const amp = `(${W}*0.10)`
      const limit = `(${base}+${amp}*cos(5*${theta}))`
      return clamp255(`lte(${rad},${limit}*2.0)`)
    }

    if (shape === 'wave') {
      const amp = `${H}*0.06`
      const mid = `${H}*0.50`
      const yline = `(${mid}+${amp}*sin(X*0.06))`
      return clamp255(`lte(abs(Y-${yline}),${H}*0.40)`)
    }

    if (shape === 'hexagon' || shape === 'pentagon' || shape === 'octagon') {
      const n = shape === 'pentagon' ? 5 : shape === 'octagon' ? 8 : 6
      const dx = `(X-${cx})`
      const dy = `(Y-${cy})`
      const theta = `atan2(${dy},${dx})`
      const rad = `hypot(${dx},${dy})`
      const k = `cos(PI/${n})/cos(mod(${theta},2*PI/${n})-PI/${n})`
      const limit = `(${W}*0.40)*${k}`
      return clamp255(`lte(${rad},${limit})`)
    }

    return null
  })()

  if (alphaExpr) vf.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`)

  vf.push('format=yuva420p')
  return vf.join(',')
}

const extFromMime = (mime, fallback = '.bin') => {
  if (/png/i.test(mime)) return '.png'
  if (/jpe?g/i.test(mime)) return '.jpg'
  if (/webp/i.test(mime)) return '.webp'
  if (/gif/i.test(mime)) return '.gif'
  if (/mp4|mkv|webm|mov|avi/i.test(mime)) return '.mp4'
  return fallback
}

const extFromContentType = (ct) => {
  if (!ct) return null
  if (ct.includes('image/png')) return '.png'
  if (ct.includes('image/jpeg')) return '.jpg'
  if (ct.includes('image/webp')) return '.webp'
  if (ct.includes('image/gif')) return '.gif'
  if (ct.includes('video/')) return '.mp4'
  return null
}

const guessKindFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return 'unknown'

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image' // GIF
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image' // PNG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image' // JPEG

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image'

  // MP4/ISO BMFF: "ftyp" near start
  if (buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp')) return 'video'
  // WebM/MKV: EBML header
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) return 'video'

  return 'unknown'
}
