export const bodyMenu = `> 👋 Olá *@$sender*!
> Eu sou o *ZÆRØ BOT*$cat

╭━━━━━━━━━━━━━━━━━━━╮
│ 👨‍💻 *DESENVOLVEDOR:* Bruno Ruthes
│ 👤 *DONO:* $owner
│ 🤖 *TIPO:* $botType
│ 📱 *DISPOSITIVO:* $device
│ 📅 *DATA:* $tiempo
│ 🕐 *HORA:* $tempo
│ 👥 *USUÁRIOS:* $users
│ ⏱️ *UPTIME:* $uptime
╰━━━━━━━━━━━━━━━━━━━╯

> 💡 Use *$prefixmenu [categoria]* para filtrar os comandos`

export const menuObject = {
economia: `╭━━━ 💰 *ECONOMIA* ━━━╮

💼 *GANHAR DINHEIRO:*
• *$prefixwork* - Trabalhar e ganhar moedas
• *$prefixcrime* - Cometer um crime por dinheiro
• *$prefixdiario* - Bônus diário grátis
• *$prefixsemanal* - Bônus semanal
• *$prefixmonthly* - Bônus mensal

💵 *GERENCIAR MOEDAS:*
• *$prefixbalance* + <@user> - Ver seu saldo
• *$prefixdeposit* + <valor|tudo> - Guardar no banco
• *$prefixwithdraw* + <valor|tudo> - Sacar do banco
• *$prefixgivecoins* + <valor @user> - Transferir moedas

🎰 *JOGOS & APOSTAS:*
• *$prefixcasino* + <valor> - Jogar no cassino
• *$prefixcoinflip* + <valor cara|coroa> - Apostar
• *$prefixroulette* + <valor red|black|green> - Roleta
• *$prefixrobar* + <@user> - Tentar roubar

⚔️ *AVENTURAS:*
• *$prefixaventura* - Ir em aventuras
• *$prefixcazar* - Caçar animais
• *$prefixpescar* - Pescar peixes
• *$prefixminar* - Minerar recursos
• *$prefixmazmorra* - Explorar masmorras
• *$prefixcurar* - Recuperar vida

📊 *RANKINGS:*
- *$prefixeconomyboard* + <pagina> - Top usuarios ricos
- *$prefixeinfo* - Suas estatisticas

╰━━━━━━━━━━━━━━━━━╯`,

gacha: `╭━━━ 🎴 *GACHA/RPG* ━━━╮

🎲 *RECLAMAR PERSONAGENS:*
• *$prefixreclamar* - Reclamar personagem
• *$prefixroll* - Personagem aleatório

👥 *COLEÇÃO:*
• *$prefixharem* + <@user> - Ver coleção
• *$prefixwinfo* + <nome> - Info do personagem
• *$prefixcharimage* + <nome> - Imagem do personagem

💱 *TROCAR & VENDER:*
• *$prefixvender* + <valor nome> - Vender personagem
• *$prefixbuychar* + <nome> - Comprar personagem
• *$prefixgivechar* + <nome @user> - Presentear
• *$prefixtrade* + <seu1 seu2> - Trocar com alguém

⚙️ *PERSONALIZAR:*
• *$prefixsetclaimmsg* + <texto> - Msg ao reclamar
• *$prefixdelclaimmsg* - Remover msg personalizada
• *$prefixsetfav* + <nome> - Marcar favorito
• *$prefixdelfav* + <nome> - Remover favorito

📊 *RANKINGS:*
• *$prefixtopwaifus* + <pág> - Chars mais valiosos
• *$prefixfavtop* - Chars mais favoritados

📚 *INFORMAÇÕES:*
• *$prefixinfogacha* - Suas estatísticas
• *$prefixserielist* - Listar todas as séries
• *$prefixserieinfo* + <nome> - Info do anime

╰━━━━━━━━━━━━━━━━━╯`,

downloads: `╭━━━ 📥 *DOWNLOADS* ━━━╮

🎵 *MÚSICA:*
• *$prefixplay* + <nome|url> - Baixar música do YouTube
• *$prefixmp3* + <url> - Converter para MP3

🎬 *VÍDEOS:*
• *$prefixplay2* + <nome|url> - Vídeo do YouTube
• *$prefixmp4* + <url> - Converter para MP4
• *$prefixsearch* + <termo> - Pesquisar no YouTube

📱 *REDES SOCIAIS:*
• *$prefixig* + <url> - Instagram (foto/vídeo/reels)
• *$prefixtiktok* + <url> - TikTok (sem marca d'água)
• *$prefixfb* + <url> - Facebook vídeos
• *$prefixtwitter* + <url> - Twitter/X (vídeo/imagem)

🖼️ *IMAGENS:*
• *$prefiximg* + <termo> - Buscar imagens Google
• *$prefixpin* + <termo> - Pinterest fotos

📦 *OUTROS:*
• *$prefixapk* + <nome> - Baixar aplicativo Android
• *$prefixmf* + <url> - MediaFire downloads
• *$prefixgit* + <url> - Clonar repositório GitHub

╰━━━━━━━━━━━━━━━━━╯`,

profile: `╭━━━ 👤 *PERFIL* ━━━╮

📊 *VER INFORMAÇÕES:*
• *$prefixperfil* + <@user> - Ver perfil completo
• *$prefixlevel* + <@user> - Ver nível e XP
• *$prefixlboard* + <pág> - Top níveis

⚙️ *CONFIGURAR PERFIL:*
• *$prefixsetgenre* + <homem|mulher> - Definir gênero
• *$prefixdelgenre* - Remover gênero
• *$prefixsetbirth* + <dd/mm/aaaa> - Data nascimento
• *$prefixdelbirth* - Remover aniversário
• *$prefixsetdesc* + <texto> - Descrição
• *$prefixdeldesc* - Remover descrição
• *$prefixsethobby* + <texto> - Hobby/passatempo
• *$prefixremovehobby* - Remover hobby

💑 *RELACIONAMENTO:*
• *$prefixcasarse* + <@user> - Pedir em casamento
• *$prefixdivorce* - Terminar casamento

⭐ *FAVORITOS:*
• *$prefixsetfav* + <personagem> - Definir favorito
• *$prefixdelfav* + <personagem> - Remover favorito

╰━━━━━━━━━━━━━━━━━╯`,

sockets: `╭━━━ 🤖 *BOT* ━━━╮

ℹ️ *INFORMAÇÕES:*
• *$prefixinfobot* - Informações do bot
• *$prefixbots* - Ver bots ativos

🔧 *GERENCIAR BOT:*
• *$prefixjoin* + <link> - Entrar em grupo
• *$prefixleave* - Sair do grupo atual
• *$prefixlogout* - Desconectar bot
• *$prefixreload* - Reiniciar sessão
• *$prefixself* + <on|off> - Bot público/privado

⚙️ *PERSONALIZAR:*
• *$prefixsetgpname* + <nome> - Mudar nome do bot
• *$prefixsetbanner* - Mudar banner do menu
• *$prefixseticon* - Mudar ícone
• *$prefixsetprefix* + <prefixo> - Mudar prefixo
• *$prefixsetcurrency* + <nome> - Mudar nome da moeda
• *$prefixsetowner* + <@user|num> - Mudar dono
• *$prefixsetpfp* - Mudar foto de perfil
• *$prefixsetstatus* + <texto> - Mudar status
• *$prefixsetusername* + <nome> - Mudar username

╰━━━━━━━━━━━━━━━━━╯`,

utils: `╭━━━ 🛠️ *UTILITÁRIOS* ━━━╮

📋 *MENU & AJUDA:*
• *$prefixmenu* + <categoria> - Menu completo
• *$prefixajuda* + <comando> - Ajuda de comando
• *$prefixstatus* - Status do bot
• *$prefixping* - Velocidade do bot

💬 *COMUNICAÇÃO:*
• *$prefixreport* + <erro> - Reportar problema
• *$prefixsuggest* + <ideia> - Enviar sugestão
• *$prefixinvite* + <link> - Convidar bot

🤖 *IA & CONVERSÃO:*
• *$prefixia* + <pergunta> - ChatGPT IA
• *$prefixsticker* + <img|vídeo> - Criar figurinha
• *$prefixtoimg* + <sticker> - Figurinha para imagem
• *$prefixtourl* + <mídia> - Mídia para link

🖼️ *IMAGENS:*
• *$prefixhd* + <imagem> - Melhorar qualidade
• *$prefixbrat* + <texto> - Criar sticker com texto
• *$prefixemojimix* + <emoji1 emoji2> - Misturar emojis
• *$prefixqc* + <texto|@user> - Quote para sticker
• *$prefixattp* + <texto|estilo texto> - Sticker de texto (ATTP)
• Ex.: *$prefixattp fogo ZAERO* | *$prefixattp ola mundo*
• *$prefixmeme* + <1-6> - Meme em figurinha

🌐 *WEB & OUTROS:*
• *$prefixget* + <url> - Fazer requisição HTTP
• *$prefixtraducir* + <idioma texto> - Traduzir texto
• *$prefixsay* + <texto> - Bot repetir mensagem
• *$prefixpfp* + <@user> - Ver foto de perfil
• *$prefixread* + <mídia> - Ver mídia única vez
• *$prefixinspeccionar* + <url> - Info de grupo WA

╰━━━━━━━━━━━━━━━━━╯`,

grupo: `╭━━━ 👥 *GRUPO* ━━━╮

⚙️ *CONFIGURAR GRUPO:*
• *$prefixclose* + <tempo> - Fechar grupo
• *$prefixabrir* + <tempo> - Abrir grupo
• *$prefixgp* - Informações do grupo
• *$prefixlink* - Link do grupo
• *$prefixrevoke* - Redefinir link
• *$prefixsetgpname* + <nome> - Mudar nome
- *$prefixsetgpdesc* + <desc> - Mudar descricao
• *$prefixsetgpbanner* - Mudar foto do grupo

👤 *MEMBROS:*
• *$prefixkick* + <@user> - Remover membro
• *$prefixpromote* + <@user> - Promover a admin
• *$prefixdemote* + <@user> - Remover admin
• *$prefixtagall* + <texto> - Marcar todos

⚠️ *AVISOS:*
• *$prefixwarn* + <@user motivo> - Dar aviso
• *$prefixwarns* + <@user> - Ver avisos
• *$prefixdelwarn* + <@user|all> - Limpar avisos
• *$prefixsetwarnlimit* + <num> - Limite de avisos

🔧 *RECURSOS DO BOT:*
• *$prefixbot* + <on|off> - Ativar/desativar bot
• *$prefixadminonly* + <on|off> - Comandos só admin
• *$prefixeconomia* + <on|off> - Sistema economia
• *$prefixgacha* + <on|off> - Sistema gacha
• *$prefixnsfw* + <on|off> - Comandos +18

✉️ *MENSAGENS:*
• *$prefixwelcome* + <on|off> - Msg boas-vindas
• *$prefixdespedida* + <on|off> - Msg despedida
• *$prefixsetwelcome* + <texto> - Customizar msg
• *$prefixsetgoodbye* + <texto> - Customizar msg

🔗 *PROTEÇÃO:*
• *$prefixantilink* + <on|off> - Anti-links
• *$prefixalertas* + <on|off> - Alertas do grupo

📊 *ESTATÍSTICAS:*
• *$prefixcount* + <@user dias> - Msgs usuário
• *$prefixtopcount* + <dias> - Ranking msgs
• *$prefixtopinactive* + <dias> - Ranking inatividade

╰━━━━━━━━━━━━━━━━━╯`,

nsfw: `╭━━━ 🔞 *NSFW* ━━━╮
> ⚠️ *CONTEÚDO +18 - USE COM RESPONSABILIDADE*

🔍 *BUSCAR CONTEÚDO:*
• *$prefixxnxx* + <termo|url> - Vídeos XNXX
• *$prefixxvideos* + <termo|url> - Vídeos XVideos
• *$prefixredgifs* + <termo|url> - GIF/vídeo curto RedGifs
• *$prefixdanbooru* + <tag> - Imagens Danbooru
• *$prefixgelbooru* + <tag> - Imagens Gelbooru
• *$prefixrule34* + <tag> - Imagens Rule34

😏 *INTERAÇÕES ADULTAS:*
• *$prefixblowjob* + <@user> - Fazer oral
• *$prefixanal* + <@user> - Sexo anal
• *$prefixfuck* + <@user> - Transar
• *$prefixpaja* + <@user> - Punheta
• *$prefixmamada* + <@user> - Chupar
• *$prefixgrabboobs* + <@user> - Agarrar
• *$prefixlickpussy* + <@user> - Lamber
• *$prefix69* + <@user> - Posição 69
• *$prefixcum* + <@user> - Gozar
• *$prefixundress* + <@user> - Despir
• *$prefixnalgada* + <@user> - Dar tapa

⚠️ *ATENÇÃO:* Estes comandos são apenas para entretenimento entre adultos. Use com responsabilidade e respeito.

╰━━━━━━━━━━━━━━━━━╯`,

anime: `╭━━━ 🎭 *ANIME* ━━━╮

🎲 *BUSCAR:*
• *$prefixwaifu* - Waifu aleatória
• *$prefixppcouple* - Fotos de casal anime

😊 *REAÇÕES POSITIVAS:*
• *$prefixabrazar* + <@user> - Abraçar
• *$prefixbesar* + <@user> - Beijar
• *$prefixbeso* + <@user> - Beijinho
• *$prefixacariciar* + <@user> - Fazer carinho
• *$prefixconsolar* + <@user> - Consolar
• *$prefixfeliz* + <@user> - Demonstrar felicidade
• *$prefixlove* + <@user> - Amor
• *$prefixhandhold* + <@user> - Segurar mão

😄 *REAÇÕES DIVERTIDAS:*
• *$prefixlaugh* + <@user> - Rir
• *$prefixaplaudir* + <@user> - Aplaudir
• *$prefixdance* + <@user> - Dançar
• *$prefixgaming* + <@user> - Jogar games
• *$prefixcantar* + <@user> - Cantar
• *$prefixjump* + <@user> - Pular

😠 *REAÇÕES NEGATIVAS:*
• *$prefixmatar* + <@user> - Matar (brincadeira)
• *$prefixpunch* + <@user> - Dar soco
• *$prefixslap* + <@user> - Dar tapa
• *$prefixmorder* + <@user> - Morder
• *$prefixpush* + <@user> - Empurrar
• *$prefixgolpear* + <@user> - Chutar
• *$prefixangry* + <@user> - Ficar bravo

😳 *REAÇÕES EMOTIVAS:*
• *$prefixshy* + <@user> - Timidez
• *$prefixblush* + <@user> - Corar
• *$prefixcry* + <@user> - Chorar
• *$prefixtriste* + <@user> - Tristeza
• *$prefixasustado* + <@user> - Susto
• *$prefixbored* + <@user> - Tédio
• *$prefixpensar* + <@user> - Pensar

🤝 *OUTRAS REAÇÕES:*
• *$prefixwave* + <@user> - Acenar
• *$prefixstare* + <@user> - Olhar
• *$prefixwink* + <@user> - Piscar
• *$prefixtickle* + <@user> - Fazer cócegas
• *$prefixcomer* + <@user> - Comer algo
• *$prefixcafe* + <@user> - Tomar café
• *$prefixdormir* + <@user> - Dormir
• *$prefixfumar* + <@user> - Fumar
• *$prefixdraw* + <@user> - Desenhar
• *$prefixcall* + <@user> - Fazer ligação

╰━━━━━━━━━━━━━━━━━╯`
}
