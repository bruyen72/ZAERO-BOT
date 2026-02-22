import { search, download } from 'aptoide-scraper'
import { getBuffer } from "../../lib/message.js"

export default {
  command: ['apk', 'aptoide', 'apkdl'],
  category: 'download',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args || !args.length) {
      return m.reply('《✧》 Por favor, insira o nome do aplicativo.')
    }
    const query = args.join(' ').trim()
    try {
      const searchA = await search(query)
      if (!searchA || searchA.length === 0) {
        return m.reply('《✧》 Nenhum resultado encontrado.')
      }
      const apkInfo = await download(searchA[0].id)
      if (!apkInfo) {
        return m.reply('《✧》 Não foi possível obter informações do aplicativo.')
      }
      const { name, package: id, size, icon, dllink: downloadUrl, lastup } = apkInfo
      const caption = `✰ ᩧ　𓈒　ׄ　Aptoide 　ׅ　✿\n\n` +
        `➩ *Nome ›* ${name}\n` +
        `❖ *Pacote ›* ${id}\n` +
        `✿ *Última atualização ›* ${lastup}\n` +
        `☆ *Tamanho ›* ${size}`
      const sizeBytes = parseSize(size)
      if (sizeBytes > 524288000) {
        return m.reply(`《✧》 O arquivo é muito grande (${size}).\n> Descárgalo directamente desde aquí:\n${downloadUrl}`)
      }
      await client.sendMessage(m.chat, { document: { url: downloadUrl }, mimetype: 'application/vnd.android.package-archive', fileName: `${name}.apk`, caption }, { quoted: m })
     } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0
  const parts = sizeStr.trim().toUpperCase().split(' ')
  const value = parseFloat(parts[0])
  const unit = parts[1] || 'B'
  switch (unit) {
    case 'KB': return value * 1024
    case 'MB': return value * 1024 * 1024
    case 'GB': return value * 1024 * 1024 * 1024
    default: return value
  }
}
