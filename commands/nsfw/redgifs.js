import { fetchMediaSafe, resolveNsfwVideo, searchNsfwVideos } from '../../lib/mediaFetcher.js'

function isRedgifsUrl(value = '') {
  return /https?:\/\/(?:www\.)?(?:redgifs\.com|media\.redgifs\.com)\//i.test(String(value))
}

function pickBestCandidate(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  return (
    candidates.find((item) => item.mediaType === 'video' && /silent\.mp4|[-_]silent\b/i.test(item.url)) ||
    candidates.find((item) => item.mediaType === 'video') ||
    candidates.find((item) => item.mediaType === 'gif') ||
    null
  )
}

function humanDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0))
  if (!total) return 'desconhecida'

  const mins = Math.floor(total / 60)
  const secs = Math.round(total % 60)
  if (mins <= 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

export default {
  command: ['redgifs', 'redgif', 'rgifs', 'redgifts'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!globalThis.db.data.chats[m.chat]?.nsfw) {
      return m.reply(
        `ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\n` +
          `Um *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`,
      )
    }

    const input = args.join(' ').trim()
    if (!input) {
      return m.reply(
        `Use assim:\n` +
          `• *${usedPrefix + command} <termo>*\n` +
          `• *${usedPrefix + command} <url do redgifs>*\n\n` +
          `Exemplo: *${usedPrefix + command} blowjob*`,
      )
    }

    try {
      await m.react('⏳')

      let parsed = null
      let sourceLabel = ''

      if (isRedgifsUrl(input)) {
        parsed = await resolveNsfwVideo(input)
        sourceLabel = input
      } else {
        const results = await searchNsfwVideos(input, { source: 'redgifs', limit: 20 })
        if (!results.length) {
          await m.react('❌')
          return m.reply('《✧》 Nenhum resultado encontrado no RedGifs para esse termo.')
        }

        const chosen = results[Math.floor(Math.random() * Math.min(results.length, 10))]
        parsed = await resolveNsfwVideo(chosen.pageUrl)
        sourceLabel = chosen.pageUrl
      }

      const best = pickBestCandidate(parsed?.candidates || [])
      if (!best) {
        await m.react('❌')
        return m.reply('《✧》 Não encontrei mídia animada (vídeo/GIF) nesse resultado.')
      }

      const mediaBuffer = await fetchMediaSafe(best.url, {
        validateFirst: true,
        logPrefix: '[RedGifs]',
      })

      const caption =
        `乂 REDGIFS 乂\n\n` +
        `≡ Título: ${parsed?.title || 'Sem título'}\n` +
        `≡ Duração: ${humanDuration(parsed?.duration)}\n` +
        `≡ Fonte: ${sourceLabel || parsed?.pageUrl || 'RedGifs'}`

      if (!mediaBuffer) {
        await client.sendMessage(
          m.chat,
          {
            video: { url: best.url },
            gifPlayback: true,
            caption,
          },
          { quoted: m },
        )
        await m.react('✅')
        return
      }

      await client.sendMessage(
        m.chat,
        {
          video: mediaBuffer,
          gifPlayback: true,
          caption,
        },
        { quoted: m },
      )

      await m.react('✅')
    } catch (error) {
      await m.react('❌')
      await m.reply(
        `> ❌ Erro ao executar *${usedPrefix + command}*.\n` +
          `> [Erro: *${error.message}*]`,
      )
    }
  },
}
