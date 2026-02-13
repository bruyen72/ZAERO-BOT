import { resolveLidToRealJid } from "../../lib/utils.js";
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js';
import {
  COMPRESS_THRESHOLD,
  MAX_WA_VIDEO_BYTES,
  compressVideoBuffer,
  getChatRedgifsHistory,
  isValidVideoBuffer,
  registerSentRedgifsId,
  withChatNsfwQueue,
} from '../../lib/nsfwShared.js';

const captions = {
  anal: (from, to) => from === to ? 'Ele colocou em seu ânus.' : 'ele colocou no ânus de',
  cum: (from, to) => from === to ? 'ele entrou... Vamos pular isso.' : 'entrou em',
  undress: (from, to) => from === to ? 'está tirando a roupa' : 'está tirando a roupa de',
  fuck: (from, to) => from === to ? 'rende-se ao desejo' : 'está fodendo',
  spank: (from, to) => from === to ? 'está batendo na própria bunda' : 'está dando uns tapas em',
  lickpussy: (from, to) => from === to ? 'está lambendo uma buceta' : 'está lambendo a buceta de',
  fap: (from, to) => from === to ? 'está se masturbando' : 'está se masturbando pensando em',
  grope: (from, to) => from === to ? 'está se apalpando' : 'está apalpando',
  sixnine: (from, to) => from === to ? 'está fazendo um 69' : 'está fazendo um 69 com',
  suckboobs: (from, to) => from === to ? 'está chupando peitos deliciosos' : 'está chupando os peitos de',
  grabboobs: (from, to) => from === to ? 'está agarrando uns peitos' : 'está agarrando os peitos de',
  blowjob: (from, to) => from === to ? 'está dando uma chupada deliciosa' : 'deu uma chupada para',
  boobjob: (from, to) => from === to ? 'está fazendo uma espanhola' : 'está fazendo uma espanhola para',
  footjob: (from, to) => from === to ? 'está fazendo um footjob' : 'está fazendo um footjob para',
  yuri: (from, to) => from === to ? 'está fazendo uma tesoura!' : 'fez uma tesoura com',
  cummouth: (from, to) => from === to ? 'está enchendo a boca de leite' : 'está enchendo a boca de',
  cumshot: (from, to) => from === to ? 'deu uma gozada monstro' : 'deu uma gozada surpresa para',
  handjob: (from, to) => from === to ? 'está dando uma punheta com amor' : 'está dando uma punheta para',
  lickass: (from, to) => from === to ? 'está lambendo um cuzinho sem parar' : 'está lambendo a bunda de',
  lickdick: (from, to) => from === to ? 'está chupando um pau com vontade' : 'está chupando o pau de',
  bunda: (from, to) => from === to ? 'está admirando uma bundona' : 'está pegando na bunda de',
  cavalgar: (from, to) => from === to ? 'está cavalgando sozinho' : 'está cavalgando em cima de',
  sentarnacara: (from, to) => from === to ? 'sentou na própria cara (como?)' : 'sentou na cara de',
  creampie: (from, to) => from === to ? 'levou uma gozada dentro' : 'gozou dentro de',
};

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)',  '✿(◕ ‿◕)✿',  'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)',  '(∩︵∩)',  '(✪ω✪)',  '(✯◕‿◕✯)', '(•̀ᴗ•́)و ̑̑'];

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

const alias = {
  anal: ['anal','violar','cuzinho'],
  cum: ['cum','gozar'],
  undress: ['undress','encuerar','tirarroupa','pelada','pelado'],
  fuck: ['fuck','coger','foder','transar','trepar'],
  spank: ['spank','nalgada','bater','tapa','palmada'],
  lickpussy: ['lickpussy','lamberbuceta','chuparbuceta'],
  fap: ['fap','paja','punheta','bronha'],
  grope: ['grope','apalpar'],
  sixnine: ['sixnine','69'],
  suckboobs: ['suckboobs','chuparpeitos','chupartetas'],
  grabboobs: ['grabboobs','agarrarpeitos','peitos','tetas'],
  blowjob: ['blowjob','mamada','bj','boquete','chupar','chupada'],
  boobjob: ['boobjob','espanhola'],
  yuri: ['yuri','tijeras','tesoura','lesbica'],
  footjob: ['footjob','pezinho'],
  cummouth: ['cummouth','gozarnaboca','engolir','leitinho'],
  cumshot: ['cumshot','gozada'],
  handjob: ['handjob','siririca'],
  lickass: ['lickass','lamberbunda','chuparbunda'],
  lickdick: ['lickdick','lamberpau','chuparpau'],
  bunda: ['bunda','bunduda','bundao','raba','rabuda','rabao'],
  cavalgar: ['cavalgar','cavalgada','cavalgando','montar'],
  sentarnacara: ['sentarnacara','sentanacara','facesitting'],
  creampie: ['creampie','gozardentro','gozoudentro','leitinhodentro'],
};

export default {
  command: Object.values(alias).flat(),
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!db.data.chats[m.chat].nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`);
    const chatData = global.db?.data?.chats?.[m.chat] || {};
    const redgifsHistory = getChatRedgifsHistory(chatData);
    const currentCommand = Object.keys(alias).find(key => alias[key].includes(command)) || command;
    if (!captions[currentCommand]) return;
    let mentionedJid = m.mentionedJid || [];

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
      await m.react('⏳');

      await withChatNsfwQueue(m.chat, async () => {
        const mediaResult = await fetchNsfwMedia(currentCommand, null, {
          allowedMediaTypes: ['video', 'gif'],
          source: 'redgifs',
          allowStaticFallback: false,
          uniqueIds: true,
          excludeIds: redgifsHistory,
          maxPages: 3,
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

        let videoBuffer = mediaResult.buffer;
        const bufferSize = videoBuffer ? videoBuffer.length : 0;
        console.log(`[NSFW] ${command}: buffer ${(bufferSize / 1024 / 1024).toFixed(2)}MB`);

        if (!videoBuffer || bufferSize === 0) {
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

        if (!isValidVideoBuffer(videoBuffer)) {
          console.error(`[NSFW] ${command}: buffer invalido (nao e video). Primeiros bytes: ${videoBuffer.slice(0, 20).toString('hex')}`);
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

        if (bufferSize > COMPRESS_THRESHOLD) {
          console.log(`[NSFW] ${command}: comprimindo video (${(bufferSize / 1024 / 1024).toFixed(2)}MB > ${(COMPRESS_THRESHOLD / 1024 / 1024).toFixed(0)}MB)`);
          m.reply('⌛ Otimizando video pro WhatsApp...').catch(() => {});
          try {
            videoBuffer = await compressVideoBuffer(videoBuffer);
            console.log(`[NSFW] ${command}: comprimido para ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);
          } catch (compErr) {
            console.error(`[NSFW] ${command}: erro na compressao:`, compErr.message);
            if (mediaResult.url) {
              console.log(`[NSFW] ${command}: compressao falhou, enviando por URL...`);
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
        }

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

        try {
          await client.sendMessage(m.chat, {
            video: videoBuffer,
            gifPlayback: true,
            caption,
            mentions: [from, to]
          }, { quoted: m });
        } catch (sendError) {
          console.error(`[NSFW] ${command}: erro no envio direto, tentando fallback:`, sendError.message);
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
      });

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
