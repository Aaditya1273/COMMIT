// Subprocess helpers shared by the verifier tools: run a shell command with a
// timeout and capture everything, or start a service and wait for it to be healthy.
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

export interface RunResult {
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  output: string;
}

export function run(command: string, opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}): Promise<RunResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, shell: true, detached: true });
    let output = '';
    let timedOut = false;
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const timer = opts.timeoutMs ? setTimeout(() => { timedOut = true; killTree(child); }, opts.timeoutMs) : undefined;
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command, exitCode, timedOut, durationMs: Date.now() - started, output });
    });
  });
}

export function killTree(child: ChildProcess): void {
  try {
    if (child.pid) process.kill(-child.pid, 'SIGKILL');
  } catch {
    // Already gone.
  }
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

export interface Service {
  url: string;
  stop: () => void;
}

/**
 * Start `command` with PORT set and wait until `healthPath` answers 200. `service`
 * is null when the process exits or never becomes healthy; the caller decides whether
 * that is an environment failure or an invalid candidate, and gets the log either way.
 */
export async function startService(command: string, opts: { cwd: string; healthPath?: string; timeoutMs?: number }): Promise<{ service: Service | null; log: () => string }> {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(command, { cwd: opts.cwd, env: { ...process.env, PORT: String(port) }, shell: true, detached: true });
  let log = '';
  child.stdout?.on('data', (d) => (log += d));
  child.stderr?.on('data', (d) => (log += d));
  let exited = false;
  child.on('exit', () => (exited = true));
  const service = { url, stop: () => killTree(child) };
  const deadline = Date.now() + (opts.timeoutMs ?? 30_000);
  while (Date.now() < deadline && !exited) {
    try {
      const res = await fetch(url + (opts.healthPath ?? '/health'), { signal: AbortSignal.timeout(1000) });
      if (res.status === 200) return { service, log: () => log };
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  service.stop();
  return { service: null, log: () => log };
}
