import fetch from 'node-fetch';
import { resolveLidToRealJid } from "../../lib/utils.js";
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

const captions = {
  peek: (from, to) => from === to ? 'Ele está espiando atrás de uma porta para se divertir.' : `está espiando a`,
  comfort: (from, to) => (from === to ? 'Ele está se consolando.' : 'está consolando a'),
  thinkhard: (from, to) => from === to ? 'Ele estava pensando muito intensamente.' : 'está pensando profundamente sobre',
  curious: (from, to) => from === to ? 'Ele parece curioso sobre tudo.' : 'ele está curioso sobre o que ele faz',
  sniff: (from, to) => from === to ? 'Ele fareja como se estivesse procurando por algo estranho.' : 'está cheirando',
  stare: (from, to) => from === to ? 'Ele olha para o teto sem motivo.' : 'ele olha atentamente para',
  trip: (from, to) => from === to ? 'Ele tropeçou em si mesmo, novamente.' : 'acidentalmente tropeçou',
  blowkiss: (from, to) => (from === to ? 'ele manda um beijo para o espelho.' : 'ele mandou um beijo para'),
  snuggle: (from, to) => from === to ? 'aconchega-se com um travesseiro macio.' : 'aconchega-se docemente com',
  sleep: (from, to) => from === to ? 'Ele está dormindo pacificamente.' : 'está dormindo com',
  cold: (from, to) => (from === to ? 'Ele está com muito frio.' : 'congela de frio'),
  sing: (from, to) => (from === to ? 'está cantando.' : 'está cantando para'),
  tickle: (from, to) => from === to ? 'Está fazendo cócegas.' : 'está fazendo cócegas em',
  scream: (from, to) => (from === to ? 'está gritando ao vento.' : 'está gritando com'),
  push: (from, to) => (from === to ? 'Ele se esforçou.' : 'empurrou'),
  nope: (from, to) => (from === to ? 'expressa claramente seu desacordo.' : 'diz “Não!” para'),
  jump: (from, to) => (from === to ? 'pule para a felicidade.' : 'pular feliz com'),
  heat: (from, to) => (from === to ? 'sente muito calor.' : 'tem calor para'),
  gaming: (from, to) => (from === to ? 'Ele está jogando sozinho.' : 'está jogando com'),
  draw: (from, to) => (from === to ? 'faz um belo desenho.' : 'desenho inspirado em'),
  call: (from, to) => from === to ? 'Ele disca seu próprio número esperando uma resposta.' : 'ligou para o número',
  seduce: (from, to) => from === to ? 'Ela lançou um olhar sedutor para o espaço.' : 'está tentando seduzir',
  shy: (from, to, genero) => from === to ? `Ele corou timidamente e desviou o olhar.` : `parece muito ${genero === 'Hombre' ? 'tímido' : genero === 'Mujer' ? 'tímida' : 'tímide'} ao olhar para`,
  slap: (from, to, genero) => from === to ? `ele se deu um tapa em si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'}.` : 'ele deu um tapa em',
  bath: (from, to) => (from === to ? 'está tomando banho' : 'está tomando banho'),
  angry: (from, to, genero) => from === to ? `está muito ${genero === 'Hombre' ? 'bravo' : genero === 'Mujer' ? 'brava' : 'brave'}.` : `está super ${genero === 'Hombre' ? 'bravo' : genero === 'Mujer' ? 'brava' : 'brave'} com`,
  bored: (from, to, genero) => from === to ? `está muito ${genero === 'Hombre' ? 'entediado' : genero === 'Mujer' ? 'entediada' : 'entediade'}.` : `está ${genero === 'Hombre' ? 'entediado' : genero === 'Mujer' ? 'entediada' : 'entediade'} de`,
  bite: (from, to, genero) => from === to ? `ele se mordeu ${genero === 'Hombre' ? 'sozinho' : genero === 'Mujer' ? 'sozinha' : 'sozinhx'}.` : 'mordeu',
  bleh: (from, to) => from === to ? 'Ele mostrou a língua na frente do espelho.' : 'Ele está fazendo caretas com a língua para',
  bonk: (from, to, genero) => from === to ? `ele se deu uma batida em si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'}.` : 'ele deu uma batida em',
  blush: (from, to) => (from === to ? 'Ele corou.' : 'ele corou por'),
  impregnate: (from, to) => (from === to ? 'ela engravidou' : 'engravidou'),
  bully: (from, to, genero) => from === to ? `o bullying é feito ${genero === 'Hombre' ? 'ele mesmo' : genero === 'Mujer' ? 'ela mesma' : 'ele/ela/mesmo'}… alguém ${genero === 'Hombre' ? 'abrace-o' : genero === 'Mujer' ? 'abrace-a' : `que ${genero === 'Hombre' ? 'o' : genero === 'Mujer' ? 'a' : 'x'} ajude`}.` : 'está fazendo bullying com',
  cry: (from, to) => (from === to ? 'está chorando' : 'está chorando por'),
  happy: (from, to) => (from === to ? 'está feliz.' : 'está feliz com'),
  coffee: (from, to) => (from === to ? 'está tomando café.' : 'está tomando café com'),
  clap: (from, to) => (from === to ? 'Ele está aplaudindo por alguma coisa.' : 'está aplaudindo por'),
  cringe: (from, to) => (from === to ? 'sente arrepios.' : 'sente arrepios por'),
  dance: (from, to) => (from === to ? 'está dançando' : 'está dançando com'),
  cuddle: (from, to, genero) => from === to ? `enrolado ${genero === 'Hombre' ? 'sozinho' : genero === 'Mujer' ? 'sozinha' : 'sozinhx'}.` : 'aconchegado com',
  drunk: (from, to, genero) => from === to ? `está muito ${genero === 'Hombre' ? 'bêbado' : genero === 'Mujer' ? 'bêbada' : 'bêbade'}` : `está ${genero === 'Hombre' ? 'bêbado' : genero === 'Mujer' ? 'bêbada' : 'bêbade'} com`,
  dramatic: (from, to) => from === to ? 'Ele está fazendo um drama exagerado.' : 'está fazendo um drama para',
  handhold: (from, to, genero) => from === to ? `ele segurou a mão de si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'}.` : 'segurou a mão de',
  eat: (from, to) => (from === to ? 'Ele está comendo algo delicioso.' : 'está comendo com'),
  highfive: (from, to) => from === to ? 'Ele deu um high five na frente do espelho.' : 'toca aqui',
  hug: (from, to, genero) => from === to ? `ele se abraçou ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'}.` : 'deu um abraço em',
  kill: (from, to) => (from === to ? 'Ele se eliminou de forma dramática.' : 'matou'),
  kiss: (from, to) => (from === to ? 'Um beijo foi lançado no ar.' : 'deu um beijo em'),
  kisscheek: (from, to) => from === to ? 'Ele se beijou na bochecha usando um espelho.' : 'deu um beijo na bochecha de',
  lick: (from, to) => (from === to ? 'ele se lambeu por curiosidade.' : 'lambeu'),
  laugh: (from, to) => (from === to ? 'Ele está rindo de alguma coisa.' : 'está rindo de'),
  pat: (from, to) => (from === to ? 'Ele acariciou sua própria cabeça com ternura.' : 'fez carinho em'),
  love: (from, to, genero) => from === to ? `ele se ama muito ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'}.` : 'está atraído por',
  pout: (from, to, genero) => from === to ? `está fazendo beicinho ${genero === 'Hombre' ? 'sozinho' : genero === 'Mujer' ? 'sozinha' : 'sozinhx'}.` : 'está fazendo beicinho para',
  punch: (from, to) => (from === to ? 'Ele deu um soco no ar.' : 'deu um soco em'),
  run: (from, to) => (from === to ? 'Ele está correndo para salvar sua vida.' : 'está correndo com'),
  scared: (from, to, genero) => from === to ? `está ${genero === 'Hombre' ? 'assustado' : genero === 'Mujer' ? 'assustada' : 'assustade'} por alguma coisa.` : `está ${genero === 'Hombre' ? 'assustado' : genero === 'Mujer' ? 'assustada' : 'assustade'} por`,
  sad: (from, to) => (from === to ? `está triste` : `está expressando sua tristeza para`),
  smoke: (from, to) => (from === to ? 'está fumando tranquilamente.' : 'está fumando com'),
  smile: (from, to) => (from === to ? 'está sorrindo.' : 'sorriu para'),
  spit: (from, to, genero) => from === to ? `ele cuspiu em si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'} por acidente.` : 'cuspiu em',
  smug: (from, to) => (from === to ? 'Ele está se exibindo muito ultimamente.' : 'está se exibindo para'),
  think: (from, to) => from === to ? 'está pensando profundamente.' : 'não consegue parar de pensar em',
  step: (from, to, genero) => from === to ? `pisou em si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'} por acidente.` : 'está pisando em',
  wave: (from, to, genero) => from === to ? `ele se cumprimentou ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'} no espelho.` : 'está acenando para',
  walk: (from, to) => (from === to ? 'Ele foi passear sozinho.' : 'decidiu dar um passeio com'),
  wink: (from, to, genero) => from === to ? `ele piscou para si ${genero === 'Hombre' ? 'mesmo' : genero === 'Mujer' ? 'mesma' : 'mesmx'} no espelho.` : 'piscou para',
  psycho: (from, to) => from === to ? 'Ele está agindo como um psicopata.' : 'está tendo um ataque de loucura com',
  poke: (from, to) => from === to ? 'ele se cutucou.' : 'cutucou',
  cook: (from, to) => from === to ? 'Ele está focado na cozinha.' : 'se diverte cozinhando com',
  lewd: (from, to) => from === to ? 'se comporta de forma provocativa.' : 'move-se sedutoramente para',
  greet: (from, to) => from === to ? 'Ele estende a mão para cumprimentar a todos.' : 'estende a mão para cumprimentar',
  facepalm: (from, to) => from === to ? 'Ele fica frustrado e dá um tapa na própria cara.' : 'dá um tapa na cara por causa de',
}

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)', '✿(◕ ‿◕)✿', 'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)', '(∩︵∩)', '(✪ω✪)', '(✯◕‿◕✯)', '(•̀ᴗ•́)u ̑̑']
function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

const alias = {
  psycho: ['psycho', 'loucura'],
  poke: ['poke', 'cutucar'],
  cook: ['cook', 'cozinhar'],
  lewd: ['lewd', 'provocativo', 'provocativa'],
  greet: ['greet', 'saudar', 'ola', 'hi', 'cumprimentar'],
  facepalm: ['facepalm', 'palmada', 'frustracao'],
  angry: ['angry','bravo','brava','irritado','irritada'],
  bleh: ['bleh'],
  bored: ['bored','entediado','entediada'],
  clap: ['clap','aplaudir'],
  coffee: ['coffee','cafe'],
  dramatic: ['dramatic','drama'],
  drunk: ['drunk','bebado','bebada'],
  cold: ['cold','frio'],
  impregnate: ['impregnate','preg','engravidar','embaracar'],
  kisscheek: ['kisscheek','beijinho'],
  laugh: ['laugh','rir'],
  love: ['love','amor'],
  pout: ['pout','beicinho'],
  punch: ['punch','socar','murro'],
  run: ['run','correr'],
  sad: ['sad','triste'],
  scared: ['scared','assustado','assustada'],
  seduce: ['seduce','seduzir'],
  shy: ['shy','timido','timida'],
  sleep: ['sleep','dormir'],
  smoke: ['smoke','fumar'],
  spit: ['spit','cuspir'],
  step: ['step','pisar'],
  think: ['think','pensar'],
  walk: ['walk','caminhar','passear'],
  hug: ['hug','abracar','abraco'],
  kill: ['kill','matar'],
  eat: ['eat','comer'],
  kiss: ['kiss','beijar','beijo'],
  wink: ['wink','piscar'],
  pat: ['pat','acariciar','carinho'],
  happy: ['happy','feliz'],
  bully: ['bully','zoar','molestar'],
  bite: ['bite','morder'],
  blush: ['blush','corar','envergonhado'],
  wave: ['wave','acenar','saudar'],
  bath: ['bath','banho'],
  smug: ['smug','presumido'],
  smile: ['smile','sorrir','sorriso'],
  highfive: ['highfive','tocaaqui'],
  handhold: ['handhold','segurarmão'],
  cringe: ['cringe'],
  bonk: ['bonk'],
  cry: ['cry','chorar'],
  lick: ['lick','lamber'],
  slap: ['slap','tapa'],
  dance: ['dance','dancar'],
  cuddle: ['cuddle','aconchegar'],
  sing: ['sing','cantar'],
  tickle: ['tickle','cocegas'],
  scream: ['scream','gritar'],
  push: ['push','empurrar'],
  nope: ['nope','nao'],
  jump: ['jump','pular'],
  heat: ['heat','calor'],
  gaming: ['gaming','jogar'],
  draw: ['draw','desenhar'],
  call: ['call','ligar'],
  snuggle: ['snuggle','aconchegarse'],
  blowkiss: ['blowkiss','beijinhoar'],
  trip: ['trip','tropeçar'],
  stare: ['stare','olhar'],
  sniff: ['sniff','cheirar'],
  curious: ['curious','curioso','curiosa'],
  thinkhard: ['thinkhard','pensarmuito'],
  comfort: ['comfort','consolar'],
  peek: ['peek','espiar']
};

export default {
command: Array.from(new Set(Object.values(alias).flat())),
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    const currentCommand = Object.keys(alias).find(key => alias[key].includes(command)) || command
    if (!captions[currentCommand]) return
    let mentionedJid = m.mentionedJid || []

    let from, to
    if (mentionedJid.length >= 2) {
      from = await resolveLidToRealJid(mentionedJid[0], client, m.chat)
      to = await resolveLidToRealJid(mentionedJid[1], client, m.chat)
    } else if (mentionedJid.length === 1) {
      from = m.sender
      to = await resolveLidToRealJid(mentionedJid[0], client, m.chat)
    } else if (m.quoted) {
      from = m.sender
      to = await resolveLidToRealJid(m.quoted.sender, client, m.chat)
    } else {
      from = m.sender
      to = m.sender
    }

    const fromMention = `@${from.split('@')[0]}`
    const toMention = `@${to.split('@')[0]}`
    const genero = global.db.data.users[from]?.genre || 'Oculto'
    const captionText = captions[currentCommand](fromMention, toMention, genero)
    const caption = to !== from ? `${fromMention} ${captionText} ${toMention} ${getRandomSymbol()}` : `${fromMention} ${captionText} ${getRandomSymbol()}`

    try {
      await m.react('⏳');

      const response = await fetch(`https://tenor.googleapis.com/v2/search?q=anime+${encodeURIComponent(currentCommand)}&key=AIzaSyCY8VRFGjKZ2wpAoRTQ3faV_XcwTrYL5DA&limit=20`)
      const json = await response.json()
      const gifs = json.results

      if (!gifs || gifs.length === 0) {
        await m.react('❌');
        throw new Error('Nenhum resultado encontrado na API do Tenor.')
      }

      let buffer = null;
      let successUrl = null;

      for (let i = 0; i < Math.min(gifs.length, 5); i++) {
        const media = gifs[i].media_formats
        const url = media.mp4?.url || media.tinymp4?.url || media.loopedmp4?.url || media.gif?.url || media.tinygif?.url

        if (!url) continue;

        buffer = await fetchMediaSafe(url, {
          validateFirst: true,
          logPrefix: `[Anime-${currentCommand}]`
        });

        if (buffer) {
          successUrl = url;
          break;
        }
      }

      if (!buffer) {
        await m.react('❌');
        return await m.reply(
          `> ⚠️ *Mídia temporariamente indisponível*\n\n` +
          `Não foi possível carregar o GIF animado do Tenor.\n` +
          `Tente novamente em alguns instantes.`
        );
      }

      await client.sendMessage(
        m.chat,
        {
          video: buffer,
          gifPlayback: true,
          caption,
          mentions: [from, to]
        },
        { quoted: m }
      );

      await m.react('✅');

    } catch (e) {
      await m.react('❌');
      console.error(`[Anime] Erro no comando ${command}:`, e);
      await m.reply(`> ❌ *Erro inesperado*\n\nOcorreu um erro ao executar o comando *${usedPrefix + command}*.\n\n*Detalhes:* ${e.message}\n\nSe o problema persistir, contate o suporte.`)
    }
  },
};
