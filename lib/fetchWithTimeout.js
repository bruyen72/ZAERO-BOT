import fetch from 'node-fetch';
import axios from 'axios';

/**
 * Fetch com timeout e retry controlado
 * @param {string} url - URL para fazer o fetch
 * @param {object} options - Opções do fetch
 * @param {number} timeout - Timeout em ms (padrão: 10000ms)
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = 10000, retries = 2) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Fetch falhou após ${retries + 1} tentativas: ${error.message}`);
      }
      // Espera exponencial entre tentativas: 500ms, 1000ms, 2000ms
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Axios com timeout e retry controlado
 * @param {object} config - Configuração do axios
 * @param {number} timeout - Timeout em ms (padrão: 10000ms)
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @returns {Promise<AxiosResponse>}
 */
export async function axiosWithTimeout(config, timeout = 10000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        ...config,
        timeout: timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...config.headers
        }
      });
      return response;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Axios falhou após ${retries + 1} tentativas: ${error.message}`);
      }
      // Espera exponencial entre tentativas
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Fetch JSON com timeout e retry
 * @param {string} url - URL para fazer o fetch
 * @param {object} options - Opções do fetch
 * @param {number} timeout - Timeout em ms (padrão: 10000ms)
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @returns {Promise<any>}
 */
export async function fetchJsonWithTimeout(url, options = {}, timeout = 10000, retries = 2) {
  const response = await fetchWithTimeout(url, options, timeout, retries);
  return response.json();
}

/**
 * Get buffer com timeout e retry
 * @param {string} url - URL para fazer o fetch
 * @param {object} options - Opções do axios
 * @param {number} timeout - Timeout em ms (padrão: 15000ms)
 * @param {number} retries - Número de tentativas (padrão: 2)
 * @returns {Promise<Buffer>}
 */
export async function getBufferWithTimeout(url, options = {}, timeout = 15000, retries = 2) {
  const response = await axiosWithTimeout({
    method: 'get',
    url,
    responseType: 'arraybuffer',
    ...options
  }, timeout, retries);
  return response.data;
}

export default {
  fetchWithTimeout,
  axiosWithTimeout,
  fetchJsonWithTimeout,
  getBufferWithTimeout
};
