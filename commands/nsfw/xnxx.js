import { searchNsfwVideos, resolveNsfwVideo } from '../../lib/mediaFetcher.js';

function sanitizeFileName(value = 'video') {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'video';
}

function isXnxxUrl(value = '') {
  return /https?:\/\/(www\.)?xnxx\.com\//i.test(value);
}

function isPlaylist(url = '') {
  return /\.m3u8(\?|$)/i.test(url);
}

function pickBestCandidate(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const bestVideo = candidates.find((item) => item.mediaType === 'video' && !isPlaylist(item.url));
  if (bestVideo) return bestVideo;

  const bestGif = candidates.find((item) => item.mediaType === 'gif');
  if (bestGif) return bestGif;

  return candidates.find((item) => item.mediaType === 'image') || null;
}

export default {
  command: ['xnxx'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!db.data.chats[m.chat].nsfw) {
      return m.reply(
        `ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\n` +
          `Um *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`,
      );
    }

    try {
      const query = args.join(' ').trim();
      if (!query) return m.reply('《✧》 Informe um termo de busca ou URL do XNXX.');

      if (isXnxxUrl(query)) {
        await m.react('⏳');

        const parsed = await resolveNsfwVideo(query);
        const media = pickBestCandidate(parsed.candidates);

        if (!media) {
          await m.react('❌');
          return m.reply('《✧》 Não foi possível extrair mídia desta URL do XNXX.');
        }

        const caption =
          `乂 XNXX - DOWNLOAD 乂\n\n` +
          `≡ Título: ${parsed.title || 'Sem título'}\n` +
          `≡ Views: ${parsed.views || 'Desconhecidas'}\n` +
          `≡ Fonte: XNXX`;

        try {
          if (media.mediaType === 'image') {
            await client.sendMessage(
              m.chat,
              {
                image: { url: media.url },
                caption,
              },
              { quoted: m },
            );
          } else {
            await client.sendMessage(
              m.chat,
              {
                video: { url: media.url },
                mimetype: 'video/mp4',
                fileName: `${sanitizeFileName(parsed.title)}.mp4`,
                caption,
              },
              { quoted: m },
            );
          }

          await m.react('✅');
          return;
        } catch (sendError) {
          await m.react('⚠️');
          return m.reply(
            `${caption}\n\n` +
              `Não consegui enviar o arquivo direto. Use o link:\n${media.url}\n\n` +
              `Página: ${query}`,
          );
        }
      }

      await m.react('⏳');
      const results = await searchNsfwVideos(query, { source: 'xnxx', limit: 10 });

      if (!results.length) {
        await m.react('❌');
        return m.reply('《✧》 Nenhum resultado encontrado no XNXX.');
      }

      const list = results
        .slice(0, 10)
        .map((item, index) => `${index + 1}. ${item.title}\n${item.pageUrl}`)
        .join('\n\n');

      await client.sendMessage(
        m.chat,
        {
          text:
            `乂 XNXX - PESQUISA 乂\n\n${list}\n\n` +
            `» Envie uma dessas URLs com *${usedPrefix}${command} <url>* para baixar.`,
        },
        { quoted: m },
      );

      await m.react('✅');
    } catch (error) {
      await m.react('❌');
      return m.reply(
        `> Ocorreu um erro ao executar *${usedPrefix + command}*.\n` +
          `> [Erro: *${error.message}*]`,
      );
    }
  },
};
