// Judge an official `harness run --mode isolated --stage N` from its report.json.
//
//   node calibration/verification/isolated-check.ts <report.json> <stage>
//
// The harness exits with the worst status of every suite it ran, and that always
// includes the next stage's suite -- which a correct stage-N folder must fail. So its
// exit code is non-zero for a correct folder and cannot be the verdict. The report is:
// the run completed in isolated mode, stage N's suite ran with no failures or errors,
// the highest contiguous stage reaches N, and the next suite did not fully pass.
import { readFileSync } from 'node:fs';

const [file, stageArg] = process.argv.slice(2);
if (!file || !/^[1-4]$/.test(stageArg ?? '')) {
  console.error('usage: isolated-check.ts <report.json> <stage 1-4>');
  process.exit(2);
}
const stage = Number(stageArg);
const r = JSON.parse(readFileSync(file, 'utf8'));
const own = r.checks?.[String(stage)];
const next = r.checks?.[String(stage + 1)];
const problems: string[] = [];
if (r.state !== 'completed') problems.push(`harness state is ${r.state}`);
if (r.mode !== 'isolated') problems.push(`mode is ${r.mode}, not isolated`);
if (!own || !(own.collected > 0)) problems.push(`stage ${stage} suite collected no checks`);
else if (own.failed !== 0 || own.errors !== 0 || own.passed !== own.collected) {
  problems.push(`stage ${stage}: ${own.passed}/${own.collected} passed, ${own.failed} failed, ${own.errors} errors`);
}
if (!(r.highest_contiguous >= stage)) problems.push(`highest contiguous stage is ${r.highest_contiguous}`);
if (next && next.collected > 0 && next.passed === next.collected) problems.push(`stage ${stage + 1} suite fully passes: the folder overshoots`);
console.log(own ? `isolated mode: stage ${stage} ${own.passed}/${own.collected} passed; highest contiguous ${r.highest_contiguous}; stage ${stage + 1}: ${next ? `${next.passed}/${next.collected} passed` : 'not run'}` : 'no stage report');
for (const p of problems) console.log(`FAIL ${p}`);
process.exit(problems.length ? 1 : 0);
