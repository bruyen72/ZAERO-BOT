import axios from 'axios'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

const STYLE_MAP = {
  fogo: 'flaming-logo',
  flame: 'flaming-logo',
  fire: 'flaming-logo',
  gelo: 'ice-logo',
  ice: 'ice-logo',
  fumaca: 'smoke-logo',
  smoke: 'smoke-logo',
  corrida: 'runner-logo',
  runner: 'runner-logo',
  sketch: 'sketch-name',
  rabisco: 'sketch-name'
}

const DEFAULT_SCRIPT = 'flaming-logo'

const normalizeStyle = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

function buildFlamingTextUrl(script, text) {
  return `https://www.flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=${encodeURIComponent(script)}&text=${encodeURIComponent(text)}`
}

async function flamingToStickerBuffer(script, text) {
  const url = buildFlamingTextUrl(script, text)
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari/537.36',
      Accept: 'image/*,*/*;q=0.8'
    }
  })

  const sticker = new Sticker(Buffer.from(response.data), {
    pack: 'ZAERO ATTP',
    author: 'ZAERO BOT',
    type: StickerTypes.FULL,
    quality: 70
  })

  return sticker.toBuffer()
}

function usage(prefix = '.', cmd = 'attp') {
  return [
    'Como usar o ATTP:',
    `${prefix}${cmd} texto`,
    `${prefix}${cmd} fogo texto`,
    `${prefix}${cmd} gelo texto`,
    `${prefix}${cmd} fumaca texto`,
    `${prefix}${cmd} corrida texto`,
    '',
    'Dica: tambem funciona respondendo uma mensagem.'
  ].join('\n')
}

export default {
  command: ['attp', 'attp2'],
  category: 'sticker',
  info: {
    desc: 'Cria sticker de texto com estilo (fogo/gelo/fumaca/corrida).'
  },
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const quotedText = (m.quoted?.text || m.quoted?.caption || '').trim()
      const firstArg = args[0] || ''
      const normalizedFirstArg = normalizeStyle(firstArg)
      const hasCustomStyle = Boolean(STYLE_MAP[normalizedFirstArg])
      const script = hasCustomStyle ? STYLE_MAP[normalizedFirstArg] : DEFAULT_SCRIPT

      const typedText = (hasCustomStyle ? args.slice(1).join(' ') : args.join(' ')).trim()
      const finalInput = (typedText || quotedText || '').trim()

      if (!finalInput) {
        return client.reply(m.chat, usage(usedPrefix, command), m)
      }

      const finalText = finalInput.slice(0, 30)
      await m.react('🕒').catch(() => {})

      const stickerBuffer = await flamingToStickerBuffer(script, finalText)
      await client.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
      await m.react('✅').catch(() => {})
    } catch (error) {
      console.error('[ATTP] erro:', error?.message || error)
      await m.react('❌').catch(() => {})
      await client.reply(
        m.chat,
        `❌ Erro ao gerar ATTP. Tente novamente.\nExemplo: ${usedPrefix}${command} fogo ZAERO`,
        m
      )
    }
  }
}
