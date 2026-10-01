// Reference model of the Pocketful stage-1 specification, for commit/campaign.ts.
//
// Written from the specification text alone and deliberately smaller than the
// service: wallets are numbers, requests are four-state records, idempotency is a
// map from (user, path, key) to the first successful body. It shares no code with
// the implementation under test -- including its own split arithmetic and handle
// derivation -- so a defect has to be made twice, independently, to go unseen.
import type { CampaignModule } from '../../commit/campaign.ts';
import { all, call, login, type Reply } from './http.ts';

type Status = 'pending' | 'paid' | 'declined' | 'cancelled';

interface Wallet { handle: string; email: string; id: string; token: string; balance: number }
interface Req { ref: number; id: string | null; requester: string; payer: string; amount: number; status: Status }
interface Slot { fingerprint: string; op: number }
interface Model {
  baseUrl: string;
  wallets: Wallet[];
  requests: Req[];
  slots: Map<string, Slot>;
  feed: Array<{ from: string; to: string; visibility: string }>;
  operator: string;
  seeded: number;
}

type Op =
  | { kind: 'pay'; by: string; key: string; body: Record<string, unknown> }
  | { kind: 'request'; by: string; key: string; body: Record<string, unknown> }
  | { kind: 'payRequest'; by: string; key: string; rq: number; body: Record<string, unknown> }
  | { kind: 'close'; by: string; rq: number; action: 'decline' | 'cancel' }
  | { kind: 'split'; by: string; key: string; body: Record<string, unknown> }
  | { kind: 'settle'; by: string; key: string; body: Record<string, unknown> }
  | { kind: 'signup'; email: string };

interface Expected {
  status: number;
  code?: string;
  /** The reply must equal, as a JSON value, the reply to this earlier operation. */
  sameAs?: number;
  fields?: Record<string, unknown>;
}

// ---- independent re-statements of spec rules ----

/** §9 by repeated hand-out rather than division: one unit at a time, round-robin. */
function shares(amount: number, n: number): number[] {
  const out = new Array<number>(n).fill(Math.trunc(amount / n));
  let left = amount - out[0] * n;
  for (let i = 0; left > 0; i++, left--) out[i]++;
  return out;
}

/** §4 handle derivation, character by character. */
function handleFor(email: string): string {
  let handle = '';
  for (const ch of email.split('@')[0].toLowerCase()) handle += /[a-z0-9_]/.test(ch) ? ch : '_';
  return handle.substring(0, 20);
}

function fingerprint(value: unknown): string {
  const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, sort(x)])) : v);
  return JSON.stringify(sort(value));
}

const validAmount = (a: unknown): a is number => typeof a === 'number' && Number.isInteger(a) && a >= 1 && a <= 1_000_000_000;

// ---- the model ----

const wallet = (m: Model, handle: string) => m.wallets.find((w) => w.handle === handle);

function pathOf(op: Op, m: Model): string {
  switch (op.kind) {
    case 'pay': return '/payments';
    case 'request': return '/requests';
    case 'split': return '/splits';
    case 'settle': return '/settlements';
    case 'payRequest': return `/requests/${m.requests[op.rq].id}/pay`;
    case 'close': return `/requests/${m.requests[op.rq].id}/${op.action}`;
    case 'signup': return '/auth/signup';
  }
}

const err = (status: number, code: string): Expected => ({ status, code });

function move(m: Model, from: string, to: string, amount: number, visibility: string) {
  wallet(m, from)!.balance -= amount;
  wallet(m, to)!.balance += amount;
  m.feed.push({ from, to, visibility });
}

/** The rule for one keyed operation, after replay resolution. Mutates m on success. */
function decide(m: Model, op: Op): Expected {
  switch (op.kind) {
    case 'pay': {
      const { to_handle: to, amount, visibility = 'public' } = op.body;
      if (!validAmount(amount) || (visibility !== 'public' && visibility !== 'private')) return err(422, 'validation_failed');
      if (to === op.by) return err(422, 'self_payment');
      if (!wallet(m, to as string)) return err(404, 'not_found');
      if (wallet(m, op.by)!.balance < amount) return err(409, 'insufficient_funds');
      move(m, op.by, to as string, amount, visibility as string);
      return { status: 201, fields: { from_handle: op.by, to_handle: to, amount, visibility, request_id: null } };
    }
    case 'request': {
      const { payer_handle: payer, amount } = op.body;
      if (!validAmount(amount)) return err(422, 'validation_failed');
      if (payer === op.by) return err(422, 'self_request');
      if (!wallet(m, payer as string)) return err(404, 'not_found');
      m.requests.push({ ref: m.requests.length, id: null, requester: op.by, payer: payer as string, amount, status: 'pending' });
      return { status: 201, fields: { requester_handle: op.by, payer_handle: payer, amount, status: 'pending' } };
    }
    case 'payRequest': {
      const rq = m.requests[op.rq];
      const visibility = op.body.visibility ?? 'public';
      if (visibility !== 'public' && visibility !== 'private') return err(422, 'validation_failed');
      if (rq.payer !== op.by) return err(403, 'forbidden');
      if (rq.status !== 'pending') return err(409, 'request_not_pending');
      if (wallet(m, op.by)!.balance < rq.amount) return err(409, 'insufficient_funds');
      move(m, op.by, rq.requester, rq.amount, visibility as string);
      rq.status = 'paid';
      return { status: 201, fields: { amount: rq.amount, from_handle: op.by, to_handle: rq.requester } };
    }
    case 'split': {
      const { amount, participant_handles: handles } = op.body as { amount: unknown; participant_handles: string[] };
      if (!validAmount(amount)) return err(422, 'validation_failed');
      if (handles.length === 0 || new Set(handles).size !== handles.length) return err(422, 'validation_failed');
      if (handles.some((h) => !wallet(m, h))) return err(404, 'not_found');
      const each = shares(amount, handles.length);
      handles.forEach((h, i) => {
        if (h !== op.by) m.requests.push({ ref: m.requests.length, id: null, requester: op.by, payer: h, amount: each[i], status: 'pending' });
      });
      return { status: 201, fields: { shares: handles.map((handle, i) => ({ handle, amount: each[i] })) } };
    }
    case 'settle': {
      if (op.by !== m.operator) return err(403, 'forbidden');
      const transfers = op.body.transfers as Array<{ from_handle: string; to_handle: string; amount: unknown }>;
      for (const t of transfers) {
        if (!validAmount(t.amount)) return err(422, 'validation_failed');
        if (!wallet(m, t.from_handle) || !wallet(m, t.to_handle)) return err(404, 'not_found');
        if (t.from_handle === t.to_handle) return err(422, 'self_payment');
      }
      const after = new Map(m.wallets.map((w) => [w.handle, w.balance]));
      for (const t of transfers) {
        after.set(t.from_handle, after.get(t.from_handle)! - (t.amount as number));
        after.set(t.to_handle, after.get(t.to_handle)! + (t.amount as number));
      }
      if ([...after.values()].some((b) => b < 0)) return err(409, 'insufficient_funds');
      for (const t of transfers) move(m, t.from_handle, t.to_handle, t.amount as number, 'public');
      return { status: 201 };
    }
    default:
      throw new Error(`not a keyed operation: ${op.kind}`);
  }
}

/** First-use replies, by operation index: what a later replay must reproduce. */
const replies = new Map<number, Reply>();

const jsonEqual = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);

const campaign: CampaignModule<Model, Op, Expected, Reply> = {
  name: 'pocketful-stage-1-reference',

  async setup(baseUrl, r) {
    const currency = r.pick([['EUR', 2], ['JPY', 0], ['BHD', 3]] as const);
    const handles = ['ada', 'bob', 'cy', 'dee'];
    const users = handles.map((handle) => ({
      id: `u_${handle}`, email: `${handle}@example.com`, password: 'correct horse',
      display_name: handle.toUpperCase(), handle, balance: r.pick([0, 1, 500, 2500, 10_000, r.range(1, 20_000)]),
    }));
    const operator = r.pick(handles);
    const fixture = { currency: currency[0], minor_units: currency[1], users, payments: [], requests: [], settlement_operator_ids: [`u_${operator}`] };
    const reset = await call(baseUrl, 'POST', '/_test/reset', { body: fixture });
    if (reset.status !== 204) throw new Error(`reset failed: ${reset.status} ${JSON.stringify(reset.body)}`);
    const wallets = await Promise.all(users.map(async (u) => ({
      handle: u.handle, email: u.email, id: u.id, balance: u.balance, token: await login(baseUrl, u.email, u.password),
    })));
    const seeded = users.reduce((s, u) => s + u.balance, 0);
    return { model: { baseUrl, wallets, requests: [], slots: new Map(), feed: [], operator, seeded }, initial: fixture };
  },

  generate(m, r, history) {
    const by = r.pick(m.wallets).handle;
    const other = () => r.pick(m.wallets.filter((w) => w.handle !== by)).handle;
    const key = () => `k-${r.int(1e9).toString(36)}`;
    const amount = (balance: number): unknown => {
      const roll = r.next();
      if (roll < 0.06) return r.pick([0, -1, 1_000_000_001, 2.5, '100', true]);
      if (roll < 0.16) return balance;
      if (roll < 0.24) return balance + 1;
      return r.range(1, Math.max(1, Math.min(balance, 5000)));
    };
    const keyed = history.map((op, i) => [op, i] as const).filter(([op]) => 'key' in op);
    const roll = r.next();
    // Retries: the identical operation again (a replay), or the same key with a changed body.
    if (roll < 0.14 && keyed.length) {
      const [prev] = r.pick(keyed);
      if (r.chance(0.7)) return structuredClone(prev);
      const changed = structuredClone(prev) as Op & { body: Record<string, unknown> };
      changed.body = { ...changed.body, note: `changed-${r.int(1000)}` };
      return changed;
    }
    const me = wallet(m, by)!;
    if (roll < 0.42) {
      const to = r.chance(0.04) ? by : r.chance(0.04) ? 'nobody_here' : other();
      return { kind: 'pay', by, key: key(), body: { to_handle: to, amount: amount(me.balance), ...(r.chance(0.3) ? { visibility: r.pick(['public', 'private', 'private', 'friends']) } : {}) } };
    }
    if (roll < 0.54) return { kind: 'request', by, key: key(), body: { payer_handle: r.chance(0.05) ? by : other(), amount: amount(r.range(1, 8000)), note: 'r' } };
    if (roll < 0.70 && m.requests.length) {
      const rq = r.pick(m.requests);
      const payer = r.chance(0.85) ? rq.payer : r.pick(m.wallets).handle;
      return { kind: 'payRequest', by: payer, key: key(), rq: rq.ref, body: r.chance(0.5) ? {} : { visibility: r.pick(['public', 'private']) } };
    }
    if (roll < 0.78 && m.requests.length) {
      const rq = r.pick(m.requests);
      const action = r.pick(['decline', 'cancel'] as const);
      const owner = action === 'decline' ? rq.payer : rq.requester;
      return { kind: 'close', by: r.chance(0.85) ? owner : r.pick(m.wallets).handle, rq: rq.ref, action };
    }
    if (roll < 0.87) {
      const pool = m.wallets.map((w) => w.handle).filter(() => r.chance(0.6));
      const participants = r.chance(0.05) ? [] : r.chance(0.05) && pool.length ? [...pool, pool[0]] : pool.length ? pool : [by];
      return { kind: 'split', by, key: key(), body: { amount: amount(r.range(1, 10_000)), participant_handles: participants, note: 'bill' } };
    }
    if (roll < 0.97) {
      const caller = r.chance(0.85) ? m.operator : by;
      const transfers = Array.from({ length: r.range(1, 4) }, () => {
        const from = r.pick(m.wallets).handle;
        const to = r.chance(0.05) ? from : r.pick(m.wallets.filter((w) => w.handle !== from)).handle;
        return { from_handle: from, to_handle: to, amount: amount(wallet(m, from)!.balance) };
      });
      return { kind: 'settle', by: caller, key: key(), body: { transfers } };
    }
    const local = r.pick(['Eve', 'eve.x', 'Fay+1', 'g-h', 'ada', 'bob', 'Zed_9']) + (r.chance(0.5) ? '' : String(r.int(9)));
    // Two domains: the same local part on another domain reaches handle_taken, not email_taken.
    return { kind: 'signup', email: `${local}@example.${r.pick(['com', 'org'])}` };
  },

  step(m, op, index) {
    if (op.kind === 'signup') {
      if (m.wallets.some((w) => w.email === op.email)) return err(409, 'email_taken');
      if (wallet(m, handleFor(op.email))) return err(409, 'handle_taken');
      m.wallets.push({ handle: handleFor(op.email), email: op.email, id: '', token: '', balance: 0 });
      return { status: 201 };
    }
    if (op.kind === 'close') {
      const rq = m.requests[op.rq];
      const owner = op.action === 'decline' ? rq.payer : rq.requester;
      const target: Status = op.action === 'decline' ? 'declined' : 'cancelled';
      if (owner !== op.by) return err(403, 'forbidden');
      if (rq.status !== target && rq.status !== 'pending') return err(409, 'request_not_pending');
      rq.status = target;
      return { status: 200, fields: { status: target } };
    }
    const slotKey = JSON.stringify([op.by, pathOf(op, m), op.key]);
    const fp = fingerprint(op.body);
    const slot = m.slots.get(slotKey);
    if (slot) return slot.fingerprint === fp ? { status: 200, sameAs: slot.op } : err(409, 'idempotency_key_reuse');
    const expected = decide(m, op);
    if (expected.status === 201) m.slots.set(slotKey, { fingerprint: fp, op: index });
    return expected;
  },

  async execute(op, m) {
    if (op.kind === 'signup') return call(m.baseUrl, 'POST', '/auth/signup', { body: { email: op.email, password: 'correct horse', display_name: 'New' } });
    const token = wallet(m, op.by)!.token;
    if (op.kind === 'close') return call(m.baseUrl, 'POST', pathOf(op, m), { token });
    return call(m.baseUrl, 'POST', pathOf(op, m), { token, key: op.key, body: op.body });
  },

  mismatch(expected, observed, index) {
    if (observed.status !== expected.status || (expected.code && observed.code !== expected.code)) {
      return `status ${observed.status} ${observed.code ?? ''} where the specification requires ${expected.status} ${expected.code ?? ''}`;
    }
    if (expected.sameAs !== undefined) {
      return jsonEqual(observed.body, replies.get(expected.sameAs)?.body)
        ? null : `a replay must return the original body (operation #${expected.sameAs})`;
    }
    for (const [field, value] of Object.entries(expected.fields ?? {})) {
      if (!jsonEqual(observed.body?.[field], value)) return `field ${field}: ${JSON.stringify(observed.body?.[field])} where the model has ${JSON.stringify(value)}`;
    }
    if (expected.status === 201) replies.set(index, observed);
    return null;
  },

  bind(m, op, observed) {
    if (observed.status !== 201) return;
    if (op.kind === 'request') m.requests[m.requests.length - 1].id = observed.body.request_id;
    if (op.kind === 'split') {
      const created = observed.body.requests as Array<{ request_id: string }>;
      const fresh = m.requests.slice(m.requests.length - created.length);
      fresh.forEach((rq, i) => (rq.id = created[i].request_id));
    }
    if (op.kind === 'signup') {
      const w = m.wallets[m.wallets.length - 1];
      w.id = observed.body.user_id;
      w.token = observed.body.token;
    }
  },

  async compareState(m, index) {
    const balances = await Promise.all(m.wallets.map(async (w) => (await call(m.baseUrl, 'GET', '/me', { token: w.token })).body?.balance));
    const total = balances.reduce((s: number, b: number) => s + b, 0);
    const invariants = [
      total === m.seeded ? 'conservation' : `VIOLATED conservation: wallets sum to ${total}, seeded ${m.seeded}`,
      balances.every((b: number) => b >= 0) ? 'non-negative' : 'VIOLATED non-negative balance',
    ];
    const expected: Record<string, unknown> = { balances: m.wallets.map((w) => w.balance) };
    const observed: Record<string, unknown> = { balances };
    // Requests and feeds page through everything, so compare them every 20 steps.
    if (index % 20 === 19) {
      expected.requests = m.wallets.map((w) => m.requests.filter((rq) => rq.payer === w.handle || rq.requester === w.handle)
        .map((rq) => `${rq.id}:${rq.status}`).sort());
      expected.feedSizes = m.wallets.map((w) => m.feed.filter((p) => p.visibility === 'public' || p.from === w.handle || p.to === w.handle).length);
      observed.requests = await Promise.all(m.wallets.map(async (w) =>
        (await all(m.baseUrl, '/requests', 'requests', w.token)).map((rq) => `${rq.request_id}:${rq.status}`).sort()));
      observed.feedSizes = await Promise.all(m.wallets.map(async (w) => (await all(m.baseUrl, '/activity', 'payments', w.token)).length));
      invariants.push('requests', 'feed-visibility');
    }
    return { expected, observed, invariants };
  },
};

export default campaign;
