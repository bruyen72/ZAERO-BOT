import fs from 'fs';
import path from 'path';
import { runFfmpeg } from './system/ffmpeg.js';

const MAX_WA_VIDEO_BYTES = 14 * 1024 * 1024;
const COMPRESS_THRESHOLD = 8 * 1024 * 1024;
const REDGIFS_HISTORY_LIMIT = 1200;

export { MAX_WA_VIDEO_BYTES, COMPRESS_THRESHOLD };

export function isValidVideoBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const hasFtyp = buffer.slice(4, 8).toString() === 'ftyp' || buffer.slice(0, 32).toString().includes('ftyp');
  const hasEbml = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  const startsWithHtml = buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<!doctype') ||
    buffer.slice(0, 15).toString().trim().toLowerCase().startsWith('<html');
  if (startsWithHtml) return false;
  return hasFtyp || hasEbml;
}

export async function compressVideoBuffer(buffer) {
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const id = Date.now() + '-' + Math.random().toString(16).slice(2);
  const inPath = path.join(tmpDir, `nsfw-in-${id}.mp4`);
  const outPath = path.join(tmpDir, `nsfw-out-${id}.mp4`);
  try {
    fs.writeFileSync(inPath, buffer);
    await runFfmpeg([
      '-y', '-i', inPath,
      '-vf', 'scale=480:-2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '64k',
      '-movflags', '+faststart',
      '-t', '60',
      outPath
    ], { timeoutMs: 60000 });
    return fs.readFileSync(outPath);
  } finally {
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
  }
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
