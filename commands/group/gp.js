import ws from 'ws';
import fs from 'fs';

export default {
  command: ['gp', 'groupinfo'],
  category: 'grupo',
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.isGroup) {
      return m.reply('⚠️ Este comando só pode ser usado em grupos.')
    }
    const from = m.chat
    const groupMetadata = await client.groupMetadata(from).catch(() => null)
    if (!groupMetadata) {
      return m.reply('⚠️ Não foi possível obter os dados do grupo.')
    }
    const groupName = groupMetadata.subject;
    const groupBanner = await client.profilePictureUrl(m.chat, 'image').catch(() => 'https://files.catbox.moe/xr2m6u.jpg')
    const groupCreator = groupMetadata.owner ? '@' + groupMetadata.owner.split('@')[0] : 'Desconhecido';
    const groupAdmins = groupMetadata?.participants.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
    const totalParticipants = groupMetadata.participants.length;
    const chatId = m.chat;
    const chat = global.db.data.chats[chatId] || {};
    const chatUsers = chat.users || {};
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net";
    const botSettings = global.db.data.settings[botId] || {};
    const botname = botSettings.botname || 'ZÆRØ BOT';
    const monedas = botSettings.currency || 'Yenes';
    let totalCoins = 0;
    let registeredUsersInGroup = 0;
    const resolvedUsers = await Promise.all(
      groupMetadata.participants.map(async (participant) => {
        return { ...participant, phoneNumber: participant.phoneNumber, jid: participant.jid };
      })
    );
    resolvedUsers.forEach((participant) => {
      const fullId = participant.phoneNumber || participant.jid || participant.id;
      const user = chatUsers[fullId];
      if (user) {
        registeredUsersInGroup++;
        totalCoins += Number(user.coins) || 0;
      }
    });
    const charactersFilePath = './lib/characters.json'
    const data = await fs.promises.readFile(charactersFilePath, 'utf-8')
    const structure = JSON.parse(data)
    const allCharacters = Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : [])
    const totalCharacters = allCharacters.length
    const claimedIDs = Object.entries(global.db.data.chats[m.chat]?.characters || {}).filter(([, c]) => c.user).map(([id]) => id)
    const claimedCount = claimedIDs.length
    const claimRate = totalCharacters > 0 ? ((claimedCount / totalCharacters) * 100).toFixed(2) : '0.00'
    const rawPrimary = typeof chat.primaryBot === 'string' ? chat.primaryBot : '';
    const botprimary = rawPrimary.endsWith('@s.whatsapp.net') ? `@${rawPrimary.split('@')[0]}` : 'Aleatorio';
    const settings = {
      bot: chat.isBanned ? '✘ Desativado' : '✓ Ativado',
      antilinks: chat.antilinks ? '✓ Ativado' : '✘ Desativado',
      welcome: chat.welcome ? '✓ Ativado' : '✘ Desativado',
      goodbye: chat.goodbye ? '✓ Ativado' : '✘ Desativado',
      alerts: chat.alerts ? '✓ Ativado' : '✘ Desativado',
      gacha: chat.gacha ? '✓ Ativado' : '✘ Desativado',
      economy: chat.economy ? '✓ Ativado' : '✘ Desativado',
      nsfw: chat.nsfw ? '✓ Ativado' : '✘ Desativado',
      adminmode: chat.adminonly ? '✓ Ativado' : '✘ Desativado',
      botprimary: botprimary
    };
    try {
      let message = `*「✿」Grupo ◢ ${groupName} ◤*\n\n`;
      message += `➪ *Criador ›* ${groupCreator}\n`;
      message += `❖ Bot Principal › *${settings.botprimary}*\n`;
      message += `♤ Admins › *${groupAdmins.length}*\n`;
      message += `❒ Usuários › *${totalParticipants}*\n`;
      message += `ꕥ Registrados › *${registeredUsersInGroup}*\n`;
      message += `✿ Claims › *${claimedCount} (${claimRate}%)*\n`;
      message += `♡ Personagens › *${totalCharacters}*\n`;
      message += `⛁ Dinheiro › *${totalCoins.toLocaleString()} ${monedas}*\n\n`;
      message += `➪ *Configurações:*\n`;
      message += `✐ ${botname} › *${settings.bot}*\n`;
      message += `✐ AntiLinks › *${settings.antilinks}*\n`;
      message += `✐ Bem-vindo › *${settings.welcome}*\n`;
      message += `✐ Despedida › *${settings.goodbye}*\n`;
      message += `✐ Alertas › *${settings.alerts}*\n`;
      message += `✐ Gacha › *${settings.gacha}*\n`;
      message += `✐ Economía › *${settings.economy}*\n`;
      message += `✐ Nsfw › *${settings.nsfw}*\n`;
      message += `✐ ModoAdmin › *${settings.adminmode}*`;
      const mentionOw = groupMetadata.owner ? groupMetadata.owner : '';
      const mentions = [rawPrimary, mentionOw].filter(Boolean);
      const ownerSettings = global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"] || {}
      await client.sendContextInfoIndex(m.chat, message.trim(), {}, null, false, mentions, { banner: groupBanner, title: groupName, body: dev, redes: ownerSettings.link || global.links?.api || '' })
    } catch (e) {
      await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
    }
  }
};
