// Minimal JSON-over-HTTP client for the calibration checks. Uses only fetch.
export interface Reply {
  status: number;
  code: string | null;
  body: any;
}

export async function call(baseUrl: string, method: string, path: string, opts: { token?: string; key?: string; body?: unknown } = {}): Promise<Reply> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.key !== undefined) headers['idempotency-key'] = opts.key;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, code: res.status >= 400 ? (body?.error?.code ?? null) : null, body };
}

export async function login(baseUrl: string, email: string, password: string): Promise<string> {
  const r = await call(baseUrl, 'POST', '/auth/login', { body: { email, password } });
  if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token;
}

/** Every page of a list endpoint, so comparisons see the whole collection. */
export async function all(baseUrl: string, path: string, field: string, token: string): Promise<any[]> {
  const items: any[] = [];
  for (let offset = 0; ; offset += 200) {
    const r = await call(baseUrl, 'GET', `${path}?limit=200&offset=${offset}`, { token });
    if (r.status !== 200) throw new Error(`GET ${path} -> ${r.status}`);
    items.push(...r.body[field]);
    if (!r.body.has_more) return items;
  }
}
