// ================================================================
// ADICIONE ESTE CÓDIGO NO SEU index.js (BOT PRINCIPAL)
// ================================================================

const axios = require('axios'); // Adicione no topo se não tiver

// ⚠️ IMPORTANTE: Troque pela URL do seu servidor no Render
const SERVIDOR_JOGO = 'https://seu-app.onrender.com';

// ================================================================
// FUNÇÃO: Comando /jogodavelha
// ================================================================

// Cole esta função onde você trata as mensagens recebidas
async function comandoJogoDaVelha(sock, msg) {
    const remetente = msg.key.remoteJid;
    const texto = msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text || '';
    
    try {
        // Verificar se mencionou alguém
        const mencoes = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        // Criar nova partida no servidor
        const response = await axios.get(`${SERVIDOR_JOGO}/criar-partida`);
        const { codigo, url } = response.data;
        
        if (mencoes.length > 0) {
            // Jogar com amigo mencionado
            const criador = remetente.split('@')[0];
            const convidado = mencoes[0].split('@')[0];
            
            await sock.sendMessage(remetente, {
                text: `🎮 *PARTIDA CRIADA!*\n\n` +
                      `🔑 Código: *${codigo}*\n\n` +
                      `👤 Você: @${criador}\n` +
                      `👤 Adversário: @${convidado}\n\n` +
                      `🔗 Link da partida:\n${url}\n\n` +
                      `⚡ Ambos devem clicar no link para começar!\n\n` +
                      `Boa sorte! 🎉`,
                mentions: [remetente, mencoes[0]]
            });
            
            // Enviar para o convidado também
            await sock.sendMessage(mencoes[0], {
                text: `🎮 *VOCÊ FOI DESAFIADO!*\n\n` +
                      `🔑 Código: *${codigo}*\n` +
                      `👤 Adversário: @${criador}\n\n` +
                      `🔗 Clique aqui para jogar:\n${url}\n\n` +
                      `Aceite o desafio! 🔥`,
                mentions: [remetente]
            });
            
        } else {
            // Jogar com qualquer pessoa
            await sock.sendMessage(remetente, {
                text: `🎮 *PARTIDA CRIADA!*\n\n` +
                      `🔑 Código: *${codigo}*\n\n` +
                      `🔗 Link da partida:\n${url}\n\n` +
                      `📤 Compartilhe este código ou link com quem você quer jogar!\n\n` +
                      `💡 *Dica:* Use /jogodavelha @amigo para criar uma partida direta!`
            });
        }
        
    } catch (error) {
        console.error('Erro ao criar partida:', error);
        await sock.sendMessage(remetente, {
            text: '❌ Erro ao criar partida. Tente novamente em alguns segundos.'
        });
    }
}

// ================================================================
// FUNÇÃO: Comando /entrar
// ================================================================

async function comandoEntrarPartida(sock, msg, codigo) {
    const remetente = msg.key.remoteJid;
    const url = `${SERVIDOR_JOGO}/partida/${codigo.toUpperCase()}`;
    
    await sock.sendMessage(remetente, {
        text: `🎮 *ENTRANDO NA PARTIDA*\n\n` +
              `🔑 Código: *${codigo.toUpperCase()}*\n\n` +
              `🔗 Clique aqui para jogar:\n${url}\n\n` +
              `Boa sorte! 🍀`
    });
}

// ================================================================
// INTEGRAÇÃO NO SEU BOT
// ================================================================

// EXEMPLO DE COMO ADICIONAR NO SEU CÓDIGO EXISTENTE:

/*
sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    
    const texto = msg.message.conversation || 
                  msg.message.extendedTextMessage?.text || '';
    
    // ... seu código existente ...
    
    // ADICIONE ESTAS LINHAS:
    
    // Comando: /jogodavelha ou /jogodavelha @usuario
    if (texto.toLowerCase().startsWith('/jogodavelha') || 
        texto.toLowerCase().startsWith('!jogodavelha')) {
        await comandoJogoDaVelha(sock, msg);
        return;
    }
    
    // Comando: /entrar CODIGO
    if (texto.toLowerCase().startsWith('/entrar') || 
        texto.toLowerCase().startsWith('!entrar')) {
        const partes = texto.split(' ');
        if (partes.length >= 2) {
            await comandoEntrarPartida(sock, msg, partes[1]);
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Uso correto: /entrar CODIGO\n\nExemplo: /entrar ABC123'
            });
        }
        return;
    }
    
    // ... resto do seu código ...
});
*/

// ================================================================
// ADICIONAR NO MENU DE AJUDA (se você tiver)
// ================================================================

/*
Adicione estas linhas no seu comando /menu ou /ajuda:

`🎮 /jogodavelha @amigo - Desafiar alguém\n` +
`🎮 /jogodavelha - Criar partida aberta\n` +
`🎯 /entrar CODIGO - Entrar em partida\n`
*/

module.exports = {
    comandoJogoDaVelha,
    comandoEntrarPartida
};