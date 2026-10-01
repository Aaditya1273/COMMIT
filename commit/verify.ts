// Independent verification run: executes a verification plan against one exact
// candidate revision and writes the evidence and the verdict.
//
//   node commit/verify.ts --plan <plan.json> --out <evidence dir> [--skip id,id] [--factory run.json]
//
// The verifier never edits the candidate. It starts the service from a throwaway copy,
// and it digests the candidate tree before and after the run: if the digest moved,
// the verdict is ERROR, whatever the checks said.
//
// Verdicts:
//   ACCEPT        every blocking step passed
//   REJECT        a blocking step failed -- an implementation failure, with reproduction
//   INCONCLUSIVE  nothing failed, but a blocking step could not run here or was skipped
//   ERROR         the verification itself is untrustworthy (candidate changed, or no service)
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { arch, platform, release, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { run, startService, type Service } from './lib/proc.ts';

interface Step {
  id: string;
  /** What kind of evidence this is: required, property, reference-model, adversarial, mutation, build, offline... */
  kind: string;
  cmd: string;
  blocking: boolean;
  /** Requirement ids from the planner's list that this step is evidence for. */
  requirements?: string[];
  /** A command that must succeed for the step to be runnable here. Failure = environment, not implementation. */
  environment?: string;
  /** Report file this step writes, relative to the evidence dir, summarised in the scorecard. */
  report?: string;
  timeoutMs?: number;
  /** Whether this step needs the candidate service running ({url} in cmd). */
  needsService?: boolean;
}

interface Plan {
  stage: string;
  target: string;
  specification: string;
  service?: { start: string; health?: string };
  steps: Step[];
}

type StepStatus = 'pass' | 'fail' | 'timeout' | 'blocked-environment' | 'skipped';

const { values: args } = parseArgs({ options: { plan: { type: 'string' }, out: { type: 'string' }, skip: { type: 'string', default: '' }, factory: { type: 'string' } } });
if (!args.plan || !args.out) {
  console.error('usage: verify.ts --plan PLAN.json --out DIR [--skip id,id] [--factory RUN.json]');
  process.exit(2);
}
const plan: Plan = JSON.parse(readFileSync(args.plan, 'utf8'));
const skip = new Set(args.skip!.split(',').filter(Boolean));
const out = resolve(args.out);
const root = process.cwd();
// One directory per run: evidence from two runs must never mix.
if (existsSync(out) && readdirSync(out).length > 0) {
  console.error(`refusing to write into non-empty ${out}; choose a new --out directory`);
  process.exit(2);
}
mkdirSync(join(out, 'logs'), { recursive: true });

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

/** Content digest of the candidate tree: paths and bytes, in a fixed order. */
function treeDigest(dir: string): string {
  const files = (readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[])
    .filter((f) => !f.split('/').some((p) => p === 'node_modules' || p === '.git') && statSync(join(dir, f)).isFile())
    .sort();
  const h = createHash('sha256');
  for (const f of files) h.update(f + '\0').update(readFileSync(join(dir, f))).update('\0');
  return h.digest('hex');
}

async function git(command: string): Promise<string> {
  const r = await run(`git ${command}`, { cwd: root });
  return r.exitCode === 0 ? r.output.trim() : '';
}

const started = new Date();
const target = resolve(plan.target);
const digestBefore = treeDigest(target);
const revision = {
  commit: await git('rev-parse HEAD'),
  targetDirty: (await git(`status --porcelain -- ${relative(root, target)}`)) !== '',
  targetDigest: digestBefore,
};

// The service runs from a copy, so no step can write into the candidate through it.
let service: Service | null = null;
let serviceLog = '';
let sandbox = '';
if (plan.service) {
  sandbox = mkdtempSync(join(tmpdir(), 'commit-verify-'));
  cpSync(target, sandbox, { recursive: true, filter: (p) => !p.includes('node_modules') && !p.includes('/.git') });
  const started = await startService(plan.service.start, { cwd: sandbox, healthPath: plan.service.health, timeoutMs: 60_000 });
  service = started.service;
  serviceLog = started.log();
}

const results: Array<Step & { status: StepStatus; exitCode: number | null; durationMs: number; log: string; logSha256: string; command: string }> = [];
for (const step of plan.steps) {
  // `{url}` is substituted only for steps that use this run's service; a step that
  // starts its own candidates (a mutation campaign) keeps the placeholder for itself.
  const withUrl = step.needsService ? step.cmd.replaceAll('{url}', service?.url ?? '<no-service>') : step.cmd;
  const command = withUrl.replaceAll('{out}', relative(root, out));
  const logFile = join('logs', `${step.id}.log`);
  let status: StepStatus;
  let exitCode: number | null = null;
  let durationMs = 0;
  let output: string;
  const env = step.environment && !skip.has(step.id) ? await run(step.environment, { cwd: root, timeoutMs: 30_000 }) : null;
  if (skip.has(step.id)) {
    status = 'skipped';
    output = 'skipped by --skip for this run; a skipped blocking step can never yield ACCEPT';
  } else if (env && env.exitCode !== 0) {
    status = 'blocked-environment';
    output = `environment precondition failed: ${step.environment}\n${env.output}`;
  } else if (step.needsService && !service) {
    status = 'blocked-environment';
    output = `the candidate service did not become healthy\n${serviceLog}`;
  } else {
    const r = await run(command, { cwd: root, timeoutMs: step.timeoutMs ?? 600_000 });
    exitCode = r.exitCode;
    durationMs = r.durationMs;
    output = r.output;
    status = r.timedOut ? 'timeout' : r.exitCode === 0 ? 'pass' : 'fail';
  }
  writeFileSync(join(out, logFile), output);
  results.push({ ...step, command, status, exitCode, durationMs, log: logFile, logSha256: sha256(output) });
  console.log(`${status.padEnd(19)} ${step.id} (${(durationMs / 1000).toFixed(1)} s)`);
}
service?.stop();
if (sandbox) rmSync(sandbox, { recursive: true, force: true });

const digestAfter = treeDigest(target);
const blocking = results.filter((r) => r.blocking);
const failed = blocking.filter((r) => r.status === 'fail' || r.status === 'timeout');
const blocked = blocking.filter((r) => r.status === 'blocked-environment' || r.status === 'skipped');
const candidateChanged = digestAfter !== digestBefore;
const verdict = candidateChanged ? 'ERROR' : failed.length ? 'REJECT' : blocked.length ? 'INCONCLUSIVE' : 'ACCEPT';

const reports: Record<string, unknown> = {};
for (const r of results) {
  if (r.report && existsSync(join(out, r.report))) {
    const data = JSON.parse(readFileSync(join(out, r.report), 'utf8'));
    reports[r.id] = data.summary ?? (({ operations: _o, results: _r, initial: _i, ...rest }) => rest)(data);
  }
}

const evidence = {
  kind: 'commit-evidence',
  stage: plan.stage,
  specification: plan.specification,
  revision: { ...revision, targetDigestAfter: digestAfter, candidateChanged },
  environment: { node: process.version, platform: platform(), release: release(), arch: arch() },
  startedAt: started.toISOString(),
  finishedAt: new Date().toISOString(),
  service: plan.service ? { start: plan.service.start, healthy: service !== null } : null,
  steps: results,
  reports,
  verdict,
  productionModificationByVerifier: candidateChanged ? 'DETECTED' : 'NONE',
};
const manifest = JSON.stringify(evidence, null, 2) + '\n';
writeFileSync(join(out, 'evidence.json'), manifest);
// An integrity identifier for this record, not a proof of anything about the software.
const manifestId = sha256(manifest);
writeFileSync(join(out, 'evidence.sha256'), `${manifestId}  evidence.json\n`);

writeFileSync(join(out, 'reproduction.sh'), `#!/bin/sh
# Re-run this verification against the same revision.
set -e
git checkout ${revision.commit || '<commit>'}
node commit/verify.ts --plan ${relative(root, resolve(args.plan))} --out "\${1:-evidence/rerun}"
`);

const pct = (x: unknown) => (typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : 'n/a');
const lines: string[] = [verdict, ''];
lines.push('Revision:', `    ${revision.commit || '(not a git checkout)'}${revision.targetDirty ? ' + uncommitted changes in the candidate' : ''}`, `    candidate digest ${digestBefore}`, '');
if (verdict === 'REJECT') {
  for (const f of failed) {
    lines.push(`Failure class:`, `    ${f.kind} check failed (${f.status})`, `Requirement:`, `    ${(f.requirements ?? ['(not mapped)']).join(', ')}`,
      `Observed:`, ...readFileSync(join(out, f.log), 'utf8').trim().split('\n').slice(-12).map((l) => `    ${l}`),
      `Expected:`, `    exit status 0 from the ${f.id} step`, `Reproduction:`, `    ${service ? f.command.replaceAll(service.url, '{url}') : f.command}`,
      ...(service && f.needsService ? [`    where {url} is the candidate started with: ${plan.service!.start}`] : []), `Evidence:`, `    ${f.log} (sha256 ${f.logSha256.slice(0, 16)}…)`, '');
  }
  lines.push('Production modification by verifier:', '    NONE', '', 'Next action:', '    Builder repairs and resubmits a new revision.');
} else if (verdict === 'INCONCLUSIVE') {
  lines.push('Not run -- blocked by the environment or skipped (not implementation failures):', ...blocked.map((b) => `    ${b.id}: ${readFileSync(join(out, b.log), 'utf8').split('\n')[0]}`), '',
    'Production modification by verifier:', '    NONE', '', 'Next action:', '    Restore the environment and re-run; nothing is accepted until these steps run.');
} else if (verdict === 'ERROR') {
  lines.push('The candidate tree changed during verification. The run is void.', `    before ${digestBefore}`, `    after  ${digestAfter}`);
} else {
  lines.push('Every blocking step passed and was executed by this run.', '', 'Production modification by verifier:', '    NONE', '',
    'Accepted revision is frozen: any change is a new revision and needs a new verification.');
}
const table = ['| Step | Kind | Blocking | Status | Duration | Requirements |', '|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.kind} | ${r.blocking ? 'yes' : 'no'} | ${r.status} | ${(r.durationMs / 1000).toFixed(1)} s | ${(r.requirements ?? []).join(' ')} |`)];
writeFileSync(join(out, 'verdict.md'), ['```text', ...lines, '```', '', ...table, '', `Evidence manifest: \`evidence.json\`, sha256 \`${manifestId}\``, ''].join('\n'));

// ---- scorecard: only numbers this run produced, or "not measured" ----
const factory = args.factory && existsSync(args.factory) ? JSON.parse(readFileSync(args.factory, 'utf8')) : null;
const m = Object.values(reports).find((x: any) => x?.kind === 'mutation-campaign') as any;
const ref = Object.values(reports).filter((x: any) => x?.kind === 'reference-campaign') as any[];
const adv = Object.values(reports).find((x: any) => x?.kind === 'adversarial-campaign') as any;
const nm = 'not measured in this run';
const stepStatus = (kind: string) => {
  const s = results.filter((r) => r.kind === kind);
  return s.length ? s.map((r) => r.status.toUpperCase()).join(', ') : nm;
};
writeFileSync(join(out, 'scorecard.md'), `# COMMIT — ${plan.stage} factory result

\`\`\`text
Human dispatches:            ${factory?.humanDispatches ?? nm}
Post-dispatch human input:   ${factory?.postDispatchHumanInput ?? nm}

Planner:
    requirements identified: ${factory?.planner?.requirements ?? nm}
    acceptance conditions:   ${factory?.planner?.acceptanceConditions ?? nm}
    ambiguities recorded:    ${factory?.planner?.ambiguities ?? nm}

Verifier (this run):
    revision:                ${revision.commit || 'n/a'}${revision.targetDirty ? ' (dirty)' : ''}
    independent checks:      ${results.length} steps, ${results.filter((r) => r.status === 'pass').length} passed
    adversarial checks:      ${adv ? `${adv.passed}/${adv.campaigns} campaign rounds, ${adv.checks} state checks, ${adv.workers} concurrent` : nm}
    reference-model runs:    ${ref.length ? ref.map((r) => `${r.result} (seed ${r.seed}, ${r.operationsExecuted} ops, ${r.invariantChecks} invariant checks)`).join('; ') : nm}
    clean rebuild:           ${stepStatus('build')}
    clean startup:           ${stepStatus('startup')}
    offline execution:       ${stepStatus('offline')}

Mutation campaign:
    seeded mutants:          ${m ? `${m.executed} of ${m.discovered} discovered` : nm}
    equivalent excluded:     ${m?.tally.equivalent ?? nm}
    invalid (never started): ${m?.tally.invalid ?? nm}
    valid mutants:           ${m?.valid ?? nm}
    killed:                  ${m?.tally.killed ?? nm}
    survived:                ${m?.tally.survived ?? nm}
    timeout:                 ${m?.tally.timeout ?? nm}
    kill rate:               ${m ? pct(m.killRate) : nm}

Defect handling:
    rejected revisions:      ${factory?.rejectedRevisions ?? nm}
    repair cycles:           ${factory?.repairCycles ?? nm}
    false accepts:           ${factory?.falseAccepts ?? nm}

Resource usage:
    verification time:       ${((Date.now() - started.getTime()) / 1000).toFixed(0)} s
    model/token usage:       ${factory?.tokens ?? nm}

Final verdict:               ${verdict}
Evidence manifest:           sha256 ${manifestId}
\`\`\`
`);

console.log(`\n${verdict} — evidence in ${relative(root, out)} (manifest sha256 ${manifestId.slice(0, 16)}…)`);
process.exit(verdict === 'ACCEPT' ? 0 : 1);
