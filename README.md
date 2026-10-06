# COMMIT

### The software factory that measures how much bad work it can kill.

<p align="center">
  <a href="https://lablab.ai/ai-hackathons/wearedevelopers-hackathon/guerrero/commit-factory-that-measures-bad-work"><img src="docs/media/commit-preview.gif" alt="COMMIT — film preview: who checks the checker, 27 charges for one payment, the COMMIT reveal, the real BAND run, the app it built" width="760"></a>
</p>

<p align="center">
  <a href="https://lablab.ai/ai-hackathons/wearedevelopers-hackathon/guerrero/commit-factory-that-measures-bad-work"><b>▶ Watch the film (3:53)</b></a> &nbsp;·&nbsp;
  <a href="https://storage.googleapis.com/lablab-static-eu/submissions/ajdxs9xxz0t764xhuqddyv99/mmgki45xibk6ufrn0r8gevx0/presentation/presentation_benph46sw7dnougxvgfjj7qa.pdf"><b>Presentation (PDF)</b></a> &nbsp;·&nbsp;
  <a href="https://github.com/Aaditya1273/COMMIT-Pocketful"><b>Result repository (the run)</b></a> &nbsp;·&nbsp;
  <a href="https://lablab.ai/ai-hackathons/wearedevelopers-hackathon/guerrero/commit-factory-that-measures-bad-work"><b>Hackathon submission</b></a>
</p>

| The submitted run · 5 Oct 2026 | |
|---|---|
| Stages accepted | **4 / 4** (Pocketful 1–4), each by an independent Verifier seat |
| Official harness, isolated, all stages | **highest contiguous stage 4**; every stage folder claims its own stage |
| Stage code written by a human | **0 lines** — full room log in [`room.json`](https://github.com/Aaditya1273/COMMIT-Pocketful/blob/main/room.json) |
| Time and model spend | **9 h 32 min**, **$33.57** (BAND room counter) |
| Human input | the dispatch + one time-limit note, both disclosed |


> **Don't trust green checks. Measure whether your factory can detect bad work.**

COMMIT is a three-seat autonomous software factory for **BAND Desktop**, built for the
**WeAreDevelopers × BAND Dark Factory** hackathon (track: Pocketful). A **Planner**, a
**Builder** and an independent **Verifier** take one human dispatch and carry it through
**plan → build → independent attack → reject or accept → repair → re-verify** with no
further human input.

What makes it COMMIT rather than "agents plus tests" is that **the verifier's strength is
itself measured**: it seeds realistic defects into a candidate and counts how many its
checks kill, drives a reference model and the real service through the same seeded
operations, attacks the service with concurrent and retried requests, and records every
number with the command that reproduces it.

- **[`FACTORY.md`](FACTORY.md)** — seats, protocol, toolkit, verdict lifecycle, measured results, costs, limitations.
- **[`mandates/`](mandates/)** — the three generic seat mandates.
- **[`docs/production-readiness.md`](docs/production-readiness.md)** — what is tested, what is not, and the evidence for each.

---

## The problem

A coding agent can plan, implement, test and report "done" on its own — so the producer
and the evaluator can be the same entity, and a convincing report is not a verified
artifact. A green suite answers *did the checks we wrote pass?*, not *would these checks
notice if the code were wrong?* Coverage does not answer that either; mutation testing
does, so COMMIT uses it to measure its own verifier.

<p align="center"><img src="docs/media/slide-problem.jpg" alt="AI writes the code. Nobody trusts it: over 25% of new code at Google is AI-written; 46% of developers distrust AI accuracy vs 33% who trust it" width="49%"> <img src="docs/media/slide-green-checks-real-bug.jpg" alt="Green checks, real bug: 147/147 official checks passed, yet one payment was charged 27 times when 50 customers paid at once" width="49%"></p>

We proved it on a payment service: one realistic planted bug (an audit log written at the
wrong moment) kept all **147 / 147** official checks green, while 50 concurrent customers
paying with one idempotency key got the same payment charged **27 times** (`{"201":27}`).

## The factory

```mermaid
flowchart TD
    H[Human dispatch] --> P[Planner<br/>requirements + acceptance conditions]
    P --> B[Builder<br/>code + evidence]
    B --> V[Verifier<br/>no edit rights over the deliverable]
    V --> R[REJECT + reproduction]
    V --> A[ACCEPT, bound to one commit]
    V --> I[INCONCLUSIVE: evidence could not be produced]
    R --> M[Builder reflects + repairs] --> B
    A --> F[Frozen revision]
```

| Seat | Owns | Never |
|---|---|---|
| **Planner** | numbered requirements, acceptance conditions, ambiguity log, every handoff | writes deliverable code, accepts work |
| **Builder** | the deliverable and its tests | self-approves, weakens a check, rewrites reported history |
| **Verifier** | the verdict, verification code, evidence | edits the deliverable — even to fix a bug it found |

The mandates are generic — roles, handoffs, evidence and rejection rules, never a track's
endpoints, fields or error codes — and the factory checks that on every run with the
event's own scanner, against both graded tracks.

<p align="center"><img src="docs/media/slide-architecture.jpg" alt="Architecture: spec into a BAND room with Planner, Builder and a read-only Verifier; the Verifier runs a six-layer release gate and rejects with a reproduce command" width="49%"> <img src="docs/media/slide-workflow.jpg" alt="Workflow of one stage: dispatch, plan, build, verify, ACCEPT, with the reject-repair loop; real stage-3 times" width="49%"></p>

**What makes it different** — not another checker, a *measured* one:

<p align="center"><img src="docs/media/slide-uniqueness.jpg" alt="Comparison: only COMMIT measures its own checks with mutation testing and seals re-auditable evidence" width="49%"> <img src="docs/media/slide-market-gap.jpg" alt="Positioning: coding agents and CI test suites are self-reported; COMMIT verifies and measures the verifier" width="49%"></p>

## The toolkit (`commit/`)

Node ≥ 22.18, no npm dependencies. One entry point: `node commit/cli.ts <command>`.

| Command | Purpose |
|---|---|
| `verify` | run a verification plan against one revision → evidence manifest (schema v2, sha256), `verdict.md`, `scorecard.md`, `reproduction.sh`. Verdicts **ACCEPT / REJECT / INCONCLUSIVE / ERROR**; missing, contradictory or unattributable evidence can never become ACCEPT |
| `mutate` | mutation campaign in isolated copies: killed / survived / timeout / invalid / error / equivalent, kill rate, kills per verification layer, `--only` replay |
| `campaign` | seeded reference-model campaign; the seed plus the module hash reproduce it |
| `audit` | check evidence directories for contradictions and after-the-fact edits |
| `doctor` | what this machine can run: Node, git, Docker *daemon* (not just binary), Python |

`commit/bootstrap.sh` installs the factory — and only the factory — into a fresh result
repository, safely and idempotently.

## The submitted run (5 Oct 2026)

One dispatch to `@planner` in BAND Desktop at 13:08 IST; all four Pocketful stages were
accepted by 22:40 IST. Full detail, evidence and the room log are in the
**[result repository](https://github.com/Aaditya1273/COMMIT-Pocketful)**.

| Stage | Verdict | Revision | Official suites (isolated, no network) | Verifier's own evidence |
|---|---|---|---|---|
| 1 | **ACCEPT** | `29baf05` | 147 / 147 | 14/14 blocking steps · contract 49/49 · adversarial 50/50 · full 782-mutant campaign, 92.5 % killed |
| 2 | **ACCEPT** | `ef962af` | 147/147 · 35/35 | 19/19 blocking steps · UI 16/16 · auth contract 14/14 · mutation sample 79.8 % |
| 3 | **ACCEPT** | `39de1bf` | 147 · 35 · 6 | 24/24 blocking steps · upgrade 58/58 · ledger contract 12/12 · mutation sample 86.0 % |
| 4 | **ACCEPT** | `cc1d710` | 147 · 35 · 6 · 5 | 25/25 blocking steps · refund contract 5/5 · upgrades 58/58 + 19/19 · mutation sample 77.0 % |

<p align="center"><img src="docs/media/slide-real-run.jpg" alt="4/4 stages accepted: timeline from the 13:08 dispatch to stage 4 at 22:37, next to the real BAND room showing the final report" width="49%"> <img src="docs/media/slide-cost.jpg" alt="What it cost: $33.57 model spend, 9 h 32 m, 0 stage-code lines by a human; work split Planner 150, Builder 335, Verifier 536 turns" width="49%"></p>

### What the factory built

The Pocketful wallet — payments, requests, splits and holds — written entirely by the band.
Screenshots of the accepted stage-4 revision, running locally:

<p align="center"><img src="docs/media/app-home.jpg" alt="Pocketful home: available balance, a payment to Bob in the activity feed, a hold and a request just placed" width="74%"> <img src="docs/media/app-mobile.jpg" alt="Pocketful on a phone" width="22%"></p>
<p align="center"><img src="docs/media/app-holds.jpg" alt="Holds page: money reserved for Cy and Bob" width="49%"> <img src="docs/media/app-requests.jpg" alt="Requests page: a pending request to Cy" width="49%"></p>

Run it yourself from the result repository: `cd stage-4 && docker build -t pocketful . && docker run --rm -p 8080:8080 pocketful`,
then open <http://localhost:8080/login> ([`RUN.md`](https://github.com/Aaditya1273/COMMIT-Pocketful/blob/main/stage-4/RUN.md)).

## Calibration results

The verifier was calibrated against a hand-written Pocketful stage-1 service
([`calibration/`](calibration/README.md) — **calibration only, never a submission**).

| Measure | Result |
|---|---|
| Official shipped stage-1 checks | 147 / 147 |
| Contract checks (one per spec rule, incl. import-corruption fuzz) | 248 / 248 |
| Reference model — 3 seeds × 1,000 generated operations | agree; 6,300 invariant checks |
| Adversarial concurrency / retry campaigns | 55 / 55 rounds, 50 concurrent requests per burst |
| **Mutation kill rate**, campaigns #1 → #6 | **64.0% → 79.7% → 95.4%**, then 95.4% three more times (83.8% counting the 58 justified equivalents as survivors; identical on the rewritten engine) |
| Defects killed *only* by the verifier's own contract layer | 97 of 398 |
| Seeded double-spend (rehearsal) | shipped checks green; **REJECTED** by the adversarial layer — 24 payments under one key |
| Clean container build | PASSED (`docker build --no-cache`, no npm install step) |
| Official isolated-mode harness: no outbound network, 2 vCPU, 2 GiB | stage 1 **147 / 147**; stage 2 0 / 35, as a stage-1 folder must |
| Overshoot probe (stage-1 must fail the stage-2 suite) | the stage-2 hold check ran and failed, as required — vacuous in runs before rc.2 ([`FACTORY.md` §8](FACTORY.md#8-what-we-tried-that-failed-and-what-it-taught-the-factory)) |
| Latest verdict (`a899d17`) | **ACCEPT** — all 13 blocking steps ran and passed |
| Factory self-audit (`pnpm verify`) | see [`evidence/factory-self-audit/summary.md`](evidence/factory-self-audit/summary.md) |

Evidence: [`evidence/calibration/stage-1/run-20261002T072952Z/verdict.md`](evidence/calibration/stage-1/run-20261002T072952Z/verdict.md) · [`scorecard.md`](evidence/calibration/stage-1/run-20261002T072952Z/scorecard.md) ·
[all runs](evidence/calibration/stage-1/) · [repair-loop rehearsal](evidence/calibration/stage-1/repair-loop/).
The 18 remaining survivors are listed in [`FACTORY.md` §6](FACTORY.md#6-measured-results--verifier-calibration).

The mutation score measures the verifier against the defects it can model; it is not a
claim that the service is correct, and agreement with a reference model is not proof.

<p align="center"><img src="docs/media/slide-mutation.jpg" alt="Mutation kill rate by campaign: 64.0%, 79.7%, then 95.4% — every bug that slipped through became a new check" width="49%"> <img src="docs/media/slide-caught-fixed-proven.jpg" alt="Caught, fixed, proven: reject 6020598 (paid 27x), repair 57e088b, inconclusive (2 steps skipped), accept a899d17 on the full gate" width="49%"></p>

## Reproduce

```sh
pnpm install          # dev tooling only (typecheck, lint)
pnpm doctor           # what this machine can verify
pnpm verify           # factory self-audit, ~1.5 min -> evidence/factory-self-audit/
pnpm verify:full      # + full calibration verification with mutation, ~40 min
pnpm test             # the factory's own tests
```

Runbook: [`docs/factory/reproducibility.md`](docs/factory/reproducibility.md).

## From this repository to a submission

This is the **factory repository**. The event grades a separate, fresh **result
repository** whose stage folders the band writes in its BAND Desktop room; this
repository therefore contains no `stage-N/` folders and never will.

1. `commit/bootstrap.sh --check /abs/path/to/result-repo`
2. In `mandates/*.md` of the result repository, replace the `Harness:` and `Model:`
   placeholders with what each BAND seat actually runs.
3. Create the **Planner**, **Builder** and **Verifier** seats in BAND Desktop; dispatch the
   stage task to `@planner` ([`FACTORY.md` §2](FACTORY.md#2-standing-it-up)); do not intervene.
4. Download the room as `room.json`; write the result repository's README; run
   `harness check` and `harness run --all --mode isolated`.

## Repository layout

```text
FACTORY.md, README.md     the factory, in depth / this entry point
mandates/                 planner.md, builder.md, verifier.md (generic, versioned)
commit/                   the generic toolkit, its tests, bootstrap.sh, VERSION
scripts/self-audit.ts     this repository's own health check (pnpm verify)
calibration/              CALIBRATION ONLY: hand-written target + its verification layers
evidence/                 every verification run, campaign and self-audit quoted anywhere
docs/factory/             verification in depth, reproducibility runbook
docs/production-readiness.md
apps/ packages/ docs/adr/ docs/*.md docker/   inherited upstream ledger (see Provenance)
```

## Links

| | |
|---|---|
| Film (3:53) | [watch on the submission page](https://lablab.ai/ai-hackathons/wearedevelopers-hackathon/guerrero/commit-factory-that-measures-bad-work) · [download MP4](https://storage.googleapis.com/lablab-video-submissions/submissions/ajdxs9xxz0t764xhuqddyv99/mmgki45xibk6ufrn0r8gevx0/video/video_l4mjeog53xysagt5gb0qnqxe.mp4) |
| Presentation | [PDF, 15 slides](https://storage.googleapis.com/lablab-static-eu/submissions/ajdxs9xxz0t764xhuqddyv99/mmgki45xibk6ufrn0r8gevx0/presentation/presentation_benph46sw7dnougxvgfjj7qa.pdf) |
| Result repository (the judged run) | <https://github.com/Aaditya1273/COMMIT-Pocketful> |
| Hackathon submission | [lablab.ai — COMMIT: Factory That Measures Bad Work](https://lablab.ai/ai-hackathons/wearedevelopers-hackathon/guerrero/commit-factory-that-measures-bad-work) |
| Factory in depth | [`FACTORY.md`](FACTORY.md) · [`mandates/`](mandates/) · [`docs/production-readiness.md`](docs/production-readiness.md) |

## Research foundation

Design inspiration, not reproduced results:

- **Agent-as-a-Judge** (Zhuge et al., arXiv:2410.10934) — agents evaluating agentic work
  from intermediate evidence; COMMIT makes a separate seat the only acceptance authority.
- **Reflexion** (Shinn et al., arXiv:2303.11366) and **Self-Refine** (Madaan et al.,
  arXiv:2303.17651) — improvement from verbal feedback; in COMMIT the feedback comes from
  an independent verifier with a deterministic reproduction, not from self-critique.
- **Mutation-guided test generation at Meta** (Foster et al., arXiv:2501.12862) —
  mutants as targets a suite must kill; COMMIT uses them to measure its verifier.
- Stateful model-based testing (QuickCheck-style state machines) and Jepsen-style
  concurrency analysis.

## Provenance and license

This repository began as a snapshot of an MIT-licensed double-entry ledger by Plesa
George-Eduard (`LICENSE`, unchanged). That code — `apps/`, `packages/`, `docs/adr/`,
`docs/*.md` outside `docs/factory/` and `docs/production-readiness.md`, `docker/` and the
database tooling — is **inherited and unused**: the Pocketful specification forbids
building from existing products' source in its domain, and its development database
URLs trip the event's credential scanner, so it must never be copied into a submission.
It stays for provenance; the first commit records it, and an earlier draft of this
README, exactly as received.

New work for this project — `commit/`, `scripts/`, `calibration/`, `mandates/`,
`evidence/`, `docs/factory/`, `docs/production-readiness.md`, `README.md`, `FACTORY.md`
— is released under the same MIT license.
