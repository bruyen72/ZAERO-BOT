import nodeFetch from 'node-fetch';
import axios from 'axios';
import https from 'https';

/**
 * Fetch com timeout automático e retry
 * Protege contra APIs lentas ou travadas
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Agent HTTPS que ignora erros de certificado SSL
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  try {
    const response = await nodeFetch(url, {
      ...options,
      signal: controller.signal,
      agent: url.startsWith('https') ? httpsAgent : undefined
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: A requisição para ${url} excedeu ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Axios com timeout automático e SSL ignorado
 */
export function createAxiosWithTimeout(timeoutMs = 10000) {
  // Agent HTTPS que ignora erros de certificado SSL
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  return axios.create({
    timeout: timeoutMs,
    validateStatus: (status) => status < 500,
    httpsAgent: httpsAgent
  });
}

/**
 * Fetch com retry automático (3 tentativas)
 */
export async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 10000) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        // Aguarda 1 segundo antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

/**
 * Fetch múltiplas APIs em paralelo (retorna a primeira que funcionar)
 */
export async function fetchFirstSuccess(urls, options = {}, timeoutMs = 10000) {
  const promises = urls.map(url =>
    fetchWithTimeout(url, options, timeoutMs)
      .then(res => ({ success: true, url, response: res }))
      .catch(error => ({ success: false, url, error }))
  );

  const results = await Promise.all(promises);
  const success = results.find(r => r.success);

  if (success) {
    return success.response;
  }

  throw new Error('Todas as APIs falharam: ' + results.map(r => `${r.url}: ${r.error?.message}`).join(', '));
}

export default fetchWithTimeout;
