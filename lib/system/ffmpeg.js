import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import chalk from 'chalk';

let resolvedBinary = null;

function looksLikePath(value = '') {
  return /[\\/]/.test(value) || /\.(exe|bin|cmd)$/i.test(value);
}

function hasExecutableInPath(command = '') {
  if (!command) return false;

  try {
    const probe = spawnSync(command, ['-version'], {
      stdio: 'ignore',
      windowsHide: true,
      timeout: 2500,
    });
    return !probe.error && probe.status === 0;
  } catch {
    return false;
  }
}

export function resolveFfmpegPath() {
  if (resolvedBinary) return resolvedBinary;

  const envPath = String(process.env.FFMPEG_PATH || '').trim();
  if (envPath) {
    if (looksLikePath(envPath) && fs.existsSync(envPath)) {
      resolvedBinary = envPath;
      return resolvedBinary;
    }
    if (hasExecutableInPath(envPath)) {
      resolvedBinary = envPath;
      return resolvedBinary;
    }
  }

  if (hasExecutableInPath('ffmpeg')) {
    resolvedBinary = 'ffmpeg';
    return resolvedBinary;
  }

  if (process.platform === 'win32' && hasExecutableInPath('ffmpeg.exe')) {
    resolvedBinary = 'ffmpeg.exe';
    return resolvedBinary;
  }

  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    resolvedBinary = ffmpegStatic;
    return resolvedBinary;
  }

  resolvedBinary = 'ffmpeg';
  return resolvedBinary;
}

export function configureFluentFfmpeg(ffmpegInstance) {
  const binary = resolveFfmpegPath();
  if (ffmpegInstance && typeof ffmpegInstance.setFfmpegPath === 'function') {
    ffmpegInstance.setFfmpegPath(binary);
  }
  return binary;
}

// Semáforo para limitar concorrência do FFmpeg (Anti-Crash/Freeze)
const MAX_CONCURRENT_FFMPEG = Math.max(1, Math.min(2, Number(process.env.BOT_FFMPEG_CONCURRENCY || 1)));
const MAX_WAITING_FFMPEG = Math.max(1, Math.min(64, Number(process.env.BOT_FFMPEG_MAX_QUEUE || 8)));
const DEFAULT_QUEUE_WAIT_TIMEOUT_MS = Math.max(
  5000,
  Math.min(180000, Number(process.env.BOT_FFMPEG_QUEUE_WAIT_TIMEOUT_MS || 45000)),
);
let activeProcesses = 0;
const waitingQueue = [];
let ffmpegJobSeq = 0;

function processNextInQueue() {
  if (activeProcesses >= MAX_CONCURRENT_FFMPEG || waitingQueue.length === 0) return;
  const job = waitingQueue.shift();
  if (!job) return;
  if (job.queueTimer) clearTimeout(job.queueTimer);
  const { resolve, reject, args, options } = job;
  executeFfmpeg(args, options).then(resolve).catch(reject);
}

/**
 * Executa o FFmpeg com controle estrito de timeout e kill de processo.
 * Agora encapsulado pelo semáforo de concorrência.
 */
export function runFfmpeg(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    if (waitingQueue.length >= MAX_WAITING_FFMPEG) {
      const err = new Error(`FFmpeg queue full (${MAX_WAITING_FFMPEG})`);
      err.code = 'FFMPEG_QUEUE_FULL';
      return reject(err);
    }

    const queueWaitTimeoutMs = Math.max(
      5000,
      Math.min(180000, Number(options.queueWaitTimeoutMs || DEFAULT_QUEUE_WAIT_TIMEOUT_MS)),
    );

    const job = {
      id: ++ffmpegJobSeq,
      resolve,
      reject,
      args,
      options,
      queueTimer: null,
    };

    job.queueTimer = setTimeout(() => {
      const idx = waitingQueue.findIndex((item) => item.id === job.id);
      if (idx === -1) return;
      waitingQueue.splice(idx, 1);
      const err = new Error(`FFmpeg queue wait timeout after ${queueWaitTimeoutMs}ms`);
      err.code = 'FFMPEG_QUEUE_TIMEOUT';
      reject(err);
    }, queueWaitTimeoutMs);

    waitingQueue.push(job);
    processNextInQueue();
  });
}

function classifyFfmpegError(stderr = '', code = 0) {
  const text = String(stderr || '').toLowerCase();
  if (text.includes('cannot allocate memory') || text.includes('out of memory') || text.includes('cannot allocate')) {
    return 'FFMPEG_OOM';
  }
  if (text.includes('resource temporarily unavailable')) return 'FFMPEG_RESOURCE_BUSY';
  if (text.includes('invalid data found')) return 'FFMPEG_INVALID_INPUT';
  if (text.includes('error while decoding')) return 'FFMPEG_DECODE_ERROR';
  if (text.includes('unable to find a suitable output format')) return 'FFMPEG_OUTPUT_FORMAT';
  if (code === 255) return 'FFMPEG_ABORTED';
  return 'FFMPEG_ERROR';
}

export function getFfmpegQueueStats() {
  return {
    limit: MAX_CONCURRENT_FFMPEG,
    active: activeProcesses,
    waiting: waitingQueue.length,
    maxWaiting: MAX_WAITING_FFMPEG,
    queueWaitTimeoutMs: DEFAULT_QUEUE_WAIT_TIMEOUT_MS,
  };
}

function executeFfmpeg(args = [], options = {}) {
  activeProcesses++;
  const timeoutMs = Number(options.timeoutMs || 120000);
  const stdio = options.stdio || ['ignore', 'ignore', 'pipe'];
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const ffmpegBin = resolveFfmpegPath();

  // ✅ [DEBUG] Log de início de pipeline (Solicitado pelo usuário)
  console.log(chalk.gray(`[DEBUG] Pipeline FFmpeg iniciada (Ativos: ${activeProcesses})`));

  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(ffmpegBin, args, {
      cwd,
      env,
      stdio,
      windowsHide: true,
    });

    let stderr = '';
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        if (stderr.length > 64000) return;
        stderr += chunk.toString();
      });
    }

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      activeProcesses--;
      clearTimeout(timer);
      setImmediate(processNextInQueue);
      if (error) return reject(error);
      return resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      const err = new Error(`FFmpeg timeout after ${timeoutMs}ms`);
      err.code = 'FFMPEG_TIMEOUT';
      finish(err);
    }, timeoutMs);

    child.on('error', (error) => {
      finish(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        finish(null, { code, stderr, binary: ffmpegBin });
        return;
      }
      if (code === null && settled) return; 

      const err = new Error(stderr || `FFmpeg exited with code ${code}`);
      err.code = classifyFfmpegError(stderr, code);
      err.stderr = stderr;
      finish(err);
    });
  });
}

export default {
  configureFluentFfmpeg,
  getFfmpegQueueStats,
  resolveFfmpegPath,
  runFfmpeg,
};
