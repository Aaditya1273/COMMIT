// Adversarial concurrency and retry campaigns against a running Pocketful stage-1
// service. Each campaign states the property it attacks, sends a real concurrent
// burst, then judges the *persistent state* -- balances, request status, the feed --
// not only the status codes the burst returned.
//
//   node calibration/verification/adversarial.ts --base-url URL [--seed S] [--workers 50] [--rounds 3] [--out DIR]
//
// One burst that passes proves little; every campaign runs `rounds` times with fresh
// seeded fixtures, and the report records seed, workers, operations, timing and the
// state each check observed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { rng, type Rng } from '../../commit/lib/rng.ts';
import { all, call, login, type Reply } from './http.ts';

const { values: args } = parseArgs({
  options: {
    'base-url': { type: 'string' },
    seed: { type: 'string', default: '20261001' },
    workers: { type: 'string', default: '50' },
    rounds: { type: 'string', default: '3' },
    out: { type: 'string' },
  },
});
if (!args['base-url']) {
  console.error('usage: adversarial.ts --base-url URL [--seed S] [--workers N] [--rounds N] [--out DIR]');
  process.exit(2);
}
const base = args['base-url'];
const WORKERS = Number(args.workers);

interface World {
  tokens: Record<string, string>;
  seeded: number;
  handles: string[];
}

async function world(balances: Record<string, number>, operators: string[] = []): Promise<World> {
  const users = Object.entries(balances).map(([handle, balance]) => ({
    id: `u_${handle}`, email: `${handle}@example.com`, password: 'correct horse', display_name: handle, handle, balance,
  }));
  const r = await call(base, 'POST', '/_test/reset', { body: { currency: 'EUR', minor_units: 2, users, settlement_operator_ids: operators.map((h) => `u_${h}`) } });
  if (r.status !== 204) throw new Error(`reset failed ${r.status}`);
  const tokens: Record<string, string> = {};
  for (const u of users) tokens[u.handle] = await login(base, u.email, u.password);
  return { tokens, seeded: users.reduce((s, u) => s + u.balance, 0), handles: users.map((u) => u.handle) };
}

const balance = async (w: World, h: string): Promise<number> => (await call(base, 'GET', '/me', { token: w.tokens[h] })).body.balance;
const balances = async (w: World) => Object.fromEntries(await Promise.all(w.handles.map(async (h) => [h, await balance(w, h)] as const)));
const tally = (replies: Reply[]) => replies.reduce<Record<string, number>>((t, r) => {
  const k = `${r.status}${r.code ? ' ' + r.code : ''}`;
  t[k] = (t[k] ?? 0) + 1;
  return t;
}, {});
const pay = (w: World, from: string, to: string, amount: number, key: string, extra: Record<string, unknown> = {}) =>
  call(base, 'POST', '/payments', { token: w.tokens[from], key, body: { to_handle: to, amount, ...extra } });

interface Finding { check: string; ok: boolean; detail: string }
interface CampaignResult {
  campaign: string;
  property: string;
  round: number;
  seed: number;
  workers: number;
  operations: number;
  durationMs: number;
  responses: Record<string, number>;
  finalState: unknown;
  findings: Finding[];
  ok: boolean;
}

const expect = (findings: Finding[], check: string, ok: boolean, detail: unknown) =>
  findings.push({ check, ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

async function conserved(w: World, findings: Finding[]) {
  const b = await balances(w);
  const total = Object.values(b).reduce((s, x) => s + x, 0);
  expect(findings, 'conservation', total === w.seeded, `sum ${total}, seeded ${w.seeded}`);
  expect(findings, 'non-negative', Object.values(b).every((x) => x >= 0), b);
  return b;
}

type Campaign = { name: string; property: string; run: (r: Rng, findings: Finding[]) => Promise<{ replies: Reply[]; state: unknown }> };

const campaigns: Campaign[] = [
  {
    name: 'same-key-storm',
    property: 'N concurrent identical requests under one unused key: exactly one 201, the rest 200 with the identical body, money moves once',
    async run(r, f) {
      const amount = r.range(1, 900);
      const w = await world({ ada: 1000, bob: 0 });
      const key = `storm-${r.int(1e9)}`;
      const replies = await Promise.all(Array.from({ length: WORKERS }, () => pay(w, 'ada', 'bob', amount, key, { note: 'storm' })));
      const created = replies.filter((x) => x.status === 201);
      expect(f, 'exactly one 201', created.length === 1, tally(replies));
      expect(f, 'every other reply is 200 with the same body', replies.every((x) => x.status === 201 || (x.status === 200 && JSON.stringify(x.body) === JSON.stringify(created[0]?.body))), tally(replies));
      const b = await conserved(w, f);
      expect(f, 'moved once', b.ada === 1000 - amount && b.bob === amount, b);
      const feed = await all(base, '/activity', 'payments', w.tokens.bob);
      expect(f, 'one feed item', feed.length === 1, `${feed.length} payments in the feed`);
      return { replies, state: { balances: b, feed: feed.length } };
    },
  },
  {
    name: 'same-key-different-bodies',
    property: 'concurrent requests sharing a key but not a body: at most one takes effect, the rest are 409 reuse or identical replays',
    async run(r, f) {
      const w = await world({ ada: 5000, bob: 0 });
      const key = `mixed-${r.int(1e9)}`;
      const amounts = Array.from({ length: WORKERS }, () => r.pick([100, 200, 300]));
      const replies = await Promise.all(amounts.map((a) => pay(w, 'ada', 'bob', a, key)));
      const created = replies.filter((x) => x.status === 201);
      const winner = created[0]?.body?.amount;
      expect(f, 'exactly one 201', created.length === 1, tally(replies));
      expect(f, 'losers are 409 reuse or same-body 200', replies.every((x, i) => x.status === 201
        || (x.status === 409 && x.code === 'idempotency_key_reuse' && amounts[i] !== winner)
        || (x.status === 200 && amounts[i] === winner)), tally(replies));
      const b = await conserved(w, f);
      expect(f, 'only the winner moved money', b.bob === winner, b);
      return { replies, state: b };
    },
  },
  {
    name: 'drain-race',
    property: 'concurrent payments from one wallet whose sum exceeds it: accepted payments never overdraw, refusals move nothing',
    async run(r, f) {
      const start = r.range(1000, 5000);
      const w = await world({ ada: start, bob: 0, cy: 0 });
      const amounts = Array.from({ length: WORKERS }, () => r.range(1, Math.ceil(start / 8)));
      const replies = await Promise.all(amounts.map((a, i) => pay(w, 'ada', i % 2 ? 'bob' : 'cy', a, `drain-${i}-${r.int(1e9)}`)));
      const accepted = amounts.filter((_, i) => replies[i].status === 201).reduce((s, a) => s + a, 0);
      expect(f, 'only 201 or 409 insufficient_funds', replies.every((x) => x.status === 201 || x.code === 'insufficient_funds'), tally(replies));
      const b = await conserved(w, f);
      expect(f, 'sender lost exactly the accepted total', b.ada === start - accepted, { start, accepted, ada: b.ada });
      expect(f, 'every refusal was genuinely unaffordable at the end', amounts.every((a, i) => replies[i].status === 201 || a > b.ada), b);
      return { replies, state: { balances: b, accepted } };
    },
  },
  {
    name: 'fan-in',
    property: 'many senders paying one recipient at once: the recipient gains exactly what was accepted',
    async run(r, f) {
      const senders = Array.from({ length: 10 }, (_, i) => `s${i}`);
      const w = await world({ ...Object.fromEntries(senders.map((s) => [s, r.range(0, 400)])), sink: 0 });
      const ops = Array.from({ length: WORKERS }, () => ({ from: r.pick(senders), amount: r.range(1, 120) }));
      const replies = await Promise.all(ops.map((o, i) => pay(w, o.from, 'sink', o.amount, `fan-${i}-${r.int(1e9)}`)));
      const accepted = ops.filter((_, i) => replies[i].status === 201).reduce((s, o) => s + o.amount, 0);
      const b = await conserved(w, f);
      expect(f, 'recipient gained the accepted total', b.sink === accepted, { sink: b.sink, accepted });
      return { replies, state: b };
    },
  },
  {
    name: 'ring',
    property: 'payments around a cycle in both directions at once: no wallet goes negative, nothing is created or lost',
    async run(r, f) {
      const ring = ['a', 'b', 'c', 'd'];
      const w = await world(Object.fromEntries(ring.map((h) => [h, r.range(0, 300)])));
      const ops = Array.from({ length: WORKERS }, () => {
        const i = r.int(ring.length);
        return { from: ring[i], to: ring[(i + (r.chance(0.5) ? 1 : ring.length - 1)) % ring.length], amount: r.range(1, 150) };
      });
      const replies = await Promise.all(ops.map((o, i) => pay(w, o.from, o.to, o.amount, `ring-${i}-${r.int(1e9)}`)));
      expect(f, 'no 5xx', replies.every((x) => x.status < 500), tally(replies));
      const b = await conserved(w, f);
      return { replies, state: b };
    },
  },
  {
    name: 'request-double-pay',
    property: 'one request paid concurrently under different keys: it moves money at most once',
    async run(r, f) {
      const w = await world({ ada: 10_000, bob: 0 });
      const amount = r.range(1, 5000);
      const rq = await call(base, 'POST', '/requests', { token: w.tokens.bob, key: `rq-${r.int(1e9)}`, body: { payer_handle: 'ada', amount } });
      const id = rq.body.request_id;
      const replies = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
        call(base, 'POST', `/requests/${id}/pay`, { token: w.tokens.ada, key: `pay-${i}`, body: {} })));
      expect(f, 'exactly one 201', replies.filter((x) => x.status === 201).length === 1, tally(replies));
      expect(f, 'the rest are request_not_pending', replies.every((x) => x.status === 201 || x.code === 'request_not_pending'), tally(replies));
      const b = await conserved(w, f);
      expect(f, 'moved once', b.bob === amount, b);
      return { replies, state: b };
    },
  },
  {
    name: 'pay-versus-cancel',
    property: 'payer pays while requester cancels: the request ends paid xor cancelled, and money matches the outcome',
    async run(r, f) {
      const w = await world({ ada: 10_000, bob: 0 });
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push((await call(base, 'POST', '/requests', { token: w.tokens.bob, key: `pc-${i}-${r.int(1e9)}`, body: { payer_handle: 'ada', amount: 100 } })).body.request_id);
      }
      const replies = (await Promise.all(ids.flatMap((id, i) => [
        call(base, 'POST', `/requests/${id}/pay`, { token: w.tokens.ada, key: `p-${i}`, body: {} }),
        call(base, 'POST', `/requests/${id}/cancel`, { token: w.tokens.bob }),
      ])));
      const listed = await all(base, '/requests', 'requests', w.tokens.bob);
      const paid = listed.filter((x) => x.status === 'paid').length;
      expect(f, 'every request ended paid or cancelled', listed.every((x) => x.status === 'paid' || x.status === 'cancelled'), listed.map((x) => x.status));
      const b = await conserved(w, f);
      expect(f, 'money matches the paid count', b.bob === paid * 100, { paid, bob: b.bob });
      return { replies, state: { balances: b, paid } };
    },
  },
  {
    name: 'settlement-under-drain',
    property: 'a settlement races ordinary payments draining its senders: all-or-nothing, never negative',
    async run(r, f) {
      const w = await world({ op: 0, ada: 600, bob: 600, cy: 0 }, ['op']);
      const transfers = [
        { from_handle: 'ada', to_handle: 'cy', amount: 400 },
        { from_handle: 'bob', to_handle: 'cy', amount: 400 },
      ];
      const settlement = call(base, 'POST', '/settlements', { token: w.tokens.op, key: `st-${r.int(1e9)}`, body: { transfers } });
      const drains = Array.from({ length: WORKERS - 1 }, (_, i) => pay(w, i % 2 ? 'ada' : 'bob', 'cy', r.range(50, 250), `d-${i}-${r.int(1e9)}`));
      const replies = await Promise.all([settlement, ...drains]);
      const b = await conserved(w, f);
      const feed = await all(base, '/activity', 'payments', w.tokens.cy);
      const members = feed.filter((p) => p.settlement_id);
      expect(f, 'settlement all or nothing', replies[0].status === 201 ? members.length === 2 : members.length === 0, { status: replies[0].status, members: members.length });
      return { replies, state: b };
    },
  },
  {
    name: 'lost-response-retry',
    property: 'the client abandons a request mid-flight and retries with the same key and body: one effect in total',
    async run(r, f) {
      const w = await world({ ada: 5000, bob: 0 });
      const keys = Array.from({ length: 20 }, (_, i) => `lost-${i}-${r.int(1e9)}`);
      await Promise.all(keys.map(async (key) => {
        const controller = new AbortController();
        const first = fetch(`${base}/payments`, {
          method: 'POST', signal: controller.signal,
          headers: { authorization: `Bearer ${w.tokens.ada}`, 'idempotency-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({ to_handle: 'bob', amount: 10 }),
        }).catch(() => null);
        setTimeout(() => controller.abort(), r.range(0, 3));
        await first;
      }));
      const replies = await Promise.all(keys.map((key) => pay(w, 'ada', 'bob', 10, key)));
      expect(f, 'every retry is 200 or 201', replies.every((x) => x.status === 200 || x.status === 201), tally(replies));
      const b = await conserved(w, f);
      expect(f, 'exactly one effect per key', b.bob === keys.length * 10, b);
      return { replies, state: b };
    },
  },
  {
    name: 'signup-race',
    property: 'concurrent signups for one email: exactly one account is created, every other attempt is 409 email_taken',
    async run(r, f) {
      await world({ ada: 0 });
      const email = `race${r.int(1e6)}@example.com`;
      const replies = await Promise.all(Array.from({ length: WORKERS }, () =>
        call(base, 'POST', '/auth/signup', { body: { email, password: 'correct horse', display_name: 'Racer' } })));
      const created = replies.filter((x) => x.status === 201);
      expect(f, 'exactly one 201', created.length === 1, tally(replies));
      expect(f, 'the rest are 409 email_taken', replies.every((x) => x.status === 201 || x.code === 'email_taken'), tally(replies));
      const again = await call(base, 'POST', '/auth/login', { body: { email, password: 'correct horse' } });
      expect(f, 'login reaches the one account', again.status === 200 && again.body.user_id === created[0]?.body?.user_id, again.status);
      return { replies, state: { created: created.length } };
    },
  },
  {
    name: 'mixed-garbage',
    property: 'a burst of valid, invalid, malformed and unauthenticated writes: no 5xx, no partial effects',
    async run(r, f) {
      const w = await world({ ada: 3000, bob: 3000, cy: 0 });
      const bodies = [
        () => ({ token: w.tokens.ada, key: `g-${r.int(1e9)}`, body: { to_handle: 'bob', amount: r.range(1, 500) } }),
        () => ({ token: w.tokens.bob, key: `g-${r.int(1e9)}`, body: { to_handle: 'cy', amount: r.pick([0, -3, 1.5, '7', null, 1e10]) } }),
        () => ({ token: w.tokens.ada, key: '', body: { to_handle: 'bob', amount: 5 } }),
        () => ({ token: 'nonsense', key: `g-${r.int(1e9)}`, body: { to_handle: 'bob', amount: 5 } }),
        () => ({ token: w.tokens.cy, key: `g-${r.int(1e9)}`, body: { to_handle: r.pick(['nobody', 'cy', 7]), amount: 5 } }),
      ];
      const replies = await Promise.all(Array.from({ length: WORKERS }, () => call(base, 'POST', '/payments', r.pick(bodies)())));
      expect(f, 'no 5xx', replies.every((x) => x.status < 500), tally(replies));
      const accepted = replies.filter((x) => x.status === 201).reduce((s, x) => s + x.body.amount, 0);
      const b = await conserved(w, f);
      expect(f, 'only accepted payments moved money', b.cy === 0 && b.bob === 3000 + accepted && b.ada === 3000 - accepted, { accepted, ...b });
      return { replies, state: b };
    },
  },
];

const results: CampaignResult[] = [];
const seed = Number(args.seed);
for (let round = 0; round < Number(args.rounds); round++) {
  for (const [index, c] of campaigns.entries()) {
    const campaignSeed = seed + round * 1000 + index;
    const findings: Finding[] = [];
    const started = Date.now();
    let replies: Reply[] = [];
    let state: unknown = null;
    try {
      ({ replies, state } = await c.run(rng(campaignSeed), findings));
    } catch (error) {
      findings.push({ check: 'campaign ran', ok: false, detail: String(error) });
    }
    const ok = findings.length > 0 && findings.every((x) => x.ok);
    results.push({ campaign: c.name, property: c.property, round, seed: campaignSeed, workers: WORKERS, operations: replies.length, durationMs: Date.now() - started, responses: tally(replies), finalState: state, findings, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name} round ${round} seed ${campaignSeed}${ok ? '' : ' :: ' + findings.filter((x) => !x.ok).map((x) => `${x.check}: ${x.detail}`).join('; ')}`);
  }
}

const failed = results.filter((x) => !x.ok);
const report = {
  kind: 'adversarial-campaign',
  baseSeed: seed,
  workers: WORKERS,
  rounds: Number(args.rounds),
  campaigns: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  checks: results.reduce((s, x) => s + x.findings.length, 0),
  reproduction: `node calibration/verification/adversarial.ts --base-url <url> --seed ${seed} --workers ${WORKERS} --rounds ${args.rounds}`,
  results,
};
if (args.out) {
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'adversarial-report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(args.out, 'adversarial-report.md'), `# Adversarial campaigns

${report.passed}/${report.campaigns} campaign rounds passed, ${report.checks} state checks, ${WORKERS} concurrent requests per burst.
Reproduce: \`${report.reproduction}\`

| Campaign | Round | Seed | Requests | Responses | Result |
|---|---|---|---|---|---|
${results.map((x) => `| ${x.campaign} | ${x.round} | ${x.seed} | ${x.operations} | ${Object.entries(x.responses).map(([k, n]) => `${k}×${n}`).join(', ')} | ${x.ok ? 'PASS' : 'FAIL: ' + x.findings.filter((y) => !y.ok).map((y) => y.check).join(', ')} |`).join('\n')}

## Properties attacked

${campaigns.map((c) => `- **${c.name}** — ${c.property}`).join('\n')}
`);
}
console.log(`${report.passed}/${report.campaigns} passed, ${report.checks} checks`);
process.exit(failed.length ? 1 : 0);
