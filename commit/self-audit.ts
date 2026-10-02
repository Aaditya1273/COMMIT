// The factory's own health check. Every line of the summary comes from a command this
// run executed; nothing is copied from earlier results.
//
//   node commit/self-audit.ts [--full] [--out evidence/factory-self-audit]
//
// Statuses: PASS (ran and passed), FAIL (ran and failed), INCONCLUSIVE (could not run
// here, with the reason), NOT RUN (outside this mode). Exit: 0 when nothing FAILED,
// 1 otherwise, 2 usage error. INCONCLUSIVE items do not fail the audit; they are listed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { auditRun } from './audit.ts';
import { detectEnvironment, EXIT, FACTORY_VERSION, loadConfig, nodeSupported } from './lib/config.ts';
import { redact, writeAtomic, writeJsonAtomic } from './lib/fsx.ts';
import { run, runShell, startService } from './lib/proc.ts';

type Status = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT RUN';
interface Item { area: string; status: Status; detail: string; command?: string; durationMs?: number }

const USAGE = `usage: node commit/self-audit.ts [--full] [--out DIR]

  quick (default): typecheck, lint, factory self-tests, mandate genericity (official
  scanner), bootstrap rehearsal, evidence consistency, secret/path scan, domain
  coupling, reference replay, calibration release gate, container checks if Docker works
  --full: also the full calibration verification, mutation campaign included (~35 min)`;

let args;
try {
  args = parseArgs({ options: { full: { type: 'boolean', default: false }, out: { type: 'string', default: 'evidence/factory-self-audit' }, help: { type: 'boolean', default: false } } }).values;
} catch (error) {
  console.error(`${(error as Error).message}\n${USAGE}`);
  process.exit(EXIT.USAGE);
}
if (args.help) { console.log(USAGE); process.exit(EXIT.OK); }

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const config = loadConfig();
const out = resolve(args.out!);
const items: Item[] = [];
const started = Date.now();

async function check(area: string, command: string, judge?: (r: Awaited<ReturnType<typeof runShell>>) => [Status, string], timeoutMs = 15 * 60_000) {
  const r = await runShell(command, { cwd: root, timeoutMs });
  const [status, detail] = judge ? judge(r) : r.status === 'exited' && r.exitCode === 0 ? ['PASS', 'exit 0'] as [Status, string]
    : ['FAIL', `${r.status === 'timeout' ? 'timed out' : `exit ${r.exitCode}`}: ${r.tail.trim().split('\n').slice(-3).join(' | ')}`] as [Status, string];
  items.push({ area, status, detail, command, durationMs: r.durationMs });
  console.log(`${status.padEnd(12)} ${area} -- ${detail}`);
  return r;
}
const add = (area: string, status: Status, detail: string) => {
  items.push({ area, status, detail });
  console.log(`${status.padEnd(12)} ${area} -- ${detail}`);
};

const env = await detectEnvironment();
add('Node runtime', nodeSupported(env.node) ? 'PASS' : 'FAIL', `${env.node}; COMMIT requires >= 22.18`);

await check('Typecheck (factory + calibration)', 'npx tsc -p tsconfig.commit.json');
await check('Lint (whole repository)', 'npx eslint .');
await check('Factory self-tests', "node --no-warnings --test 'commit/**/*.test.ts'", (r) => {
  const pass = r.tail.match(/^# pass (\d+)|^ℹ pass (\d+)/m);
  const fail = r.tail.match(/^# fail (\d+)|^ℹ fail (\d+)/m);
  const p = Number(pass?.[1] ?? pass?.[2] ?? NaN);
  const f = Number(fail?.[1] ?? fail?.[2] ?? NaN);
  if (Number.isNaN(p) || Number.isNaN(f)) return ['FAIL', 'could not read the test summary'];
  return r.exitCode === 0 && f === 0 && p > 0 ? ['PASS', `${p} passed, 0 failed`] : ['FAIL', `${p} passed, ${f} failed`];
});

// Bootstrap rehearsal: a fresh repository, the official scanner, an idempotent re-run.
const rehearsal = join(mkdtempSync(join(tmpdir(), 'commit-rehearsal-')), 'result');
await check('Bootstrap into a fresh repository (+ installed self-test)', `sh commit/bootstrap.sh --check '${rehearsal}'`, (r) =>
  r.exitCode === 0 && /self-test: PASS/.test(r.tail) && !readdirSync(rehearsal).some((f) => f.startsWith('stage-'))
    ? ['PASS', 'mandates, toolkit and FACTORY.md installed; installed self-tests pass; no stage folders created'] : ['FAIL', r.tail.trim().split('\n').slice(-2).join(' | ')]);
await check('Bootstrap re-run is idempotent', `sh commit/bootstrap.sh '${rehearsal}'`, (r) =>
  r.exitCode === 0 && /already installed/.test(r.tail) ? ['PASS', 'second run changed nothing'] : ['FAIL', r.tail.trim().split('\n')[0]]);

const kickoff = resolve(config.kickoffDir);
const python = join(kickoff, '.venv', 'bin', 'python');
if (existsSync(python) && existsSync(join(kickoff, 'harness'))) {
  // The official scanner needs a README and a room; give the rehearsal stand-ins so only
  // the mandate findings remain, then attribute findings to each mandate.
  writeAtomic(join(rehearsal, 'README.md'), '# rehearsal\n');
  for (const track of ['pocketful', 'tablekeeper', 'toy']) {
    const r = await run(python, ['-m', 'harness', 'check', rehearsal, '--track', track], { cwd: kickoff, timeoutMs: 120_000 });
    const lines = r.tail.split('\n');
    const mandateLines = lines.filter((l) => /mandates\//.test(l));
    for (const seat of ['planner', 'builder', 'verifier']) {
      const hits = mandateLines.filter((l) => l.includes(`mandates/${seat}.md`));
      add(`Mandate genericity: ${seat} (${track}, official scanner)`, hits.length ? 'FAIL' : 'PASS', hits.length ? hits.join(' | ') : 'no track vocabulary; Harness/Model lines present');
    }
    const other = lines.filter((l) => l.trim() && !/mandates\//.test(l) && !/stage-1\/ is missing|room\.json is missing|problem\(s\)|^ok/.test(l));
    if (other.length) add(`Official check, other findings (${track})`, 'FAIL', other.join(' | '));
  }
} else {
  add('Mandate genericity (official scanner)', 'INCONCLUSIVE', `kickoff package with .venv not found at ${config.kickoffDir}; set COMMIT_KICKOFF`);
}
const placeholders = ['planner', 'builder', 'verifier'].filter((s) => readFileSync(join('mandates', `${s}.md`), 'utf8').includes('<fill in:'));
add('Mandate Harness/Model values', placeholders.length ? 'INCONCLUSIVE' : 'PASS',
  placeholders.length ? `placeholders in ${placeholders.join(', ')}: fill in the real values in the result repository before the BAND run` : 'set');
rmSync(dirname(rehearsal), { recursive: true, force: true });

// Evidence: every committed verification run is internally consistent and unaltered.
const evidenceDirs = (readdirSync('evidence', { recursive: true, encoding: 'utf8' }) as string[])
  .filter((f) => f.endsWith('evidence.json')).map((f) => join('evidence', dirname(f))).filter((d) => !d.startsWith(relative(root, out)));
const audits = evidenceDirs.map(auditRun);
const broken = audits.filter((a) => a.problems.length);
add('Evidence consistency (all committed runs)', broken.length || !audits.length ? 'FAIL' : 'PASS',
  broken.length ? broken.map((b) => `${b.dir}: ${b.problems[0]}`).join(' | ') : `${audits.length} runs: manifest hashes, logs, verdict.md and scorecard.md agree`);

// Public-repository hygiene over the factory's tracked files and evidence.
const tracked = (await run('git', ['ls-files', 'commit', 'mandates', 'calibration', 'docs/factory', 'docs/production-readiness.md', 'evidence', 'README.md', 'FACTORY.md'], { cwd: root })).tail.split('\n').filter(Boolean);
const textFiles = tracked.filter((f) => existsSync(f) && statSync(f).size < 20 * 1024 * 1024 && !/\.(png|jpg|gif|ico|pdf)$/.test(f));
const secretHits = textFiles.filter((f) => redact(readFileSync(f, 'utf8')).redactions > 0);
add('Secret scan (factory files + evidence)', secretHits.length ? 'FAIL' : 'PASS', secretHits.length ? `credential shapes in: ${secretHits.join(', ')}` : `${textFiles.length} files, no credential shapes`);
const home = process.env.HOME ?? '/home/';
const localHits = textFiles.filter((f) => { const t = readFileSync(f, 'utf8'); return t.includes(home) || /\/tmp\/claude-\d+/.test(t); });
add('Machine-specific paths', localHits.length ? 'FAIL' : 'PASS', localHits.length ? `absolute local paths in: ${localHits.join(', ')}` : 'no home-directory or session paths');

// The generic toolkit and mandates must not know the problem they verify.
const vocabularyFile = join(kickoff, 'harness', 'vocabulary.py');
if (existsSync(vocabularyFile)) {
  const terms = [...new Set([...readFileSync(vocabularyFile, 'utf8').matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]))];
  const generic = tracked.filter((f) => (f.startsWith('commit/') || f.startsWith('mandates/')) && !f.endsWith('.test.ts'));
  const coupled = generic.flatMap((f) => {
    const text = readFileSync(f, 'utf8').toLowerCase();
    return terms.filter((t) => new RegExp(`(?<![a-z0-9_/-])${t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![a-z0-9_-])`).test(text)).map((t) => `${f}: ${t}`);
  }).concat(generic.filter((f) => /pocketful|tablekeeper/i.test(readFileSync(f, 'utf8'))).map((f) => `${f}: track name`));
  add('No domain coupling in commit/ and mandates/', coupled.length ? 'FAIL' : 'PASS', coupled.length ? coupled.slice(0, 8).join(' | ') : `${generic.length} files checked against ${terms.length} track terms of both graded tracks`);
} else {
  add('No domain coupling in commit/ and mandates/', 'INCONCLUSIVE', 'kickoff vocabulary not found');
}

// Replay: the same seed drives the same operation sequence against a fresh candidate.
const ops: string[] = [];
for (let i = 0; i < 2; i++) {
  const { service } = await startService('node --no-warnings src/server.ts', { cwd: 'calibration/pocketful-stage-1', timeoutMs: 30_000 });
  if (!service) { add('Reference-model replay', 'FAIL', 'calibration service did not start'); break; }
  const dir = mkdtempSync(join(tmpdir(), 'commit-replay-'));
  const r = await run(process.execPath, ['--no-warnings', 'commit/campaign.ts', '--module', 'calibration/verification/reference.campaign.ts', '--base-url', service.url, '--seed', '481927', '--operations', '300', '--out', dir], { cwd: root, timeoutMs: 120_000 });
  service.stop();
  const file = join(dir, 'reference-report.json');
  ops.push(r.exitCode === 0 && existsSync(file) ? createHash('sha256').update(JSON.stringify(JSON.parse(readFileSync(file, 'utf8')).operations)).digest('hex') : `run ${i} failed: ${r.tail.slice(-200)}`);
  rmSync(dir, { recursive: true, force: true });
}
if (ops.length === 2) add('Reference-model replay (seed 481927, 300 ops, twice)', ops[0] === ops[1] && /^[0-9a-f]{64}$/.test(ops[0]) ? 'PASS' : 'FAIL',
  ops[0] === ops[1] ? `both runs agree with the model; identical operation sequences (sha256 ${ops[0].slice(0, 16)}…)` : ops.join(' vs '));

// The calibration release gate: every layer except the long mutation campaign.
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) rmSync(join(out, f), { recursive: true, force: true });
const gateDir = join(out, 'calibration-gate');
const gate = await run(process.execPath, ['--no-warnings', 'commit/verify.ts', '--plan', 'calibration/verification/plan.json', '--skip', 'mutation', '--out', gateDir], { cwd: root, timeoutMs: 30 * 60_000 });
const gateEvidence = existsSync(join(gateDir, 'evidence.json')) ? JSON.parse(readFileSync(join(gateDir, 'evidence.json'), 'utf8')) : null;
if (!gateEvidence) add('Calibration release gate', 'FAIL', `no evidence written: ${gate.tail.slice(-300)}`);
else {
  const steps = gateEvidence.steps as Array<{ id: string; status: string }>;
  const bad = steps.filter((s) => ['FAILED', 'ERROR', 'TIMEOUT'].includes(s.status));
  const ran = steps.filter((s) => s.status === 'PASSED');
  add('Calibration release gate (all layers but mutation)', bad.length ? 'FAIL' : 'PASS',
    `${ran.length}/${steps.length} steps PASSED (${ran.map((s) => s.id).join(', ')}); verdict ${gateEvidence.verdict}${bad.length ? `; failed: ${bad.map((s) => s.id).join(', ')}` : ''}`);
  for (const id of ['clean-build', 'offline-isolated']) {
    const s = steps.find((x) => x.id === id);
    add(id === 'clean-build' ? 'Clean container build' : 'Offline, resource-capped run (official isolated mode)',
      s?.status === 'PASSED' ? 'PASS' : s?.status === 'BLOCKED' ? 'INCONCLUSIVE' : 'FAIL',
      s?.status === 'BLOCKED' ? `not run: ${env.docker.detail}` : `step ${id}: ${s?.status ?? 'missing'}`);
  }
  const gateAudit = auditRun(gateDir);
  add('Gate evidence audits clean', gateAudit.problems.length ? 'FAIL' : 'PASS', gateAudit.problems.join(' | ') || `run ${gateEvidence.runId}`);
}

if (args.full) {
  const fullDir = join(out, 'full-verification');
  const r = await run(process.execPath, ['--no-warnings', 'commit/verify.ts', '--plan', 'calibration/verification/plan.json', '--out', fullDir], { cwd: root, timeoutMs: 3 * 60 * 60_000 });
  const ev = existsSync(join(fullDir, 'evidence.json')) ? JSON.parse(readFileSync(join(fullDir, 'evidence.json'), 'utf8')) : null;
  const m = ev?.reports?.mutation;
  add('Full calibration verification (mutation included)', ev && !['REJECT', 'ERROR'].includes(ev.verdict) ? 'PASS' : 'FAIL',
    ev ? `verdict ${ev.verdict}${m ? `; mutation ${m.tally.killed}/${m.valid} killed (${(m.killRate * 100).toFixed(1)}%), ${m.tally.equivalent} equivalents excluded` : ''}` : `no evidence: ${r.tail.slice(-200)}`);
} else {
  add('Full calibration verification (mutation included)', 'NOT RUN', 'run with --full (pnpm verify:full); latest committed result is cited in FACTORY.md §6');
}

const counts = Object.fromEntries((['PASS', 'FAIL', 'INCONCLUSIVE', 'NOT RUN'] as const).map((s) => [s, items.filter((i) => i.status === s).length]));
const summary = {
  kind: 'factory-self-audit',
  factoryVersion: FACTORY_VERSION,
  mode: args.full ? 'full' : 'quick',
  revision: (await run('git', ['rev-parse', 'HEAD'], { cwd: root })).tail.trim(),
  dirty: (await run('git', ['status', '--porcelain'], { cwd: root })).tail.trim() !== '',
  environment: env,
  startedAt: new Date(started).toISOString(),
  durationMs: Date.now() - started,
  counts,
  items,
};
writeJsonAtomic(join(out, 'summary.json'), summary);
writeAtomic(join(out, 'summary.md'), `# Factory self-audit

Generated by \`node commit/self-audit.ts${args.full ? ' --full' : ''}\` from \`summary.json\`; do not edit by hand.

| | |
|---|---|
| Factory version | ${FACTORY_VERSION} |
| Revision | \`${summary.revision}\`${summary.dirty ? ' (with uncommitted changes)' : ''} |
| Environment | Node ${env.node}, ${env.platform} ${env.arch}, ${env.git ?? 'no git'}, Docker: ${env.docker.detail} |
| Duration | ${(summary.durationMs / 1000).toFixed(0)} s |
| Result | ${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.INCONCLUSIVE} INCONCLUSIVE, ${counts['NOT RUN']} NOT RUN |

| Area | Status | Detail |
|---|---|---|
${items.map((i) => `| ${i.area} | **${i.status}** | ${i.detail.replaceAll('|', '\\|').replaceAll('\n', ' ')} |`).join('\n')}

INCONCLUSIVE means the check could not run in this environment; it is never counted as a pass.
`);
console.log(`\n${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.INCONCLUSIVE} INCONCLUSIVE, ${counts['NOT RUN']} NOT RUN -- ${relative(root, out)}/summary.md`);
process.exit(counts.FAIL ? EXIT.REJECT : EXIT.OK);
