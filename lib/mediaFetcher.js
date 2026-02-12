import axios from 'axios';
import { getBufferWithTimeout } from './fetchWithTimeout.js';

/**
 * Sistema robusto de fetch de mídia com fallback e validação
 */

// Configurações
const CONFIG = {
  // Timeout para validação HEAD (rápido)
  HEAD_TIMEOUT: 5000,
  // Timeout para download completo
  DOWNLOAD_TIMEOUT: 25000,
  // Número de retries por URL
  RETRIES_PER_URL: 3,
  // Delay entre tentativas (ms) - com backoff exponencial
  RETRY_DELAYS: [1000, 2500, 5000],
  // Headers padrão para evitar bloqueio de bot
  DEFAULT_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
};

/**
 * Valida URL com HEAD request antes de baixar
 * @param {string} url - URL para validar
 * @returns {Promise<{valid: boolean, contentType: string, size: number, error: string}>}
 */
async function validateUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: CONFIG.HEAD_TIMEOUT,
      headers: CONFIG.DEFAULT_HEADERS,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Aceita 2xx, 3xx, 4xx mas não 5xx
    });

    const valid = response.status >= 200 && response.status < 400;
    const contentType = response.headers['content-type'] || 'unknown';
    const size = parseInt(response.headers['content-length'] || '0', 10);

    return {
      valid,
      status: response.status,
      contentType,
      size,
      error: valid ? null : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      valid: false,
      status: 0,
      contentType: 'unknown',
      size: 0,
      error: error.code || error.message
    };
  }
}

/**
 * Tenta baixar mídia de uma URL com retry
 * @param {string} url - URL para baixar
 * @param {number} retries - Número de tentativas
 * @returns {Promise<Buffer|null>}
 */
async function fetchMediaFromUrl(url, retries = CONFIG.RETRIES_PER_URL) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[MediaFetcher] Tentativa ${attempt + 1}/${retries} para ${url}`);

      const buffer = await getBufferWithTimeout(
        url,
        {
          headers: CONFIG.DEFAULT_HEADERS,
          maxRedirects: 5,
          maxContentLength: 25 * 1024 * 1024, // 25MB max (limite seguro)
          maxBodyLength: 25 * 1024 * 1024
        },
        CONFIG.DOWNLOAD_TIMEOUT,
        0 // Não usar retry interno, fazemos aqui
      );

      // Valida se o buffer é realmente um Buffer válido
      if (Buffer.isBuffer(buffer) && buffer.length > 0) {
        console.log(`[MediaFetcher] ✓ Download bem-sucedido: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        return buffer;
      } else {
        throw new Error('Buffer inválido ou vazio');
      }
    } catch (error) {
      const errorCode = error.code || error.message;
      const delay = CONFIG.RETRY_DELAYS[attempt] || CONFIG.RETRY_DELAYS[CONFIG.RETRY_DELAYS.length - 1];

      // Log detalhado do erro
      if (errorCode === 'ECONNRESET') {
        console.error(`[MediaFetcher] ✗ Conexão resetada pelo servidor (ECONNRESET)`);
      } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNABORTED') {
        console.error(`[MediaFetcher] ✗ Timeout: ${errorCode}`);
      } else if (errorCode === 'ENOTFOUND') {
        console.error(`[MediaFetcher] ✗ Host não encontrado: ${errorCode}`);
      } else {
        console.error(`[MediaFetcher] ✗ Erro: ${error.message || errorCode}`);
      }

      // Se não for a última tentativa, aguarda antes de retry
      if (attempt < retries - 1) {
        console.log(`[MediaFetcher] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[MediaFetcher] ✗✗ Todas as ${retries} tentativas falharam para: ${url}`);
  return null;
}

/**
 * Busca mídia com sistema de fallback (tenta múltiplas URLs)
 * @param {string[]} urls - Lista de URLs para tentar
 * @param {boolean} validateFirst - Se true, valida URLs com HEAD antes de baixar
 * @returns {Promise<{buffer: Buffer, url: string, attempts: number}|null>}
 */
export async function fetchMediaWithFallback(urls, validateFirst = true) {
  if (!urls || urls.length === 0) {
    console.error('[MediaFetcher] Nenhuma URL fornecida');
    return null;
  }

  // Remove duplicatas
  urls = [...new Set(urls)];

  let totalAttempts = 0;
  const failedUrls = [];

  for (const url of urls) {
    totalAttempts++;
    console.log(`\n[MediaFetcher] Tentando URL ${totalAttempts}/${urls.length}: ${url}`);

    // Validação opcional com HEAD
    if (validateFirst) {
      const validation = await validateUrl(url);
      console.log(`[MediaFetcher] Validação HEAD:`, {
        status: validation.status,
        valid: validation.valid,
        type: validation.contentType,
        size: `${(validation.size / 1024).toFixed(2)}KB`
      });

      // Se não for válido (404, 403, 5xx, timeout), pula para próxima URL
      if (!validation.valid) {
        failedUrls.push({ url, reason: validation.error });
        console.log(`[MediaFetcher] URL inválida, pulando para próxima...`);
        continue;
      }
    }

    // Tenta baixar
    const buffer = await fetchMediaFromUrl(url, CONFIG.RETRIES_PER_URL);

    if (buffer) {
      console.log(`[MediaFetcher] ✓✓ Sucesso total! URL funcionou: ${url}`);
      return {
        buffer,
        url,
        attempts: totalAttempts,
        size: buffer.length
      };
    } else {
      failedUrls.push({ url, reason: 'Download falhou após retries' });
    }
  }

  // Se chegou aqui, todas URLs falharam
  console.error(`[MediaFetcher] ✗✗ TODAS as ${urls.length} URLs falharam:`);
  failedUrls.forEach((f, i) => {
    console.error(`  ${i + 1}. ${f.url}`);
    console.error(`     Motivo: ${f.reason}`);
  });

  return null;
}

/**
 * Busca mídia NSFW de um comando específico
 * @param {string} commandName - Nome do comando (ex: 'blowjob', 'anal')
 * @param {object} nsfwData - Dados do nsfw.json
 * @returns {Promise<{buffer: Buffer, url: string}|null>}
 */
export async function fetchNsfwMedia(commandName, nsfwData) {
  if (!nsfwData || !nsfwData[commandName]) {
    console.error(`[MediaFetcher] Comando NSFW não encontrado: ${commandName}`);
    return null;
  }

  const urls = nsfwData[commandName];

  if (!Array.isArray(urls) || urls.length === 0) {
    console.error(`[MediaFetcher] Sem URLs para comando: ${commandName}`);
    return null;
  }

  console.log(`[MediaFetcher] Buscando mídia NSFW para comando: ${commandName}`);
  console.log(`[MediaFetcher] URLs disponíveis: ${urls.length}`);

  // Embaralha URLs para distribuir carga e evitar sempre tentar a mesma primeira
  const shuffledUrls = [...urls].sort(() => Math.random() - 0.5);

  // Tenta com todas URLs (fallback automático)
  const result = await fetchMediaWithFallback(shuffledUrls, true);

  if (!result) {
    console.error(`[MediaFetcher] Todas as URLs do comando ${commandName} falharam`);
    return null;
  }

  return {
    buffer: result.buffer,
    url: result.url,
    size: result.size,
    attempts: result.attempts
  };
}

/**
 * Configuração customizada (permite override no runtime)
 */
export function setConfig(key, value) {
  if (CONFIG.hasOwnProperty(key)) {
    CONFIG[key] = value;
    console.log(`[MediaFetcher] Config atualizada: ${key} = ${value}`);
  }
}

/**
 * Wrapper genérico para baixar mídia de URL com retry robusto
 * Uso: para comandos que recebem URL de API e precisam baixar
 * @param {string} url - URL do vídeo/imagem
 * @param {object} options - Opções adicionais
 * @returns {Promise<Buffer|null>}
 */
export async function fetchMediaSafe(url, options = {}) {
  const {
    validateFirst = true,
    retries = CONFIG.RETRIES_PER_URL,
    timeout = CONFIG.DOWNLOAD_TIMEOUT,
    logPrefix = '[MediaFetcher]'
  } = options;

  console.log(`${logPrefix} Baixando: ${url}`);

  // Validação opcional
  if (validateFirst) {
    const validation = await validateUrl(url);
    if (!validation.valid) {
      console.error(`${logPrefix} URL inválida: ${validation.error}`);
      return null;
    }
  }

  // Tenta baixar com retry
  const buffer = await fetchMediaFromUrl(url, retries);

  if (!buffer) {
    console.error(`${logPrefix} Falha ao baixar após ${retries} tentativas`);
    return null;
  }

  console.log(`${logPrefix} ✓ Download completo: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
  return buffer;
}

export default {
  fetchMediaWithFallback,
  fetchNsfwMedia,
  fetchMediaSafe,
  validateUrl,
  setConfig
};
