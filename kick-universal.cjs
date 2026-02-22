'use strict';

/**
 * KICK UNIVERSAL (portable)
 *
 * You can copy this file to another bot project and adapt only the adapter.
 * It works with mention, quoted user, or phone number in args.
 *
 * Quick usage with Baileys:
 * const { createBaileysAdapter, executeKick } = require('./kick-universal.cjs')
 * const adapter = createBaileysAdapter(client)
 * await executeKick({
 *   chatId: m.chat,
 *   senderJid: m.sender,
 *   mentionedJids: m.mentionedJid,
 *   quotedSenderJid: m.quoted?.sender,
 *   argText: args.join(' '),
 *   isGroup: m.isGroup,
 *   rawMessage: m
 * }, adapter, {
 *   ownerJids: ['5511999999999@s.whatsapp.net']
 * })
 */

const DEFAULT_MESSAGES = {
  groupOnly: 'Este comando so funciona em grupo.',
  senderNotAdmin: 'Apenas admin pode usar este comando.',
  botNotAdmin: 'O bot precisa ser admin para remover membros.',
  missingTarget: 'Marque alguem, responda uma mensagem, ou passe o numero.',
  targetNotInGroup: 'Esse usuario nao esta no grupo.',
  cannotKickSelfBot: 'Nao posso remover o proprio bot.',
  cannotKickGroupOwner: 'Nao posso remover o dono do grupo.',
  cannotKickOwner: 'Nao posso remover o dono do bot.',
  success: (jid) => `@${extractNumber(jid)} removido com sucesso.`,
  genericError: (msg) => `Erro ao remover participante: ${msg || 'falha desconhecida'}`,
};

function extractNumber(jid) {
  const text = String(jid || '');
  const match = text.match(/^(\d{5,20})@/);
  if (match) return match[1];
  return text.replace(/@.*/, '');
}

function normalizeJid(adapter, jid) {
  const raw = String(jid || '').trim();
  if (!raw) return '';
  try {
    if (adapter && typeof adapter.decodeJid === 'function') {
      return String(adapter.decodeJid(raw) || raw);
    }
  } catch {}
  return raw;
}

function addComparableJid(targetSet, adapter, jid) {
  const normalized = normalizeJid(adapter, jid);
  if (!normalized) return;

  targetSet.add(normalized);
  targetSet.add(normalized.toLowerCase());
  targetSet.add(normalized.replace(/:\d+@/g, '@'));

  if (/^\d{5,20}$/.test(normalized)) {
    targetSet.add(`${normalized}@s.whatsapp.net`);
  }

  const numMatch = normalized.match(/^(\d{5,20})@s\.whatsapp\.net$/i);
  if (numMatch) {
    targetSet.add(numMatch[1]);
    targetSet.add(`${numMatch[1]}@lid`);
  }

  if (/@lid$/i.test(normalized) && adapter && typeof adapter.findJidByLid === 'function') {
    try {
      const resolved = adapter.findJidByLid(normalized);
      if (resolved) {
        targetSet.add(String(resolved));
        targetSet.add(String(resolved).toLowerCase());
      }
    } catch {}
  }
}

function phoneToJid(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : '';
}

function participantIsAdmin(participant) {
  if (!participant || typeof participant !== 'object') return false;
  const role = String(participant.admin || '').toLowerCase();
  return participant.admin === true || role === 'admin' || role === 'superadmin';
}

function participantKeys(participant, adapter) {
  const keys = new Set();
  addComparableJid(keys, adapter, participant && participant.id);
  addComparableJid(keys, adapter, participant && participant.jid);
  addComparableJid(keys, adapter, participant && participant.lid);
  addComparableJid(keys, adapter, participant && phoneToJid(participant.phoneNumber));
  return keys;
}

function participantMatchesTarget(participant, targetSet, adapter) {
  if (!(targetSet instanceof Set) || targetSet.size === 0) return false;
  const keys = participantKeys(participant, adapter);
  for (const key of keys) {
    if (targetSet.has(key) || targetSet.has(String(key || '').toLowerCase())) return true;
  }
  return false;
}

function getParticipantPrimaryJid(participant, adapter) {
  const candidates = [
    participant && participant.id,
    participant && participant.jid,
    participant && participant.lid,
    participant && phoneToJid(participant.phoneNumber),
  ].filter(Boolean);

  for (const candidate of candidates) {
    let normalized = normalizeJid(adapter, candidate);
    if (!normalized) continue;
    if (/@lid$/i.test(normalized) && adapter && typeof adapter.findJidByLid === 'function') {
      try {
        const resolved = adapter.findJidByLid(normalized);
        if (resolved) normalized = normalizeJid(adapter, resolved);
      } catch {}
    }
    if (!/@/.test(normalized) && /^\d{5,20}$/.test(normalized)) {
      normalized = `${normalized}@s.whatsapp.net`;
    }
    return normalized;
  }

  return '';
}

function parseJidFromArgs(argText) {
  const text = String(argText || '').trim();
  if (!text) return '';

  const explicitJid = text.match(/([0-9]{5,20}@(?:s\.whatsapp\.net|lid))/i);
  if (explicitJid) return explicitJid[1];

  const digits = text.match(/(?:^|\s|@)(\d{5,20})(?:\s|$)/);
  if (digits) return `${digits[1]}@s.whatsapp.net`;

  return '';
}

function pickTargetCandidate(ctx) {
  const mentioned = Array.isArray(ctx.mentionedJids) ? ctx.mentionedJids : [];
  if (mentioned[0]) return mentioned[0];
  if (ctx.quotedSenderJid) return ctx.quotedSenderJid;
  const fromArgs = parseJidFromArgs(ctx.argText);
  if (fromArgs) return fromArgs;
  return '';
}

function buildOwnerSet(ownerJids, adapter) {
  const set = new Set();
  const list = Array.isArray(ownerJids) ? ownerJids : [];
  for (const owner of list) addComparableJid(set, adapter, owner);
  return set;
}

async function safeReply(adapter, ctx, text, mentions) {
  const mentionList = Array.isArray(mentions) ? mentions.filter(Boolean) : [];
  if (!adapter || typeof adapter.reply !== 'function') return;
  await adapter.reply(ctx, String(text || ''), { mentions: mentionList });
}

function assertAdapter(adapter) {
  const required = ['getGroupMetadata', 'removeParticipants', 'reply'];
  for (const key of required) {
    if (!adapter || typeof adapter[key] !== 'function') {
      throw new Error(`Adapter invalido: faltando metodo "${key}"`);
    }
  }
}

async function executeKick(ctx, adapter, options) {
  assertAdapter(adapter);

  const cfg = Object.assign(
    {
      ownerJids: [],
      allowKickGroupOwner: false,
      bypassSenderAdminCheck: false,
      bypassBotAdminCheck: false,
      messages: {},
    },
    options || {},
  );
  const msg = Object.assign({}, DEFAULT_MESSAGES, cfg.messages || {});

  if (!ctx || !ctx.isGroup) {
    await safeReply(adapter, ctx || {}, msg.groupOnly);
    return { ok: false, reason: 'group_only' };
  }

  const metadata = await adapter.getGroupMetadata(ctx.chatId, ctx);
  const participants = Array.isArray(metadata && metadata.participants) ? metadata.participants : [];

  const senderSet = new Set();
  addComparableJid(senderSet, adapter, ctx.senderJid);
  const senderParticipant = participants.find((p) => participantMatchesTarget(p, senderSet, adapter));
  const senderIsAdmin = participantIsAdmin(senderParticipant);

  if (!cfg.bypassSenderAdminCheck && !senderIsAdmin) {
    await safeReply(adapter, ctx, msg.senderNotAdmin);
    return { ok: false, reason: 'sender_not_admin' };
  }

  let botJid = '';
  if (ctx.botJid) botJid = normalizeJid(adapter, ctx.botJid);
  if (!botJid && typeof adapter.getBotJid === 'function') {
    botJid = normalizeJid(adapter, await adapter.getBotJid(ctx));
  }
  const botSet = new Set();
  addComparableJid(botSet, adapter, botJid);
  const botParticipant = participants.find((p) => participantMatchesTarget(p, botSet, adapter));
  const botIsAdmin = participantIsAdmin(botParticipant);

  if (!cfg.bypassBotAdminCheck && !botIsAdmin) {
    await safeReply(adapter, ctx, msg.botNotAdmin);
    return { ok: false, reason: 'bot_not_admin' };
  }

  const rawTarget = pickTargetCandidate(ctx);
  if (!rawTarget) {
    await safeReply(adapter, ctx, msg.missingTarget);
    return { ok: false, reason: 'missing_target' };
  }

  const targetSet = new Set();
  addComparableJid(targetSet, adapter, rawTarget);
  const targetParticipant = participants.find((p) => participantMatchesTarget(p, targetSet, adapter));

  if (!targetParticipant) {
    const guessedJid = normalizeJid(adapter, rawTarget) || String(rawTarget);
    await safeReply(adapter, ctx, msg.targetNotInGroup, [guessedJid]);
    return { ok: false, reason: 'target_not_in_group' };
  }

  const targetJid = getParticipantPrimaryJid(targetParticipant, adapter);
  if (!targetJid) {
    await safeReply(adapter, ctx, msg.targetNotInGroup);
    return { ok: false, reason: 'target_unresolved' };
  }

  const botIdentitySet = new Set();
  addComparableJid(botIdentitySet, adapter, botJid);
  if (botIdentitySet.size > 0) {
    const targetIdentitySet = new Set();
    addComparableJid(targetIdentitySet, adapter, targetJid);
    for (const k of targetIdentitySet) {
      if (botIdentitySet.has(k) || botIdentitySet.has(String(k).toLowerCase())) {
        await safeReply(adapter, ctx, msg.cannotKickSelfBot);
        return { ok: false, reason: 'cannot_kick_bot' };
      }
    }
  }

  const groupOwner = normalizeJid(adapter, (metadata && metadata.owner) || `${String(ctx.chatId || '').split('-')[0]}@s.whatsapp.net`);
  if (!cfg.allowKickGroupOwner && groupOwner) {
    const targetIdentitySet = new Set();
    addComparableJid(targetIdentitySet, adapter, targetJid);
    const ownerIdentitySet = new Set();
    addComparableJid(ownerIdentitySet, adapter, groupOwner);
    for (const k of targetIdentitySet) {
      if (ownerIdentitySet.has(k) || ownerIdentitySet.has(String(k).toLowerCase())) {
        await safeReply(adapter, ctx, msg.cannotKickGroupOwner);
        return { ok: false, reason: 'cannot_kick_group_owner' };
      }
    }
  }

  const ownerSet = buildOwnerSet(cfg.ownerJids, adapter);
  if (ownerSet.size > 0) {
    const targetIdentitySet = new Set();
    addComparableJid(targetIdentitySet, adapter, targetJid);
    for (const k of targetIdentitySet) {
      if (ownerSet.has(k) || ownerSet.has(String(k).toLowerCase())) {
        await safeReply(adapter, ctx, msg.cannotKickOwner);
        return { ok: false, reason: 'cannot_kick_owner' };
      }
    }
  }

  try {
    await adapter.removeParticipants(ctx.chatId, [targetJid], ctx);
    const okMessage = typeof msg.success === 'function' ? msg.success(targetJid, ctx) : String(msg.success || 'Removido.');
    await safeReply(adapter, ctx, okMessage, [targetJid]);
    return { ok: true, jid: targetJid };
  } catch (error) {
    const failMessage = typeof msg.genericError === 'function'
      ? msg.genericError(error && error.message ? error.message : '')
      : String(msg.genericError || 'Erro ao remover.');
    await safeReply(adapter, ctx, failMessage);
    return { ok: false, reason: 'remove_failed', error };
  }
}

function createKickCommand(adapter, options) {
  return {
    name: 'kick',
    run: async (ctx) => executeKick(ctx, adapter, options),
  };
}

function createBaileysAdapter(client) {
  return {
    decodeJid: (jid) => {
      if (!jid) return jid;
      if (typeof client.decodeJid === 'function') return client.decodeJid(jid);
      return jid;
    },
    findJidByLid: (lid) => {
      if (typeof client.findJidByLid === 'function') return client.findJidByLid(lid);
      return '';
    },
    getBotJid: () => {
      const raw = client && client.user ? (client.user.id || client.user.jid || '') : '';
      if (!raw) return '';
      if (typeof client.decodeJid === 'function') return client.decodeJid(raw);
      return String(raw);
    },
    getGroupMetadata: async (chatId) => client.groupMetadata(chatId),
    removeParticipants: async (chatId, jids) => client.groupParticipantsUpdate(chatId, jids, 'remove'),
    reply: async (ctx, text, extra) => {
      if (ctx && typeof ctx.reply === 'function') {
        return ctx.reply(text, extra || {});
      }
      return client.sendMessage(
        ctx.chatId,
        { text: String(text), mentions: (extra && extra.mentions) || [] },
        { quoted: ctx.rawMessage || undefined },
      );
    },
  };
}

module.exports = {
  executeKick,
  createKickCommand,
  createBaileysAdapter,
};
