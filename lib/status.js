/**
 * ZÆRØ BOT - System Status & Anime UI (2026)
 * Estilo: Dark/Red Anime High Performance
 */

const STATUS_MESSAGES = {
  processing: "⚡ *𝙕Æ𝙍Ø* está despertando o poder...
⏳ Preparando sua mídia...",
  queue: (pos) => `🩸 *Poder acumulando...*
⏳ Fila: *#${pos}*`,
  heavy: "❌ *Excede o limite do poder atual.*
🩸 Reduza para *6–8 segundos*.",
  timeout: "⏱️ *O núcleo perdeu energia.
🔥 Envie um vídeo menor.*",
  blocked: "⚠️ *Portal temporariamente fechado.*
🔁 Buscando outra dimensão...",
  successSticker: "🔥 *Poder materializado!*
🩸 Figurinha concluída.",
  successVideo: "🎬 *Manifestação completa.*
📱 Compatível com celular."
};

/**
 * Envia uma mensagem de status estilizada.
 */
export async function sendStatus(client, m, type, extra = {}) {
  let text = STATUS_MESSAGES[type];
  if (typeof text === 'function') text = text(extra.pos || 1);
  
  try {
    return await client.sendMessage(m.chat, { text: `> ${text}` }, { quoted: m });
  } catch (e) {
    console.error('[Status UI Error]', e);
  }
}

export default { sendStatus, STATUS_MESSAGES };
