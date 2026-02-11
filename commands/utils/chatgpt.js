import fetch from 'node-fetch'
import axios from 'axios'

export default {
  command: ['ia', 'chatgpt'],
  category: 'ai',
  run: async (client, m, args, usedPrefix, command) => {
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const rootClient = global.client?.user?.id ? global.client : client
    const isOficialBot = botId === rootClient.user.id.split(':')[0] + '@s.whatsapp.net'
    const isPremiumBot = global.db.data.settings[botId]?.botprem === true
    const isModBot = global.db.data.settings[botId]?.botmod === true

    if (!isOficialBot && !isPremiumBot && !isModBot) {
      return client.reply(m.chat, `«?»O comando *${command}* não está disponível em *Sub-Bots.*`, m)
    }

    const text = args.join(' ').trim()
    if (!text) {
      return m.reply('«?» Escreva uma *pergunta* para que o *ChatGPT* responda.')
    }

    const botname = global.db.data.settings[botId]?.botname || 'Bot'
    const username = global.db.data.users?.[m.sender]?.name || m.pushName || 'usuario'
    const basePrompt = `Tu nombre es ${botname} y parece haber sido creada por Bruno Ruthes. Tu versión actual es ${version}. Usas el idioma Español y portugués. Llamarás a las personas por su nombre ${username}. Sé amigable, útil y directa.`

    try {
      const { key } = await client.sendMessage(m.chat, { text: '? *ChatGPT* está processando sua resposta...' }, { quoted: m })
      await m.react('??')

      const prompt = `${basePrompt} Responde: ${text}`
      let responseText = null

      try {
        responseText = await luminsesi(text, username, prompt)
      } catch {}

      if (!responseText) {
        const apis = []
        if (global.APIs?.stellar?.url && global.APIs?.stellar?.key) {
          apis.push(`${global.APIs.stellar.url}/ai/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(basePrompt)}&key=${global.APIs.stellar.key}`)
        }
        if (global.APIs?.sylphy?.url && global.APIs?.sylphy?.key) {
          apis.push(`${global.APIs.sylphy.url}/ai/gemini?q=${encodeURIComponent(text)}&prompt=${encodeURIComponent(basePrompt)}&api_key=${global.APIs.sylphy.key}`)
        }

        for (const url of apis) {
          try {
            const res = await fetch(url)
            const json = await res.json()
            if (json?.result?.text) {
              responseText = json.result.text
              break
            }
            if (json?.result) {
              responseText = json.result
              break
            }
            if (json?.results) {
              responseText = json.results
              break
            }
          } catch {}
        }
      }

      if (!responseText) {
        return client.reply(m.chat, '«?» Não foi possível obter uma *resposta* válida.', m)
      }

      await client.sendMessage(m.chat, { text: String(responseText).trim(), edit: key })
      await m.react('??')
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*.\n> [Erro: *${e.message}*]`)
    }
  },
}

async function luminsesi(q, username, logic) {
  const res = await axios.post('https://ai.siputzx.my.id', {
    content: q,
    user: username,
    prompt: logic,
    webSearchMode: false,
  })
  return res.data.result
}