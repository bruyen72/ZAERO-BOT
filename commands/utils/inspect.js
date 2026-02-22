import { getUrlFromDirectPath } from "@whiskeysockets/baileys"
import _ from "lodash"

export default {
  command: ["inspect","inspeccionar"],
  category: "tools",
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!text) return client.reply(m.chat, `《✧》 Por favor insira o link do grupo/comunidade ou canal.`, m)
    const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]
    const settings = global.db.data.settings[client.user.id.split(':')[0] + '@s.whatsapp.net']
    let thumb = settings.icon
    let pp 
    let inviteCode
    const MetadataGroupInfo = async (res) => {
    let nameCommunity = ""
    if (res.linkedParent) {
    let linkedGroupMeta = await client.groupMetadata(res.linkedParent).catch(() => null)
    nameCommunity = linkedGroupMeta ? "`Nombre:` " + linkedGroupMeta.subject : ""
    }
    pp = await client.profilePictureUrl(res.id, 'image').catch(() => null)
    inviteCode = await client.groupInviteCode(m.chat).catch(() => null)
    const formatParticipants = (participants) => participants && participants.length > 0 ? participants.map((user, i) => `${i + 1}. @${user.id?.split("@")[0]}${user.admin === "superadmin" ? " (superadmin)" : user.admin === "admin" ? " (admin)" : ""}`).join("\n") : "Não encontrado"
      let caption = `🆔 *Identificador do grupo:*\n${res.id || "Não encontrado"}\n\n` +
      `👑 *Creado por:*\n${res.owner ? `@${res.owner?.split("@")[0]}` : "Não encontrado"} ${res.creation ? `el ${formatDate(res.creation)}` : "(Data não encontrada)"}\n\n` +
      `🏷️ *Nombre:*\n${res.subject || "Não encontrado"}\n\n` +
      `✏️ *Nombre cambiado por:*\n${res.subjectOwner ? `@${res.subjectOwner?.split("@")[0]}` : "Não encontrado"} ${res.subjectTime ? `el ${formatDate(res.subjectTime)}` : "(Data não encontrada)"}\n\n` +
      `📄 *Descripción:*\n${res.desc || "Não encontrado"}\n\n` +
      `📝 *Descripción cambiado por:*\n${res.descOwner ? `@${res.descOwner?.split("@")[0]}` : "Não encontrado"}\n\n` +
      `🗃️ *Id de la descripción:*\n${res.descId || "Não encontrado"}\n\n` +
      `🖼️ *Imagem do grupo:*\n${pp ? pp : "Não foi possível obter"}\n\n` +
      `💫 *Autor:*\n${res.author || "Não encontrado"}\n\n` +
      `🎫 *Código de invitación:*\n${res.inviteCode || inviteCode || "Não disponível"}\n\n` +
      `⌛ *Duração:*\n${res.ephemeralDuration !== undefined ? `${res.ephemeralDuration} segundos` : "Desconhecido"}\n\n` +
      `🛃 *Admins:*\n${formatParticipants(res.participants)}\n\n` +
      `🔰 *Total de usuários:*\n${res.size || "Quantidade não encontrada"}\n\n` +
      `✨ *Informações avançadas* ✨\n\n🔎 *Comunidade vinculada ao grupo:*\n${res.linkedParent ? "`Id:` " + res.linkedParent + (nameCommunity ? "\n" + nameCommunity : "") : res.isCommunity ? "Este grupo é uma comunidade" : "No pertenece a ninguna comunidad"}\n\n` +
      `⚠️ *Restricciones:* ${res.restrict ? "✅" : "❌"}\n` +
      `📢 *Anuncios:* ${res.announce ? "✅" : "❌"}\n` +
      `🏘️ *É uma comunidade?:* ${res.isCommunity ? "✅" : "❌"}\n` +
      `📯 *Este é um anúncio da comunidade?:* ${res.isCommunityAnnounce ? "✅" : "❌"}\n` +
      `🤝 *Tiene aprobación de miembros:* ${res.joinApprovalMode ? "✅" : "❌"}\n` +
      `🆕 *Você pode adicionar futuros membros:* ${res.memberAddMode ? "✅" : "❌"}\n\n`
      return caption.trim()
    }
    const inviteGroupInfo = async (groupData) => {
      const { id, subject, subjectOwner, subjectTime, size, creation, owner, desc, descId, linkedParent, restrict, announce, isCommunity, isCommunityAnnounce, joinApprovalMode } = groupData
      let nameCommunity = ""
      if (linkedParent) {
        let linkedGroupMeta = await client.groupMetadata(linkedParent).catch(() => null)
        nameCommunity = linkedGroupMeta ? "`Nombre:` " + linkedGroupMeta.subject : ""
      }
      pp = await client.profilePictureUrl(id, 'image').catch(() => null)
      const formatParticipants = (participants) => participants && participants.length > 0 ? participants.map((user, i) => `${i + 1}. @${user.id?.split("@")[0]}${user.admin === "superadmin" ? " (superadmin)" : user.admin === "admin" ? " (admin)" : ""}`).join("\n") : "Não encontrado"
      let caption = `🆔 *Identificador do grupo:*\n${id || "Não encontrado"}\n\n` +
      `👑 *Creado por:*\n${owner ? `@${owner?.split("@")[0]}` : "Não encontrado"} ${creation ? `el ${formatDate(creation)}` : "(Data não encontrada)"}\n\n` +
      `🏷️ *Nombre:*\n${subject || "Não encontrado"}\n\n` +
      `✏️ *Nombre cambiado por:*\n${subjectOwner ? `@${subjectOwner?.split("@")[0]}` : "Não encontrado"} ${subjectTime ? `el ${formatDate(subjectTime)}` : "(Data não encontrada)"}\n\n` +
      `📄 *Descripción:*\n${desc || "Não encontrado"}\n\n` +
      `💠 *ID de la descripción:*\n${descId || "Não encontrado"}\n\n` +
      `🖼️ *Imagem do grupo:*\n${pp ? pp : "Não foi possível obter"}\n\n` +
      `🏆 *Miembros destacados:*\n${formatParticipants(groupData.participants)}\n\n` +
      `👥 *Destacados total:*\n${size || "Quantidade não encontrada"}\n\n` +
      `✨ *Informações avançadas* ✨\n\n🔎 *Comunidade vinculada ao grupo:*\n${linkedParent ? "`Id:` " + linkedParent + (nameCommunity ? "\n" + nameCommunity : "") : isCommunity ? "Este grupo é uma comunidade" : "No pertenece a ninguna comunidad"}\n\n` +      
      `📢 *Anuncios:* ${announce ? "✅ Si" : "❌ No"}\n` +
      `🏘️ *É uma comunidade?:* ${isCommunity ? "✅ Si" : "❌ No"}\n` +
      `📯 *Este é um anúncio da comunidade?:* ${isCommunityAnnounce ? "✅" : "❌"}\n` +
      `🤝 *Tiene aprobación de miembros:* ${joinApprovalMode ? "✅" : "❌"}\n`
      return caption.trim()
    }
    let info
    let res
    let inviteInfo
    try {
      res = text ? null : await client.groupMetadata(m.chat)
      info = await MetadataGroupInfo(res)
    } catch {
      const inviteUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]      
      if (inviteUrl) {
        try {
          inviteInfo = await client.groupGetInviteInfo(inviteUrl)
          info = await inviteGroupInfo(inviteInfo)
        } catch (e) {
          m.reply('《✧》 Grupo não encontrado.')
          return
        }
      }
    }
    if (info) {
    const mentions = (res?.participants || inviteInfo?.participants || []).filter(p => p && p.id && (p.admin === "admin" || p.admin === "superadmin" || p.id === (res?.owner || inviteInfo?.owner))).map(p => p.id).filter(id => id && typeof id === 'string' && id.includes('@'))
      await client.sendMessage(m.chat, { text: info, contextInfo: {
        mentionedJid: mentions,
        externalAdReply: {
          title: "❀ Inspetor de Grupo",
          body: "✧ ¡Super Inspectador!",
          thumbnailUrl: pp ? pp : thumb,
          sourceUrl: args[0] ? args[0] : inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : md,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: false
        }
      }}, { quoted: m })
    } else {
      let newsletterInfo
      if (!channelUrl) return client.reply(m.chat, "《✧》 Verifique se é um link de canal do WhatsApp.", m)
      if (channelUrl) {
        try {
          newsletterInfo = await client.newsletterMetadata("invite", channelUrl).catch(() => null)
          if (!newsletterInfo) return client.reply(m.chat, "《✧》 Nenhuma informação de canal encontrada. Verifique se o link está correto.", m)
          let caption = "*Inspetor de link de canal*\n\n" + processObject(newsletterInfo, "", newsletterInfo?.preview)
          if (newsletterInfo?.preview) {
            pp = getUrlFromDirectPath(newsletterInfo.preview)
          } else {
            pp = thumb
          }
          if (channelUrl && newsletterInfo) {
            await client.sendMessage(m.chat, { text: caption, contextInfo: {
              mentionedJid: Array.isArray(client.parseMention(caption)) ? client.parseMention(caption) : [],
              externalAdReply: {
                title: "❀ Inspector de Canales",
                body: "✧ ¡Super Inspectador!",
                thumbnailUrl: pp,
                sourceUrl: args[0],
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: false
              }
            }}, { quoted: m })
          }
          newsletterInfo.id ? client.sendMessage(m.chat, { text: newsletterInfo.id }, { quoted: null }) : ''
        } catch (e) {
          await m.reply(`> Ocorreu um erro inesperado ao executar o comando *${usedPrefix + command}*. Tente novamente ou entre em contato com o suporte se o problema persistir.\n> [Erro: *${e.message}*]`)
        }
      }
    }
  }
}

function formatDate(n, locale = "es", includeTime = true) {
  if (n > 1e12) {
    n = Math.floor(n / 1000)
  } else if (n < 1e10) {
    n = Math.floor(n * 1000)
  }
  const date = new Date(n)
  if (isNaN(date)) return "Fecha no válida"
  const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' }
  const formattedDate = date.toLocaleDateString(locale, optionsDate)
  if (!includeTime) return formattedDate
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const period = hours < 12 ? 'AM' : 'PM'
  const formattedTime = `${hours}:${minutes}:${seconds} ${period}`
  return `${formattedDate}, ${formattedTime}`
}

function newsletterKey(key) {
  return _.startCase(key.replace(/_/g, " "))
    .replace("Id", "🆔 Identificador")
    .replace("State", "📌 Estado")
    .replace("Creation Time", "📅 Fecha de creación")
    .replace("Name Time", "✏️ Fecha de modificación del nombre")
    .replace("Name", "🏷️ Nombre")
    .replace("Description Time", "📝 Fecha de modificación de la descripción")
    .replace("Description", "📜 Descripción")
    .replace("Invite", "📩 Invitación")
    .replace("Handle", "👤 Alias")
    .replace("Picture", "🖼️ Imagem")
    .replace("Preview", "👀 Vista previa")
    .replace("Reaction Codes", "😃 Reacciones")
    .replace("Subscribers", "👥 Suscriptores")
    .replace("Verification", "✅ Verificación")
    .replace("Viewer Metadata", "🔍 Datos avanzados")
}

function formatValue(key, value, preview) {
  switch (key) {
    case "subscribers":
      return value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "No hay suscriptores"
    case "creation_time":
    case "nameTime":
    case "descriptionTime":
      return formatDate(value)
    case "description": 
    case "name":
      return value || "No hay información disponible"
    case "state":
      switch (value) {
        case "ACTIVE": return "Activo"
        case "GEOSUSPENDED": return "Suspendido por región"
        case "SUSPENDED": return "Suspendido"
        default: return "Desconhecido"
      }
    case "reaction_codes":
      switch (value) {
        case "ALL": return "Todas las reacciones permitidas"
        case "BASIC": return "Reacciones básicas permitidas"
        case "NONE": return "Não são permitidas reações"
        default: return "Desconhecido"
      }
    case "verification":
      switch (value) {
        case "VERIFIED": return "Verificado"
        case "UNVERIFIED": return "No verificado"
        default: return "Desconhecido"
      }
    case "mute":
      switch (value) {
        case "ON": return "Silenciado"
        case "OFF": return "No silenciado"
        case "UNDEFINED": return "Sin definir"
        default: return "Desconhecido"
      }
    case "view_role":
      switch (value) {
        case "ADMIN": return "Administrador"
        case "OWNER": return "Propietario"
        case "SUBSCRIBER": return "Suscriptor"
        case "GUEST": return "Invitado"
        default: return "Desconhecido"
      }
    case "picture":
      if (preview) {
        return getUrlFromDirectPath(preview)
      } else {
        return "Nenhuma imagem disponível"
      }
    default:
      return value !== null && value !== undefined ? value.toString() : "No hay información disponible"
  }
}

function processObject(obj, prefix = "", preview) {
  let caption = ""
  Object.keys(obj).forEach(key => {
    const value = obj[key]
    if (typeof value === "object" && value !== null) {
      if (Object.keys(value).length > 0) {
        const sectionName = newsletterKey(prefix + key)
        caption += `\n*\`${sectionName}\`*\n`
        caption += processObject(value, `${prefix}${key}_`)
      }
    } else {
      const shortKey = prefix ? prefix.split("_").pop() + "_" + key : key
      const displayValue = formatValue(shortKey, value, preview)
      const translatedKey = newsletterKey(shortKey)
      caption += `- *${translatedKey}:*\n${displayValue}\n`
    }
  })
  return caption
}
                                                            
