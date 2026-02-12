import fs from 'fs';
import path from 'path';
import { resolveLidToRealJid } from "../../lib/utils.js";
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js';
import { runFfmpeg } from '../../lib/system/ffmpeg.js';

const MAX_WA_VIDEO_BYTES = 14 * 1024 * 1024; // 14MB limite WhatsApp
const COMPRESS_THRESHOLD = 8 * 1024 * 1024;  // Comprimir acima de 8MB

function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  // Verificar magic bytes MP4 (ftyp) ou WebM (EBML)
  const hasFtyp = buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp');
  const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  // Verificar que NAO e HTML
  const startsWithHtml = buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<!doctype') ||
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<html');
  if (startsWithHtml) return false;
  return hasFtyp || hasEbml;
}

async function compressVideoBuffer(buffer) {
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const id = Date.now() + '-' + Math.random().toString(16).slice(2);
  const inPath = path.join(tmpDir, `nsfw-in-${id}.mp4`);
  const outPath = path.join(tmpDir, `nsfw-out-${id}.mp4`);
  try {
    fs.writeFileSync(inPath, buffer);
    await runFfmpeg([
      '-y', '-i', inPath,
      '-vf', 'scale=480:-2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '64k',
      '-movflags', '+faststart',
      '-t', '60',
      outPath
    ], { timeoutMs: 60000 });
    const compressed = fs.readFileSync(outPath);
    return compressed;
  } finally {
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
  }
}

const captions = {      
  anal: (from, to) => from === to ? 'Ele colocou em seu ânus.' : 'ele colocou no ânus',
  cum: (from, to) => from === to ? 'ele entrou... Vamos pular isso.' : 'entrou',
  undress: (from, to) => from === to ? 'ele está tirando a roupa' : 'ele está tirando a roupa dela',
  fuck: (from, to) => from === to ? 'rende-se ao desejo' : 'é foda',
  spank: (from, to) => from === to ? 'está batendo' : 'ele está espancando',
  lickpussy: (from, to) => from === to ? 'está lambendo uma buceta' : 'ele está lambendo a buceta dela',
  fap: (from, to) => from === to ? 'se está masturbando' : 'se está masturbando pensando en',
  grope: (from, to) => from === to ? 'ele está tocando' : 'ele está tateando',
  sixnine: (from, to) => from === to ? 'ele está fazendo um 69' : 'ele está fazendo um 69 com',
  suckboobs: (from, to) => from === to ? 'Ele está chupando peitos deliciosos' : 'ele está chupando os peitos dela',
  grabboobs: (from, to) => from === to ? 'ele está pegando alguns peitos' : 'ele está agarrando os peitos dela',
  blowjob: (from, to) => from === to ? 'ele está dando uma chupada deliciosa' : 'deu uma chupada para',
  boobjob: (from, to) => from === to ? 'ele está fazendo um russo' : 'ele está fazendo uma coisa russa para',
  footjob: (from, to) => from === to ? 'ele está dando um footjob' : 'ele está dando um footjob para',
  yuri: (from, to) => from === to ? 'está fazendo uma tesoura!' : 'fiz uma tesoura com',
  cummouth: (from, to) => from === to ? 'é encher a boca de alguém de carinho' : 'está enchendo sua boca com',
  cumshot: (from, to) => from === to ? 'Ele deu para alguém e agora vem o presente' : 'deu um presente surpresa para',
  handjob: (from, to) => from === to ? 'dá uma punheta em alguém com amor' : 'ele está dando uma punheta para',
  lickass: (from, to) => from === to ? 'provar um cuzinho sem parar' : 'ele está lambendo a bunda dela',
  lickdick: (from, to) => from === to ? 'chupa um pênis com vontade' : 'ele coloca tudo na boca para'
};

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)',  '✿(◕ ‿◕)✿',  'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)',  '(∩︵∩)',  '(✪ω✪)',  '(✯◕‿◕✯)', '(•̀ᴗ•́)و ̑̑'];

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

const REDGIFS_HISTORY_LIMIT = 1200;

function normalizeId(value = '') {
  return String(value).toLowerCase().trim();
}

function getChatRedgifsHistory(chat = {}) {
  if (!Array.isArray(chat.nsfwRedgifsSentIds)) {
    chat.nsfwRedgifsSentIds = [];
  }

  chat.nsfwRedgifsSentIds = chat.nsfwRedgifsSentIds
    .map((item) => normalizeId(item))
    .filter(Boolean);

  return chat.nsfwRedgifsSentIds;
}

function registerSentRedgifsId(chat = {}, id = '') {
  const normalized = normalizeId(id);
  if (!normalized) return;

  const history = getChatRedgifsHistory(chat).filter((item) => item !== normalized);
  history.push(normalized);

  if (history.length > REDGIFS_HISTORY_LIMIT) {
    chat.nsfwRedgifsSentIds = history.slice(-REDGIFS_HISTORY_LIMIT);
    return;
  }

  chat.nsfwRedgifsSentIds = history;
}

const alias = {
  anal: ['anal','violar'],
  cum: ['cum','gozar'],
  undress: ['undress','encuerar','tirarroupa'],
  fuck: ['fuck','coger','foder'],
  spank: ['spank','nalgada','bater'],
  lickpussy: ['lickpussy','lamberbuceta'],
  fap: ['fap','paja','punheta'],
  grope: ['grope','apalpar'],
  sixnine: ['sixnine','69'],
  suckboobs: ['suckboobs','chuparpeitos'],
  grabboobs: ['grabboobs','agarrarpeitos'],
  blowjob: ['blowjob','mamada','bj'],
  boobjob: ['boobjob','espanhola'],
  yuri: ['yuri','tijeras'],
  footjob: ['footjob'],
  cummouth: ['cummouth','gozarnaboca'],
  cumshot: ['cumshot'],
  handjob: ['handjob'],
  lickass: ['lickass'],
  lickdick: ['lickdick','lamberpau']
};

export default {
  command: ['anal','violar','cum','gozar','undress','encuerar','tirarroupa','fuck','coger','foder','spank','nalgada','bater','lickpussy','lamberbuceta','fap','paja','punheta','grope','apalpar','sixnine','69','suckboobs','chuparpeitos','grabboobs','agarrarpeitos','blowjob','mamada','bj','boobjob','espanhola','yuri','tijeras','footjob','cummouth','gozarnaboca','cumshot','handjob','lickass','lickdick','lamberpau'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!db.data.chats[m.chat].nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`);
    const chatData = global.db?.data?.chats?.[m.chat] || {};
    const redgifsHistory = getChatRedgifsHistory(chatData);
    const currentCommand = Object.keys(alias).find(key => alias[key].includes(command)) || command;
    if (!captions[currentCommand]) return;
    let mentionedJid = m.mentionedJid || [];

    // Se marcar 2 pessoas: primeira faz ação COM segunda
    // Se marcar 1 pessoa: você faz ação COM pessoa marcada
    // Se não marcar: você faz ação consigo mesmo
    let from, to
    if (mentionedJid.length >= 2) {
      from = await resolveLidToRealJid(mentionedJid[0], client, m.chat);
      to = await resolveLidToRealJid(mentionedJid[1], client, m.chat);
    } else if (mentionedJid.length === 1) {
      from = m.sender;
      to = await resolveLidToRealJid(mentionedJid[0], client, m.chat);
    } else if (m.quoted) {
      from = m.sender;
      to = await resolveLidToRealJid(m.quoted.sender, client, m.chat);
    } else {
      from = m.sender;
      to = m.sender;
    }

    const fromMention = `@${from.split('@')[0]}`;
    const toMention = `@${to.split('@')[0]}`;
    const genero = global.db.data.users[from]?.genre || 'Oculto';
    const captionText = captions[currentCommand](fromMention, toMention, genero);
    const caption = to !== from ? `${fromMention} ${captionText} ${toMention} ${getRandomSymbol()}` : `${fromMention} ${captionText} ${getRandomSymbol()}`;

    try {

      // Envia mensagem de "carregando" (opcional)
      await m.react('⏳');

      // Busca mídia apenas animada (gif/mp4) para interações adultas
      const mediaResult = await fetchNsfwMedia(currentCommand, null, {
        allowedMediaTypes: ['video', 'gif'],
        source: 'redgifs',
        allowStaticFallback: false,
        uniqueIds: true,
        excludeIds: redgifsHistory,
        maxPages: 10,
        perPage: 40
      });

      if (!mediaResult) {
        await m.react('❌');
        return await m.reply(
          `> Fonte temporariamente indisponivel.\n` +
          `Tente novamente em alguns minutos.`
        );
      }
      if (mediaResult.id) {
        registerSentRedgifsId(chatData, mediaResult.id);
      }

      // Validar buffer antes de enviar
      let videoBuffer = mediaResult.buffer;
      const bufferSize = videoBuffer ? videoBuffer.length : 0;
      console.log(`[NSFW] ${command}: buffer ${(bufferSize / 1024 / 1024).toFixed(2)}MB`);

      if (!videoBuffer || bufferSize === 0) {
        // Buffer vazio - tentar enviar por URL
        if (mediaResult.url) {
          console.log(`[NSFW] Buffer vazio, tentando enviar por URL: ${mediaResult.url}`);
          await client.sendMessage(m.chat, {
            video: { url: mediaResult.url },
            gifPlayback: true,
            caption,
            mentions: [from, to]
          }, { quoted: m });
          await m.react('✅');
          return;
        }
        await m.react('❌');
        return m.reply('> Erro: midia nao disponivel. Tente novamente.');
      }

      // Verificar se e video valido (nao HTML ou lixo)
      if (!isValidVideoBuffer(videoBuffer)) {
        console.error(`[NSFW] ${command}: buffer invalido (nao e video). Primeiros bytes: ${videoBuffer.slice(0, 20).toString('hex')}`);
        // Tentar por URL como fallback
        if (mediaResult.url) {
          await client.sendMessage(m.chat, {
            video: { url: mediaResult.url },
            gifPlayback: true,
            caption,
            mentions: [from, to]
          }, { quoted: m });
          await m.react('✅');
          return;
        }
        await m.react('❌');
        return m.reply('> Erro: midia corrompida. Tente novamente.');
      }

      // Comprimir se muito grande
      if (bufferSize > COMPRESS_THRESHOLD) {
        console.log(`[NSFW] ${command}: comprimindo video (${(bufferSize / 1024 / 1024).toFixed(2)}MB > ${(COMPRESS_THRESHOLD / 1024 / 1024).toFixed(0)}MB)`);
        try {
          videoBuffer = await compressVideoBuffer(videoBuffer);
          console.log(`[NSFW] ${command}: comprimido para ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        } catch (compErr) {
          console.error(`[NSFW] ${command}: erro na compressao:`, compErr.message);
          // Continuar com buffer original se compressao falhar
        }
      }

      // Rejeitar se ainda estiver muito grande
      if (videoBuffer.length > MAX_WA_VIDEO_BYTES) {
        console.warn(`[NSFW] ${command}: video muito grande (${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB), enviando por URL`);
        if (mediaResult.url) {
          await client.sendMessage(m.chat, {
            video: { url: mediaResult.url },
            gifPlayback: true,
            caption,
            mentions: [from, to]
          }, { quoted: m });
          await m.react('✅');
          return;
        }
      }

      // Enviar video
      try {
        await client.sendMessage(m.chat, {
          video: videoBuffer,
          gifPlayback: true,
          caption,
          mentions: [from, to]
        }, { quoted: m });
      } catch (sendError) {
        console.error(`[NSFW] ${command}: erro no envio direto, tentando fallback:`, sendError.message);
        // Fallback por URL
        if (mediaResult.url) {
          await client.sendMessage(m.chat, {
            video: { url: mediaResult.url },
            gifPlayback: true,
            caption,
            mentions: [from, to]
          }, { quoted: m });
        } else {
          throw sendError;
        }
      }

      await m.react('✅');
      console.log(`[NSFW] Comando ${command} ok. Tamanho: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    } catch (e) {
      await m.react('❌');
      console.error(`[NSFW] Erro no comando ${command}:`, e);
      await m.reply(
        `> ❌ *Erro inesperado*\n\n` +
        `Ocorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n` +
        `*Detalhes técnicos:* ${e.message}\n\n` +
        `Se o problema persistir, contate o suporte.`
      );
    }
  }
};

