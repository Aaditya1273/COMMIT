// Seeded reference-model campaign.
//
//   node commit/campaign.ts --module <campaign module> --base-url URL \
//        --seed S --operations N --out <report dir>
//
// A campaign module (written by the verifier, from the specification, without reading
// the implementation) supplies a deliberately small reference model and an operation
// generator. This runner owns everything generic: the seeded RNG, stepping model and
// implementation in lockstep, comparing after every step, stopping at the first
// divergence, and writing a report whose seed and command reproduce the run exactly.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { rng, type Rng } from './lib/rng.ts';

export interface CampaignModule<Model, Op, Expected, Observed> {
  name: string;
  /** Build the initial state; load it into the implementation; return the model of it. */
  setup(baseUrl: string, rng: Rng): Promise<{ model: Model; initial: unknown }>;
  generate(model: Model, rng: Rng, history: Op[]): Op;
  /** Pure reference transition. Returns what the implementation must answer. */
  step(model: Model, op: Op, index: number): Expected;
  execute(op: Op, model: Model): Promise<Observed>;
  /** null when the observation satisfies the expectation, else why not. */
  mismatch(expected: Expected, observed: Observed, index: number): string | null;
  /** Bind identifiers the implementation chose (ids, tokens) back into the model. */
  bind?(model: Model, op: Op, observed: Observed, index: number): void;
  /** Whole-state comparison: the model's projection against what the implementation shows. */
  compareState(model: Model, index: number): Promise<{ expected: unknown; observed: unknown; invariants: string[] } | null>;
}

export interface CampaignReport {
  kind: 'reference-campaign';
  campaign: string;
  seed: number;
  operationsRequested: number;
  operationsExecuted: number;
  stateComparisons: number;
  invariantChecks: number;
  /** How often each expected outcome occurred: shows whether the generator exercised the system or only its refusals. */
  outcomes: Record<string, number>;
  durationMs: number;
  result: 'agree' | 'diverged';
  initial: unknown;
  firstDivergence: null | { index: number; op: unknown; detail: string; expected: unknown; observed: unknown };
  reproduction: string;
  operations: unknown[];
}

export async function runCampaign<M, O, E, X>(mod: CampaignModule<M, O, E, X>, opts: { baseUrl: string; seed: number; operations: number; command: string }): Promise<CampaignReport> {
  const started = Date.now();
  const random = rng(opts.seed);
  const { model, initial } = await mod.setup(opts.baseUrl, random);
  const history: O[] = [];
  let stateComparisons = 0;
  let invariantChecks = 0;
  const outcomes: Record<string, number> = {};
  let firstDivergence: CampaignReport['firstDivergence'] = null;

  for (let i = 0; i < opts.operations && !firstDivergence; i++) {
    const op = mod.generate(model, random, history);
    history.push(op);
    const expected = mod.step(model, op, i);
    const e = expected as { status?: unknown; code?: unknown; sameAs?: unknown };
    const label = [e.status, e.code ?? (e.sameAs !== undefined ? 'replay' : '')].filter((x) => x !== undefined && x !== '').join(' ') || 'n/a';
    outcomes[label] = (outcomes[label] ?? 0) + 1;
    const observed = await mod.execute(op, model);
    const why = mod.mismatch(expected, observed, i);
    if (why) {
      firstDivergence = { index: i, op, detail: why, expected, observed };
      break;
    }
    mod.bind?.(model, op, observed, i);
    const state = await mod.compareState(model, i);
    if (state) {
      stateComparisons++;
      invariantChecks += state.invariants.length;
      const broken = state.invariants.find((inv) => inv.startsWith('VIOLATED'));
      if (broken || !isDeepStrictEqual(state.expected, state.observed)) {
        firstDivergence = { index: i, op, detail: broken ?? 'observable state differs from the reference model', expected: state.expected, observed: state.observed };
      }
    }
  }

  return {
    kind: 'reference-campaign',
    campaign: mod.name,
    seed: opts.seed,
    operationsRequested: opts.operations,
    operationsExecuted: history.length,
    stateComparisons,
    invariantChecks,
    outcomes,
    durationMs: Date.now() - started,
    result: firstDivergence ? 'diverged' : 'agree',
    initial,
    firstDivergence,
    reproduction: opts.command,
    operations: history,
  };
}

function markdown(r: CampaignReport): string {
  const d = r.firstDivergence;
  return `# Reference-model campaign: ${r.campaign}

| | |
|---|---|
| Result | **${r.result.toUpperCase()}** |
| Seed | ${r.seed} |
| Operations executed / requested | ${r.operationsExecuted} / ${r.operationsRequested} |
| Whole-state comparisons | ${r.stateComparisons} |
| Invariant checks | ${r.invariantChecks} |
| Expected outcomes | ${Object.entries(r.outcomes).sort(([, a], [, b]) => b - a).map(([k, n]) => `${k}: ${n}`).join(', ')} |
| Duration | ${(r.durationMs / 1000).toFixed(1)} s |

Reproduce: \`${r.reproduction}\`
${d ? `
## First divergence — operation #${d.index}

${d.detail}

Operation:
\`\`\`json
${JSON.stringify(d.op, null, 2)}
\`\`\`

Expected (reference model):
\`\`\`json
${JSON.stringify(d.expected, null, 2)}
\`\`\`

Observed (implementation):
\`\`\`json
${JSON.stringify(d.observed, null, 2)}
\`\`\`
` : ''}
The full operation sequence is in \`reference-report.json\`.
`;
}

// Run as a CLI only when executed directly (portable to Node 22; `import.meta.main` is newer).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: args } = parseArgs({
    options: {
      module: { type: 'string' },
      'base-url': { type: 'string' },
      seed: { type: 'string', default: String(Date.now() % 1_000_000) },
      operations: { type: 'string', default: '500' },
      out: { type: 'string' },
    },
  });
  if (!args.module || !args['base-url']) {
    console.error('usage: campaign.ts --module FILE --base-url URL [--seed S] [--operations N] [--out DIR]');
    process.exit(2);
  }
  const mod = (await import(resolve(args.module))).default as CampaignModule<unknown, unknown, unknown, unknown>;
  const seed = Number(args.seed);
  const command = `node commit/campaign.ts --module ${args.module} --base-url <url> --seed ${seed} --operations ${args.operations}`;
  const report = await runCampaign(mod, { baseUrl: args['base-url'], seed, operations: Number(args.operations), command });
  if (args.out) {
    mkdirSync(args.out, { recursive: true });
    writeFileSync(join(args.out, 'reference-report.json'), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(args.out, 'reference-report.md'), markdown(report));
  }
  const { operations: _ops, initial: _init, ...brief } = report;
  console.log(JSON.stringify(brief, null, 2));
  process.exit(report.result === 'agree' ? 0 : 1);
}
