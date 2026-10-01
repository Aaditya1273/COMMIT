// Contract checks: one assertion per rule stated in the Pocketful stage-1 specification's
// tables and prose, each citing its section. These cover what example-based sample
// checks tend not to: every boundary on both sides, every wrong-type case, every
// precedence rule between errors.
//
//   node calibration/verification/contract.ts --base-url URL [--out DIR]
//
// Written after mutation campaign #1 showed whole rule families (signup validation,
// length limits) that no layer asserted. Each case below is derived from the spec
// text, not from the implementation.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { all, call, login, type Reply } from './http.ts';

const { values: args } = parseArgs({ options: { 'base-url': { type: 'string' }, out: { type: 'string' } } });
if (!args['base-url']) {
  console.error('usage: contract.ts --base-url URL [--out DIR]');
  process.exit(2);
}
const base = args['base-url'];

interface Case { id: string; spec: string; rule: string; ok: boolean; detail: string }
const cases: Case[] = [];
let key = 0;
const k = () => `contract-${process.pid}-${key++}`;

function check(id: string, spec: string, rule: string, reply: Reply, status: number, code?: string) {
  const ok = reply.status === status && (code === undefined || reply.code === code)
    && (status < 400 || (typeof reply.body?.error?.message === 'string' && reply.code !== null));
  cases.push({ id, spec, rule, ok, detail: `got ${reply.status} ${reply.code ?? ''}, want ${status} ${code ?? ''}` });
}
function assert(id: string, spec: string, rule: string, ok: boolean, detail: unknown) {
  cases.push({ id, spec, rule, ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
}

const user = (handle: string, balance: number, extra: Record<string, unknown> = {}) =>
  ({ id: `u_${handle}`, email: `${handle}@example.com`, password: 'correct horse', display_name: handle.toUpperCase(), handle, balance, ...extra });

async function reset(fixture: Record<string, unknown>) {
  const r = await call(base, 'POST', '/_test/reset', { body: fixture });
  if (r.status !== 204) throw new Error(`reset ${r.status} ${JSON.stringify(r.body)}`);
}

async function standard() {
  await reset({ currency: 'EUR', minor_units: 2, users: [user('ada', 10_000), user('bob', 2500), user('cy', 500)], settlement_operator_ids: ['u_ada'] });
  return { ada: await login(base, 'ada@example.com', 'correct horse'), bob: await login(base, 'bob@example.com', 'correct horse'), cy: await login(base, 'cy@example.com', 'correct horse') };
}

const me = async (token: string) => (await call(base, 'GET', '/me', { token })).body;
// `null` means "send no Idempotency-Key header". (An explicit `undefined` would silently
// pick up a default key -- the bug this check had on its first run.)
const post = (path: string, token: string | undefined, body: unknown, idem: string | null = k()) =>
  call(base, 'POST', path, { token, key: idem ?? undefined, body });

// ---- §3 runtime contract ----
{
  const h = await call(base, 'GET', '/health');
  assert('health', '§3.2', 'GET /health is 200 {"status":"ok"}', h.status === 200 && h.body?.status === 'ok', h);
}

// ---- §3.3 / §4 reset validation ----
{
  const bad = await call(base, 'POST', '/_test/reset', { body: { currency: 'EUR', minor_units: 2, users: [user('ada', -1)] } });
  check('reset-negative', '§4 fixture', 'a negative seeded balance is 422 validation_failed', bad, 422, 'validation_failed');
  await reset({ currency: 'JPY', minor_units: 0, users: [user('zed', 7)] });
  const t = await login(base, 'zed@example.com', 'correct horse');
  const after = await call(base, 'POST', '/_test/reset', { body: { currency: 'EUR', minor_units: 2, users: [user('zed', -5)] } });
  const still = await me(t);
  assert('reset-unchanged', '§4 fixture', 'a rejected reset changes nothing', after.status === 422 && still?.balance === 7 && still?.currency === 'JPY', still);
  const m = await me(t);
  assert('me-shape', '§8 GET /me', 'GET /me carries handle, balance, currency and minor_units',
    m.handle === 'zed' && m.balance === 7 && m.currency === 'JPY' && m.minor_units === 0 && m.user_id === 'u_zed' && m.display_name === 'ZED', m);
}

// ---- §6 authentication ----
{
  await standard();
  check('signup-ok', '§6', 'signup returns 201', await call(base, 'POST', '/auth/signup', { body: { email: 'dee@example.com', password: 'correct horse', display_name: 'Dee' } }), 201);
  check('signup-email-taken', '§6', 'an already registered email is 409 email_taken',
    await call(base, 'POST', '/auth/signup', { body: { email: 'ada@example.com', password: 'correct horse', display_name: 'X' } }), 409, 'email_taken');
  check('signup-short-password', '§6', 'a password shorter than 8 characters is 422',
    await call(base, 'POST', '/auth/signup', { body: { email: 'eve@example.com', password: '1234567', display_name: 'Eve' } }), 422, 'validation_failed');
  check('signup-8-char-password', '§6', 'an 8-character password is accepted',
    await call(base, 'POST', '/auth/signup', { body: { email: 'fay@example.com', password: '12345678', display_name: 'Fay' } }), 201);
  for (const email of ['no-at-sign.example.com', '@example.com', 'local@', '']) {
    check(`signup-bad-email ${JSON.stringify(email)}`, '§6', 'an email not of the form local@domain is 422',
      await call(base, 'POST', '/auth/signup', { body: { email, password: 'correct horse', display_name: 'Q' } }), 422, 'validation_failed');
  }
  check('signup-handle-taken', '§6', 'a derived handle already taken is 409 handle_taken',
    await call(base, 'POST', '/auth/signup', { body: { email: 'ada@example.org', password: 'correct horse', display_name: 'Ada2' } }), 409, 'handle_taken');
  const nope = await call(base, 'POST', '/auth/login', { body: { email: 'ada@example.org', password: 'correct horse' } });
  check('handle-taken-creates-nothing', '§6', 'a handle_taken signup creates no account', nope, 401, 'unauthenticated');
  const long = await call(base, 'POST', '/auth/signup', { body: { email: 'A.Very-Long+Local.Part.Name@example.com', password: 'correct horse', display_name: 'L' } });
  const lh = long.status === 201 ? (await me(long.body.token)).handle : null;
  assert('handle-derivation', '§4 handles', 'derived handle: lowercase, non [a-z0-9_] to _, cut to 20', lh === 'a_very_long_local_pa', lh);
  check('login-wrong-password', '§6', 'a wrong password is 401', await call(base, 'POST', '/auth/login', { body: { email: 'ada@example.com', password: 'wrong horse' } }), 401, 'unauthenticated');
  check('login-unknown', '§6', 'an unknown email is 401', await call(base, 'POST', '/auth/login', { body: { email: 'who@example.com', password: 'correct horse' } }), 401, 'unauthenticated');
  check('me-no-token', '§6', 'no bearer token is 401', await call(base, 'GET', '/me'), 401, 'unauthenticated');
  check('me-bad-token', '§6', 'an unknown bearer token is 401', await call(base, 'GET', '/me', { token: 'not-a-token' }), 401, 'unauthenticated');
  const a = await login(base, 'ada@example.com', 'correct horse');
  const b = await login(base, 'ada@example.com', 'correct horse');
  assert('multiple-tokens', '§6', 'an account may hold several valid tokens', (await me(a))?.handle === 'ada' && (await me(b))?.handle === 'ada', 'both tokens work');
}

// ---- §5 / §7 idempotency and errors ----
{
  const t = await standard();
  check('missing-key', '§7', 'a write without Idempotency-Key is 400', await post('/payments', t.ada, { to_handle: 'bob', amount: 1 }, null), 400, 'missing_idempotency_key');
  check('empty-key', '§7', 'an empty Idempotency-Key is 400', await post('/payments', t.ada, { to_handle: 'bob', amount: 1 }, ''), 400, 'missing_idempotency_key');
  check('key-255', '§5', 'a 255-character key is valid', await post('/payments', t.ada, { to_handle: 'bob', amount: 1 }, 'k'.repeat(255)), 201);
  check('key-256', '§5', 'a 256-character key is 422', await post('/payments', t.ada, { to_handle: 'bob', amount: 1 }, 'k'.repeat(256)), 422, 'validation_failed');
  const key = k();
  const first = await post('/payments', t.ada, { to_handle: 'bob', amount: 5, note: 'x' }, key);
  const reordered = await call(base, 'POST', '/payments', { token: t.ada, key, body: { note: 'x', amount: 5, to_handle: 'bob' } });
  assert('replay-key-order', '§7', 'same JSON value in a different key order is a replay (200, identical body)', reordered.status === 200 && JSON.stringify(reordered.body) === JSON.stringify(first.body), reordered.status);
  check('reuse-different-body', '§7', 'same key, different body is 409', await post('/payments', t.ada, { to_handle: 'bob', amount: 6, note: 'x' }, key), 409, 'idempotency_key_reuse');
  check('reuse-invalid-body', '§7', 'a claimed key is resolved before validation', await post('/payments', t.ada, { to_handle: 'bob', amount: -1 }, key), 409, 'idempotency_key_reuse');
  check('key-per-user', '§7', 'another user may use the same key string', await post('/payments', t.bob, { to_handle: 'ada', amount: 5, note: 'x' }, key), 201);
  check('key-per-path', '§7', 'the same key and body on another path is a new request',
    await post('/requests', t.ada, { payer_handle: 'bob', amount: 5, note: 'x' }, key), 201);
  const failKey = k();
  check('failed-first', '§7', 'an unaffordable payment is 409', await post('/payments', t.cy, { to_handle: 'bob', amount: 501 }, failKey), 409, 'insufficient_funds');
  check('reuse-after-4xx', '§7', 'a key whose request failed with 4xx is a first use again', await post('/payments', t.cy, { to_handle: 'bob', amount: 500 }, failKey), 201);
  const numKey = k();
  const n1 = await post('/payments', t.ada, { to_handle: 'bob', amount: 1000 }, numKey);
  const n2 = await call(base, 'POST', '/payments', { token: t.ada, key: numKey, body: { to_handle: 'bob', amount: 1e3 } });
  assert('numeric-equality', '§4 amounts', '1000 and 1e3 are the same JSON value: replay', n1.status === 201 && n2.status === 200, [n1.status, n2.status]);
  const raw = await fetch(`${base}/payments`, { method: 'POST', headers: { authorization: `Bearer ${t.ada}`, 'idempotency-key': k(), 'content-type': 'application/json' }, body: '{"to_handle": "bob", "amount": 1000.0}' });
  assert('float-integral', '§4 amounts', 'an integral 1000.0 is a valid amount', raw.status === 201, raw.status);
  const bad = await fetch(`${base}/payments`, { method: 'POST', headers: { authorization: `Bearer ${t.ada}`, 'idempotency-key': k(), 'content-type': 'application/json' }, body: '{"to_handle": "bob",' });
  const badBody = await bad.json().catch(() => null);
  assert('malformed-json', '§5', 'an unparseable body is 400 malformed_request', bad.status === 400 && badBody?.error?.code === 'malformed_request', bad.status);
  for (const raw of ['null', '[]', '"text"', '7']) {
    const r = await fetch(`${base}/payments`, { method: 'POST', headers: { authorization: `Bearer ${t.ada}`, 'idempotency-key': k(), 'content-type': 'application/json' }, body: raw });
    const b = await r.json().catch(() => null);
    assert(`non-object-body ${raw}`, '§3.4 / §5', 'a JSON body that is not an object is 400 malformed_request, never 5xx', r.status === 400 && b?.error?.code === 'malformed_request', r.status);
  }
  for (const [method, path] of [['GET', '/nope'], ['POST', '/me'], ['GET', '/payments'], ['POST', '/activity'], ['POST', '/requests/x/approve'], ['GET', '/requests/x/pay']]) {
    const r = await call(base, method, path, { token: t.ada, key: k(), body: method === 'POST' ? {} : undefined });
    check(`unknown-route ${method} ${path}`, '§5', 'an endpoint that does not exist is 404 not_found', r, 404, 'not_found');
  }
  check('wrong-type-handle', '§5', 'a field of the wrong JSON type is 400', await post('/payments', t.ada, { to_handle: 42, amount: 1 }), 400, 'malformed_request');
  check('missing-handle', '§5', 'a missing required field is 422', await post('/payments', t.ada, { amount: 1 }), 422, 'validation_failed');
  check('unknown-fields', '§3.4', 'unknown request fields are ignored', await post('/payments', t.ada, { to_handle: 'bob', amount: 1, colour: 'blue' }), 201);
}

// ---- §8 payments ----
{
  const t = await standard();
  for (const amount of [0, -1, 1_000_000_001, 2.5, '100', true, null]) {
    check(`pay-amount ${JSON.stringify(amount)}`, '§8 payments', 'amount below 1, above 1e9, non-integer, string or boolean is 422', await post('/payments', t.ada, { to_handle: 'bob', amount }), 422, 'validation_failed');
  }
  await reset({ currency: 'EUR', minor_units: 2, users: [user('ada', 1_000_000_000), user('bob', 0)] });
  const rich = await login(base, 'ada@example.com', 'correct horse');
  check('pay-amount-max', '§8 payments', 'an amount of exactly 1000000000 is valid', await post('/payments', rich, { to_handle: 'bob', amount: 1_000_000_000 }), 201);
  const t2 = await standard();
  check('pay-exact-balance', '§8 payments', 'paying exactly the whole balance is allowed', await post('/payments', t2.cy, { to_handle: 'bob', amount: 500 }), 201);
  check('pay-one-over', '§8 payments', 'one unit over the balance is 409', await post('/payments', t2.bob, { to_handle: 'ada', amount: 3001 }), 409, 'insufficient_funds');
  check('pay-self', '§8 payments', 'paying your own handle is 422 self_payment', await post('/payments', t2.ada, { to_handle: 'ada', amount: 1 }), 422, 'self_payment');
  check('pay-unknown', '§8 payments', 'an unknown handle is 404', await post('/payments', t2.ada, { to_handle: 'nobody', amount: 1 }), 404, 'not_found');
  check('note-200', '§8 payments', 'a 200-character note is valid', await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, note: 'n'.repeat(200) }), 201);
  check('note-201', '§8 payments', 'a 201-character note is 422', await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, note: 'n'.repeat(201) }), 422, 'validation_failed');
  check('note-null', '§5', 'a null note is 422', await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, note: null }), 422, 'validation_failed');
  check('note-number', '§5', 'a non-string note is 422', await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, note: 7 }), 422, 'validation_failed');
  check('visibility-bad', '§8 payments', 'visibility other than public/private is 422', await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, visibility: 'friends' }), 422, 'validation_failed');
  const emoji = 'café ☕ 🎉 \u200b  spaced  ';
  const p = await post('/payments', t2.ada, { to_handle: 'bob', amount: 1, note: emoji });
  const feed = await all(base, '/activity', 'payments', t2.bob);
  assert('note-verbatim', '§8 payments', 'notes round-trip verbatim, emoji and whitespace included', p.body?.note === emoji && feed.some((x) => x.note === emoji), p.body?.note);
  const ts = p.body?.created_at as string;
  assert('timestamp-format', '§3.4', 'timestamps are RFC 3339 with an explicit offset', /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?([+-]\d\d:\d\d|Z)$/.test(ts ?? ''), ts);
  assert('id-length', '§3.4', 'ids are strings of at most 64 characters', typeof p.body?.payment_id === 'string' && p.body.payment_id.length <= 64, p.body?.payment_id);
  const before = await me(t2.cy);
  const feedBefore = await all(base, '/activity', 'payments', t2.cy);
  await post('/payments', t2.cy, { to_handle: 'bob', amount: before.balance + 1 });
  const feedAfter = await all(base, '/activity', 'payments', t2.cy);
  assert('failed-no-trace', '§8 payments', 'a failed payment leaves no trace in balances or the feed',
    (await me(t2.cy)).balance === before.balance && JSON.stringify(feedAfter) === JSON.stringify(feedBefore), [feedBefore.length, feedAfter.length]);
}

// ---- §8 requests ----
{
  const t = await standard();
  const big = await post('/requests', t.bob, { payer_handle: 'cy', amount: 100_000 });
  check('request-over-balance', '§4 requests', 'a request may exceed the payer balance', big, 201);
  check('request-self', '§8 requests', 'requesting from yourself is 422 self_request', await post('/requests', t.bob, { payer_handle: 'bob', amount: 1 }), 422, 'self_request');
  check('request-unknown', '§8 requests', 'an unknown payer handle is 404', await post('/requests', t.bob, { payer_handle: 'nobody', amount: 1 }), 404, 'not_found');
  check('request-amount', '§8 requests', 'an invalid amount is 422', await post('/requests', t.bob, { payer_handle: 'ada', amount: 0 }), 422, 'validation_failed');
  check('request-note-201', '§8 requests', 'a 201-character note is 422', await post('/requests', t.bob, { payer_handle: 'ada', amount: 1, note: 'n'.repeat(201) }), 422, 'validation_failed');
  const id = big.body.request_id;
  check('pay-short', '§8 pay', 'paying a request while short is 409 and changes nothing', await post(`/requests/${id}/pay`, t.cy, {}), 409, 'insufficient_funds');
  const listed = (await all(base, '/requests', 'requests', t.cy)).find((x) => x.request_id === id);
  assert('pay-short-still-pending', '§4 requests', 'the request stays pending after an unaffordable pay', listed?.status === 'pending', listed?.status);
  check('pay-by-requester', '§8 pay', 'only the payer may pay', await post(`/requests/${id}/pay`, t.bob, {}), 403, 'forbidden');
  check('pay-by-stranger', '§8 pay', 'a third party may not pay', await post(`/requests/${id}/pay`, t.ada, {}), 403, 'forbidden');
  check('pay-unknown-request', '§8 pay', 'an unknown request is 404', await post('/requests/rq_nope/pay', t.cy, {}), 404, 'not_found');
  check('decline-by-requester', '§8 decline', 'only the payer may decline', await post(`/requests/${id}/decline`, t.bob, undefined, null), 403, 'forbidden');
  check('cancel-by-payer', '§8 cancel', 'only the requester may cancel', await post(`/requests/${id}/cancel`, t.cy, undefined, null), 403, 'forbidden');
  const small = (await post('/requests', t.bob, { payer_handle: 'ada', amount: 300, note: 'taxi' })).body.request_id;
  const pk = k();
  const paid = await post(`/requests/${small}/pay`, t.ada, { visibility: 'private' }, pk);
  assert('pay-request-payment', '§8 pay', 'paying returns the payment with request_id, the payer chooses visibility',
    paid.status === 201 && paid.body.request_id === small && paid.body.visibility === 'private' && paid.body.amount === 300 && paid.body.note === 'taxi', paid.body);
  const replay = await post(`/requests/${small}/pay`, t.ada, { visibility: 'private' }, pk);
  assert('pay-replay-after-paid', '§8 pay', 'a replay after the request is paid is 200 with the original body, not request_not_pending',
    replay.status === 200 && JSON.stringify(replay.body) === JSON.stringify(paid.body), replay.status);
  check('pay-replay-other-body', '§8 pay', '{} and {"visibility":"public"} are different bodies', await post(`/requests/${small}/pay`, t.ada, {}, pk), 409, 'idempotency_key_reuse');
  check('pay-twice', '§8 pay', 'paying a paid request under a new key is 409 request_not_pending', await post(`/requests/${small}/pay`, t.ada, {}), 409, 'request_not_pending');
  check('decline-paid', '§8 decline', 'declining a paid request is 409', await post(`/requests/${small}/decline`, t.ada, undefined, null), 409, 'request_not_pending');
  check('cancel-paid', '§8 cancel', 'cancelling a paid request is 409', await post(`/requests/${small}/cancel`, t.bob, undefined, null), 409, 'request_not_pending');
  const d = (await post('/requests', t.bob, { payer_handle: 'ada', amount: 1 })).body.request_id;
  await post(`/requests/${d}/decline`, t.ada, undefined, null);
  check('cancel-declined', '§8 cancel', 'cancelling a declined request is 409', await post(`/requests/${d}/cancel`, t.bob, undefined, null), 409, 'request_not_pending');
  check('pay-declined', '§8 pay', 'paying a declined request is 409', await post(`/requests/${d}/pay`, t.ada, {}), 409, 'request_not_pending');
  const c = (await post('/requests', t.bob, { payer_handle: 'ada', amount: 1 })).body.request_id;
  await post(`/requests/${c}/cancel`, t.bob, undefined, null);
  check('decline-cancelled', '§8 decline', 'declining a cancelled request is 409', await post(`/requests/${c}/decline`, t.ada, undefined, null), 409, 'request_not_pending');
  const feedCy = await all(base, '/activity', 'payments', t.cy);
  assert('private-hidden', '§4 feed', 'a private payment is hidden from third parties', feedCy.every((x) => x.payment_id !== paid.body.payment_id), feedCy.length);
  const feedBob = await all(base, '/activity', 'payments', t.bob);
  assert('private-visible-receiver', '§4 feed', 'a private payment is visible to its receiver', feedBob.some((x) => x.payment_id === paid.body.payment_id), feedBob.length);
  assert('requests-not-in-feed', '§4 feed', 'requests never appear in the activity feed', feedBob.every((x) => !('status' in x)), feedBob.length);
  const cyRequests = await all(base, '/requests', 'requests', t.cy);
  assert('requests-only-parties', '§8 GET /requests', 'a caller sees only requests they are party to', cyRequests.every((x) => x.payer_handle === 'cy' || x.requester_handle === 'cy'), cyRequests.length);
}

// ---- §8 list parameters ----
{
  const t = await standard();
  for (let i = 0; i < 3; i++) await post('/requests', t.bob, { payer_handle: 'ada', amount: i + 1 });
  await post('/requests', t.ada, { payer_handle: 'bob', amount: 9 });
  const inc = await call(base, 'GET', '/requests?direction=incoming', { token: t.ada });
  const out = await call(base, 'GET', '/requests?direction=outgoing', { token: t.ada });
  assert('direction', '§8 GET /requests', 'incoming = caller is payer, outgoing = caller is requester',
    inc.body.requests.length === 3 && inc.body.requests.every((x: any) => x.payer_handle === 'ada') && out.body.requests.length === 1, [inc.body.requests.length, out.body.requests.length]);
  const amounts = inc.body.requests.map((x: any) => x.amount);
  assert('newest-first', '§8 GET /requests', 'requests are newest first', JSON.stringify(amounts) === JSON.stringify([3, 2, 1]), amounts);
  const page = await call(base, 'GET', '/requests?direction=incoming&limit=2', { token: t.ada });
  const last = await call(base, 'GET', '/requests?direction=incoming&limit=2&offset=2', { token: t.ada });
  assert('has-more', '§8 GET /requests', 'has_more is true exactly when items remain', page.body.has_more === true && page.body.requests.length === 2 && last.body.has_more === false && last.body.requests.length === 1, [page.body.has_more, last.body.has_more]);
  const exact = await call(base, 'GET', '/requests?direction=incoming&limit=3', { token: t.ada });
  assert('has-more-exact', '§8 GET /requests', 'has_more is false when the page ends exactly at the last item', exact.body.has_more === false, exact.body.has_more);
  const pending = await call(base, 'GET', '/requests?status=paid', { token: t.ada });
  assert('status-filter', '§8 GET /requests', 'status filters the list', pending.body.requests.length === 0, pending.body.requests.length);
  for (const q of ['limit=0', 'limit=201', 'limit=1e1', 'limit=4.0', 'limit=+4', 'limit=abc', 'offset=-1', 'direction=sideways', 'status=open']) {
    check(`list-param ${q}`, '§5 / §8', 'out-of-range or non-digit list parameters are 422', await call(base, 'GET', `/requests?${q}`, { token: t.ada }), 422, 'validation_failed');
    if (q.startsWith('limit') || q.startsWith('offset')) {
      check(`feed-param ${q}`, '§8 GET /activity', 'the feed applies the same limit/offset rules', await call(base, 'GET', `/activity?${q}`, { token: t.ada }), 422, 'validation_failed');
    }
  }
  check('limit-200', '§5', 'limit=200 is valid', await call(base, 'GET', '/requests?limit=200', { token: t.ada }), 200);
  check('unknown-query', '§3.4', 'unknown query parameters are ignored', await call(base, 'GET', '/activity?colour=blue', { token: t.ada }), 200);
}

// ---- §8 / §9 splits ----
{
  const t = await standard();
  const table: Array<[number, string[], number[]]> = [
    [1000, ['ada', 'bob', 'cy'], [334, 333, 333]], [1, ['ada', 'bob', 'cy'], [1, 0, 0]], [10, ['ada', 'bob', 'cy'], [4, 3, 3]],
    [999, ['ada', 'bob', 'cy'], [333, 333, 333]], [10, ['cy', 'bob', 'ada'], [4, 3, 3]],
  ];
  for (const [amount, handles, want] of table) {
    const r = await post('/splits', t.ada, { amount, participant_handles: handles });
    const got = r.body?.shares?.map((s: any) => s.amount);
    assert(`split ${amount}/${handles.join(',')}`, '§9', 'shares follow the equal-split table, larger shares first', JSON.stringify(got) === JSON.stringify(want), got);
  }
  const zero = await post('/splits', t.ada, { amount: 1, participant_handles: ['ada', 'bob', 'cy'] });
  assert('split-zero-share-request', '§9', 'a zero share still produces a request', zero.body?.requests?.length === 2 && zero.body.requests.some((x: any) => x.amount === 0), zero.body?.requests?.map((x: any) => x.amount));
  const without = await post('/splits', t.ada, { amount: 100, participant_handles: ['bob', 'cy'] });
  assert('split-caller-omitted', '§8 splits', 'a caller omitted from the handles is not a share holder', without.body?.shares?.length === 2 && without.body.requests.length === 2, without.body?.shares);
  const solo = await post('/splits', t.ada, { amount: 100, participant_handles: ['ada'] });
  assert('split-solo', '§8 splits', 'a split of only the caller is valid with no requests', solo.status === 201 && solo.body.requests.length === 0, solo.status);
  check('split-empty', '§8 splits', 'empty participant_handles is 422', await post('/splits', t.ada, { amount: 100, participant_handles: [] }), 422, 'validation_failed');
  check('split-duplicate', '§8 splits', 'a duplicate handle is 422', await post('/splits', t.ada, { amount: 100, participant_handles: ['bob', 'bob'] }), 422, 'validation_failed');
  check('split-unknown', '§8 splits', 'an unknown handle is 404', await post('/splits', t.ada, { amount: 100, participant_handles: ['bob', 'nobody'] }), 404, 'not_found');
  check('split-amount', '§8 splits', 'an invalid amount is 422', await post('/splits', t.ada, { amount: 0, participant_handles: ['bob'] }), 422, 'validation_failed');
  const poor = await post('/splits', t.cy, { amount: 1_000_000_000, participant_handles: ['ada', 'bob'] });
  assert('split-no-balance-check', '§8 splits', 'nothing about a split checks anyone\'s balance', poor.status === 201, poor.status);
  const bal = (await me(t.ada)).balance;
  assert('split-moves-nothing', '§8 splits', 'creating a split moves no money', bal === 10_000, bal);
}

// ---- §11 settlements ----
{
  const t = await standard();
  const tr = (from: string, to: string, amount: unknown, extra: Record<string, unknown> = {}) => ({ from_handle: from, to_handle: to, amount, ...extra });
  check('settle-no-token', '§11', 'no token is 401', await post('/settlements', undefined, { transfers: [tr('ada', 'bob', 1)] }), 401, 'unauthenticated');
  check('settle-not-operator', '§11', 'an authenticated non-operator is 403', await post('/settlements', t.bob, { transfers: [tr('ada', 'bob', 1)] }), 403, 'forbidden');
  check('settle-empty', '§11', 'zero transfers is 422', await post('/settlements', t.ada, { transfers: [] }), 422, 'validation_failed');
  check('settle-33', '§11', '33 transfers is 422', await post('/settlements', t.ada, { transfers: Array.from({ length: 33 }, () => tr('ada', 'bob', 1)) }), 422, 'validation_failed');
  check('settle-32', '§11', '32 transfers is valid', await post('/settlements', t.ada, { transfers: Array.from({ length: 32 }, () => tr('ada', 'bob', 1)) }), 201);
  check('settle-shape', '§11', 'a malformed batch shape is 422', await post('/settlements', t.ada, { transfers: 'all of them' }), 422, 'validation_failed');
  check('settle-entry-shape', '§11', 'a non-object entry is 422', await post('/settlements', t.ada, { transfers: [7] }), 422, 'validation_failed');
  check('settle-self', '§11', 'a self-transfer is 422 self_payment', await post('/settlements', t.ada, { transfers: [tr('bob', 'bob', 1)] }), 422, 'self_payment');
  check('settle-unknown', '§11', 'an unknown handle is 404', await post('/settlements', t.ada, { transfers: [tr('bob', 'nobody', 1)] }), 404, 'not_found');
  check('settle-order', '§11', 'entry errors are reported in input order', await post('/settlements', t.ada, { transfers: [tr('bob', 'nobody', 1), tr('bob', 'bob', 1)] }), 404, 'not_found');
  check('settle-order-2', '§11', 'entry errors precede insufficient funds', await post('/settlements', t.ada, { transfers: [tr('cy', 'bob', 100_000), tr('bob', 'bob', 1)] }), 422, 'self_payment');
  const before = await Promise.all([t.ada, t.bob, t.cy].map(async (x) => (await me(x)).balance));
  check('settle-unaffordable', '§11', 'a settlement leaving any wallet negative is 409', await post('/settlements', t.ada, { transfers: [tr('cy', 'bob', 400), tr('cy', 'ada', 200)] }), 409, 'insufficient_funds');
  const after = await Promise.all([t.ada, t.bob, t.cy].map(async (x) => (await me(x)).balance));
  assert('settle-atomic', '§11', 'a refused settlement moves nothing', JSON.stringify(before) === JSON.stringify(after), after);
  const net = await post('/settlements', t.ada, { transfers: [tr('cy', 'bob', 900), tr('bob', 'cy', 500)] });
  assert('settle-net', '§11', 'affordability is net: cy pays 900 holding 500 but receives 500', net.status === 201, net.status);
  const members = net.body?.payments ?? [];
  assert('settle-receipts', '§11', 'members share settlement_id and created_at = committed_at, null request_id, input order',
    members.length === 2 && members.every((p: any) => p.settlement_id === net.body.settlement_id && p.created_at === net.body.committed_at && p.request_id === null)
    && members[0].from_handle === 'cy' && members[1].from_handle === 'bob', members);
  const plain = await post('/payments', t.ada, { to_handle: 'bob', amount: 1 });
  assert('nonmember-null', '§11', 'non-member payments expose settlement_id null', plain.body?.settlement_id === null, plain.body?.settlement_id);
  const sk = k();
  const s1 = await post('/settlements', t.ada, { transfers: [tr('ada', 'bob', 10)] }, sk);
  const s2 = await post('/settlements', t.ada, { transfers: [tr('ada', 'bob', 10)] }, sk);
  assert('settle-replay', '§11', 'a settlement replay is 200 with the original complete response', s1.status === 201 && s2.status === 200 && JSON.stringify(s1.body) === JSON.stringify(s2.body), [s1.status, s2.status]);
  const failKey = k();
  await post('/settlements', t.ada, { transfers: [tr('cy', 'bob', 100_000)] }, failKey);
  check('settle-failed-key-free', '§11', 'failed validation claims no idempotency key', await post('/settlements', t.ada, { transfers: [tr('ada', 'bob', 1)] }, failKey), 201);
}

// ---- §10 export / import ----
{
  const t = await standard();
  const paid = await post('/payments', t.ada, { to_handle: 'bob', amount: 77 });
  const pk = k();
  const rq = await post('/requests', t.bob, { payer_handle: 'ada', amount: 5 }, pk);
  const snap = await call(base, 'GET', '/_test/export');
  assert('export-shape', '§10', 'export is 200 with track, format_version 1 and state', snap.status === 200 && snap.body.track === 'pocketful' && snap.body.format_version === 1 && typeof snap.body.state === 'object', snap.status);
  await post('/payments', t.ada, { to_handle: 'bob', amount: 1 });
  const again = await call(base, 'GET', '/_test/export');
  assert('export-snapshot', '§10', 'export is a snapshot: later writes do not change it', JSON.stringify(again.body) !== JSON.stringify(snap.body), 'differs after a write');
  await reset({ currency: 'JPY', minor_units: 0, users: [user('zz', 1)] });
  const imp = await call(base, 'POST', '/_test/import', { body: snap.body });
  assert('import-204', '§10', 'importing an unchanged export is 204', imp.status === 204, imp.status);
  const m2 = await me(t.ada);
  assert('import-token', '§10', 'existing tokens remain valid after import', m2?.balance === 10_000 - 77 && m2?.currency === 'EUR', m2);
  const replay = await post('/requests', t.bob, { payer_handle: 'ada', amount: 5 }, pk);
  assert('import-retry', '§10', 'original idempotent responses survive import', replay.status === 200 && JSON.stringify(replay.body) === JSON.stringify(rq.body), replay.status);
  const feed = await all(base, '/activity', 'payments', t.ada);
  assert('import-payments', '§10', 'payments survive import unchanged', feed.some((x) => JSON.stringify(x) === JSON.stringify(paid.body)), feed.length);
  assert('import-login', '§10', 'hashed-password login survives import', (await call(base, 'POST', '/auth/login', { body: { email: 'bob@example.com', password: 'correct horse' } })).status === 200, 'login');
  const twice = await call(base, 'POST', '/_test/import', { body: snap.body });
  const feed2 = await all(base, '/activity', 'payments', t.ada);
  assert('import-replace', '§10', 'repeating an import duplicates nothing', twice.status === 204 && feed2.length === feed.length, [feed.length, feed2.length]);
  check('import-wrong-track', '§10', 'a wrong track is 422', await call(base, 'POST', '/_test/import', { body: { ...snap.body, track: 'other' } }), 422, 'validation_failed');
  check('import-wrong-version', '§10', 'a wrong format_version is 422', await call(base, 'POST', '/_test/import', { body: { ...snap.body, format_version: 2 } }), 422, 'validation_failed');
  check('import-no-state', '§10', 'a missing state is 422', await call(base, 'POST', '/_test/import', { body: { track: 'pocketful', format_version: 1 } }), 422, 'validation_failed');
  check('import-bad-state', '§10', 'an invalid state is 422', await call(base, 'POST', '/_test/import', { body: { track: 'pocketful', format_version: 1, state: { nonsense: true } } }), 422, 'validation_failed');
  const still = await me(t.ada);
  assert('import-reject-unchanged', '§10', 'a rejected import leaves the destination unchanged', still?.balance === 10_000 - 77, still);
  await reset({ currency: 'EUR', minor_units: 2, users: [user('ada', 1)] });
  check('reset-clears-tokens', '§10', 'reset clears all state, including imported tokens', await call(base, 'GET', '/me', { token: t.bob }), 401, 'unauthenticated');
}

// ---- §10 import must reject any invalid state, atomically ----
// The state format is the service's own, so the verifier corrupts a real export one
// field at a time: every corruption must be 422 with the destination unchanged, and
// the service must stay healthy afterwards.
{
  const t = await standard();
  await call(base, 'POST', '/auth/signup', { body: { email: 'neo@example.com', password: 'correct horse', display_name: 'Neo' } });
  await post('/payments', t.ada, { to_handle: 'bob', amount: 10 });
  await post('/requests', t.bob, { payer_handle: 'ada', amount: 3 });
  const snap = (await call(base, 'GET', '/_test/export')).body;
  // An account created through the API, not the fixture, must survive the round trip too.
  await reset({ currency: 'EUR', minor_units: 2, users: [user('zz', 1)] });
  await call(base, 'POST', '/_test/import', { body: snap });
  check('import-api-user', '§10', 'accounts created after reset survive export and import',
    await call(base, 'POST', '/auth/login', { body: { email: 'neo@example.com', password: 'correct horse' } }), 200);
  const before = JSON.stringify((await call(base, 'GET', '/_test/export')).body);

  const state = snap.state as Record<string, any>;
  const keys = Object.keys(state);
  const corrupt: Array<[string, (s: any) => void]> = [
    ['state is a list', (s) => { for (const k of Object.keys(s)) delete s[k]; s.length = 0; }],
    ...keys.map((k): [string, (s: any) => void] => [`state.${k} missing`, (s) => { delete s[k]; }]),
    ...keys.map((k): [string, (s: any) => void] => [`state.${k} wrong type`, (s) => { s[k] = typeof s[k] === 'string' ? 42 : 'x'; }]),
  ];
  for (const listKey of keys.filter((k) => Array.isArray(state[k]) && state[k].length && typeof state[k][0] === 'object')) {
    corrupt.push([`state.${listKey}[0] not an object`, (s) => { s[listKey][0] = 7; }]);
    for (const field of Object.keys(state[listKey][0])) {
      const value = state[listKey][0][field];
      if (value === null) continue; // a null field may legitimately be anything nullable
      corrupt.push([`state.${listKey}[0].${field} missing`, (s) => { delete s[listKey][0][field]; }]);
      corrupt.push([`state.${listKey}[0].${field} wrong type`, (s) => { s[listKey][0][field] = typeof value === 'string' ? 42 : 'x'; }]);
    }
    if (state[listKey].length > 1) corrupt.push([`state.${listKey} duplicated entry`, (s) => { s[listKey][1] = structuredClone(s[listKey][0]); }]);
  }
  for (const mapKey of keys.filter((k) => state[k] && typeof state[k] === 'object' && !Array.isArray(state[k]) && Object.keys(state[k]).length)) {
    const first = Object.keys(state[mapKey])[0];
    corrupt.push([`state.${mapKey} entry wrong type`, (s) => { s[mapKey][first] = 7; }]);
  }
  for (const [name, mutateState] of corrupt) {
    const body = structuredClone(snap);
    mutateState(body.state);
    const r = await call(base, 'POST', '/_test/import', { body });
    const after = JSON.stringify((await call(base, 'GET', '/_test/export')).body);
    assert(`import-corrupt ${name}`, '§10', 'an invalid state is 422 validation_failed and leaves the destination unchanged',
      r.status === 422 && r.code === 'validation_failed' && after === before, `${r.status} ${r.code}${after === before ? '' : ', destination changed'}`);
  }
  const healthy = await me(t.ada);
  assert('import-fuzz-healthy', '§5', 'after every rejected import the service still answers', healthy?.handle === 'ada', healthy);
}

// ---- §8 paging edges and §11 exact affordability ----
{
  const t = await standard();
  const feedPage = async (q: string) => (await call(base, 'GET', `/activity?${q}`, { token: t.ada })).body;
  for (let i = 0; i < 51; i++) await post('/payments', t.ada, { to_handle: 'bob', amount: 1 });
  const first = await feedPage('');
  assert('feed-default-limit', '§8 GET /requests', 'limit defaults to 50', first.payments.length === 50 && first.has_more === true, first.payments.length);
  const exact = await feedPage('limit=51');
  assert('feed-has-more-exact', '§8 GET /activity', 'has_more is false when the page ends exactly at the last item', exact.payments.length === 51 && exact.has_more === false, exact.has_more);
  const one = await feedPage('limit=1&offset=50');
  assert('feed-limit-1', '§5', 'limit=1 is valid; offset past the newest pages correctly', one.payments?.length === 1 && one.has_more === false, one);
  const beyond = await feedPage('offset=500');
  assert('feed-offset-beyond', '§8', 'an offset beyond the end is an empty page', beyond.payments?.length === 0 && beyond.has_more === false, beyond);

  const t2 = await standard();
  const tr = (from: string, to: string, amount: number) => ({ from_handle: from, to_handle: to, amount });
  check('settle-minus-one', '§11', 'a settlement leaving one wallet at exactly -1 is 409',
    await post('/settlements', t2.ada, { transfers: [tr('bob', 'cy', 100), tr('cy', 'ada', 601)] }), 409, 'insufficient_funds');
  check('settle-exactly-zero', '§11', 'a settlement leaving one wallet at exactly 0 is accepted',
    await post('/settlements', t2.ada, { transfers: [tr('bob', 'cy', 100), tr('cy', 'ada', 600)] }), 201);
  check('settle-handle-type', '§11', 'a non-string handle in an entry is 422', await post('/settlements', t2.ada, { transfers: [{ from_handle: 7, to_handle: 'bob', amount: 1 }] }), 422, 'validation_failed');
  const sk = k();
  const s1 = await post('/settlements', t2.ada, { transfers: [{ from_handle: 'ada', to_handle: 'bob', amount: 5, note: 'n' }] }, sk);
  const s2 = await post('/settlements', t2.ada, { transfers: [{ note: 'n', amount: 5, to_handle: 'bob', from_handle: 'ada' }] }, sk);
  assert('replay-nested-key-order', '§7', 'key order inside nested objects does not change the JSON value', s1.status === 201 && s2.status === 200, [s1.status, s2.status]);
}

const failed = cases.filter((c) => !c.ok);
for (const c of failed) console.log(`FAIL ${c.id} (${c.spec}) ${c.rule} :: ${c.detail}`);
console.log(`${cases.length - failed.length}/${cases.length} contract checks passed`);
if (args.out) {
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'contract-report.json'), JSON.stringify({ kind: 'contract-checks', total: cases.length, passed: cases.length - failed.length, failed: failed.length, cases }, null, 2) + '\n');
}
process.exit(failed.length ? 1 : 0);
