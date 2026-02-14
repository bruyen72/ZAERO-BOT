function toPositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const floored = Math.floor(parsed);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

function parseCsvSet(value = '') {
  return new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

class Semaphore {
  constructor(limit = 1) {
    this.limit = toPositiveInt(limit, 1);
    this.active = 0;
    this.waiters = [];
  }

  async acquire() {
    if (this.active < this.limit) {
      this.active += 1;
      return this.#createRelease();
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    }).then(() => {
      this.active += 1;
      return this.#createRelease();
    });
  }

  stats() {
    return {
      limit: this.limit,
      active: this.active,
      waiting: this.waiters.length,
    };
  }

  #createRelease() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
      if (this.waiters.length > 0) {
        const next = this.waiters.shift();
        next();
      }
    };
  }
}

const DEFAULT_HEAVY_CATEGORIES = new Set(['download', 'downloader', 'nsfw', 'sticker']);
const DEFAULT_HEAVY_COMMANDS = new Set([
  'sticker',
  's',
  'toimg',
  'tourl',
  'hd',
  'enhance',
  'remini',
  'read',
  'qc',
  'brat',
  'bratv',
  'attp',
  'attp2',
  'redgifs',
  'redgif',
  'rgifs',
  'testered',
  'testeredgifs',
  'testredgifs',
  'testpesado',
  'testheavy',
  'heavytest',
  'testcomando',
  'testcmd',
  'benchcomando',
]);
const DEFAULT_LIGHT_COMMANDS = new Set([
  'menu',
  'allmenu',
  'help',
  'ajuda',
  'comandos',
  'ping',
  'status',
  'infobot',
]);

const HEAVY_CATEGORIES = new Set([
  ...DEFAULT_HEAVY_CATEGORIES,
  ...parseCsvSet(process.env.BOT_HEAVY_CATEGORIES || ''),
]);
const HEAVY_COMMANDS = new Set([
  ...DEFAULT_HEAVY_COMMANDS,
  ...parseCsvSet(process.env.BOT_HEAVY_COMMANDS || ''),
]);
const LIGHT_COMMANDS = new Set([
  ...DEFAULT_LIGHT_COMMANDS,
  ...parseCsvSet(process.env.BOT_LIGHT_COMMANDS || ''),
]);

const HEAVY_LIMIT = toPositiveInt(process.env.BOT_HEAVY_CONCURRENCY, 1, 1, 3);
const HEAVY_TIMEOUT_MS = toPositiveInt(process.env.BOT_HEAVY_TIMEOUT_MS, 120000, 1000);
const LIGHT_TIMEOUT_MS = toPositiveInt(process.env.BOT_LIGHT_TIMEOUT_MS, 0, 0);
const HEAVY_MAX_WAITING = toPositiveInt(process.env.BOT_HEAVY_MAX_WAITING, 8, 1, 200);
const HEAVY_NOTICE_WINDOW_MS = toPositiveInt(process.env.BOT_HEAVY_NOTICE_WINDOW_MS, 8000, 1000, 60000);

const heavySemaphore = new Semaphore(HEAVY_LIMIT);
const heavyNoticeByChat = new Map();

const DARK_MSG = {
  processing: '*Processando comando pesado...*\nAguarde...',
  queue: (pos) => `*Fila pesada ativa*\nPosicao: #${pos}`,
  busy: '*Fila pesada lotada.*\nTente novamente em alguns segundos.',
  heavy: '*Excede o limite.*\nReduza para 6-8s.',
  timeout: '*Nucleo sem energia.*\nEnvie menor.',
  success: '*Poder materializado.*',
};

function shouldNotifyHeavy(chatKey = 'unknown', bucket = 'generic', windowMs = HEAVY_NOTICE_WINDOW_MS) {
  const now = Date.now();
  const key = `${chatKey}:${bucket}`;
  const last = Number(heavyNoticeByChat.get(key) || 0);
  if (now - last < windowMs) return false;
  heavyNoticeByChat.set(key, now);

  if (heavyNoticeByChat.size > 2000) {
    for (const [k, ts] of heavyNoticeByChat.entries()) {
      if (now - ts > windowMs * 2) heavyNoticeByChat.delete(k);
    }
  }
  return true;
}

function withTimeout(taskFn, timeoutMs, label = 'task') {
  if (!timeoutMs || timeoutMs <= 0) {
    return Promise.resolve().then(taskFn);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      const err = new Error(DARK_MSG.timeout);
      err.isTimeout = true;
      reject(err);
    }, timeoutMs);

    const taskPromise = Promise.resolve().then(taskFn);
    taskPromise.catch(() => {});

    taskPromise
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function isHeavyCommand(cmdData, commandName = '') {
  const normalizedCommand = String(commandName || '').toLowerCase().trim();
  const normalizedCategory = String(cmdData?.category || '').toLowerCase().trim();

  if (cmdData?.info?.heavy === true) return true;
  if (cmdData?.info?.heavy === false) return false;
  if (LIGHT_COMMANDS.has(normalizedCommand)) return false;
  if (HEAVY_COMMANDS.has(normalizedCommand)) return true;
  if (HEAVY_CATEGORIES.has(normalizedCategory)) return true;
  return false;
}

export function getCommandTimeoutMs(cmdData, commandName = '', isHeavy = false) {
  const explicit = Number(cmdData?.info?.timeoutMs || cmdData?.timeoutMs || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const normalizedCommand = String(commandName || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const fromEnvByCommand = Number(process.env[`BOT_TIMEOUT_${normalizedCommand}`] || 0);
  if (Number.isFinite(fromEnvByCommand) && fromEnvByCommand > 0) return fromEnvByCommand;

  return isHeavy ? HEAVY_TIMEOUT_MS : LIGHT_TIMEOUT_MS;
}

export async function executeCommandTask(client, m, taskFn, options = {}) {
  const {
    heavy = false,
    label = 'command',
    chatId = m?.chat || 'unknown',
    timeoutMs = heavy ? HEAVY_TIMEOUT_MS : LIGHT_TIMEOUT_MS,
  } = options;

  if (!heavy) {
    return withTimeout(taskFn, timeoutMs, label);
  }

  const stats = heavySemaphore.stats();
  const chatKey = String(chatId || 'unknown');

  if (stats.waiting >= HEAVY_MAX_WAITING) {
    if (shouldNotifyHeavy(chatKey, 'full')) {
      await client.sendMessage(m.chat, { text: DARK_MSG.busy }, { quoted: m }).catch(() => {});
    }
    const err = new Error('Heavy queue full');
    err.isBusy = true;
    throw err;
  }

  if (stats.active >= stats.limit) {
    const pos = stats.waiting + 1;
    if (shouldNotifyHeavy(chatKey, 'queue')) {
      await client.sendMessage(m.chat, { text: DARK_MSG.queue(pos) }, { quoted: m }).catch(() => {});
    }
  } else {
    if (shouldNotifyHeavy(chatKey, 'processing', 4000)) {
      await client.sendMessage(m.chat, { text: DARK_MSG.processing }, { quoted: m }).catch(() => {});
    }
  }

  const release = await heavySemaphore.acquire();
  const taskPromise = Promise.resolve().then(taskFn);
  try {
    const result = await withTimeout(() => taskPromise, timeoutMs, label);
    return result;
  } catch (error) {
    if (error.isTimeout) {
      await client.sendMessage(m.chat, { text: DARK_MSG.timeout }, { quoted: m }).catch(() => {});
    }
    throw error;
  } finally {
    // Even on timeout we wait the real task to finish before releasing heavy slot.
    await taskPromise.catch(() => {});
    release();
  }
}

export function getHeavyTaskStats() {
  return {
    ...heavySemaphore.stats(),
    heavyTimeoutMs: HEAVY_TIMEOUT_MS,
    maxWaiting: HEAVY_MAX_WAITING,
  };
}

export default {
  executeCommandTask,
  getCommandTimeoutMs,
  getHeavyTaskStats,
  isHeavyCommand,
};
