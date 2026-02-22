import NodeCache from 'node-cache';

// Cache para GroupMetadata (5 minutos de TTL)
export const groupMetadataCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false // Melhor performance
});

// Cache para dados de usuário (2 minutos de TTL)
export const userDataCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 30,
  useClones: false
});

// Cache para comandos e APIs (10 minutos de TTL)
export const apiCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

/**
 * Obtém groupMetadata com cache
 * @param {object} client - Cliente WhatsApp
 * @param {string} groupJid - JID do grupo
 * @returns {Promise<object>}
 */
export async function getCachedGroupMetadata(client, groupJid) {
  const cached = groupMetadataCache.get(groupJid);
  if (cached) return cached;

  try {
    const metadata = await client.groupMetadata(groupJid);
    groupMetadataCache.set(groupJid, metadata);
    return metadata;
  } catch (error) {
    console.error('Erro ao buscar groupMetadata:', error.message);
    return null;
  }
}

/**
 * Limpa cache de um grupo específico
 * @param {string} groupJid - JID do grupo
 */
export function clearGroupCache(groupJid) {
  groupMetadataCache.del(groupJid);
}

/**
 * Limpa todo o cache
 */
export function clearAllCache() {
  groupMetadataCache.flushAll();
  userDataCache.flushAll();
  apiCache.flushAll();
}

export default {
  groupMetadataCache,
  userDataCache,
  apiCache,
  getCachedGroupMetadata,
  clearGroupCache,
  clearAllCache
};
