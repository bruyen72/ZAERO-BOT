function toInt(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

export class QueueManager {
  constructor(options = {}) {
    this.perChatConcurrency = toInt(options.perChatConcurrency, 1, 1, 8)
    this.maxQueuePerChat = toInt(options.maxQueuePerChat, 10, 1, 500)
    this.minGapMs = toInt(options.minGapMs, 900, 0, 30000)
    this.logger = options.logger || console
    this.chats = new Map()
  }

  enqueue(chatId, jobFn) {
    const key = String(chatId || 'unknown')
    if (typeof jobFn !== 'function') {
      return { ok: false, position: 0, reason: 'invalid_job' }
    }

    const state = this._ensureChatState(key)
    if (state.queue.length >= this.maxQueuePerChat) {
      return { ok: false, position: 0, reason: 'queue_full' }
    }

    const position = state.running + state.queue.length + 1
    state.queue.push(jobFn)
    this._schedule(key)

    return { ok: true, position }
  }

  getStats(chatId) {
    const key = String(chatId || 'unknown')
    const state = this.chats.get(key)
    if (!state) return { queued: 0, running: 0 }
    return { queued: state.queue.length, running: state.running }
  }

  getGlobalStats() {
    let queued = 0
    let running = 0
    for (const state of this.chats.values()) {
      queued += state.queue.length
      running += state.running
    }
    return {
      chats: this.chats.size,
      queued,
      running,
      perChatConcurrency: this.perChatConcurrency,
      maxQueuePerChat: this.maxQueuePerChat,
      minGapMs: this.minGapMs,
    }
  }

  _ensureChatState(chatId) {
    let state = this.chats.get(chatId)
    if (!state) {
      state = {
        queue: [],
        running: 0,
        lastFinishedAt: 0,
      }
      this.chats.set(chatId, state)
    }
    return state
  }

  _schedule(chatId) {
    const state = this.chats.get(chatId)
    if (!state) return

    while (state.running < this.perChatConcurrency && state.queue.length > 0) {
      const jobFn = state.queue.shift()
      state.running += 1
      this._runJob(chatId, state, jobFn)
    }
  }

  async _runJob(chatId, state, jobFn) {
    const waitMs = Math.max(0, (state.lastFinishedAt + this.minGapMs) - Date.now())
    if (waitMs > 0) {
      await sleep(waitMs)
    }

    try {
      await Promise.resolve().then(jobFn)
    } catch (error) {
      this.logger?.error?.(
        `[QueueManager] Falha no job de ${chatId}: ${error?.message || error}`,
      )
    } finally {
      state.running = Math.max(0, state.running - 1)
      state.lastFinishedAt = Date.now()
      this._schedule(chatId)
      if (state.running === 0 && state.queue.length === 0) {
        this.chats.delete(chatId)
      }
    }
  }
}

export default QueueManager
