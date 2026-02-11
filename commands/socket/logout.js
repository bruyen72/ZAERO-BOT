import fs from 'fs';
import path from 'path';
import {jidDecode} from '@whiskeysockets/baileys';

export default {
  command: ['logout'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const rawId = client.user?.id || ''
    const decoded = jidDecode(rawId)
    const cleanId = decoded?.user || rawId.split('@')[0]
    const sessionTypes = ['Subs']
    const basePath = 'Sessions'
    const sessionPath = sessionTypes.map((type) => path.join(basePath, type, cleanId)).find((p) => fs.existsSync(p))
    if (!sessionPath) {
      return m.reply('《✧》 Este comando só pode ser usado em uma instância do Sub-Bot.')
    }
    try {
      await m.reply('《✧》 Cerrando sesión del Socket...')
      await client.logout()
      setTimeout(() => {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true })
          console.log(`《✧》 Sesión de ${cleanId} eliminada de ${sessionPath}`)
        }
      }, 2000)
      setTimeout(() => {
        m.reply(`《✧》 Sessão finalizada com sucesso.\nVocê pode reconectar usando *${usedPrefix}code*`)
      }, 3000)
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  },
};
