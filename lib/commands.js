/**
 * ZÆRØ BOT - Configuração de Menu e Comandos (PT-BR)
 * Organizado por categorias para facilitar a navegação.
 */

export const bodyMenu = `╔═══『 ✧ ZÆRØ BOT ✧ 』═══╗
║
║ 👋 *Olá, $sender!*
║ ✨ Seu assistente virtual de anime
║
╠═══『 📊 STATUS 』═══
║
║ ⚡ *Tipo:* $botType
║ 📱 *Dispositivo:* $device
║ 👥 *Usuários:* $users
║ ⏱️ *Online:* $uptime
║ 📅 *Data:* $data
║ 🕐 *Hora:* $tempo
║
╚═══『 ⭐ $botname ⭐ 』═══╝

💡 *Dica:* Use *$prefixmenu <categoria>* para ver comandos específicos`

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
╚═══『 ⭐ MÍDIAS SOCIAIS ⭐ 』═══╝`,

stickers: `╔═══『 ✨ STICKERS & EDIÇÃO 』═══╗
║
╠══ 🧩 CRIAR FIGURINHA ══
║
║ ✨ *$prefixsticker* <mídia> - Criar figurinha (imagem/vídeo)
║ 🔥 *$prefixattp* <texto> - Sticker de texto (estilo fogo/gelo)
║ 📌 Ex.: *$prefixattp <texto>* | *$prefixattp fogo ZAERO*
║ 💬 *$prefixqc* <texto|@user> - Criar citação (quote)
║ 🎨 *$prefixbrat* <texto> - Sticker com texto estilizado
║ 🎨 *$prefixbratv* <texto> - Brat versão vídeo animado
║ 😂 *$prefixmeme* <número> - Aplicar meme em figurinha
║ 😊 *$prefixemojimix* <emoji1 emoji2> - Misturar dois emojis
║
╠══ 🔁 CONVERTER / LINK ══
║
║ 🖼️ *$prefixtoimg* <sticker> - Converter figurinha para imagem
║ 🔗 *$prefixtourl* <mídia> - Gerar link direto da mídia
║ 👁️ *$prefixread* <mídia> - Ver mídia de visualização única
║
╠══ 🖼️ MELHORAR / CAPTURAR ══
║
║ ✨ *$prefixhd* <imagem> - Melhorar qualidade da imagem
║ 🌐 *$prefixssweb* <url> - Captura de tela de site
║
╚═══『 ⭐ STICKER PRO ⭐ 』═══╝`,

anime: `╔═══『 🎭 ANIME ROLEPLAY 』═══╗
║
╠══ 🎲 BUSCAR ══
║
║ 💖 *$prefixwaifu* - Obter uma Waifu aleatória
║ 👫 *$prefixppcouple* - Obter casal de anime
║
╠══ 😊 REAÇÕES POSITIVAS ══
║
║ 🤗 *$prefixabracar* <@user> - Abraçar alguém
║ 💋 *$prefixbeijar* <@user> - Beijar alguém
║ 😘 *$prefixbeijo* <@user> - Dar um beijinho
║ 🥰 *$prefixacariciar* <@user> - Fazer carinho
║ 🫂 *$prefixconsolar* <@user> - Consolar alguém
║ 😄 *$prefixfeliz* - Demonstrar felicidade
║ ❤️ *$prefixlove* <@user> - Demonstrar amor
║ 🤝 *$prefixhandhold* <@user> - Segurar a mão
║
╠══ 😄 REAÇÕES DIVERTIDAS ══
║
║ 😂 *$prefixlaugh* <@user> - Rir de alguém
║ 👏 *$prefixaplaudir* <@user> - Aplaudir alguém
║ 💃 *$prefixdance* - Começar a dançar
║ 🎮 *$prefixgaming* - Começar a jogar
║ 🎤 *$prefixcantar* - Começar a cantar
║ 🦘 *$prefixjump* - Começar a pular
║
╠══ 😠 REAÇÕES NEGATIVAS ══
║
║ 🔫 *$prefixmatar* <@user> - Matar alguém
║ 👊 *$prefixpunch* <@user> - Dar um soco
║ ✋ *$prefixslap* <@user> - Dar um tapa
║ 🦷 *$prefixmorder* <@user> - Morder alguém
║ 🚫 *$prefixpush* <@user> - Empurrar alguém
║ 🦵 *$prefixgolpear* <@user> - Chutar alguém
║ 😡 *$prefixangry* - Demonstrar braveza
║
╠══ 😳 REAÇÕES EMOTIVAS ══
║
║ 😳 *$prefixshy* - Demonstrar timidez
║ 😊 *$prefixblush* - Ficar corado(a)
║ 😭 *$prefixcry* - Começar a chorar
║ 😢 *$prefixtriste* - Demonstrar tristeza
║ 😱 *$prefixassustado* - Levar um susto
║ 😴 *$prefixbored* - Demonstrar tédio
║ 🤔 *$prefixpensar* - Ficar pensando
║
╠══ 🤝 OUTRAS REAÇÕES ══
║
║ 👋 *$prefixwave* <@user> - Acenar para alguém
║ 👀 *$prefixstare* <@user> - Olhar fixamente
║ 😉 *$prefixwink* <@user> - Piscar para alguém
║ ✨ *$prefixtickle* <@user> - Fazer cócegas
║ 🍕 *$prefixcomer* - Começar a comer
║ ☕ *$prefixcafe* - Beber um café
║ 😴 *$prefixdormir* - Ir dormir
║ 🚬 *$prefixfumar* - Começar a fumar
║ ✏️ *$prefixdraw* - Começar a desenhar
║ 📞 *$prefixcall* <@user> - Ligar para alguém
║
╚═══『 ⭐ ANIME REACTIONS ⭐ 』═══╝`,

downloads: `╔═══『 📥 DOWNLOADS 』═══╗
║
╠══ 🎬 VÍDEOS (YOUTUBE) ══
║
║ 📹 *$prefixplay2* <nome|url> - Baixar vídeo do YouTube
║ 🎥 *$prefixmp4* <url> - Converter link para MP4
║ 🔍 *$prefixsearch* <termo> - Pesquisar vídeos no YouTube
║ 📺 *$prefixyt* <url> - Download direto do YouTube
║
╠══ 🖼️ BUSCA DE IMAGENS ══
║
║ 🔍 *$prefiximg* <termo> - Buscar imagens no Google
║ 🔍 *$prefiximagem* <termo> - Busca alternativa de imagens
║ 📌 *$prefixpin* <termo> - Buscar fotos no Pinterest
║ 📌 *$prefixpinterest* <termo> - Pinterest alternativo
║
╠══ 📦 ARQUIVOS & FERRAMENTAS ══
║
║ 📲 *$prefixapk* <nome> - Baixar aplicativo Android (APK)
║ 📁 *$prefixmf* <url> - Download do MediaFire
║ 🔧 *$prefixgit* <url> - Clonar repositório do GitHub
║ 🔧 *$prefixgitclone* <url> - Clone alternativo do GitHub
║ 📂 *$prefixgrive* <url> - Download do Google Drive
║
╚═══『 ⭐ BAIXAR CONTEÚDO ⭐ 』═══╝`,

profile: `╔═══『 👤 PERFIL 』═══╗
║
╠══ 📊 INFORMAÇÕES ══
║
║ 👤 *$prefixperfil* <@user> - Ver perfil do usuário
║ ⭐ *$prefixlevel* <@user> - Ver nível e experiência (XP)
║ 🏆 *$prefixlboard* <página> - Ranking global de níveis
║
╠══ ⚙️ CONFIGURAÇÃO ══
║
║ 👫 *$prefixsetgenre* <gênero> - Definir seu gênero
║ ❌ *$prefixdelgenre* - Remover seu gênero
║ 🎂 *$prefixsetbirth* <data> - Definir nascimento (dd/mm)
║ 🗑️ *$prefixdelbirth* - Remover data de nascimento
║ 📝 *$prefixsetdesc* <texto> - Definir sua biografia
║ ❌ *$prefixdeldesc* - Remover sua biografia
║ 🎮 *$prefixsethobby* <texto> - Definir seu hobby
║ 🗑️ *$prefixremovehobby* - Remover seu hobby
║
╠══ 💑 RELACIONAMENTO ══
║
║ 💍 *$prefixcasarse* <@user> - Pedir em casamento
║ 💍 *$prefixmarry* <@user> - Casar (alternativa)
║ 💔 *$prefixdivorce* - Divorciar-se
║
╠══ ⭐ FAVORITOS ══
║
║ ⭐ *$prefixsetfav* <nome> - Definir personagem favorito
║ ❌ *$prefixdelfav* <nome> - Remover personagem favorito
║
╚═══『 ⭐ SEU PERFIL ⭐ 』═══╝`,

grupo: `╔═══『 👥 GRUPO 』═══╗
║
╠══ ⚙️ ADMINISTRAÇÃO ══
║
║ 🔒 *$prefixclose* <tempo> - Fechar o grupo
║ 🔓 *$prefixabrir* <tempo> - Abrir o grupo
║ ℹ️ *$prefixgp* - Ver informações do grupo
║ ℹ️ *$prefixsetgp* - Abrir menu de configuração
║ 🔗 *$prefixlink* - Obter link do grupo
║ 🔄 *$prefixrevoke* - Redefinir link do grupo
║ ✏️ *$prefixsetgpname* <nome> - Mudar nome do grupo
║ 📝 *$prefixsetgpdesc* <desc> - Mudar descrição
║ 🖼️ *$prefixsetgpbanner* - Mudar foto do grupo
║
╠══ 👤 GESTÃO DE MEMBROS ══
║
║ 🚫 *$prefixkick* <@user> - Remover um membro
║ ⬆️ *$prefixpromote* <@user> - Tornar administrador
║ ⬇️ *$prefixdemote* <@user> - Remover cargo de admin
║ 📢 *$prefixtagall* <texto> - Marcar todos os membros
║ 📢 *$prefixhidetag* <texto> - Marcar todos (oculto)
║
╠══ ⚠️ SISTEMA DE AVISOS ══
║
║ ⚠️ *$prefixwarn* <@user> - Dar um aviso ao membro
║ 📋 *$prefixwarns* <@user> - Ver avisos de um membro
║ 🗑️ *$prefixdelwarn* <@user> - Limpar avisos do membro
║ 📊 *$prefixsetwarnlimit* <número> - Definir limite de avisos
║
╠══ 🔧 RECURSOS DO BOT ══
║
║ 🤖 *$prefixbot* <on|off> - Ativar/Desativar o bot no chat
║ 👮 *$prefixadminonly* <on|off> - Apenas admins usam o bot
║ 🔞 *$prefixnsfw* <on|off> - Ativar conteúdo adulto (+18)
║
╠══ ✉️ MENSAGENS AUTOMÁTICAS ══
║
║ 👋 *$prefixwelcome* <on|off> - Ativar boas-vindas
║ 👋 *$prefixdespedida* <on|off> - Ativar despedida
║ ✏️ *$prefixsetwelcome* <texto> - Definir mensagem de entrada
║ 📝 *$prefixsetgoodbye* <texto> - Definir mensagem de saída
║
╠══ 🛡️ PROTEÇÃO ══
║
║ 🚫 *$prefixantilink* <on|off> - Bloquear links externos
║ 🔔 *$prefixalertas* <on|off> - Notificar ações proibidas
║
╠══ 📊 ESTATÍSTICAS ══
║
║ 📈 *$prefixcount* <@user> - Ver total de mensagens
║ 🏆 *$prefixtopcount* - Ranking de mensagens do grupo
║ 💤 *$prefixtopinactive* - Ranking de inatividade
║
╚═══『 ⭐ ADMIN GRUPO ⭐ 』═══╝`,

utils: `╔═══『 🛠️ UTILITÁRIOS 』═══╗
║
╠══ 📋 SISTEMA ══
║
║ 📖 *$prefixmenu* <categoria> - Ver menu de comandos
║ ❓ *$prefixajuda* <comando> - Ver ajuda detalhada
║ 📊 *$prefixstatus* - Ver estado do servidor
║ ⚡ *$prefixping* - Testar latência do bot
║
╠══ 💬 COMUNICAÇÃO ══
║
║ 🐛 *$prefixreport* <erro> - Reportar um bug/erro
║ 💡 *$prefixsuggest* <ideia> - Enviar uma sugestão
║ 📨 *$prefixinvite* - Receber convite do bot
║
╠══ 🤖 INTELIGÊNCIA ARTIFICIAL ══
║
║ 🧠 *$prefixia* <pergunta> - Conversar com ChatGPT
║ ✨ *$prefixsticker* <mídia> - Criar uma figurinha
║ 🖼️ *$prefixtoimg* <sticker> - Figurinha para imagem
║ 🔗 *$prefixtourl* <mídia> - Upload para link (URL)
║
╠══ 🌐 FERRAMENTAS WEB ══
║
║ 🌐 *$prefixget* <url> - Requisição HTTP GET
║ 🌍 *$prefixtraduzir* <idioma> <texto> - Traduzir texto
║ 🗣️ *$prefixsay* <texto> - Fazer o bot falar algo
║ 👤 *$prefixpfp* <@user> - Obter foto de perfil
║ 🔍 *$prefixinspecionar* <link> - Analisar link de grupo
║ ⚙️ *$prefixsetmeta* - Configurar metadados de sticker
║
╚═══『 ⭐ FERRAMENTAS ⭐ 』═══╝`,

bot: `╔═══『 🤖 BOT SYSTEM 』═══╗
║
╠══ ℹ️ STATUS ══
║
║ ℹ️ *$prefixinfobot* - Informações técnicas do bot
║ 🤖 *$prefixbots* - Listar sub-bots ativos
║
╠══ 🔧 GERENCIAMENTO ══
║
║ ➕ *$prefixjoin* <link> - Bot entra em um grupo
║ ➖ *$prefixleave* - Bot sai do grupo atual
║ 🚪 *$prefixlogout* - Desconectar a sessão atual
║ 🔄 *$prefixreload* - Reiniciar o processo do bot
║ 🔓 *$prefixself* <on|off> - Alternar Público/Privado
║
╚═══『 ⭐ BOT SYSTEM ⭐ 』═══╝`,

owner: `╔═══『 👑 DONO (OWNER) 』═══╗
║
╠══ ⚙️ CONFIGURAÇÕES ══
║
║ ✏️ *$prefixsetname* <nome> - Alterar nome do bot
║ 🖼️ *$prefixsetbanner* - Alterar banner do menu
║ 🎨 *$prefixseticon* - Alterar ícone do sistema
║ 🔤 *$prefixsetprefix* <prefixo> - Alterar prefixo global
║ 👑 *$prefixsetowner* <@user> - Definir novo dono
║ 📸 *$prefixsetpfp* - Alterar foto de perfil do bot
║ 📝 *$prefixsetstatus* <texto> - Alterar frase de status
║ 👤 *$prefixsetusername* <nome> - Alterar nome de usuário
║ 📢 *$prefixsetchannel* <id> - Configurar canal oficial
║
╠══ 🔧 MANUTENÇÃO ══
║
║ 🔄 *$prefixreload* - Reiniciar o sistema
║ 🚪 *$prefixlogout* - Desconectar conta
║ 🔓 *$prefixself* <on|off> - Alternar privacidade
║
╚═══『 ⭐ CONTROLE TOTAL ⭐ 』═══╝`,

nsfw: `╔═══『 🔞 NSFW (ADULTO) 』═══╗
║
║ ⚠️ *CONTEÚDO PARA MAIORES*
║ Proibido para menores de 18 anos!
║
╠══ 🔍 BUSCA ADULTA ══
║
║ 🎥 *$prefixxnxx* <termo|url> - Pesquisar no XNXX
║ 📹 *$prefixxvideos* <termo|url> - Pesquisar no XVideos
║ 🎞️ *$prefixredgifs* <termo|url> - Buscar no RedGifs
║ 🖼️ *$prefixdanbooru* <tag> - Imagens do Danbooru
║ 🎨 *$prefixgelbooru* <tag> - Imagens do Gelbooru
║ 🔞 *$prefixrule34* <tag> - Pesquisar na Rule34
║
╠══ 😏 INTERAÇÕES (+18) ══
║
║ 💋 *$prefixblowjob* <@user> - Simular oral
║ 💋 *$prefixmamada* <@user> - Simular oral (PT)
║ 🍑 *$prefixanal* <@user> - Simular sexo anal
║ 🍑 *$prefixviolar* <@user> - Simular violação (RP)
║ 🔥 *$prefixfuck* <@user> - Simular transa
║ ✊ *$prefixpunheta* <@user> - Simular punheta
║ 🤲 *$prefixgrabboobs* <@user> - Agarrar peitos
║ 🤲 *$prefixsuckboobs* <@user> - Chupar peitos
║ 💗 *$prefixboobjob* <@user> - Fazer espanhola
║ 👅 *$prefixlickpussy* <@user> - Lamber buceta
║ 👅 *$prefixlickass* <@user> - Lamber bunda
║ 👅 *$prefixlickdick* <@user> - Lamber pau
║ 6️⃣9️⃣ *$prefix69* <@user> - Fazer posição 69
║ 💦 *$prefixcum* <@user> - Gozar em alguém
║ 💦 *$prefixcummouth* <@user> - Gozar na boca
║ 💦 *$prefixcumshot* <@user> - Ejacular em alguém
║ 👗 *$prefixundress* <@user> - Despir alguém
║ 👋 *$prefixspank* <@user> - Dar um tapa na bunda
║ 🤲 *$prefixgrope* <@user> - Apalpar alguém
║ 👣 *$prefixfootjob* <@user> - Fazer footjob
║ 💕 *$prefixyuri* <@user> - Roleplay Yuri
║ 💕 *$prefixtesoura* <@user> - Fazer tesoura
║
║ ⚠️ *AVISO:* Conteúdo puramente fictício
║ para entretenimento em chats permitidos.
║
╚═══『 🔞 APENAS +18 🔞 』═══╝`
}

/**
 * Retorna o menu formatado de acordo com a categoria solicitada.
 * Se nenhuma categoria for informada, retorna o cabeçalho principal.
 */
export function getMenu(prefix, category) {
  if (!category) return bodyMenu
  
  const key = String(category).toLowerCase().trim()
  const result = menuObject[key]
  
  if (result) return result.replace(/\$prefix/g, prefix)
  
  return `╔══════════════════════════════╗
║ ✧ ❌ *Categoria Inválida* ✧
╠══════════════════════════════╣
║ ✧ Use: ${prefix}menu <categoria>
║ ✧ Categorias disponíveis:
║ ✧ anime, stickers, redes,
║ ✧ downloads, utils, grupo,
║ ✧ perfil, bot, owner, nsfw
╚══════════════════════════════╝`
}
