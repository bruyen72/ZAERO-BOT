function toInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export class Limiter {
  constructor(limit = 3, options = {}) {
    this.limit = toInt(limit, 3, 1, 64)
    this.maxQueue = toInt(options.maxQueue, 80, 1, 5000)
    this.defaultQueueWaitTimeoutMs = toInt(options.queueWaitTimeoutMs, 45000, 1000, 300000)
    this.active = 0
    this.waiting = []
  }

  run(asyncFn, options = {}) {
    if (typeof asyncFn !== 'function') {
      return Promise.reject(new Error('Limiter.run requer uma funcao assincrona.'))
    }

    if (this.waiting.length >= this.maxQueue) {
      const err = new Error(`Limiter queue full (${this.maxQueue})`)
      err.code = 'LIMITER_QUEUE_FULL'
      return Promise.reject(err)
    }

    const queueWaitTimeoutMs = toInt(
      options.queueWaitTimeoutMs,
      this.defaultQueueWaitTimeoutMs,
      1000,
      300000,
    )

    return new Promise((resolve, reject) => {
      const task = { asyncFn, resolve, reject, timer: null }
      task.timer = setTimeout(() => {
        const idx = this.waiting.indexOf(task)
        if (idx === -1) return
        this.waiting.splice(idx, 1)
        const err = new Error(`Limiter queue wait timeout after ${queueWaitTimeoutMs}ms`)
        err.code = 'LIMITER_QUEUE_TIMEOUT'
        reject(err)
      }, queueWaitTimeoutMs)
      this.waiting.push(task)
      this._drain()
    })
  }

  stats() {
    return {
      limit: this.limit,
      active: this.active,
      queued: this.waiting.length,
      maxQueue: this.maxQueue,
      queueWaitTimeoutMs: this.defaultQueueWaitTimeoutMs,
    }
  }

  _drain() {
    while (this.active < this.limit && this.waiting.length > 0) {
      const task = this.waiting.shift()
      if (task?.timer) clearTimeout(task.timer)
      this.active += 1

      Promise.resolve()
        .then(task.asyncFn)
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.active = Math.max(0, this.active - 1)
          this._drain()
        })
    }
  }
}

const DEFAULT_DOWNLOAD_CONCURRENCY = toInt(process.env.BOT_DOWNLOAD_CONCURRENCY, 1, 1, 4)
const DEFAULT_DOWNLOAD_MAX_QUEUE = toInt(process.env.BOT_DOWNLOAD_MAX_QUEUE, 80, 1, 5000)
const DEFAULT_DOWNLOAD_QUEUE_WAIT_TIMEOUT_MS = toInt(process.env.BOT_DOWNLOAD_QUEUE_WAIT_TIMEOUT_MS, 45000, 1000, 300000)

export const globalDownloadLimiter = new Limiter(DEFAULT_DOWNLOAD_CONCURRENCY, {
  maxQueue: DEFAULT_DOWNLOAD_MAX_QUEUE,
  queueWaitTimeoutMs: DEFAULT_DOWNLOAD_QUEUE_WAIT_TIMEOUT_MS,
})

export default Limiter
