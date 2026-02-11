export default {
  command: ['w', 'work', 'chambear', 'chamba', 'trabajar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chat = db.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const monedas = db.settings[botId].currency
    if (chat.adminonly || !chat.economy) return m.reply(`ꕥ Os comandos *Economy* estão desabilitados neste grupo.\n\nUm *administrador* pode habilitá-los com o comando:\n» *${usedPrefix}economy on*`)
    const cooldown = 3 * 60 * 1000
    user.lastwork = user.lastwork || 0
    if (Date.now() < user.lastwork) {
      const tiempoRestante = formatTime(user.lastwork - Date.now())
      return client.reply(m.chat, `ꕥ Você deve esperar *${tiempoRestante}*para usar*${usedPrefix + command}* de novo.`, m)
    }
    user.lastwork = Date.now() + cooldown
    const rsl = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000
    user.coins = user.coins || 0
    user.coins += rsl
    await client.sendMessage(m.chat, { text: `❀ ${pickRandom(trabajo)} *¥${rsl.toLocaleString()} ${monedas}*.`, }, { quoted: m })
  }
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const parts = []
  if (minutes > 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`)
  parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`)
  return parts.join(' ')
}

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

const trabajo = [
  "Você trabalha como colhedor de morango e ganha",
  "Você é assistente em uma oficina de cerâmica e recebe",
  "Você cria páginas da web e ganha",
  "Você é fotógrafo de casamento e recebe",
  "Você trabalha em uma loja de animais e ganha",
  "Você é um narrador de audiolivro e obtém",
  "Mostramos no departamento de arte e desejamos",
  "Você trabalha como jardineiro em um parque e recebe",
  "Você é DJ em festas e ganha",
  "Você fez um mural em uma cafeteria e eles te deram",
  "Você trabalha como designer de interiores e ganha",
  "Você é um motorista de ônibus de turismo e recebe",
  "Você prepara sushi em um restaurante e ganha",
  "Você trabalha como assistente de pesquisa e recebe",
  "Você é um especialista em marketing de conteúdo e deseja",
  "Você trabalha em uma fazenda orgânica e recebe",
  "Você é uma dançarina em um show e você ganha",
  "Você organiza feiras de arte e recebe",
  "Você é um escritor freelance e ganha",
  "Você fez um design gráfico para uma campanha e eles te pagaram",
  "Você trabalha como mecânico de automóveis e ganha",
  "Você é instrutor de surf e recebe",
  "Você limpa casas como um serviço de limpeza e quer",
  "Você é técnico de som em shows e recebe",
  "Você trabalha como desenvolvedor de aplicativos e ganha",
  "Você é crupiê em um cassino e recebe",
  "Você trabalha como cabeleireiro e ganha",
  "Você é um restaurador de arte e recebe",
  "Você trabalha em uma livraria e ganha",
  "Você é um guia de montanhismo e recebe",
  "Você tem um blog de viagens e ganha",
  "Você fez uma campanha de crowdfunding e conseguiu",
  "Você trabalha como assistente social e ganha",
  "Você é motorista de caminhão de carga e recebe",
  "Você trabalha em uma equipe de resgate e ganha",
  "Você é um consultor de negócios e obtém",
  "Você faz degustações de vinhos e quer",
  "Você trabalha como barista em uma cafeteria e recebe",
  "Você é um treinador de animais de estimação e ganhou",
  "Você fez um documentário para uma ONG e recebeu",
  "Você é um operador de drone e ganha",
  "Você trabalha em uma produtora de filmes e recebe",
  "Você é um pesquisador de mercado e ganha",
  "Você trabalha como entregador de comida e recebe",
  "Você é um acupunturista e ganha",
  "Você fez um design de joias e conseguiu",
  "Você trabalha como especialista em atendimento ao cliente e ganha",
  "Você é curador de um museu e recebe",
  "Você trabalha em um centro de reabilitação e recebe",
  "Você é um piloto de helicóptero e vence",
  "Você fez uma campanha de conscientização e eles te deram",
  "Você trabalha em uma oficina mecânica e ganha",
  "Você é um organizador de eventos esportivos e recebe",
  "Você desenvolve um aplicativo educacional e ganha",
  "Você é um técnico em redes de computadores e obtém",
  "Você trabalha como assistente de produção em um teatro e ganha",
  "Você é ilustrador de livros infantis e recebe",
  "Você trabalha em um centro de ioga e recebe",
  "Você é um chef pessoal e ganha",
  "Você faz um calendário de fotos e recebe",
  "Você é um promotor de saúde e bem-estar e deseja",
  "Você trabalha como decorador de interiores e recebe",
  "Você é um arranjador de flores e você ganhou",
  "Você organiza um festival de música e recebe",
  "Você é um jornalista investigativo e quer",
  "Você trabalha como assistente técnico em um estúdio de gravação e recebe",
  "Você é mecânico de bicicletas e ganha",
  "Você fez um vídeo viral e conseguiu",
  "Você trabalha como pesquisador de ciências sociais e ganha",
  "Você é um organizador de conferências e recebe",
  "Desenhando caricaturas em eventos e desejos",
  "Você é um gerente de relações públicas e recebe",
  "Você trabalha como coach de vida e ganha",
  "Você é educador em um centro cultural e recebe",
  "Você é diretor de fotografia e ganhou",
  "Você trabalha em um abrigo de animais e recebe",
  "Você é guia em almoços e jantares temáticos e deseja",
  "Você fez um projeto de arte comunitária e recebeu",
  "Você é um tradutor de documentos e obtém",
  "Você trabalha como assistente pessoal de um executivo e ganha",
  "Você é um especialista em sustentabilidade e recebe",
  "Você faz um programa de rádio e ganha",
  "Você trabalha como avaliador de arte e obtém",
  "Você é um criador de conteúdo de mídia social e ganha",
  "Você fez uma oficina de artesanato e recebeu"
];