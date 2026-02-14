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

const heavySemaphore = new Semaphore(HEAVY_LIMIT);

const DARK_MSG = {
  processing: "⚡ *𝙕Æ𝙍Ø está despertando...*\n⏳ Preparando...",
  queue: (pos) => `🩸 *Poder acumulando...*\n⏳ Fila: #${pos}`,
  heavy: "❌ *Excede o limite.*\n🩸 Reduza para 6–8s.",
  timeout: "⏱️ *Núcleo sem energia.*\n🔥 Envie menor.",
  success: "🔥 *Poder materializado.*"
};

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
    timeoutMs = heavy ? HEAVY_TIMEOUT_MS : LIGHT_TIMEOUT_MS,
  } = options;

  if (!heavy) {
    return withTimeout(taskFn, timeoutMs, label);
  }

  const stats = heavySemaphore.stats();
  if (stats.active >= stats.limit) {
    const pos = stats.waiting + 1;
    await client.sendMessage(m.chat, { text: DARK_MSG.queue(pos) }, { quoted: m }).catch(() => {});
  } else {
    // Resposta imediata de processamento se for o primeiro da fila
    await client.sendMessage(m.chat, { text: DARK_MSG.processing }, { quoted: m }).catch(() => {});
  }

  const release = await heavySemaphore.acquire();
  try {
    const result = await withTimeout(taskFn, timeoutMs, label);
    // Opcional: Reagir ou enviar sucesso (comentado para não ser spammer)
    // await m.react('🔥').catch(() => {});
    return result;
  } catch (error) {
    if (error.isTimeout) {
       await client.sendMessage(m.chat, { text: DARK_MSG.timeout }, { quoted: m }).catch(() => {});
    }
    throw error;
  } finally {
    release();
  }
}

export function getHeavyTaskStats() {
  return {
    ...heavySemaphore.stats(),
    heavyTimeoutMs: HEAVY_TIMEOUT_MS,
  };
}

export default {
  executeCommandTask,
  getCommandTimeoutMs,
  getHeavyTaskStats,
  isHeavyCommand,
};
