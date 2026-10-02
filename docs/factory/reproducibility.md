# Runbook — reproduce every result in this repository

Every command here was run to produce the evidence in `evidence/`. Paths assume this
repository is checked out next to the official kickoff package:

```text
<workspace>/
  COMMIT/                      this repository
  dark-factory-wearedevs/      git clone https://github.com/band-ai/dark-factory-wearedevs
```

## 0. One-time setup

```sh
# Node >= 22.18 runs the toolkit and the calibration service directly (no build step).
node --version

# Dev tooling for typecheck and lint only (the toolkit itself has no dependencies).
pnpm install

# The official harness, for the shipped checks and the isolated (offline) run.
cd ../dark-factory-wearedevs
python3 -m venv .venv
.venv/bin/pip install -r harness/requirements.txt   # or just httpx + pytest for API stages
cd ../COMMIT
```

The clean-container and offline steps need a running Docker daemon
(`sudo systemctl start docker` on most Linux systems).

## 1. What can this machine run?

```sh
pnpm doctor              # Node >= 22.18, git, Docker daemon (not just binary), Python, kickoff
```

## 1b. Factory health: one command

```sh
pnpm verify              # ~1.5 min: typecheck, lint, the factory's own tests, mandate
                         # genericity (official scanner, both tracks), bootstrap rehearsal,
                         # evidence consistency, secret/path scan, domain coupling,
                         # reference replay, calibration release gate, container checks
                         # when Docker works -> evidence/factory-self-audit/summary.{json,md}
pnpm verify:full         # the same, plus the full calibration verification (~40 min)
```

Exit 0 means nothing FAILED; INCONCLUSIVE items (no Docker daemon, unfilled seat
placeholders) are listed in the summary and never counted as passes.

Individually: `pnpm typecheck` (factory + upstream), `pnpm lint`, `pnpm test` (factory
tests: meta-verification of the release gate, mutation engine, replay, bootstrap).

## 2. Start the calibration target

```sh
pnpm calibration:start   # PORT=8080, in-memory state
curl http://127.0.0.1:8080/health
```

## 3. Individual verification layers (service running on :8080)

```sh
# Official shipped checks for stage 1
(cd ../dark-factory-wearedevs && .venv/bin/python -m harness run --track pocketful \
   --base-url http://127.0.0.1:8080 --stage 1)

# Contract checks: one per spec rule
pnpm verify:contract --base-url http://127.0.0.1:8080

# Reference-model campaign: seed + operation count reproduce the run exactly
pnpm verify:reference --base-url http://127.0.0.1:8080 --seed 481927 --operations 1000 --out /tmp/ref

# Adversarial concurrency / retry campaigns
pnpm verify:adversarial --base-url http://127.0.0.1:8080 --seed 20261001 --workers 50 --rounds 5
```

## 4. Mutation campaign (starts its own candidates; no service needed)

```sh
pnpm verify:mutation     # ~45-60 min on 12 cores with --jobs 6
```

Writes `mutation-report.json` and `mutation-report.md`. Exits 2 — with no score — if the
unmutated baseline fails the kill check or any check command cannot run.

## 5. The full independent verification of the calibration target

```sh
pnpm verify:calibration  # every layer, mutation included; writes evidence + verdict
pnpm verify:gate         # the per-revision release gate: everything except mutation
node commit/cli.ts audit evidence/calibration/stage-1/run-*   # consistency of any run
```

Exit codes: 0 ACCEPT, 1 REJECT, 2 usage/config, 3 INCONCLUSIVE, 4 ERROR, 130 interrupted.

Output: a new `evidence/calibration/stage-1/run-<UTC timestamp>/` directory with `evidence.json`, `evidence.sha256`,
`verdict.md`, `scorecard.md`, `reproduction.sh` and per-step logs.

## 6. Clean container and offline execution

```sh
docker build --no-cache -t pocketful-calibration calibration/pocketful-stage-1
docker run --rm -e PORT=8080 -p 8080:8080 pocketful-calibration

# Graded conditions: internal network with no outbound access, 2 vCPU, 2 GiB
(cd ../dark-factory-wearedevs && .venv/bin/python -m harness run --track pocketful \
   --build ../COMMIT/calibration/pocketful-stage-1 --mode isolated --stage 1)
```

The image has no npm install step: the service has zero dependencies and runs its
TypeScript under Node's type stripping, so the base image is the only thing the build
fetches and nothing is fetched at run time.

## 7. Bootstrap rehearsal

```sh
commit/bootstrap.sh --check "$(mktemp -d)/result"     # installs, then runs the installed self-tests
commit/bootstrap.sh "$that_dir"                         # second run: "already installed; nothing changed"
```

## 8. Check a submission repository offline

```sh
(cd ../dark-factory-wearedevs && .venv/bin/python -m harness check <result-repo> --track pocketful)
```

This validates layout, mandates (including the track-vocabulary scan), `room.json` and
credential shapes. It builds nothing.
