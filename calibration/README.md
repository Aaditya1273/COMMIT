# calibration/ — CALIBRATION ONLY, NOT JUDGED STAGE CODE

Everything in this directory exists to **measure COMMIT's verifier**, not to be submitted.

| | |
|---|---|
| `pocketful-stage-1/` | A Pocketful stage-1 service written **by hand**, outside any BAND room, to the published stage-1 specification. It is the known-good candidate the mutation campaigns seed defects into. |
| `verification/` | The problem-specific verification a verifier seat would write during a real run: contract checks, a reference model, adversarial campaigns, the kill suite, the verification plan, and the register of equivalent mutants. |

## Rules

- **Never copy anything from here into a result repository's `stage-N/` folder.** The event
  counts only code the band writes in its BAND Desktop room; hand-built code earns nothing
  and misrepresents where the code came from.
- **Never give these files to the band.** A verifier seat that inherited this reference
  model, or a builder that read this service, would not be producing independent work.
  `commit/bootstrap.sh` deliberately does not install this directory.
- The generic factory (`commit/`, `mandates/`) must not depend on anything here. The
  factory self-audit checks `commit/` and `mandates/` against both graded tracks'
  vocabulary on every run.

## What it is for

- Mutation campaigns: how many seeded defects does the verifier's suite kill?
  (`evidence/calibration/stage-1/`, summarised in `FACTORY.md` §6.)
- The reject → repair → re-verify rehearsal (`evidence/calibration/stage-1/repair-loop/`).
- Regression input for the factory's own self-audit (`pnpm verify`).
