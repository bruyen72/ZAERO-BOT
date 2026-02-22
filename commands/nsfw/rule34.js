import fetch from 'node-fetch';
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';
import { getNsfwSafetyBlockedTerms, isNsfwCandidateBlocked } from '../../lib/nsfwSafetyFilter.js';
import { DARK_MSG } from '../../lib/system/heavyTaskManager.js';

const MAX_HISTORY_ITEMS = 500;
const MAX_FETCH_TRIES = 8;

function shuffle(items = []) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTagTokens(input = '') {
  const text = normalizeText(input);
  if (!text) return [];

  const tokens = [];
  const regex = /"([^"]+)"|'([^']+)'|`([^`]+)`|([^,\s]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1] || match[2] || match[3] || match[4] || '';
    const token = normalizeText(raw)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!token) continue;
    tokens.push(token);
  }

  return [...new Set(tokens)];
}

function parseRule34Tags(args = []) {
  const rawInput = normalizeText(args.join(' '));
  if (!rawInput) return { rawInput: '', tags: [], tagsQuery: '', tagsDisplay: '' };

  let normalized = rawInput
    .replace(/^(?:tags?|search|buscar|busca|pesquisar)\s*[:=]?\s*/i, '')
    .replace(/\b(?:tags?|search)\s*[:=]\s*/gi, ' ');

  normalized = normalizeText(normalized);
  const tags = splitTagTokens(normalized);

  return {
    rawInput,
    tags,
    tagsQuery: tags.join(' '),
    tagsDisplay: tags.join(', ')
  };
}

function ensureRule34History(chat) {
  if (!chat) return [];
  if (!Array.isArray(chat.nsfwRule34SentIds)) {
    chat.nsfwRule34SentIds = [];
  }
  return chat.nsfwRule34SentIds;
}

function getCandidateKey(item = {}) {
  const id = String(item.id || '').trim();
  if (id) return `id:${id}`;
  const url = String(item.url || '').trim().split('?')[0];
  if (!url) return '';
  return `url:${url}`;
}

function pushHistory(history, key) {
  if (!key) return;
  if (!history.includes(key)) {
    history.push(key);
  }
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(0, history.length - MAX_HISTORY_ITEMS);
  }
}

export default {
  command: ['r34', 'rule34', 'rules34', 'rule'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!globalThis.db.data.chats[m.chat]?.nsfw) {
        return m.reply(
          `O conteudo *NSFW* esta desabilitado neste grupo.\n\nUm *administrador* pode habilita-lo com:\n>> *${usedPrefix}nsfw on*`,
        );
      }

      const parsed = parseRule34Tags(args);
      if (!parsed.tagsQuery) {
        return client.reply(
          m.chat,
          `[!] Voce deve informar tags para pesquisar.\nExemplos:\n` +
            `- *${usedPrefix + command} neko maid*\n` +
            `- *${usedPrefix + command} tag:neko,maid*\n` +
            `- *${usedPrefix + command} search:"hello kitty"*`,
          m,
        );
      }

      await m.react('\u23F3').catch(async () => {
        await m.reply(DARK_MSG.processing).catch(() => {});
      });

      const safetyTerms = getNsfwSafetyBlockedTerms();
      const encodedTags = encodeURIComponent(parsed.tagsQuery);
      const apiUrl =
        `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1` +
        `&tags=${encodedTags}` +
        `&api_key=a4e807dd6d4c9e55768772996946e4074030ec02c49049d291e5edb8808a97b004190660b4b36c3d21699144c823ad93491d066e73682a632a38f9b6c3cf951b` +
        `&user_id=5753302`;

      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });

      const type = String(res.headers.get('content-type') || '').toLowerCase();
      let rows = [];

      if (res.ok && type.includes('json')) {
        const json = await res.json();
        rows = Array.isArray(json) ? json : json?.post || json?.data || [];
      }

      const mapped = rows
        .map((item) => ({
          id: item?.id ? String(item.id) : '',
          url: item?.file_url || item?.sample_url || item?.preview_url || '',
          tags: item?.tags || item?.tag_string || '',
        }))
        .filter((item) => typeof item.url === 'string' && /\.(jpe?g|png|gif|mp4|webm)$/i.test(item.url))
        .filter((item) => {
          const check = isNsfwCandidateBlocked(item, safetyTerms);
          if (check.blocked) {
            console.log(`[Rule34] bloqueado por filtro de seguranca (${check.hit})`);
          }
          return !check.blocked;
        });

      const unique = [];
      const seen = new Set();
      for (const item of mapped) {
        const key = getCandidateKey(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
      }

      if (!unique.length) {
        await m.react('\u274C');
        return client.reply(m.chat, `[!] Nenhum resultado encontrado para tags: ${parsed.tagsDisplay}`, m);
      }

      const chat = globalThis.db.data.chats[m.chat] || {};
      const history = ensureRule34History(chat);

      const fresh = unique.filter((item) => !history.includes(getCandidateKey(item)));
      const pool = fresh.length ? fresh : unique;
      const shuffled = shuffle(pool);

      let mediaBuffer = null;
      let selected = null;
      for (const candidate of shuffled.slice(0, MAX_FETCH_TRIES)) {
        const buffer = await fetchMediaSafe(candidate.url, {
          validateFirst: true,
          logPrefix: `[Rule34-${parsed.tagsQuery}]`,
        });
        if (buffer) {
          mediaBuffer = buffer;
          selected = candidate;
          break;
        }
      }

      if (!mediaBuffer || !selected) {
        await m.react('\u274C');
        return m.reply(
          `[!] Midia indisponivel.\n\nTodas as URLs retornadas pelo Rule34 falharam ao carregar.\nTente outra tag ou tente novamente mais tarde.`,
        );
      }

      const selectedKey = getCandidateKey(selected);
      pushHistory(history, selectedKey);

      const replayNotice = fresh.length ? '' : '\nAviso: sem novos no historico recente.';
      const caption =
        `*ZAERO BOT - ADULTO (18+)*\n\n` +
        `Tags: ${parsed.tagsDisplay || parsed.tagsQuery}${replayNotice}\n\n` +
        `Aviso: o conteudo 18+ e de sua total responsabilidade.`;

      if (/\.(mp4|webm)$/i.test(selected.url)) {
        await client.sendMessage(m.chat, { video: mediaBuffer, caption, mentions: [m.sender] });
      } else {
        await client.sendMessage(m.chat, { image: mediaBuffer, caption, mentions: [m.sender] });
      }

      await m.react('\u2705');
    } catch (e) {
      await m.react('\u274C');
      console.error(`[Rule34] Erro no comando ${command}:`, e);
      await m.reply(
        `[!] Erro inesperado ao executar *${usedPrefix + command}*.\nDetalhes: ${e.message || DARK_MSG.timeout}`,
      );
    }
  },
};
