import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'

async function fetchJsonWithTimeout(url, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetchWithTimeout(url, { signal: controller.signal })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchBufferWithTimeout(url, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetchWithTimeout(url, { signal: controller.signal })
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

export default {
  command: ['ppcp', 'ppcouple'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('??')

      const data = await fetchJsonWithTimeout('https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json', 12000)
      const cita = data[Math.floor(Math.random() * data.length)]

      const cowi = await fetchBufferWithTimeout(cita.cowo, 12000)
      await client.sendFile(m.chat, cowi, '', '*Masculino* ?', m)

      const ciwi = await fetchBufferWithTimeout(cita.cewe, 12000)
      await client.sendFile(m.chat, ciwi, '', '*Mulher* ?', m)

      await m.react('??')
    } catch (e) {
      await m.react('??')
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*.\n> [Erro: *${e.message}*]`)
    }
  },
}