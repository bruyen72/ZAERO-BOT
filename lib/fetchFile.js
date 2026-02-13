import fs from 'fs';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const FETCH_TIMEOUT_MS = 30000; // 30s

/**
 * ZÆRØ BOT - Streaming Download (2026 Anti-OOM)
 * Baixa arquivos diretamente para o disco sem carregar na RAM.
 */
export async function fetchToFileLimited(url, outFile, options = {}) {
  const maxBytes = options.maxBytes || MAX_DOWNLOAD_BYTES;
  const timeoutMs = options.timeoutMs || FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);

    const contentLength = Number(res.headers.get('content-length') || '0');
    if (contentLength > maxBytes) {
      throw new Error(`Arquivo muito grande: ${(contentLength / 1024 / 1024).toFixed(1)}MB (limite ${maxBytes / 1024 / 1024}MB)`);
    }

    let downloadedBytes = 0;
    const progressTracker = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        if (downloadedBytes > maxBytes) {
          controller.abort();
          return callback(new Error('Download excedeu o limite de segurança.'));
        }
        callback(null, chunk);
      }
    });

    await pipeline(res.body, progressTracker, fs.createWriteStream(outFile));
    
    return {
      file: outFile,
      contentType: res.headers.get('content-type') || '',
      size: downloadedBytes
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default { fetchToFileLimited };
