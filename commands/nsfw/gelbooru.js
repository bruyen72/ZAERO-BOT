import axios from 'axios';
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';
import { getNsfwSafetyBlockedTerms, isNsfwCandidateBlocked } from '../../lib/nsfwSafetyFilter.js';

function shuffle(items = []) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export default {
  command: ['gelbooru', 'gbooru'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!globalThis.db.data.chats[m.chat]?.nsfw) {
        return m.reply(
          `O conteudo *NSFW* esta desabilitado neste grupo.\n\nUm *administrador* pode habilita-lo com:\n>> *${usedPrefix}nsfw on*`,
        );
      }

      if (!args[0]) {
        return client.reply(
          m.chat,
          `[!] Voce deve especificar tags para pesquisar\nExemplo: *${usedPrefix + command} neko*`,
          m,
        );
      }

      await m.react('\u23F3');

      const tagInput = args.join(' ').trim();
      const tag = tagInput.replace(/\s+/g, '_');
      const safetyTerms = getNsfwSafetyBlockedTerms();

      const url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tag)}&api_key=f965be362e70972902e69652a472b8b2df2c5d876cee2dc9aebc7d5935d128db98e9f30ea4f1a7d497e762f8a82f132da65bc4e56b6add0f6283eb9b16974a1a&user_id=1862243`;
      const res = await axios.get(url);
      const data = res.data?.post || [];

      const candidates = data
        .map((item) => ({
          url: item?.file_url || item?.source || '',
          tags: item?.tags || item?.tag_string || '',
          title: item?.id ? `gelbooru-${item.id}` : '',
        }))
        .filter((item) => typeof item.url === 'string' && /\.(jpe?g|png|gif|mp4)$/i.test(item.url))
        .filter((item) => {
          const check = isNsfwCandidateBlocked(item, safetyTerms);
          if (check.blocked) {
            console.log(`[Gelbooru] bloqueado por filtro de seguranca (${check.hit})`);
          }
          return !check.blocked;
        })
        .map((item) => item.url);

      const mediaList = [...new Set(shuffle(candidates))];
      if (!mediaList.length) {
        return client.reply(m.chat, `[!] Nenhum resultado encontrado para ${tag}`, m);
      }

      let mediaBuffer = null;
      let selectedUrl = '';
      for (const mediaUrl of mediaList.slice(0, 5)) {
        mediaBuffer = await fetchMediaSafe(mediaUrl, {
          validateFirst: true,
          logPrefix: `[Gelbooru-${tag}]`,
        });
        if (mediaBuffer) {
          selectedUrl = mediaUrl;
          break;
        }
      }

      if (!mediaBuffer) {
        await m.react('\u274C');
        return m.reply(
          `[!] Midia indisponivel\n\nTodas as URLs retornadas pelo Gelbooru falharam ao carregar.\nTente outra tag ou tente novamente mais tarde.`,
        );
      }

      const caption =
        `*ZAERO BOT - ADULTO (18+)*\n\n` +
        `Tags: ${tag}\n\n` +
        `Aviso: o conteudo 18+ e de sua total responsabilidade.`;

      if (/\.mp4$/i.test(selectedUrl)) {
        await client.sendMessage(m.chat, { video: mediaBuffer, caption, mentions: [m.sender] });
      } else {
        await client.sendMessage(m.chat, { image: mediaBuffer, caption, mentions: [m.sender] });
      }

      await m.react('\u2705');
    } catch (e) {
      await m.react('\u274C');
      console.error(`[Gelbooru] Erro no comando ${command}:`, e);
      await m.reply(
        `[!] Erro inesperado ao executar *${usedPrefix + command}*.\nDetalhes: ${e.message}`,
      );
    }
  },
};
