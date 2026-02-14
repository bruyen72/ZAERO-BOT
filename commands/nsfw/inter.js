import { resolveLidToRealJid } from '../../lib/utils.js'
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js'
import {
  COMPRESS_THRESHOLD,
  MAX_DOWNLOAD_VIDEO_BYTES,
  MAX_WA_VIDEO_BYTES,
  compressVideoBuffer,
  downloadVideoBuffer,
  getChatRedgifsHistory,
  isValidVideoBuffer,
  registerSentRedgifsId,
  withChatNsfwQueue,
} from '../../lib/nsfwShared.js'

const captions = {
  anal: (from, to) => (from === to ? 'colocou em seu proprio anus.' : 'colocou no anus de'),
  cum: (from, to) => (from === to ? 'gozou... vamos pular os detalhes.' : 'gozou em'),
  undress: (from, to) => (from === to ? 'esta tirando a propria roupa' : 'esta tirando a roupa de'),
  fuck: (from, to) => (from === to ? 'se rendeu ao desejo' : 'esta fodendo'),
  spank: (from, to) => (from === to ? 'esta batendo na propria bunda' : 'esta dando uns tapas em'),
  lickpussy: (from, to) => (from === to ? 'esta lambendo uma buceta' : 'esta lambendo a buceta de'),
  fap: (from, to) => (from === to ? 'esta se masturbando' : 'esta se masturbando pensando em'),
  grope: (from, to) => (from === to ? 'esta se apalpando' : 'esta apalpando'),
  sixnine: (from, to) => (from === to ? 'esta fazendo um 69' : 'esta fazendo um 69 com'),
  suckboobs: (from, to) => (from === to ? 'esta chupando peitos deliciosos' : 'esta chupando os peitos de'),
  grabboobs: (from, to) => (from === to ? 'esta agarrando uns peitos' : 'esta agarrando os peitos de'),
  blowjob: (from, to) => (from === to ? 'esta dando uma chupada deliciosa' : 'deu uma chupada para'),
  boobjob: (from, to) => (from === to ? 'esta fazendo uma espanhola' : 'esta fazendo uma espanhola para'),
  footjob: (from, to) => (from === to ? 'esta fazendo um footjob' : 'esta fazendo um footjob para'),
  yuri: (from, to) => (from === to ? 'esta fazendo uma tesoura!' : 'fez uma tesoura com'),
  cummouth: (from, to) => (from === to ? 'esta enchendo a boca de leite' : 'esta enchendo a boca de'),
  cumshot: (from, to) => (from === to ? 'deu uma gozada monstro' : 'deu uma gozada surpresa para'),
  handjob: (from, to) => (from === to ? 'esta dando uma punheta com amor' : 'esta dando uma punheta para'),
  lickass: (from, to) => (from === to ? 'esta lambendo um cuzinho sem parar' : 'esta lambendo a bunda de'),
  lickdick: (from, to) => (from === to ? 'esta chupando um pau com vontade' : 'esta chupando o pau de'),
  bunda: (from, to) => (from === to ? 'esta admirando uma bundona' : 'esta pegando na bunda de'),
  cavalgar: (from, to) => (from === to ? 'esta cavalgando sozinho' : 'esta cavalgando em cima de'),
  sentarnacara: (from, to) => (from === to ? 'sentou na propria cara (como?)' : 'sentou na cara de'),
  creampie: (from, to) => (from === to ? 'levou uma gozada dentro' : 'gozou dentro de'),
}

const symbols = ['(o_o)', '(>_<)', '(^_^)', '(x_x)', '(~_~)']

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

const alias = {
  anal: ['anal', 'violar', 'cuzinho'],
  cum: ['cum', 'gozar'],
  undress: ['undress', 'encuerar', 'tirarroupa', 'pelada', 'pelado'],
  fuck: ['fuck', 'coger', 'foder', 'transar', 'trepar'],
  spank: ['spank', 'nalgada', 'bater', 'baternabunda'],
  lickpussy: ['lickpussy', 'lamberbuceta', 'chuparbuceta'],
  fap: ['fap', 'paja', 'punheta', 'bronha'],
  grope: ['grope', 'apalpar'],
  sixnine: ['sixnine', '69'],
  suckboobs: ['suckboobs', 'chuparpeitos', 'chupartetas'],
  grabboobs: ['grabboobs', 'agarrarpeitos', 'peitos', 'tetas'],
  blowjob: ['blowjob', 'mamada', 'bj', 'boquete', 'chupar', 'chupada'],
  boobjob: ['boobjob', 'espanhola'],
  yuri: ['yuri', 'tijeras', 'tesoura', 'lesbica'],
  footjob: ['footjob', 'pezinho'],
  cummouth: ['cummouth', 'gozarnaboca', 'engolir', 'leitinho'],
  cumshot: ['cumshot', 'gozada'],
  handjob: ['handjob', 'siririca'],
  lickass: ['lickass', 'lamberbunda', 'chuparbunda'],
  lickdick: ['lickdick', 'lamberpau', 'chuparpau'],
  bunda: ['bunda', 'bunduda', 'bundada', 'raba', 'rabuda', 'rabao'],
  cavalgar: ['cavalgar', 'cavalgada', 'cavalgando', 'montar'],
  sentarnacara: ['sentarnacara', 'sentanacara', 'facesitting'],
  creampie: ['creampie', 'gozardentro', 'gozoudentro', 'leitinhodentro'],
}

const WA_GIF_VIDEO_FLAGS = {
  gifPlayback: true,
  mimetype: 'video/mp4',
  ptv: false,
}

function buildRedgifsMessage(payload = {}) {
  return {
    ...payload,
    ...WA_GIF_VIDEO_FLAGS,
  }
}

function buildDownloadHeaders(pageUrl = '') {
  try {
    const parsed = new URL(String(pageUrl || ''))
    return {
      Referer: parsed.href,
      Origin: parsed.origin,
    }
  } catch {
    return {}
  }
}

function pickTranscodeOptions(sizeBytes = 0, aggressive = false) {
  const sizeMb = sizeBytes / 1024 / 1024

  if (aggressive || sizeMb > 40) {
    return {
      preset: 'ultrafast',
      crf: 30,
      maxBitrate: 450,
      scale: '640:-2',
      timeoutMs: 180000,
      limitSeconds: 12,
    }
  }

  if (sizeBytes > COMPRESS_THRESHOLD) {
    return {
      preset: 'veryfast',
      crf: 27,
      maxBitrate: 800,
      scale: '720:-2',
      timeoutMs: 150000,
      limitSeconds: 15,
    }
  }

  return {
    preset: 'fast',
    crf: 24,
    maxBitrate: 1000,
    timeoutMs: 120000,
    limitSeconds: 15,
  }
}

async function loadAndNormalizeVideo(mediaResult, logLabel = 'nsfw') {
  let videoBuffer = Buffer.isBuffer(mediaResult?.buffer) ? mediaResult.buffer : null
  const fallbackUrl = mediaResult?.url || null
  const fallbackHeaders = buildDownloadHeaders(mediaResult?.pageUrl || '')

  if (!videoBuffer || videoBuffer.length === 0) {
    if (!fallbackUrl) throw new Error('Midia nao disponivel para download.')

    console.log(`[NSFW] ${logLabel}: buffer vazio, baixando video...`)
    videoBuffer = await downloadVideoBuffer(fallbackUrl, {
      timeoutMs: 45000,
      maxBytes: MAX_DOWNLOAD_VIDEO_BYTES,
      headers: fallbackHeaders,
    })
  }

  if (!isValidVideoBuffer(videoBuffer)) {
    if (!fallbackUrl) throw new Error('Buffer de video invalido.')
    console.warn(`[NSFW] ${logLabel}: buffer invalido, tentando recuperar pela URL...`)
    videoBuffer = await downloadVideoBuffer(fallbackUrl, {
      timeoutMs: 45000,
      maxBytes: MAX_DOWNLOAD_VIDEO_BYTES,
      headers: fallbackHeaders,
    })
    if (!isValidVideoBuffer(videoBuffer)) {
      throw new Error('Buffer de video invalido mesmo apos download.')
    }
  }

  let normalized = await compressVideoBuffer(videoBuffer, pickTranscodeOptions(videoBuffer.length, false))

  if (normalized.length > MAX_WA_VIDEO_BYTES) {
    console.warn(
      `[NSFW] ${logLabel}: video acima do limite (${(normalized.length / 1024 / 1024).toFixed(2)}MB), tentando compressao agressiva...`,
    )
    normalized = await compressVideoBuffer(normalized, pickTranscodeOptions(normalized.length, true))
  }

  if (normalized.length > MAX_WA_VIDEO_BYTES) {
    throw new Error(`Video muito grande mesmo apos compressao (${(normalized.length / 1024 / 1024).toFixed(2)}MB).`)
  }

  return normalized
}

export default {
  command: Object.values(alias).flat(),
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!global.db.data.chats[m.chat].nsfw) {
      return m.reply(
        `O conteudo *NSFW* esta desabilitado neste grupo.\n\nUm *administrador* pode habilitar com o comando:\n>> *${usedPrefix}nsfw on*`,
      )
    }

    const chatData = global.db?.data?.chats?.[m.chat] || {}
    const redgifsHistory = getChatRedgifsHistory(chatData)
    const currentCommand = Object.keys(alias).find((key) => alias[key].includes(command)) || command
    if (!captions[currentCommand]) return
    const mentionedJid = m.mentionedJid || []

    let from
    let to
    if (mentionedJid.length >= 2) {
      from = await resolveLidToRealJid(mentionedJid[0], client, m.chat)
      to = await resolveLidToRealJid(mentionedJid[1], client, m.chat)
    } else if (mentionedJid.length === 1) {
      from = m.sender
      to = await resolveLidToRealJid(mentionedJid[0], client, m.chat)
    } else if (m.quoted) {
      from = m.sender
      to = await resolveLidToRealJid(m.quoted.sender, client, m.chat)
    } else {
      from = m.sender
      to = m.sender
    }

    const fromMention = `@${from.split('@')[0]}`
    const toMention = `@${to.split('@')[0]}`
    const genero = global.db.data.users[from]?.genre || 'Oculto'
    const captionText = captions[currentCommand](fromMention, toMention, genero)
    const caption =
      to !== from
        ? `${fromMention} ${captionText} ${toMention} ${getRandomSymbol()}`
        : `${fromMention} ${captionText} ${getRandomSymbol()}`

    try {
      await m.react('\u23F3')

      await withChatNsfwQueue(m.chat, async () => {
        const mediaResult = await fetchNsfwMedia(currentCommand, null, {
          allowedMediaTypes: ['video'],
          source: 'redgifs',
          allowStaticFallback: false,
          uniqueIds: true,
          excludeIds: redgifsHistory,
          maxPages: 3,
          perPage: 40,
        })

        if (!mediaResult) {
          await m.react('\u274C')
          return m.reply('> Fonte temporariamente indisponivel.\nTente novamente em alguns minutos.')
        }

        if (mediaResult.id) {
          registerSentRedgifsId(chatData, mediaResult.id)
        }

        m.reply('Otimizando video pro WhatsApp...').catch(() => {})

        let videoBuffer = null
        try {
          videoBuffer = await loadAndNormalizeVideo(mediaResult, currentCommand)
        } catch (normalizeErr) {
          console.error(`[NSFW] ${command}: erro ao preparar video:`, normalizeErr.message)
          await m.react('\u274C')
          return m.reply('> Erro ao preparar o video para WhatsApp. Tente novamente em alguns segundos.')
        }

        try {
          await client.sendMessage(
            m.chat,
            buildRedgifsMessage({
              video: videoBuffer,
              caption,
              mentions: [from, to],
            }),
            { quoted: m },
          )
        } catch (sendError) {
          console.error(`[NSFW] ${command}: erro no envio direto, tentando novo preparo:`, sendError.message)
          const retryBuffer = await loadAndNormalizeVideo({ ...mediaResult, buffer: null }, `${currentCommand}:retry`)
          await client.sendMessage(
            m.chat,
            buildRedgifsMessage({
              video: retryBuffer,
              caption,
              mentions: [from, to],
            }),
            { quoted: m },
          )
          videoBuffer = retryBuffer
        }

        await m.react('\u2705')
        console.log(`[NSFW] Comando ${command} ok. Tamanho: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`)
      })
    } catch (e) {
      await m.react('\u274C')
      console.error(`[NSFW] Erro no comando ${command}:`, e)
      await m.reply(
        `> Erro inesperado\n\n` +
          `Ocorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n` +
          `Detalhes tecnicos: ${e.message}\n\n` +
          `Se o problema persistir, contate o suporte.`,
      )
    }
  },
}
