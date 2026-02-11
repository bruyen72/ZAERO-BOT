import fetch from 'node-fetch';
import fs from 'fs';
import { resolveLidToRealJid } from "../../lib/utils.js";

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

const alias = {
  anal: ['anal','violar'],
  cum: ['cum'],
  undress: ['undress','encuerar'],
  fuck: ['fuck','coger'],
  spank: ['spank','nalgada'],
  lickpussy: ['lickpussy'],
  fap: ['fap','paja'],
  grope: ['grope'],
  sixnine: ['sixnine','69'],
  suckboobs: ['suckboobs'],
  grabboobs: ['grabboobs'],
  blowjob: ['blowjob','mamada','bj'],
  boobjob: ['boobjob'],
  yuri: ['yuri','tijeras'],
  footjob: ['footjob'],
  cummouth: ['cummouth'],
  cumshot: ['cumshot'],
  handjob: ['handjob'],
  lickass: ['lickass'],
  lickdick: ['lickdick']
};

export default {
  command: ['anal','violar','cum','undress','encuerar','fuck','coger','spank','nalgada','lickpussy','fap','paja','grope','sixnine','69','suckboobs','grabboobs','blowjob','mamada','bj','boobjob','yuri','tijeras','footjob','cummouth','cumshot','handjob','lickass','lickdick'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!db.data.chats[m.chat].nsfw) return m.reply(`ꕥ O conteúdo *NSFW* está desabilitado neste grupo.\n\nUm *administrador* pode habilitá-lo com o comando:\n» *${usedPrefix}nsfw on*`);
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
    const nsfw = './lib/nsfw.json'
    const nsfwData = JSON.parse(fs.readFileSync(nsfw))
      const videos = nsfwData[currentCommand];      
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      await client.sendMessage(m.chat, { video: { url: randomVideo }, gifPlayback: true, caption, mentions: [from, to] }, { quoted: m });
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`);
    }
  }
};
