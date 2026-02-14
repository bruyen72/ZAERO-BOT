import fetch from 'node-fetch';
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
  command: ['r34', 'rule34', 'rule'],
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

      const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}&api_key=a4e807dd6d4c9e55768772996946e4074030ec02c49049d291e5edb8808a97b004190660b4b36c3d21699144c823ad93491d066e73682a632a38f9b6c3cf951b&user_id=5753302`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });

      const type = res.headers.get('content-type') || '';
      let mediaList = [];

      if (res.ok && type.includes('json')) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json?.post || json?.data || [];

        const candidates = data
          .map((item) => ({
            url: item?.file_url || item?.sample_url || item?.preview_url || '',
            tags: item?.tags || item?.tag_string || '',
            title: item?.id ? `rule34-${item.id}` : '',
          }))
          .filter((item) => typeof item.url === 'string' && /\.(jpe?g|png|gif|mp4)$/i.test(item.url))
          .filter((item) => {
            const check = isNsfwCandidateBlocked(item, safetyTerms);
            if (check.blocked) {
              console.log(`[Rule34] bloqueado por filtro de seguranca (${check.hit})`);
            }
            return !check.blocked;
          })
          .map((item) => item.url);

        mediaList = [...new Set(shuffle(candidates))];
      }

      if (!mediaList.length) {
        return client.reply(m.chat, `[!] Nenhum resultado encontrado para ${tag}`, m);
      }

      let mediaBuffer = null;
      let selectedUrl = '';
      for (const mediaUrl of mediaList.slice(0, 5)) {
        mediaBuffer = await fetchMediaSafe(mediaUrl, {
          validateFirst: true,
          logPrefix: `[Rule34-${tag}]`,
        });
        if (mediaBuffer) {
          selectedUrl = mediaUrl;
          break;
        }
      }

      if (!mediaBuffer) {
        await m.react('\u274C');
        return m.reply(
          `[!] Midia indisponivel\n\nTodas as URLs retornadas pelo Rule34 falharam ao carregar.\nTente outra tag ou tente novamente mais tarde.`,
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
      console.error(`[Rule34] Erro no comando ${command}:`, e);
      await m.reply(
        `[!] Erro inesperado ao executar *${usedPrefix + command}*.\nDetalhes: ${e.message}`,
      );
    }
  },
};
