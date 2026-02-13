import fs from 'fs';
import path from 'path';
import { runFfmpeg } from './system/ffmpeg.js';

const MAX_WA_VIDEO_BYTES = 12 * 1024 * 1024;
const COMPRESS_THRESHOLD = 6 * 1024 * 1024;
const PRE_CHECK_SKIP_BYTES = 18 * 1024 * 1024;
const REDGIFS_HISTORY_LIMIT = 500;

export { MAX_WA_VIDEO_BYTES, COMPRESS_THRESHOLD, PRE_CHECK_SKIP_BYTES };

export function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const hasFtyp = buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp');
  const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  const startsWithHtml = buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<!doctype') ||
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<html');
  if (startsWithHtml) return false;
  return hasFtyp || hasEbml;
}

export async function compressVideoBuffer(buffer, options = {}) {
  const inputSize = Buffer.isBuffer(buffer) ? buffer.length : 0;

  if (inputSize > 20 * 1024 * 1024) {
    throw new Error(`Video muito grande para comprimir (${(inputSize / 1024 / 1024).toFixed(1)}MB > 20MB)`);
  }

  let timeoutMs;
  if (inputSize <= 12 * 1024 * 1024) {
    timeoutMs = 60000;
  } else {
    timeoutMs = 120000;
  }
  if (options.timeoutMs && options.timeoutMs > 0) {
    timeoutMs = options.timeoutMs;
  }

  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const id = Date.now() + '-' + Math.random().toString(16).slice(2);
  const inPath = path.join(tmpDir, `nsfw-in-${id}.mp4`);
  const outPath = path.join(tmpDir, `nsfw-out-${id}.mp4`);
  try {
    fs.writeFileSync(inPath, buffer);
    await runFfmpeg([
      '-y', '-i', inPath,
      '-t', '12',
      '-vf', "scale='min(540,iw)':-2,fps=24",
      '-c:v', 'libx264',
      '-profile:v', 'main',
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ac', '2',
      '-ar', '44100',
      '-movflags', '+faststart',
      outPath
    ], { timeoutMs });
    return fs.readFileSync(outPath);
  } finally {
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
  }
}

const nsfwChatQueues = new Map();

export function withChatNsfwQueue(chatId, fn) {
  const key = String(chatId || 'unknown');
  const prev = nsfwChatQueues.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  const safe = next.catch(() => {});
  nsfwChatQueues.set(key, safe);
  return next;
}

export function normalizeId(value = '') {
  return String(value).toLowerCase().trim();
}

export function getChatRedgifsHistory(chat = {}) {
  if (!Array.isArray(chat.nsfwRedgifsSentIds)) {
    chat.nsfwRedgifsSentIds = [];
  }
  chat.nsfwRedgifsSentIds = chat.nsfwRedgifsSentIds
    .map((item) => normalizeId(item))
    .filter(Boolean);
  return chat.nsfwRedgifsSentIds;
}

export function registerSentRedgifsId(chat = {}, id = '') {
  const normalized = normalizeId(id);
  if (!normalized) return;
  const history = getChatRedgifsHistory(chat).filter((item) => item !== normalized);
  history.push(normalized);
  if (history.length > REDGIFS_HISTORY_LIMIT) {
    chat.nsfwRedgifsSentIds = history.slice(-REDGIFS_HISTORY_LIMIT);
    return;
  }
  chat.nsfwRedgifsSentIds = history;
}
