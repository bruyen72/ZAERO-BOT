import fetch from 'node-fetch';
import { resolveLidToRealJid } from "../../lib/utils.js";
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

const captions = {
  peek: (from, to, genero) => from === to ? 'Ele está espionando atrás de uma porta para se divertir.' : `está espiando a`,
  comfort: (from, to) => (from === to ? 'Ele está se consolando.' : 'está consolando a'),
  thinkhard: (from, to) => from === to ? 'Ele estava pensando muito intensamente.' : 'está pensando profundamente sobre',
  curious: (from, to) => from === to ? 'Ele parece curioso sobre tudo.' : 'ele está curioso sobre o que ele faz',
  sniff: (from, to) => from === to ? 'Ele fareja como se estivesse procurando por algo estranho.' : 'está cheirando',
  stare: (from, to) => from === to ? 'Ele olha para o teto sem motivo.' : 'ele olha atentamente para',
  trip: (from, to) => from === to ? 'Ele tropeçou em si mesmo, novamente.' : 'acidentalmente tropeçou',
  blowkiss: (from, to) => (from === to ? 'ele manda um beijo para o espelho.' : 'ele mandou um beijo para'),
  snuggle: (from, to) => from === to ? 'aconchega-se com um travesseiro macio.' : 'aconchega-se docemente com',
  sleep: (from, to, genero) => from === to ? 'Ele está dormindo pacificamente.' : 'está dormindo com',
  cold: (from, to, genero) => (from === to ? 'Ele está com muito frio.' : 'congela de frio'),
  sing: (from, to, genero) => (from === to ? 'está cantando.' : 'está cantando para'),
  tickle: (from, to, genero) => from === to ? 'Está fazendo cócegas.' : 'está fazendo cócegas',
  scream: (from, to, genero) => (from === to ? 'está gritando ao vento.' : 'está gritando com'),
  push: (from, to, genero) => (from === to ? 'Ele se esforçou.' : 'empurrado'),
  nope: (from, to, genero) => (from === to ? 'expressa claramente seu desacordo.' : 'diz “Não!” para'),
  jump: (from, to, genero) => (from === to ? 'pule para a felicidade.' : 'pular feliz com'),
  heat: (from, to, genero) => (from === to ? 'sente muito calor.' : 'tem calor para'),
  gaming: (from, to, genero) => (from === to ? 'Ele está jogando sozinho.' : 'está brincando com'),
  draw: (from, to, genero) => (from === to ? 'faz um belo desenho.' : 'desenho inspirado em'),
  call: (from, to, genero) => from === to ? 'Ele disca seu próprio número esperando uma resposta.' : 'ligou para o número',
  seduce: (from, to, genero) => from === to ? 'Ela lançou um olhar sedutor para o espaço.' : 'está tentando seduzir',
  shy: (from, to, genero) => from === to ? `Ele corou timidamente e desviou o olhar.` : `parece demais ${genero === 'Hombre' ? 'tímido' : genero === 'Mujer' ? 'tímida' : 'tímide'} olhar`,
  slap: (from, to, genero) => from === to ? `ele se deu um tapa ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'ele deu um tapa',
  bath: (from, to) => (from === to ? 'está tomando banho' : 'está tomando banho'),
  angry: (from, to, genero) => from === to ? `é muito ${genero === 'Hombre' ? 'enojado' : genero === 'Mujer' ? 'enojada' : 'enojadx'}.` : `está super ${genero === 'Hombre' ? 'enojado' : genero === 'Mujer' ? 'enojada' : 'enojadx'} con`,
  bored: (from, to, genero) => from === to ? `é muito ${genero === 'Hombre' ? 'aburrido' : genero === 'Mujer' ? 'aburrida' : 'aburridx'}.` : `está ${genero === 'Hombre' ? 'aburrido' : genero === 'Mujer' ? 'aburrida' : 'aburridx'} de`,
  bite: (from, to, genero) => from === to ? `ele se mordeu ${genero === 'Hombre' ? 'solito' : genero === 'Mujer' ? 'solita' : 'solitx'}.` : 'mordido',
  bleh: (from, to) => from === to ? 'Ele mostrou a língua na frente do espelho.' : 'Ele está fazendo caretas com a língua',
  bonk: (from, to, genero) => from === to ? `ele se deu uma surra ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'ele bateu',
  blush: (from, to) => (from === to ? 'Ele corou.' : 'ele corou por'),
  impregnate: (from, to) => (from === to ? 'ela engravidou' : 'engravidei'),
  bully: (from, to, genero) => from === to ? `o bullying é feito ${genero === 'Hombre' ? 'ele mesmo' : genero === 'Mujer' ? 'ela mesma' : 'ele/ela/ele mesmo'}… alguém ${genero === 'Hombre' ? 'abrace-o' : genero === 'Mujer' ? 'abraçá-la' : `que ${genero === 'Hombre' ? 'lo' : genero === 'Mujer' ? 'la' : 'lx'} ayude`}.` : 'é bullying',
  cry: (from, to) => (from === to ? 'está chorando' : 'está chorando por'),
  happy: (from, to) => (from === to ? 'está feliz.' : 'está feliz com'),
  coffee: (from, to) => (from === to ? 'está tomando café.' : 'está tomando café com'),
  clap: (from, to) => (from === to ? 'Ele está aplaudindo por alguma coisa.' : 'está aplaudindo por'),
  cringe: (from, to) => (from === to ? 'sinta arrepios.' : 'sente arrepios por'),
  dance: (from, to) => (from === to ? 'está dançando' : 'está dançando com'),
  cuddle: (from, to, genero) => from === to ? `enrolado ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'aconchegado com',
  drunk: (from, to, genero) => from === to ? `é demais ${genero === 'Hombre' ? 'borracho' : genero === 'Mujer' ? 'borracha' : 'borrachx'}` : `está ${genero === 'Hombre' ? 'borracho' : genero === 'Mujer' ? 'borracha' : 'borrachx'} con`,
  dramatic: (from, to) => from === to ? 'Ele está fazendo um drama exagerado.' : 'está fazendo um drama',
  handhold: (from, to, genero) => from === to ? `ele apertou a mão de si mesmo ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'agarrou a mão dele',
  eat: (from, to) => (from === to ? 'Ele está comendo algo delicioso.' : 'está comendo com'),
  highfive: (from, to) => from === to ? 'Ele deu um high five na frente do espelho.' : 'toca aqui',
  hug: (from, to, genero) => from === to ? `ele se abraçou ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'deu um abraço em',
  kill: (from, to) => (from === to ? 'Ele se eliminou de forma dramática.' : 'assassinado'),
  kiss: (from, to) => (from === to ? 'Um beijo foi lançado no ar.' : 'deu um beijo em'),
  kisscheek: (from, to) => from === to ? 'Ele se beijou na bochecha usando um espelho.' : 'deu-lhe um beijo na bochecha',
  lick: (from, to) => (from === to ? 'ele se lambeu por curiosidade.' : 'lambeu'),
  laugh: (from, to) => (from === to ? 'Ele está rindo de alguma coisa.' : 'está tirando sarro'),
  pat: (from, to) => (from === to ? 'Ele acariciou sua cabeça com ternura.' : 'le dio una caricia a'),
  love: (from, to, genero) => from === to ? `ele se ama muito ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'sinta-se atraído por',
  pout: (from, to, genero) => from === to ? `está fazendo beicinho ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'está fazendo beicinho com',
  punch: (from, to) => (from === to ? 'Ele deu um soco no ar.' : 'ele deu um soco'),
  run: (from, to) => (from === to ? 'Ele está correndo para salvar sua vida.' : 'está correndo com'),
  scared: (from, to, genero) => from === to ? `está ${genero === 'Hombre' ? 'asustado' : genero === 'Mujer' ? 'asustada' : 'asustxd'} por alguma coisa.` : `está ${genero === 'Hombre' ? 'asustado' : genero === 'Mujer' ? 'asustada' : 'asustxd'} por`,
  sad: (from, to) => (from === to ? `está triste` : `está expressando sua tristeza`),
  smoke: (from, to) => (from === to ? 'está fumando tranquilamente.' : 'está fumando com'),
  smile: (from, to) => (from === to ? 'está sorrindo.' : 'ele sorriu para'),
  spit: (from, to, genero) => from === to ? `ele cuspiu em si mesmo ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} por acidente.` : 'cuspiu em',
  smug: (from, to) => (from === to ? 'Ele está se exibindo muito ultimamente.' : 'está se exibindo'),
  think: (from, to) => from === to ? 'está pensando profundamente.' : 'não consigo parar de pensar',
  step: (from, to, genero) => from === to ? `pisou em si mesmo ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} por acidente.` : 'está pisando a',
  wave: (from, to, genero) => from === to ? `ele se cumprimentou ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} no espelho.` : 'está cumprimentando',
  walk: (from, to) => (from === to ? 'Ele foi passear sozinho.' : 'decidi dar um passeio com'),
  wink: (from, to, genero) => from === to ? `ele piscou para si mesmo ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} no espelho.` : 'piscou para',
  psycho: (from, to) => from === to ? 'Ele está agindo como um psicopata.' : 'está tendo um ataque de loucura',
  poke: (from, to) => from === to ? 'ele se picou.' : 'torneiras',
  cook: (from, to) => from === to ? 'Ele está focado na cozinha.' : 'se diverte cozinhando com',
  lewd: (from, to) => from === to ? 'se comporta de forma provocativa.' : 'move-se sedutoramente através',
  greet: (from, to) => from === to ? 'Ele estende a mão para cumprimentar a todos.' : 'estenda a mão para cumprimentar',
  facepalm: (from, to) => from === to ? 'Ele fica frustrado e dá um tapa na cara.' : 'dá um tapa na cara',
}

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)', '✿(◕ ‿◕)✿', 'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)', '(∩︵∩)', '(✪ω✪)', '(✯◕‿◕✯)', '(•̀ᴗ•́)و ̑̑']
function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

const alias = {
  psycho: ['psycho', 'locura'],
  poke: ['poke', 'picar'],
  cook: ['cook', 'cocinar'],
  lewd: ['lewd', 'provocativo', 'provocativa'],
  greet: ['greet', 'saludar', 'hola', 'hi'],
  facepalm: ['facepalm', 'palmada', 'frustracion'],
  angry: ['angry','enojado','enojada'],
  bleh: ['bleh'],
  bored: ['bored','aburrido','aburrida'],
  clap: ['clap','aplaudir'],
  coffee: ['coffee','cafe'],
  dramatic: ['dramatic','drama'],
  drunk: ['drunk'],
  cold: ['cold'],
  impregnate: ['impregnate','preg','impregnar','embarazar'],
  kisscheek: ['kisscheek','beso','besar'],
  laugh: ['laugh'],
  love: ['love','amor'],
  pout: ['pout','mueca'],
  punch: ['punch','golpear'],
  run: ['run','correr'],
  sad: ['sad','triste'],
  scared: ['scared','asustado'],
  seduce: ['seduce','seducir'],
  shy: ['shy','timido','timida'],
  sleep: ['sleep','dormir'],
  smoke: ['smoke','fumar'],
  spit: ['spit','escupir'],
  step: ['step','pisar'],
  think: ['think','pensar'],
  walk: ['walk','caminar'],
  hug: ['hug','abrazar'],
  kill: ['kill','matar'],
  eat: ['eat','nom','comer'],
  kiss: ['kiss','muak','besar'],
  wink: ['wink','guiñar'],
  pat: ['pat','acariciar'],
  happy: ['happy','feliz'],
  bully: ['bully','molestar'],
  bite: ['bite','morder'],
  blush: ['blush','sonrojarse'],
  wave: ['wave','saludar'],
  bath: ['bath','tome um banho'],
  smug: ['smug','presumir'],
  smile: ['smile','sonreir'],
  highfive: ['highfive','choca'],
  handhold: ['handhold','tomar'],
  cringe: ['cringe','mueca'],
  bonk: ['bonk','golpe'],
  cry: ['cry','llorar'],
  lick: ['lick','lamer'],
  slap: ['slap','bofetada'],
  dance: ['dance','bailar'],
  cuddle: ['cuddle','acurrucar'],
  sing: ['sing','cantar'],
  tickle: ['tickle','cosquillas'],
  scream: ['scream','gritar'],
  push: ['push','empujar'],
  nope: ['nope','no'],
  jump: ['jump','saltar'],
  heat: ['heat','calor'],
  gaming: ['gaming','jugar'],
  draw: ['draw','dibujar'],
  call: ['call','llamar'],
  snuggle: ['snuggle','acurrucarse'],
  blowkiss: ['blowkiss','besito'],
  trip: ['trip','tropezar'],
  stare: ['stare','mirar'],
  sniff: ['sniff','oler'],
  curious: ['curious','curioso','curiosa'],
  thinkhard: ['thinkhard','pensar'],
  comfort: ['comfort','consolar'],
  peek: ['peek','mirar']
};

export default {
command: Array.from(new Set(['angry','enojado','enojada','bleh','bored','aburrido','aburrida','clap','aplaudir','coffee','cafe','dramatic','drama','drunk','cold','impregnate','preg','impregnar','embarazar','kisscheek','beso','besar','laugh','love','amor','pout','mueca','punch','golpear','run','correr','sad','triste','scared','asustado','seduce','seducir','shy','timido','timida','sleep','dormir','smoke','fumar','spit','escupir','step','pisar','think','pensar','walk','caminar','hug','abrazar','kill','matar','eat','nom','comer','kiss','muak','wink','guiñar','pat','acariciar','happy','feliz','bully','molestar','bite','morder','blush','sonrojarse','wave','saludar','bath','tome um banho','smug','presumir','smile','sonreir','highfive','choca','handhold','tomar','cringe','mueca','bonk','golpe','cry','llorar','lick','lamer','slap','bofetada','dance','bailar','cuddle','acurrucar','sing','cantar','tickle','cosquillas','scream','gritar','push','empujar','nope','no','jump','saltar','heat','calor','gaming','jugar','draw','dibujar','call','llamar','snuggle','acurrucarse','blowkiss','besito','trip','tropezar','stare','mirar','sniff','oler','curious','curioso','curiosa','thinkhard','pensar','comfort','consolar','peek','mirar','psycho','locura','poke','picar','cook','cocinar','lewd','provocativo','provocativa','greet','saludar','hola','hi','facepalm','palmada','frustracion'])),
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    const currentCommand = Object.keys(alias).find(key => alias[key].includes(command)) || command
    if (!captions[currentCommand]) return
    let mentionedJid = m.mentionedJid || []

    // Se marcar 2 pessoas: primeira faz ação COM segunda
    // Se marcar 1 pessoa: você faz ação COM pessoa marcada
    // Se não marcar: você faz ação consigo mesmo
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

      // Tenta múltiplos GIFs (fallback)
      let buffer = null;
      let successUrl = null;

      for (let i = 0; i < Math.min(gifs.length, 5); i++) {
        const media = gifs[i].media_formats
        const url = media.mp4?.url || media.tinymp4?.url || media.loopedmp4?.url || media.gif?.url || media.tinygif?.url

        if (!url) continue;

        // Tenta baixar com sistema robusto
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

      // Envia com o buffer baixado
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
