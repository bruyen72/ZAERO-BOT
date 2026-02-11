import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'

export default {
  command: ['drive', 'gdrive'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args[0]) {
      return m.reply('《✧》 Insira um link do Google Drive.')
    }
    const url = args[0]
    if (!url.match(/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/)) {
      return m.reply('《✧》 O URL não parece válido para o Google Drive.')
    }
    try {
      const result = await gdriveScraper(url)
      if (!result.status) {
        return m.reply('《✧》 Não foi possível obter o arquivo. Tente outro link.')
      }
      const { fileName, fileSize, mimetype, downloadUrl } = result.data
      const caption = `╔═══『 💾 GOOGLE DRIVE 』═══╗\n` +
        `║\n` +
        `║ 📄 *Nome:* ${fileName}\n` +
        `║ 📦 *Tamanho:* ${fileSize}\n` +
        `║ 📋 *Tipo:* ${mimetype}\n` +
        `║\n` +
        `╚═══『 ✧ ZÆRØ BOT ✧ 』═══╝`
     await client.sendMessage(m.chat, { document: { url: downloadUrl }, mimetype, fileName, caption }, { quoted: m })
    } catch (e) {
      return m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
}

async function gdriveScraper(url) {
  try {
    let id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))[1]
    if (!id) throw new Error('Nenhum ID de download encontrado')
    let res = await fetchWithTimeout(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
      { method: 'post', headers: { 'accept-encoding': 'gzip, deflate, br', 'content-length': 0, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', origin: 'https://drive.google.com', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36', 'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=', 'x-drive-first-party': 'DriveWebUi', 'x-json-requested': 'true' }
      }
    )
    let { fileName, sizeBytes, downloadUrl } = JSON.parse((await res.text()).slice(4))
    if (!downloadUrl) throw new Error('O número de downloads do link foi excedido')
    let data = await fetchWithTimeout(downloadUrl)
    if (data.status !== 200) throw new Error(data.statusText)
    return {
      status: true,
      data: { downloadUrl, fileName, fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`, mimetype: data.headers.get('content-type') }
    }
  } catch (error) {
    return { status: false, message: error.message }
  }
}