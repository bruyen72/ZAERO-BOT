import { fetchMediaSafe, fetchNsfwMedia, resolveNsfwVideo } from '../../lib/mediaFetcher.js'
import {
  transcodeForWhatsapp,
  getChatRedgifsHistory,
  normalizeId,
  registerSentRedgifsId,
} from '../../lib/nsfwShared.js'
import { sendStatus } from '../../lib/status.js'
import { globalJobQueue } from '../../lib/jobQueue.js'

/**
 * ZÆRØ BOT - RedGifs Command (2026 Stability Edition)
 */

const SEARCH_MAX_ATTEMPTS = 2
const nicheBlacklist = new Map() // Cache de 403

function isRedgifsUrl(value = '') {
  return /https?:\/\/(?:www\.)?(?:redgifs\.com|media\.redgifs\.com)\//i.test(String(value))
}

export default {
  command: ['redgifs', 'redgif', 'rgifs', 'lickass'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!globalThis.db?.data?.chats?.[m.chat]?.nsfw) {
      return m.reply(`🔞 O conteúdo *NSFW* está desabilitado neste grupo.`)
    }

    const input = args.join(' ').trim()
    if (!input) return m.reply(`Use: *${usedPrefix + command} <termo|url>*`)

    // 1) Check Blacklist (403)
    if (nicheBlacklist.has(input.toLowerCase())) {
      const blockedTime = nicheBlacklist.get(input.toLowerCase())
      if (Date.now() - blockedTime < 300000) { // 5 minutos
        return m.reply(`⚠️ O RedGifs bloqueou temporariamente este nicho. Tente outro termo.`)
      }
    }

    try {
      await m.react('⏳')
      const pos = globalJobQueue.getPosition(m.sender)
      await sendStatus(client, m, pos > 1 ? 'queue' : 'processing', { pos })

      const task = async () => {
        let mediaResult = null
        if (isRedgifsUrl(input)) {
          mediaResult = await resolveDirectInput(input)
        } else {
          mediaResult = await fetchUniqueSearchResult(input, [])
        }

        if (!mediaResult?.buffer) throw new Error('Não foi possível obter a mídia.')

        // 2) Transcodificação Obrigatória (Anti-Tela-Cinza)
        const buffer = await transcodeForWhatsapp(mediaResult.buffer, { userId: m.sender })
        
        await client.sendMessage(m.chat, { 
          video: buffer, 
          caption: `🔞 * Manifestação Completa * 🎬\n> _Compatível com mobile (2026)_` 
        }, { quoted: m })
        
        if (mediaResult.id) registerSentRedgifsId(global.db.data.chats[m.chat], mediaResult.id)
        await m.react('✅')
      }

      await globalJobQueue.enqueue(task, { priority: 3, userId: m.sender, label: 'redgifs' })

    } catch (error) {
      console.error('[RedGifs Error]', error)
      if (error.message.includes('403')) {
        nicheBlacklist.set(input.toLowerCase(), Date.now())
        return sendStatus(client, m, 'blocked')
      }
      if (error.message.includes('timeout')) return sendStatus(client, m, 'timeout')
      return m.reply(`> ❌ *Erro:* ${error.message}`)
    }
  },
}

async function resolveDirectInput(input) {
  const parsed = await resolveNsfwVideo(input)
  const best = parsed?.candidates?.[0]
  if (!best?.url) throw new Error('Link inválido.')
  const buffer = await fetchMediaSafe(best.url, { timeout: 30000 })
  return { id: normalizeId(parsed?.id || ''), buffer }
}

async function fetchUniqueSearchResult(query, excludeIds = []) {
  return fetchNsfwMedia(query, null, {
    allowedMediaTypes: ['video'],
    source: 'redgifs',
    perPage: 10,
    strictQuery: true,
  })
}
