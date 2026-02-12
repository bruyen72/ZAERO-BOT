function toPositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const floored = Math.floor(parsed);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

export class ChatTaskQueue {
  constructor(options = {}) {
    this.maxPendingPerChat = toPositiveInt(
      options.maxPendingPerChat ?? process.env.BOT_CHAT_QUEUE_MAX_PENDING,
      120,
    );
    this.maxPendingGlobal = toPositiveInt(
      options.maxPendingGlobal ?? process.env.BOT_QUEUE_MAX_PENDING,
      6000,
    );
    this.logger = options.logger || console;
    this.queues = new Map();
    this.pendingGlobal = 0;
  }

  enqueue(chatId, task, metadata = {}) {
    const key = String(chatId || 'unknown');
    if (typeof task !== 'function') {
      return Promise.reject(new Error('Task invalida para fila de chat.'));
    }

    if (this.pendingGlobal >= this.maxPendingGlobal) {
      return Promise.reject(new Error(`Fila global cheia (${this.maxPendingGlobal}).`));
    }

    let queue = this.queues.get(key);
    if (!queue) {
      queue = { running: false, tasks: [] };
      this.queues.set(key, queue);
    }

    if (queue.tasks.length >= this.maxPendingPerChat) {
      return Promise.reject(
        new Error(`Fila do chat ${key} cheia (${this.maxPendingPerChat}).`),
      );
    }

    this.pendingGlobal += 1;

    return new Promise((resolve, reject) => {
      queue.tasks.push({
        task,
        resolve,
        reject,
        createdAt: Date.now(),
        metadata,
      });
      setImmediate(() => {
        this.#drain(key).catch((error) => {
          this.logger.error(
            `[TaskQueue] Erro ao drenar fila ${key}: ${error?.message || error}`,
          );
        });
      });
    });
  }

  getStats() {
    return {
      chats: this.queues.size,
      pendingGlobal: this.pendingGlobal,
      maxPendingPerChat: this.maxPendingPerChat,
      maxPendingGlobal: this.maxPendingGlobal,
    };
  }

  async #drain(chatId) {
    const queue = this.queues.get(chatId);
    if (!queue || queue.running) return;

    queue.running = true;

    while (queue.tasks.length > 0) {
      const current = queue.tasks.shift();
      this.pendingGlobal = Math.max(0, this.pendingGlobal - 1);

      try {
        const result = await current.task();
        current.resolve(result);
      } catch (error) {
        current.reject(error);
      }
    }

    queue.running = false;
    if (queue.tasks.length === 0) {
      this.queues.delete(chatId);
    }
  }
}

export default ChatTaskQueue;
