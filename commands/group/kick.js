import { resolveLidToRealJid } from '../../lib/utils.js'

function normalizeJid(client, jid) {
  const raw = String(jid || '').trim()
  if (!raw) return ''
  try {
    return client?.decodeJid ? String(client.decodeJid(raw) || raw) : raw
  } catch {
    return raw
  }
}

function addComparableJid(set, client, jid) {
  const normalized = normalizeJid(client, jid)
  if (!normalized) return
  set.add(normalized)
  set.add(normalized.toLowerCase())
  set.add(normalized.replace(/:\d+@/g, '@'))

  if (/^\d{5,20}$/.test(normalized)) {
    set.add(`${normalized}@s.whatsapp.net`)
  }

  const numMatch = normalized.match(/^(\d{5,20})@s\.whatsapp\.net$/i)
  if (numMatch) {
    set.add(numMatch[1])
    set.add(`${numMatch[1]}@lid`)
  }

  if (/@lid$/i.test(normalized) && typeof client?.findJidByLid === 'function') {
    try {
      const resolved = client.findJidByLid(normalized)
      if (resolved) {
        const resolvedNorm = normalizeJid(client, resolved)
        if (resolvedNorm) {
          set.add(resolvedNorm)
          set.add(resolvedNorm.toLowerCase())
        }
      }
    } catch {}
  }
}

function phoneToJid(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `${digits}@s.whatsapp.net` : ''
}

function participantKeys(client, participant) {
  const keys = new Set()
  addComparableJid(keys, client, participant?.id)
  addComparableJid(keys, client, participant?.jid)
  addComparableJid(keys, client, participant?.lid)
  addComparableJid(keys, client, phoneToJid(participant?.phoneNumber))
  return keys
}

function participantMatchesSet(client, participant, targetSet) {
  if (!(targetSet instanceof Set) || targetSet.size === 0) return false
  const keys = participantKeys(client, participant)
  for (const key of keys) {
    if (targetSet.has(key) || targetSet.has(String(key).toLowerCase())) return true
  }
  return false
}

function findParticipantBySet(client, participants, targetSet) {
  const list = Array.isArray(participants) ? participants : []
  return list.find((p) => participantMatchesSet(client, p, targetSet)) || null
}

function participantIsAdmin(participant) {
  if (!participant || typeof participant !== 'object') return false
  const role = String(participant.admin || '').toLowerCase()
  return participant.admin === true || role === 'admin' || role === 'superadmin'
}

function parseTargetFromArgs(args = []) {
  const text = Array.isArray(args) ? args.join(' ').trim() : ''
  if (!text) return ''
  const directJid = text.match(/([0-9]{5,20}@(?:s\.whatsapp\.net|lid))/i)
  if (directJid) return directJid[1]
  const number = text.match(/(?:^|\s|@)(\d{5,20})(?:\s|$)/)
  if (number) return `${number[1]}@s.whatsapp.net`
  return ''
}

function buildOwnerSet(client) {
  const set = new Set()
  const configuredOwners = Array.isArray(global.owner) ? global.owner : []
  for (const owner of configuredOwners) {
    const digits = String(owner || '').replace(/\D/g, '')
    if (digits) addComparableJid(set, client, `${digits}@s.whatsapp.net`)
    addComparableJid(set, client, owner)
  }

  const botJid = normalizeJid(client, client?.user?.id)
  const dbOwner = global.db?.data?.settings?.[botJid]?.owner
  if (dbOwner) {
    const digits = String(dbOwner).replace(/\D/g, '')
    if (digits) addComparableJid(set, client, `${digits}@s.whatsapp.net`)
    addComparableJid(set, client, dbOwner)
  }
  return set
}

function setFromJid(client, jid) {
  const set = new Set()
  addComparableJid(set, client, jid)
  return set
}

async function resolveParticipantKickJid(client, groupJid, participant) {
  const preferred = [
    normalizeJid(client, participant?.id),
    normalizeJid(client, participant?.jid),
    phoneToJid(participant?.phoneNumber),
  ].filter(Boolean)

  for (const candidate of preferred) {
    if (!candidate) continue
    if (!/@/.test(candidate) && /^\d{5,20}$/.test(candidate)) {
      return `${candidate}@s.whatsapp.net`
    }
    if (/@s\.whatsapp\.net$/i.test(candidate)) {
      return candidate
    }
  }

  const lidCandidates = [normalizeJid(client, participant?.lid), normalizeJid(client, participant?.id)]
    .filter((jid) => /@lid$/i.test(String(jid || '')))

  for (const lidJid of lidCandidates) {
    if (!lidJid) continue

    if (typeof client?.findJidByLid === 'function') {
      try {
        const resolved = normalizeJid(client, client.findJidByLid(lidJid))
        if (/@s\.whatsapp\.net$/i.test(resolved)) return resolved
      } catch {}
    }

    try {
      const resolvedByMetadata = normalizeJid(client, await resolveLidToRealJid(lidJid, client, groupJid))
      if (/@s\.whatsapp\.net$/i.test(resolvedByMetadata)) return resolvedByMetadata
    } catch {}

    return lidJid
  }

  return ''
}

function parseParticipantActionFailure(entry) {
  const status = String(entry?.status || '').trim()
  if (!status || status === '200') return null

  let contentText = ''
  try {
    contentText = String(entry?.content ? JSON.stringify(entry.content) : '').toLowerCase()
  } catch {
    contentText = ''
  }
  if (['401', '403'].includes(status) || /not-authorized|forbidden|permission|admin/.test(contentText)) {
    return 'bot_not_admin'
  }
  if (status === '404' || /not a participant|not in group/.test(contentText)) {
    return 'not_in_group'
  }
  if (status === '406' || /superadmin|owner/.test(contentText)) {
    return 'owner_or_superadmin'
  }
  return `status_${status}`
}

export default {
  command: ['kick'],
  category: 'grupo',
  // Validacao feita dentro do comando para evitar falso negativo de cache no gate global.
  isAdmin: false,
  botAdmin: false,
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.isGroup) return m.reply('Esse comando so funciona em grupos.')

    const groupInfo = await client.groupMetadata(m.chat)
    const participants = Array.isArray(groupInfo?.participants) ? groupInfo.participants : []

    const ownerSet = buildOwnerSet(client)
    const senderSet = setFromJid(client, m.sender)
    let senderIsOwner = false
    for (const key of senderSet) {
      if (ownerSet.has(key) || ownerSet.has(String(key).toLowerCase())) {
        senderIsOwner = true
        break
      }
    }

    const senderParticipant = findParticipantBySet(client, participants, senderSet)
    const senderIsAdmin = participantIsAdmin(senderParticipant)
    if (!senderIsOwner && !senderIsAdmin) {
      return m.reply('Apenas administradores do grupo podem usar o kick.')
    }

    const botSet = new Set()
    addComparableJid(botSet, client, client?.user?.id)
    addComparableJid(botSet, client, client?.user?.jid)
    addComparableJid(botSet, client, client?.user?.lid)
    const botParticipant = findParticipantBySet(client, participants, botSet)
    const botIsAdmin = participantIsAdmin(botParticipant)
    if (!botIsAdmin) {
      return m.reply('O bot precisa ser administrador do grupo para remover participantes.')
    }

    const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender || parseTargetFromArgs(args)
    if (!rawTarget) {
      return m.reply(`Use: ${usedPrefix + command} @usuario\nOu responda a mensagem da pessoa.`)
    }

    const targetSet = setFromJid(client, rawTarget)
    const targetParticipant = findParticipantBySet(client, participants, targetSet)
    if (!targetParticipant) {
      const fallbackTarget = normalizeJid(client, rawTarget) || String(rawTarget)
      return client.reply(
        m.chat,
        `@${fallbackTarget.split('@')[0]} nao esta no grupo.`,
        m,
        { mentions: [fallbackTarget] },
      )
    }

    const targetKeys = participantKeys(client, targetParticipant)
    let targetJid = await resolveParticipantKickJid(client, m.chat, targetParticipant)

    if (!targetJid) return m.reply('Nao consegui identificar esse usuario para remover.')

    const groupOwnerSet = setFromJid(
      client,
      groupInfo.owner || `${m.chat.split('@')[0]}@s.whatsapp.net`,
    )
    const targetIdentitySet = new Set(targetKeys)
    addComparableJid(targetIdentitySet, client, targetJid)

    let targetIsOwner = false
    for (const key of targetIdentitySet) {
      if (ownerSet.has(key) || ownerSet.has(String(key).toLowerCase())) {
        targetIsOwner = true
        break
      }
    }
    if (targetIsOwner) return m.reply('Nao posso remover o dono do bot.')

    for (const key of targetIdentitySet) {
      if (groupOwnerSet.has(key) || groupOwnerSet.has(String(key).toLowerCase())) {
        return m.reply('Nao posso remover o dono do grupo.')
      }
    }

    for (const key of targetIdentitySet) {
      if (botSet.has(key) || botSet.has(String(key).toLowerCase())) {
        return m.reply('Nao posso remover o proprio bot.')
      }
    }

    try {
      const removeResult = await client.groupParticipantsUpdate(m.chat, [targetJid], 'remove')
      const failedEntry = Array.isArray(removeResult)
        ? removeResult.find((entry) => String(entry?.status || '') !== '200')
        : null

      if (failedEntry) {
        const reason = parseParticipantActionFailure(failedEntry)
        if (reason === 'bot_not_admin') {
          return m.reply('O bot precisa ser administrador do grupo para remover participantes.')
        }
        if (reason === 'not_in_group') {
          return m.reply('Esse usuario ja nao esta no grupo.')
        }
        if (reason === 'owner_or_superadmin') {
          return m.reply('Nao e permitido remover o dono/admin principal do grupo.')
        }
        return m.reply(`Nao foi possivel remover esse usuario. [status: ${failedEntry.status}]`)
      }

      return client.reply(
        m.chat,
        `@${targetJid.split('@')[0]} removido com sucesso.`,
        m,
        { mentions: [targetJid] },
      )
    } catch (e) {
      const errText = String(e?.message || '').toLowerCase()
      if (
        errText.includes('not-authorized') ||
        errText.includes('forbidden') ||
        errText.includes('permission') ||
        errText.includes('admin')
      ) {
        return m.reply('O bot precisa ser administrador do grupo para remover participantes.')
      }
      if (errText.includes('not a participant') || errText.includes('not in group')) {
        return m.reply('Esse usuario ja nao esta no grupo.')
      }
      if (errText.includes('superadmin') || errText.includes('owner')) {
        return m.reply('Nao e permitido remover o dono/admin principal do grupo.')
      }
      return m.reply(`Erro ao executar *${usedPrefix + command}*.\n[Erro: *${e.message}*]`)
    }
  },
}
