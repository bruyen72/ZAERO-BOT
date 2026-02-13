import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';

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

// Cache para mídias processadas (15 minutos de TTL)
export const mediaCache = new NodeCache({
  stdTTL: 900,
  checkperiod: 60,
  useClones: false
});

/**
 * Salva um arquivo no cache de mídia.
 */
export function setMediaCache(key, filePath) {
  if (!fs.existsSync(filePath)) return;
  const cacheDir = path.join('./tmp', 'media_cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const ext = path.extname(filePath);
  const cachePath = path.join(cacheDir, `${key}${ext}`);
  
  try {
    fs.copyFileSync(filePath, cachePath);
    mediaCache.set(key, cachePath);
  } catch (e) {
    console.error('[MediaCache] Erro ao salvar:', e.message);
  }
}

/**
 * Busca um arquivo no cache de mídia.
 */
export function getMediaCache(key) {
  const cachePath = mediaCache.get(key);
  if (cachePath && fs.existsSync(cachePath)) {
    return cachePath;
  }
  return null;
}

// Limpeza automática de arquivos físicos quando o item expira no NodeCache
mediaCache.on('expired', (key, value) => {
  try {
    if (value && fs.existsSync(value)) fs.unlinkSync(value);
  } catch {}
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
  mediaCache.flushAll();
}

export default {
  groupMetadataCache,
  userDataCache,
  apiCache,
  mediaCache,
  setMediaCache,
  getMediaCache,
  getCachedGroupMetadata,
  clearGroupCache,
  clearAllCache
};
