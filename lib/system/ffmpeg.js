import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

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

export function runFfmpeg(args = [], options = {}) {
  const timeoutMs = Number(options.timeoutMs || 120000);
  const stdio = options.stdio || ['ignore', 'ignore', 'pipe'];
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const ffmpegBin = resolveFfmpegPath();

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
      clearTimeout(timer);
      if (error) return reject(error);
      return resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      finish(new Error(`ffmpeg timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    child.on('error', (error) => {
      finish(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        finish(null, { code, stderr, binary: ffmpegBin });
        return;
      }
      finish(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

export default {
  configureFluentFfmpeg,
  resolveFfmpegPath,
  runFfmpeg,
};
