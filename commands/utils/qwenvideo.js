import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'
import axios from 'axios'

export default {
  command: ['qwenvideo'],
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
      return m.reply('«?» Escreva uma *solicitação* para gerar o *vídeo*.')
    }

    try {
      const { key } = await client.sendMessage(m.chat, { text: '? *Qwen Video* está gerando seu vídeo...' }, { quoted: m })
      await m.react('??')

      const taskRes = await fetchWithTimeout(`https://api.soymaycol.icu/ai-qwen-task?q=${encodeURIComponent(text)}&apikey=soymaycol%3C3`)
      const taskJson = await taskRes.json()
      if (!taskJson?.status || !taskJson?.check_url) throw new Error('task_failed')

      const checkUrl = taskJson.check_url
      let resultUrl = null

      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const checkRes = await fetchWithTimeout(checkUrl)
        const checkJson = await checkRes.json()

        if (checkJson?.status && checkJson?.state === 'success' && checkJson?.result?.original_url) {
          resultUrl = checkJson.result.original_url
          break
        }
        if (!checkJson?.status) throw new Error('process_failed')
      }

      if (!resultUrl) throw new Error('timeout')

      const videoRes = await axios.get(resultUrl, { responseType: 'arraybuffer' })
      await client.sendMessage(m.chat, { video: Buffer.from(videoRes.data), caption: '«?» *Vídeo Qwen* gerado com sucesso.' }, { quoted: m })
      await client.sendMessage(m.chat, { text: '? *Vídeo Qwen* pronto.', edit: key })
      await m.react('??')
    } catch {
      await m.react('??')
      await client.reply(m.chat, '«?» Ocorreu um *erro* ao gerar o vídeo. Tente novamente mais tarde.', m)
    }
  },
}