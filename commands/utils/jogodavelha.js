import axios from 'axios'
import { resolveLidToRealJid } from '../../lib/utils.js'

const JOIN_SYNONYMS = new Set(['entrar', 'join', 'codigo', 'code'])

function sanitizeBaseUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '')
}

function resolveGameServerBase() {
  const candidates = [
    process.env.JOGODAVELHA_SERVER_URL,
    process.env.JOGODAVELHA_PUBLIC_URL,
    process.env.TICTACTOE_SERVER_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RAILWAY_STATIC_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    process.env.FLY_APP_NAME ? `https://${process.env.FLY_APP_NAME}.fly.dev` : '',
    process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : '',
    'http://127.0.0.1:3000'
  ]

  for (const candidate of candidates) {
    const cleaned = sanitizeBaseUrl(candidate)
    if (/^https?:\/\//i.test(cleaned)) return cleaned
  }

  return ''
}

function normalizeLabel(value = '', max = 30) {
  const clean = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return ''
  return clean.slice(0, max)
}

function resolveOwnerLabel(value = '') {
  const clean = normalizeLabel(value, 24)
  if (!clean) return ''
  const digits = clean.replace(/\D/g, '')
  if (digits.length >= 8) return ''
  return clean
}

function resolveGameMetaProfile(client) {
  const botId = client?.user?.id
    ? `${client.user.id.split(':')[0]}@s.whatsapp.net`
    : ''
  const settings = global.db?.data?.settings?.[botId] || {}

  const brandName = normalizeLabel(
    process.env.JOGODAVELHA_BRAND ||
    settings.namebot ||
    settings.botname ||
    global.botName ||
    'ZAERO',
    24
  )

  const ownerName = normalizeLabel(
    process.env.JOGODAVELHA_OWNER ||
    resolveOwnerLabel(settings.owner) ||
    'Dono',
    24
  )

  const matchTitle = normalizeLabel(
    process.env.JOGODAVELHA_MATCH_TITLE ||
    'Partida Relampago',
    30
  )

  return {
    brandName: brandName || 'ZAERO',
    ownerName: ownerName || 'Dono',
    matchTitle: matchTitle || 'Partida Relampago'
  }
}

function normalizeCode(input = '') {
  const code = String(input || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return ''
  return code
}

function buildJoinUrl(base, code) {
  return `${base}/partida/${encodeURIComponent(code)}`
}

function buildPlayerJoinUrl(rawUrl, jid = '', name = '') {
  const cleanUrl = String(rawUrl || '').trim()
  if (!cleanUrl) return ''

  const cleanJid = String(jid || '').trim()
  const cleanName = normalizeLabel(name, 60)

  if (!cleanJid && !cleanName) return cleanUrl

  try {
    const parsed = new URL(cleanUrl)
    if (cleanJid) parsed.searchParams.set('jid', cleanJid)
    if (cleanName) parsed.searchParams.set('nome', cleanName)
    return parsed.toString()
  } catch {
    return cleanUrl
  }
}

async function resolveTargetJid(client, m) {
  const mentioned = Array.isArray(m?.mentionedJid) ? m.mentionedJid : []
  const raw = mentioned[0] || m?.quoted?.sender || ''
  if (!raw) return ''
  return resolveLidToRealJid(raw, client, m.chat)
}

async function createMatch(base, params = {}) {
  const response = await axios.get(`${base}/criar-partida`, {
    params,
    timeout: 15000,
    validateStatus: () => true
  })

  if (response.status < 200 || response.status > 299) {
    const remoteError = response.data?.message || response.data?.error || response.data?.erro || 'Falha ao criar partida'
    throw new Error(`HTTP ${response.status}: ${remoteError}`)
  }

  const data = response.data || {}
  const codigo = normalizeCode(data.codigo)
  if (!codigo) throw new Error('Resposta invalida do servidor: codigo ausente')

  const url = String(data.url || '').trim() || buildJoinUrl(base, codigo)
  return { codigo, url }
}

function setupHint() {
  return [
    'Configure no .env:',
    'JOGODAVELHA_SERVER_URL=https://seu-servidor-do-jogo.com',
    'JOGODAVELHA_BRAND=ZAERO',
    'JOGODAVELHA_OWNER=Bruno',
    'JOGODAVELHA_MATCH_TITLE=Partida Relampago'
  ].join('\n')
}

function usage(prefix = '.', command = 'jogodavelha') {
  return [
    `Uso do comando *${prefix}${command}*:`,
    `${prefix}jogodavelha`,
    `${prefix}jogodavelha @usuario`,
    `${prefix}jogodavelha entrar CODIGO`,
    `${prefix}entrarjogo CODIGO`
  ].join('\n')
}

function isJoinCommandName(command = '') {
  const normalized = String(command || '').toLowerCase()
  return normalized === 'entrarjogo' || normalized === 'entrarvelha'
}

function trimError(errorMessage = '') {
  return String(errorMessage || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

export default {
  command: [
    'jogodavelha',
    'jogodavelho',
    'jdv',
    'velha',
    'tictactoe',
    'entrarjogo',
    'entrarvelha'
  ],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const gameBase = resolveGameServerBase()
      const gameMeta = resolveGameMetaProfile(client)
      if (!gameBase) {
        return m.reply(
          `Nao achei a URL do servidor do jogo.\n\n${setupHint()}`
        )
      }

      const lowerCommand = String(command || '').toLowerCase()
      const firstArg = String(args?.[0] || '').trim().toLowerCase()
      const joinByCommand = isJoinCommandName(lowerCommand)
      const joinByArg = JOIN_SYNONYMS.has(firstArg)
      const joinExplicit = joinByCommand || joinByArg
      const implicitCode = !joinExplicit ? normalizeCode(args?.[0] || '') : ''

      if (joinExplicit || implicitCode) {
        const rawCode = joinExplicit
          ? (joinByCommand ? args?.[0] : args?.[1])
          : args?.[0]
        const code = normalizeCode(rawCode || '')
        if (!code) {
          const cmdExample = joinByCommand ? command : 'entrarjogo'
          return m.reply(usage(usedPrefix, cmdExample))
        }

        const url = buildJoinUrl(gameBase, code)
        return client.sendMessage(
          m.chat,
          {
            text: [
              `*${gameMeta.brandName} | ${gameMeta.matchTitle}*`,
              `Dono: ${gameMeta.ownerName}`,
              '',
              '*ENTRAR NA PARTIDA*',
              '',
              `- Codigo: *${code}*`,
              `- Link: ${url}`,
              '',
              'Boa sorte!'
            ].join('\n')
          },
          { quoted: m }
        )
      }

      const opponent = await resolveTargetJid(client, m)
      if (opponent && opponent === m.sender) {
        return m.reply('Voce nao pode se desafiar no jogo da velha.')
      }

      const senderName = (
        global.db?.data?.users?.[m.sender]?.name ||
        m.pushName ||
        m.sender.split('@')[0]
      )
      const opponentName = opponent
        ? (global.db?.data?.users?.[opponent]?.name || opponent.split('@')[0])
        : ''

      const { codigo, url } = await createMatch(gameBase, {
        creatorJid: m.sender,
        creatorName: senderName,
        opponentJid: opponent || '',
        opponentName,
        chatJid: m.chat || '',
        brandName: gameMeta.brandName,
        ownerName: gameMeta.ownerName,
        matchTitle: gameMeta.matchTitle
      })
      const creatorAutoUrl = buildPlayerJoinUrl(url, m.sender, senderName)
      const opponentAutoUrl = opponent
        ? buildPlayerJoinUrl(url, opponent, opponentName)
        : ''

      if (opponent) {
        const mentions = [...new Set([m.sender, opponent])]
        const challengeText = [
          `*${gameMeta.brandName} | ${gameMeta.matchTitle}*`,
          `Dono: ${gameMeta.ownerName}`,
          '',
          '*DESAFIO DE JOGO DA VELHA*',
          '',
          `- Codigo: *${codigo}*`,
          `- Desafiante: @${m.sender.split('@')[0]}`,
          `- Desafiado: @${opponent.split('@')[0]}`,
          '',
          `- Link da partida:\n${url}`,
          '',
          'Link automatico (WhatsApp) enviado no privado para cada jogador.',
          '',
          `Para entrar por codigo: *${usedPrefix}entrarjogo ${codigo}*`
        ].join('\n')

        await client.sendMessage(
          m.chat,
          { text: challengeText, mentions },
          { quoted: m }
        )

        await client.sendMessage(m.sender, {
          text: [
            `*${gameMeta.brandName} | ${gameMeta.matchTitle}*`,
            `Dono: ${gameMeta.ownerName}`,
            '',
            '*SEU LINK AUTOMATICO*',
            `Codigo: *${codigo}*`,
            `Link: ${creatorAutoUrl || url}`
          ].join('\n')
        }).catch(() => {})

        await client.sendMessage(opponent, {
          text: [
            `*${gameMeta.brandName} | ${gameMeta.matchTitle}*`,
            `Dono: ${gameMeta.ownerName}`,
            '',
            '*VOCE FOI DESAFIADO NO JOGO DA VELHA*',
            `Por: @${m.sender.split('@')[0]}`,
            '',
            `Codigo: *${codigo}*`,
            `Link automatico: ${opponentAutoUrl || url}`
          ].join('\n'),
          mentions: [m.sender]
        }).catch(() => {})
        return
      }

      await client.sendMessage(
        m.chat,
        {
          text: [
            `*${gameMeta.brandName} | ${gameMeta.matchTitle}*`,
            `Dono: ${gameMeta.ownerName}`,
            '',
            '*PARTIDA DE JOGO DA VELHA CRIADA*',
            '',
            `- Codigo: *${codigo}*`,
            `- Link: ${url}`,
            `- Seu link automatico: ${creatorAutoUrl || url}`,
            '',
            `Desafie alguem com: *${usedPrefix}jogodavelha @usuario*`,
            `Entrar por codigo: *${usedPrefix}entrarjogo ${codigo}*`
          ].join('\n')
        },
        { quoted: m }
      )
    } catch (error) {
      const status = error?.response?.status
      const apiMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message
      const detail = trimError(apiMsg || 'Erro desconhecido')
      const statusSuffix = status ? ` (HTTP ${status})` : ''

      await m.reply(
        `Nao consegui criar ou abrir a partida${statusSuffix}.\n` +
        `Detalhe: ${detail}\n\n` +
        setupHint()
      )
    }
  }
}
