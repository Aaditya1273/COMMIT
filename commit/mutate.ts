// Mutation campaign: how much deliberately bad work does the verification suite kill?
//
//   node commit/mutate.ts --target <service dir> --files src --start "<cmd>" \
//        --check "<cmd using {url}>" [--jobs 4] [--max N --seed S] \
//        [--exclude equivalents.json] --out <report dir>
//
// Every mutant runs in its own temporary copy of the target; the target itself is
// never written. The unmutated baseline must pass the check first, or the campaign
// aborts: a score computed over a broken suite would be a fabricated number.
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { apply, discover, type Mutant } from './lib/mutants.ts';
import { run, startService } from './lib/proc.ts';
import { rng } from './lib/rng.ts';

type Outcome = 'killed' | 'survived' | 'timeout' | 'invalid' | 'error' | 'equivalent';

interface Result extends Mutant {
  outcome: Outcome;
  durationMs: number;
  reason?: string;
  evidence?: string;
  /** Per-layer verdicts, when the check prints `COMMIT-LAYER <name>=<pass|fail>` lines. */
  layers?: Record<string, string>;
}

const { values: args } = parseArgs({
  options: {
    target: { type: 'string' },
    files: { type: 'string', default: 'src' },
    start: { type: 'string' },
    check: { type: 'string' },
    health: { type: 'string', default: '/health' },
    jobs: { type: 'string', default: '4' },
    max: { type: 'string' },
    seed: { type: 'string', default: '1' },
    timeout: { type: 'string', default: '120000' },
    exclude: { type: 'string' },
    out: { type: 'string' },
  },
});

if (!args.target || !args.start || !args.check || !args.out) {
  console.error('usage: mutate.ts --target DIR --start CMD --check CMD --out DIR [--files src] [--jobs N] [--max N --seed S] [--exclude FILE]');
  process.exit(2);
}
const target = args.target;
const startCmd = args.start;
const checkCmd = args.check;
const out = args.out;
const timeoutMs = Number(args.timeout);
const seed = Number(args.seed);

function sourceFiles(root: string, spec: string): string[] {
  return spec.split(',').flatMap((entry) => {
    const path = join(root, entry.trim());
    if (statSync(path).isFile()) return [relative(root, path)];
    return readdirSync(path, { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.(ts|js|mjs)$/.test(f) && !f.includes('node_modules'))
      .map((f) => relative(root, join(path, f)));
  }).sort();
}

/** Run the check against one candidate tree. `null` mutant means the baseline. */
async function evaluate(mutant: Mutant | null): Promise<Omit<Result, keyof Mutant>> {
  const dir = mkdtempSync(join(tmpdir(), 'commit-mutant-'));
  const started = Date.now();
  try {
    cpSync(target, dir, { recursive: true, filter: (src) => !src.includes('node_modules') && !src.includes('.git') });
    if (mutant) {
      const file = join(dir, mutant.file);
      writeFileSync(file, apply(readFileSync(file, 'utf8'), mutant));
    }
    const { service, log } = await startService(startCmd, { cwd: dir, healthPath: args.health, timeoutMs: 20_000 });
    if (!service) return { outcome: 'invalid', durationMs: Date.now() - started, reason: 'candidate never became healthy', evidence: log().slice(-600) };
    try {
      const result = await run(checkCmd.replaceAll('{url}', service.url), { timeoutMs });
      const evidence = result.output.slice(-1200);
      const layers = Object.fromEntries([...result.output.matchAll(/^COMMIT-LAYER (\S+)=(\S+)$/gm)].map((m) => [m[1], m[2]]));
      if (result.timedOut) return { outcome: 'timeout', durationMs: result.durationMs, evidence, layers };
      // 126/127: the check command itself could not run. That is a broken campaign,
      // never a kill.
      if (result.exitCode === 126 || result.exitCode === 127) return { outcome: 'error', durationMs: result.durationMs, reason: 'check command could not run', evidence, layers };
      return { outcome: result.exitCode === 0 ? 'survived' : 'killed', durationMs: result.durationMs, evidence, layers };
    } finally {
      service.stop();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  mkdirSync(out, { recursive: true });
  const exclusions: Record<string, string> = args.exclude ? JSON.parse(readFileSync(args.exclude, 'utf8')) : {};
  const files = sourceFiles(target, args.files!);
  let mutants = files.flatMap((f) => discover(f, readFileSync(join(target, f), 'utf8')));
  const discovered = mutants.length;
  if (args.max && Number(args.max) < mutants.length) {
    const r = rng(seed);
    const shuffled = [...mutants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = r.int(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen = new Set(shuffled.slice(0, Number(args.max)).map((m) => m.id));
    mutants = mutants.filter((m) => chosen.has(m.id));
  }
  console.log(`discovered ${discovered} mutants in ${files.length} files; running ${mutants.length}`);

  const baseline = await evaluate(null);
  if (baseline.outcome !== 'survived') {
    writeFileSync(join(out, 'baseline-failure.txt'), `${baseline.outcome}\n${baseline.reason ?? ''}\n${baseline.evidence ?? ''}`);
    console.error(`CAMPAIGN BROKEN: the unmutated baseline did not pass the check (${baseline.outcome}). No score is reported.`);
    console.error(baseline.evidence ?? '');
    process.exit(2);
  }
  console.log(`baseline passes the check in ${baseline.durationMs} ms`);

  const results: Result[] = [];
  const queue = [...mutants];
  const workers = Array.from({ length: Number(args.jobs) }, async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      const result: Result = exclusions[m.id]
        ? { ...m, outcome: 'equivalent', durationMs: 0, reason: exclusions[m.id] }
        : { ...m, ...(await evaluate(m)) };
      results.push(result);
      console.log(`[${results.length}/${mutants.length}] ${result.outcome.padEnd(9)} ${m.id} ${m.file}:${m.line} ${m.operator} ${JSON.stringify(m.original)} -> ${JSON.stringify(m.replacement)}`);
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => a.file.localeCompare(b.file) || a.start - b.start || a.id.localeCompare(b.id));

  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const tally = Object.fromEntries((['killed', 'survived', 'timeout', 'invalid', 'error', 'equivalent'] as const).map((o) => [o, count(o)]));
  const valid = count('killed') + count('survived') + count('timeout');
  // Which layer caught what: a kill attributed to one layer alone is a defect every
  // other layer would have accepted.
  const killed = results.filter((r) => r.outcome === 'killed' && r.layers);
  const layerNames = [...new Set(killed.flatMap((r) => Object.keys(r.layers!)))].sort();
  const layers = Object.fromEntries(layerNames.map((name) => [name, {
    killed: killed.filter((r) => r.layers![name] === 'fail').length,
    onlyThisLayer: killed.filter((r) => r.layers![name] === 'fail' && Object.entries(r.layers!).every(([n, v]) => n === name || v === 'pass')).length,
  }]));
  const summary = {
    kind: 'mutation-campaign',
    target,
    files,
    start: startCmd,
    check: checkCmd,
    seed,
    discovered,
    executed: mutants.length,
    tally,
    layers,
    valid,
    killRate: valid ? count('killed') / valid : null,
    detectionRate: valid ? (count('killed') + count('timeout')) / valid : null,
    formula: 'killRate = killed / (killed + survived + timeout); detectionRate counts timeouts as detected; invalid, error and equivalent are excluded from both and listed',
    campaignBroken: count('error') > 0,
    finishedAt: new Date().toISOString(),
  };
  writeFileSync(join(out, 'mutation-report.json'), JSON.stringify({ summary, results }, null, 2) + '\n');
  writeFileSync(join(out, 'mutation-report.md'), markdown(summary, results));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.campaignBroken) {
    console.error('CAMPAIGN BROKEN: at least one mutant could not be checked; see the error rows.');
    process.exit(2);
  }
}

function markdown(summary: Record<string, unknown> & { tally: Record<string, number> }, results: Result[]): string {
  const pct = (x: unknown) => (typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : 'n/a');
  const row = (r: Result) => `| \`${r.id}\` | ${r.file}:${r.line} | ${r.operator} | \`${r.original.replaceAll('|', '\\|')}\` → \`${r.replacement.replaceAll('|', '\\|')}\` | ${r.reason ?? ''} |`;
  const section = (title: string, rows: Result[]) =>
    rows.length ? `\n## ${title} (${rows.length})\n\n| id | location | operator | change | note |\n|---|---|---|---|---|\n${rows.map(row).join('\n')}\n` : '';
  return `# Mutation campaign report

| | |
|---|---|
| Target | \`${summary.target}\` |
| Check | \`${summary.check}\` |
| Seed | ${summary.seed} |
| Discovered / executed | ${summary.discovered} / ${summary.executed} |
| Killed | ${summary.tally.killed} |
| Survived | ${summary.tally.survived} |
| Timeout | ${summary.tally.timeout} |
| Invalid (never started) | ${summary.tally.invalid} |
| Error (check could not run) | ${summary.tally.error} |
| Equivalent (excluded, justified) | ${summary.tally.equivalent} |
| **Kill rate** | **${pct(summary.killRate)}** |
| Detection rate (timeouts count) | ${pct(summary.detectionRate)} |

${summary.formula}.
${Object.keys(summary.layers as object).length ? `
## Kills by verification layer

| Layer | Killed | Killed by this layer alone |
|---|---|---|
${Object.entries(summary.layers as Record<string, { killed: number; onlyThisLayer: number }>).map(([n, l]) => `| ${n} | ${l.killed} | ${l.onlyThisLayer} |`).join('\n')}
` : ''}
${section('Survived — bad work the suite accepted', results.filter((r) => r.outcome === 'survived'))}${section('Equivalent — excluded with justification', results.filter((r) => r.outcome === 'equivalent'))}${section('Error', results.filter((r) => r.outcome === 'error'))}`;
}

await main();
