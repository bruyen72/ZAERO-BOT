const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5000 // 5 segundos de frescura máxima

function getCachedMetadata(groupChatId) {
  const cached = groupMetadataCache.get(groupChatId)
  if (!cached || Date.now() - cached.timestamp > metadataTTL) return null
  return cached.metadata
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}

function baseFromJid(jid) {
  return String(jid || '').split('@')[0].trim()
}

function normalizeClientJid(client, jid) {
  const raw = String(jid || '').trim()
  if (!raw) return ''
  try {
    return client?.decodeJid ? String(client.decodeJid(raw) || raw) : raw
  } catch {
    return raw
  }
}

function buildParticipantJidCandidates(participant, client) {
  const candidates = [
    normalizeClientJid(client, participant?.id),
    normalizeClientJid(client, participant?.jid),
    normalizeClientJid(client, participant?.lid),
    normalizeToJid(participant?.phoneNumber),
  ].filter(Boolean)

  return Array.from(new Set(candidates))
}

export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  if (input.endsWith('@s.whatsapp.net')) return input

  if (lidCache.has(input)) return lidCache.get(input)

  const inputNorm = normalizeClientJid(client, input)
  const lidBase = baseFromJid(inputNorm)

  if (typeof client?.findJidByLid === 'function' && /@lid$/i.test(inputNorm)) {
    try {
      const resolved = normalizeClientJid(client, client.findJidByLid(inputNorm))
      if (resolved && /@s\.whatsapp\.net$/i.test(resolved)) {
        lidCache.set(input, resolved)
        return resolved
      }
    } catch {}
  }

  let metadata = getCachedMetadata(groupChatId)

  if (!metadata) {
    try {
      metadata = await client.groupMetadata(groupChatId)
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
    } catch {
      return lidCache.set(input, input), input
    }
  }

  for (const p of metadata.participants || []) {
    const candidates = buildParticipantJidCandidates(p, client)
    if (candidates.length === 0) continue

    const hasMatchingLid = candidates.some((jid) => /@lid$/i.test(jid) && baseFromJid(jid) === lidBase)
    const hasMatchingBase = candidates.some((jid) => baseFromJid(jid) === lidBase)
    if (!hasMatchingLid && !hasMatchingBase) continue

    const preferred = candidates.find((jid) => /@s\.whatsapp\.net$/i.test(jid))
    if (preferred) {
      lidCache.set(input, preferred)
      return preferred
    }
  }

  return lidCache.set(input, input), input
}
