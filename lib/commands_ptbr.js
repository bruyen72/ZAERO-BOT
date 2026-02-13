export const bodyMenu = `╔═══『 ✧ ZÆRØ BOT ✧ 』═══╗
║
║ 👋 *Olá, $sender!*
║ ✨ Seu assistente virtual de anime
║
╠═══『 📊 STATUS 』═══
║
║ ⚡ *Tipo:* $botType
║ 📱 *Device:* $device
║ 👥 *Usuários:* $users
║ ⏱️ *Online:* $uptime
║ 📅 *Data:* $tiempo
║ 🕐 *Hora:* $tempo
║
╚═══『 ⭐ $botname ⭐ 』═══╝

💡 *Dica:* Use *$prefixmenu [categoria]* para ver comandos específicos`

export const menuObject = {

redes: `╔═══『 📱 REDES SOCIAIS 』═══╗
║
╠══ 📸 INSTAGRAM ══
║
║ 📸 *$prefixig* <url> - Instagram (foto/vídeo/reels)
║ 📸 *$prefixinstagram* <url> - Instagram alternativo
║
╠══ 🎵 TIKTOK ══
║
║ 🎵 *$prefixtiktok* <url> - TikTok (sem marca d'água)
║
╠══ 🐦 TWITTER / X ══
║
║ 🐦 *$prefixtwitter* <url> - Twitter/X (vídeo/imagem)
║
╠══ 📘 FACEBOOK ══
║
║ 📘 *$prefixfb* <url> - Facebook vídeos
║
╚═══『 ⭐ MIDIAS SOCIAIS ⭐ 』═══╝`,

stickers: `╔═══『 ✨ STICKERS & EDIÇÃO 』═══╗
║
╠══ 🧩 CRIAR FIGURINHA ══
║
║ ✨ *$prefixsticker* <img|vídeo> - Criar figurinha
║ 🔥 *$prefixattp* <texto|estilo> - Sticker de texto (ATTP)
║ 📌 Ex.: *$prefixattp fogo ZAERO* | *$prefixattp ola mundo*
║ 💬 *$prefixqc* <texto|@user> - Quote para sticker
║ 🎨 *$prefixbrat* <texto> - Sticker com texto
║ 🎨 *$prefixbratv* <texto> - Brat versão vídeo
║ 😂 *$prefixmeme* <1-6> - Meme em figurinha
║ 😊 *$prefixemojimix* <emoji1 emoji2> - Misturar emojis
║
╠══ 🔁 CONVERTER / LINK ══
║
║ 🖼️ *$prefixtoimg* <sticker> - Figurinha para imagem
║ 🔗 *$prefixtourl* <mídia> - Mídia para link
║ 👁️ *$prefixread* <mídia> - Ver mídia única vez
║
╠══ 🖼️ MELHORAR / CAPTURAR ══
║
║ ✨ *$prefixhd* <imagem> - Melhorar qualidade
║ 🌐 *$prefixssweb* <url> - Screenshot de site
║
╚═══『 ⭐ STICKER PRO ⭐ 』═══╝`,

anime: `╔═══『 🎭 ANIME ROLEPLAY 』═══╗
║
╠══ 🎲 BUSCAR ══
║
║ 💖 *$prefixwaifu* - Waifu aleatória
║ 👫 *$prefixppcouple* - Casal anime
║
╠══ 😊 REAÇÕES POSITIVAS ══
║
║ 🤗 *$prefixabrazar* <@user> - Abraçar
║ 💋 *$prefixbesar* <@user> - Beijar
║ 😘 *$prefixbeso* <@user> - Beijinho
║ 🥰 *$prefixacariciar* <@user> - Carinho
║ 🫂 *$prefixconsolar* <@user> - Consolar
║ 😄 *$prefixfeliz* <@user> - Felicidade
║ ❤️ *$prefixlove* <@user> - Demonstrar amor
║ 🤝 *$prefixhandhold* <@user> - Segurar mão
║
╠══ 😄 REAÇÕES DIVERTIDAS ══
║
║ 😂 *$prefixlaugh* <@user> - Rir
║ 👏 *$prefixaplaudir* <@user> - Aplaudir
║ 💃 *$prefixdance* <@user> - Dançar
║ 🎮 *$prefixgaming* <@user> - Jogar
║ 🎤 *$prefixcantar* <@user> - Cantar
║ 🦘 *$prefixjump* <@user> - Pular
║
╠══ 😠 REAÇÕES NEGATIVAS ══
║
║ 🔫 *$prefixmatar* <@user> - Matar
║ 👊 *$prefixpunch* <@user> - Socar
║ ✋ *$prefixslap* <@user> - Tapa
║ 🦷 *$prefixmorder* <@user> - Morder
║ 🚫 *$prefixpush* <@user> - Empurrar
║ 🦵 *$prefixgolpear* <@user> - Chutar
║ 😡 *$prefixangry* <@user> - Bravo
║
╠══ 😳 REAÇÕES EMOTIVAS ══
║
║ 😳 *$prefixshy* <@user> - Timidez
║ 😊 *$prefixblush* <@user> - Corar
║ 😭 *$prefixcry* <@user> - Chorar
║ 😢 *$prefixtriste* <@user> - Tristeza
║ 😱 *$prefixasustado* <@user> - Susto
║ 😴 *$prefixbored* <@user> - Tédio
║ 🤔 *$prefixpensar* <@user> - Pensar
║
╠══ 🤝 OUTRAS REAÇÕES ══
║
║ 👋 *$prefixwave* <@user> - Acenar
║ 👀 *$prefixstare* <@user> - Olhar
║ 😉 *$prefixwink* <@user> - Piscar
║ ✨ *$prefixtickle* <@user> - Cócegas
║ 🍕 *$prefixcomer* <@user> - Comer
║ ☕ *$prefixcafe* <@user> - Café
║ 😴 *$prefixdormir* <@user> - Dormir
║ 🚬 *$prefixfumar* <@user> - Fumar
║ ✏️ *$prefixdraw* <@user> - Desenhar
║ 📞 *$prefixcall* <@user> - Ligar
║
╚═══『 ⭐ ANIME REACTIONS ⭐ 』═══╝`,

downloads: `╔═══『 📥 DOWNLOADS (GERAL) 』═══╗
║
╠══ 🎬 VÍDEOS (YOUTUBE) ══
║
║ 📹 *$prefixplay2* <nome|url> - Vídeo do YouTube
║ 🎥 *$prefixmp4* <url> - Converter para MP4
║ 🔍 *$prefixsearch* <termo> - Pesquisar no YouTube
║ 📺 *$prefixyt* <url> - Download YouTube
║
╠══ 🖼️ BUSCA DE IMAGENS ══
║
║ 🔍 *$prefiximg* <termo> - Buscar imagens Google
║ 🔍 *$prefiximagen* <termo> - Imagens alternativas
║ 📌 *$prefixpin* <termo> - Pinterest fotos
║ 📌 *$prefixpinterest* <termo> - Pinterest alternativo
║
╠══ 📦 ARQUIVOS / OUTROS ══
║
║ 📲 *$prefixapk* <nome> - Baixar aplicativo Android
║ 📁 *$prefixmf* <url> - MediaFire downloads
║ 🔧 *$prefixgit* <url> - Clonar repositório GitHub
║ 🔧 *$prefixgitclone* <url> - GitHub clone alternativo
║ 📂 *$prefixgrive* <url> - Google Drive downloads
║
╚═══『 ⭐ BAIXAR CONTEÚDO ⭐ 』═══╝`,

profile: `╔═══『 👤 PERFIL 』═══╗
║
╠══ 📊 VER INFORMAÇÕES ══
║
║ 👤 *$prefixperfil* <@user> - Ver perfil completo
║ ⭐ *$prefixlevel* <@user> - Ver nível e XP
║ 🏆 *$prefixlboard* <pág> - Top níveis
║
╠══ ⚙️ CONFIGURAR PERFIL ══
║
║ 👫 *$prefixsetgenre* <homem|mulher> - Definir gênero
║ ❌ *$prefixdelgenre* - Remover gênero
║ 🎂 *$prefixsetbirth* <dd/mm/aaaa> - Data nascimento
║ 🗑️ *$prefixdelbirth* - Remover aniversário
║ 📝 *$prefixsetdesc* <texto> - Descrição
║ ❌ *$prefixdeldesc* - Remover descrição
║ 🎮 *$prefixsethobby* <texto> - Hobby/passatempo
║ 🗑️ *$prefixremovehobby* - Remover hobby
║
╠══ 💑 RELACIONAMENTO ══
║
║ 💍 *$prefixcasarse* <@user> - Pedir em casamento
║ 💍 *$prefixmarry* <@user> - Casar (alternativo)
║ 💔 *$prefixdivorce* - Terminar casamento
║
╠══ ⭐ FAVORITOS ══
║
║ ⭐ *$prefixsetfav* <personagem> - Definir favorito
║ ❌ *$prefixdelfav* <personagem> - Remover favorito
║
╚═══『 ⭐ SEU PERFIL ⭐ 』═══╝`,

grupo: `╔═══『 👥 GRUPO 』═══╗
║
╠══ ⚙️ CONFIGURAR GRUPO ══
║
║ 🔒 *$prefixclose* <tempo> - Fechar grupo
║ 🔓 *$prefixabrir* <tempo> - Abrir grupo
║ ℹ️ *$prefixgp* - Informações do grupo
║ ℹ️ *$prefixsetgp* - Configurar grupo
║ 🔗 *$prefixlink* - Link do grupo
║ 🔄 *$prefixrevoke* - Redefinir link
║ ✏️ *$prefixsetgpname* <nome> - Mudar nome
║ 📝 *$prefixsetgpdesc* <desc> - Mudar descrição
║ 🖼️ *$prefixsetgpbanner* - Mudar foto do grupo
║
╠══ 👤 MEMBROS ══
║
║ 🚫 *$prefixkick* <@user> - Remover membro
║ ⬆️ *$prefixpromote* <@user> - Promover a admin
║ ⬇️ *$prefixdemote* <@user> - Remover admin
║ 📢 *$prefixtagall* <texto> - Marcar todos
║ 📢 *$prefixhidetag* <texto> - Marcar oculto
║
╠══ ⚠️ AVISOS ══
║
║ ⚠️ *$prefixwarn* <@user motivo> - Dar aviso
║ 📋 *$prefixwarns* <@user> - Ver avisos
║ 🗑️ *$prefixdelwarn* <@user|all> - Limpar avisos
║ 📊 *$prefixsetwarnlimit* <num> - Limite de avisos
║
╠══ 🔧 RECURSOS DO BOT ══
║
║ 🤖 *$prefixbot* <on|off> - Ativar/desativar bot
║ 👮 *$prefixadminonly* <on|off> - Comandos só admin
║ 🔞 *$prefixnsfw* <on|off> - Comandos +18
║
╠══ ✉️ MENSAGENS ══
║
║ 👋 *$prefixwelcome* <on|off> - Msg boas-vindas
║ 👋 *$prefixdespedida* <on|off> - Msg despedida
║ ✏️ *$prefixsetwelcome* <texto> - Customizar msg
║ 📝 *$prefixsetgoodbye* <texto> - Customizar msg
║
╠══ 🔗 PROTEÇÃO ══
║
║ 🚫 *$prefixantilink* <on|off> - Anti-links
║ 🔔 *$prefixalertas* <on|off> - Alertas do grupo
║
╠══ 📊 ESTATÍSTICAS ══
║
║ 📈 *$prefixcount* <@user dias> - Msgs usuário
║ 🏆 *$prefixtopcount* <dias> - Ranking msgs
║ 💤 *$prefixtopinactive* <dias> - Ranking inatividade
║
╚═══『 ⭐ ADMIN GRUPO ⭐ 』═══╝`,

utils: `╔═══『 🛠️ UTILITÁRIOS 』═══╗
║
╠══ 📋 MENU & AJUDA ══
║
║ 📖 *$prefixmenu* <categoria> - Menu completo
║ ❓ *$prefixajuda* <comando> - Ajuda de comando
║ 📊 *$prefixstatus* - Status do bot
║ ⚡ *$prefixping* - Velocidade do bot
║
╠══ 💬 COMUNICAÇÃO ══
║
║ 🐛 *$prefixreport* <erro> - Reportar problema
║ 💡 *$prefixsuggest* <ideia> - Enviar sugestão
║ 📨 *$prefixinvite* <link> - Convidar bot
║
╠══ 🤖 IA & CONVERSÃO ══
║
║ 🧠 *$prefixia* <pergunta> - ChatGPT IA
║ ✨ *$prefixsticker* <img|vídeo> - Criar figurinha
║ 🖼️ *$prefixtoimg* <sticker> - Figurinha para imagem
║ 🔗 *$prefixtourl* <mídia> - Mídia para link
║
╠══ 🌐 WEB & OUTROS ══
║
║ 🌐 *$prefixget* <url> - Fazer requisição HTTP
║ 🌍 *$prefixtraducir* <idioma texto> - Traduzir texto
║ 🌍 *$prefixtranslate* <idioma texto> - Traduzir alternativo
║ 🗣️ *$prefixsay* <texto> - Bot repetir mensagem
║ 👤 *$prefixpfp* <@user> - Ver foto de perfil
║ 👤 *$prefixgetpic* <@user> - Foto de perfil alternativo
║ 🔍 *$prefixinspeccionar* <url> - Info de grupo WA
║ ⚙️ *$prefixsetmeta* - Configurar metadados
║
╚═══『 ⭐ FERRAMENTAS ⭐ 』═══╝`,

bot: `╔═══『 🤖 BOT 』═══╗
║
╠══ ℹ️ INFORMAÇÕES ══
║
║ ℹ️ *$prefixinfobot* - Informações do bot
║ 🤖 *$prefixbots* - Ver bots ativos
║
╠══ 🔧 GERENCIAR BOT ══
║
║ ➕ *$prefixjoin* <link> - Entrar em grupo
║ ➖ *$prefixleave* - Sair do grupo atual
║ 🚪 *$prefixlogout* - Desconectar bot
║ 🔄 *$prefixreload* - Reiniciar sessão
║ 🔓 *$prefixself* <on|off> - Bot público/privado
║
╚═══『 ⭐ BOT SYSTEM ⭐ 』═══╝`,

owner: `╔═══『 👑 DONO (OWNER) 』═══╗
║
╠══ ⚙️ PERSONALIZAR ══
║
║ ✏️ *$prefixsetname* <nome> - Mudar nome do bot
║ 🖼️ *$prefixsetbanner* - Mudar banner do menu
║ 🎨 *$prefixseticon* - Mudar ícone
║ 🔤 *$prefixsetprefix* <prefixo> - Mudar prefixo
║ 👑 *$prefixsetowner* <@user|num> - Mudar dono
║ 📸 *$prefixsetpfp* - Mudar foto de perfil
║ 📝 *$prefixsetstatus* <texto> - Mudar status
║ 👤 *$prefixsetusername* <nome> - Mudar username
║ 📢 *$prefixsetchannel* <id> - Configurar canal
║
╠══ 🔧 CONTROLE ══
║
║ 🔄 *$prefixreload* - Reiniciar sessão
║ 🚪 *$prefixlogout* - Desconectar bot
║ 🔓 *$prefixself* <on|off> - Bot público/privado
║
╚═══『 ⭐ CONTROLE DO DONO ⭐ 』═══╝`,

nsfw: `╔═══『 🔞 NSFW 』═══╗
║
║ ⚠️ *CONTEÚDO +18 ANOS*
║ Use com responsabilidade!
║
╠══ 🔍 BUSCAR CONTEÚDO ══
║
║ 🎥 *$prefixxnxx* <termo|url> - Vídeos XNXX
║ 📹 *$prefixxvideos* <termo|url> - Vídeos XVideos
║ 🎞️ *$prefixredgifs* <termo|url> - GIF/vídeo curto RedGifs
║ 🖼️ *$prefixdanbooru* <tag> - Imagens Danbooru
║ 🎨 *$prefixgelbooru* <tag> - Imagens Gelbooru
║ 🔞 *$prefixrule34* <tag> - Imagens Rule34
║
╠══ 😏 INTERAÇÕES ADULTAS ══
║
║ 💋 *$prefixblowjob* <@user> - Fazer oral
║ 💋 *$prefixmamada* <@user> - Chupar
║ 💋 *$prefixbj* <@user> - Boquete
║ 🍑 *$prefixanal* <@user> - Sexo anal
║ 🍑 *$prefixviolar* <@user> - Violar
║ 🔥 *$prefixfuck* <@user> - Transar
║ 🔥 *$prefixcoger* <@user> - Foder
║ ✊ *$prefixfap* <@user> - Punheta
║ ✊ *$prefixpaja* <@user> - Masturbar
║ ✊ *$prefixhandjob* <@user> - Punheta manual
║ 🤲 *$prefixgrabboobs* <@user> - Agarrar peitos
║ 🤲 *$prefixsuckboobs* <@user> - Chupar peitos
║ 💗 *$prefixboobjob* <@user> - Espanhola
║ 👅 *$prefixlickpussy* <@user> - Lamber buceta
║ 👅 *$prefixlickass* <@user> - Lamber bunda
║ 👅 *$prefixlickdick* <@user> - Lamber pau
║ 6️⃣9️⃣ *$prefix69* <@user> - Posição 69
║ 6️⃣9️⃣ *$prefixsixnine* <@user> - 69 alternativo
║ 💦 *$prefixcum* <@user> - Gozar
║ 💦 *$prefixcummouth* <@user> - Gozar na boca
║ 💦 *$prefixcumshot* <@user> - Ejacular
║ 👗 *$prefixundress* <@user> - Despir
║ 👗 *$prefixencuerar* <@user> - Tirar roupa
║ 👋 *$prefixspank* <@user> - Dar tapa
║ 👋 *$prefixnalgada* <@user> - Bater na bunda
║ 🤲 *$prefixgrope* <@user> - Apalpar
║ 👣 *$prefixfootjob* <@user> - Footjob
║ 💕 *$prefixyuri* <@user> - Yuri/Lésbica
║ 💕 *$prefixtijeras* <@user> - Tesoura lésbica
║
║ ⚠️ *ATENÇÃO:* Estes comandos são apenas
║ para entretenimento entre adultos.
║ Use com responsabilidade e respeito.
║
╚═══『 🔞 APENAS +18 🔞 』═══╝`
}
