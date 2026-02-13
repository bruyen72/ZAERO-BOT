import { EventEmitter } from 'events';

/**
 * ZÆRØ BOT - Global Job Queue (2026 High Performance)
 * Gerencia tarefas pesadas (FFmpeg) com prioridade e concorrência limitada.
 */
class JobQueue extends EventEmitter {
  constructor(concurrency = 1) {
    super();
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
    this.userActiveJobs = new Map();
  }

  /**
   * Retorna a posição do usuário na fila.
   */
  getPosition(userId) {
    const idx = this.queue.findIndex(j => j.userId === userId);
    if (idx !== -1) return idx + 1;
    return this.queue.length + (this.active >= this.concurrency ? 1 : 0);
  }

  /**
   * Adiciona um job à fila com rate limit por usuário.
   */
  enqueue(task, options = {}) {
    const priority = options.priority || 2;
    const label = options.label || 'job';
    const userId = options.userId || 'global';

    if (userId !== 'global' && (this.userActiveJobs.get(userId) || 0) >= 1) {
      return Promise.reject(new Error('Você já tem uma tarefa em andamento. Aguarde.'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        priority,
        label,
        userId,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.addedAt - b.addedAt;
      });

      this.process();
    });
  }

  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.active++;
    this.userActiveJobs.set(job.userId, (this.userActiveJobs.get(job.userId) || 0) + 1);

    try {
      const result = await job.task();
      job.resolve(result);
    } catch (error) {
      job.reject(error);
    } finally {
      this.active--;
      this.userActiveJobs.set(job.userId, Math.max(0, (this.userActiveJobs.get(job.userId) || 0) - 1));
      this.process();
    }
  }

  getStats() {
    return {
      active: this.active,
      pending: this.queue.length,
      concurrency: this.concurrency,
    };
  }
}

// Exporta instância global para o bot (concorrência 1 para Fly.io shared-cpu-1x)
export const globalJobQueue = new JobQueue(1);
export default globalJobQueue;
