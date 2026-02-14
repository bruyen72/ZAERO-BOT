import fs from 'fs';

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile('.env');
  }
} catch {}


global.owner = [''] // Configure seu número aqui
global.botNumber = ''

const sessionDirFromEnv = String(process.env.SESSION_DIR || '').trim()
const hasDataDir = (() => {
  try {
    return fs.existsSync('/data')
  } catch {
    return false
  }
})()
global.sessionName = sessionDirFromEnv || (hasDataDir ? '/data/auth' : 'Sessions/Owner')
global.version = '^2.0 - Otimizado'
global.dev = "© ZÆRØ BOT - Sistema Avançado de IA"
global.botName = "ZÆRØ BOT"
global.botLogo = "./ZK.png"
global.links = {
api: 'https://api.stellarwa.xyz',
web: 'http://localhost:5010',
channel: "",
github: "",
gmail: ""
}
global.my = {
ch: '120363401404146384@newsletter',
name: '⚡ ZÆRØ BOT - Canal Oficial ⚡',
}

global.mess = {
socket: '⚠️ Este comando só pode ser executado por um Socket.',
admin: '⚠️ Este comando só pode ser executado pelos Administradores do Grupo.',
botAdmin: '⚠️ Este comando só pode ser executado se o Bot for Administrador do Grupo.',
owner: '⚠️ Este comando é exclusivo para o dono do bot.',
group: '⚠️ Este comando só pode ser usado em grupos.',
private: '⚠️ Este comando só pode ser usado no privado.',
wait: '⏳ Processando, aguarde...',
error: '❌ Ocorreu um erro ao executar o comando!',
success: '✅ Comando executado com sucesso!'
}

global.APIs = {
adonix: { url: "https://api-adonix.ultraplus.click", key: "Yuki-WaBot" },
vreden: { url: "https://api.vreden.web.id", key: null },
nekolabs: { url: "https://api.nekolabs.web.id", key: null },
siputzx: { url: "https://api.siputzx.my.id", key: null },
delirius: { url: "https://api.delirius.store", key: null },
ootaizumi: { url: "https://api.ootaizumi.web.id", key: null },
stellar: { url: "https://api.stellarwa.xyz", key: "YukiWaBot", key2: '1bcd4698ce6c75217275c9607f01fd99' },
apifaa: { url: "https://api-faa.my.id", key: null },
xyro: { url: "https://api.xyro.site", key: null },
yupra: { url: "https://api.yupra.my.id", key: null }
}
