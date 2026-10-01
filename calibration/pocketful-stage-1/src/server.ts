// HTTP layer: routing, body parsing, authentication order, idempotency, the error
// envelope. Domain rules live in wallet.ts and auth.ts.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { authenticate, hashPassword, login, signup } from './auth.ts';
import { ApiError, invalid, malformed, notFound } from './errors.ts';
import { now, parseFixture, parseState, replace, store, Store, type User } from './store.ts';
import { canonical, type Body } from './validate.ts';
import * as wallet from './wallet.ts';

interface Result {
  status: number;
  body?: unknown;
}

const MAX_BODY = 16 * 1024 * 1024;

async function readBody(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw malformed('body is too large');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.trim() === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw malformed('body is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw malformed('body must be a JSON object');
  return parsed as Body;
}

/**
 * §7. The key is scoped to (user, method, path); a claimed key is resolved before any
 * field validation, and only a successful result claims it. `run` is synchronous, so
 * no second request can interleave between the lookup and the claim.
 */
function idempotent(req: IncomingMessage, user: User, path: string, body: Body, run: () => Result): Result {
  const key = req.headers['idempotency-key'];
  if (typeof key !== 'string' || key === '') throw new ApiError(400, 'missing_idempotency_key', 'Idempotency-Key header is required');
  if (key.length > 255) throw invalid('Idempotency-Key must be at most 255 characters');
  const records = store().data.idempotency;
  const slot = JSON.stringify([user.id, 'POST', path, key]);
  const fingerprint = canonical(body);
  const previous = records[slot];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new ApiError(409, 'idempotency_key_reuse', 'key already used with a different body');
    return { status: 200, body: previous.body };
  }
  const result = run();
  records[slot] = { fingerprint, body: result.body };
  return result;
}

async function resetState(body: Body): Promise<Result> {
  const { seeds, data } = parseFixture(body, now());
  const users = await Promise.all(seeds.map(async ({ password, ...seed }) => ({ ...seed, passwordHash: await hashPassword(password) })));
  replace(new Store({ ...data, users }));
  return { status: 204 };
}

function importState(body: Body): Result {
  if (body.track !== 'pocketful' || body.format_version !== 1) throw invalid('expected track pocketful, format_version 1');
  replace(new Store(parseState(body.state)));
  return { status: 204 };
}

async function route(req: IncomingMessage, url: URL): Promise<Result> {
  const method = req.method ?? 'GET';
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').slice(1);

  // Unauthenticated surface.
  if (method === 'GET' && path === '/health') return { status: 200, body: { status: 'ok' } };
  if (method === 'POST' && path === '/_test/reset') return resetState(await readBody(req));
  if (method === 'GET' && path === '/_test/export') {
    return { status: 200, body: { track: 'pocketful', format_version: 1, state: structuredClone(store().data) } };
  }
  if (method === 'POST' && path === '/_test/import') return importState(await readBody(req));
  if (method === 'POST' && path === '/auth/signup') return signup(await readBody(req));
  if (method === 'POST' && path === '/auth/login') return login(await readBody(req));

  const known =
    (method === 'GET' && ['/me', '/requests', '/activity'].includes(path))
    || (method === 'POST' && ['/payments', '/requests', '/splits', '/settlements'].includes(path))
    || (method === 'POST' && parts.length === 3 && parts[0] === 'requests' && ['pay', 'decline', 'cancel'].includes(parts[2]));
  if (!known) throw notFound('no such endpoint');

  const user = authenticate(req.headers.authorization);
  if (method === 'GET') {
    if (path === '/me') return { status: 200, body: wallet.me(user) };
    if (path === '/requests') return wallet.listRequests(user, url.searchParams);
    return wallet.activity(user, url.searchParams);
  }
  const body = await readBody(req);
  // Reading the body yielded the thread; a reset or import may have replaced the user.
  const caller = authenticate(req.headers.authorization);
  switch (path) {
    case '/payments': return idempotent(req, caller, path, body, () => wallet.pay(caller, body));
    case '/requests': return idempotent(req, caller, path, body, () => wallet.createRequest(caller, body));
    case '/splits': return idempotent(req, caller, path, body, () => wallet.split(caller, body));
    case '/settlements': return idempotent(req, caller, path, body, () => wallet.settle(caller, body));
  }
  let id: string;
  try {
    id = decodeURIComponent(parts[1]);
  } catch {
    throw notFound('no such request');
  }
  if (parts[2] === 'pay') return idempotent(req, caller, path, body, () => wallet.payRequest(caller, id, body));
  return wallet.closeRequest(caller, id, parts[2] === 'decline' ? 'declined' : 'cancelled');
}

function send(res: ServerResponse, { status, body }: Result): void {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    send(res, await route(req, new URL(req.url ?? '/', 'http://service')));
  } catch (error) {
    if (error instanceof ApiError) {
      send(res, { status: error.status, body: { error: { code: error.code, message: error.message } } });
      return;
    }
    console.error(JSON.stringify({ level: 'error', method: req.method, url: req.url, error: String((error as Error)?.stack ?? error) }));
    send(res, { status: 500, body: { error: { code: 'internal_error', message: 'unexpected server error' } } });
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ level: 'info', msg: 'listening', port })));
