```text
REJECT

Run:
    20261002T052447Z-482df0 (factory 1.0.0-rc.2)
Revision:
    80f7caa10c36110b87ebe425d80f9bdb9c554cf7 on main
    candidate digest f8c1a458f4d9411512fac334aa89715dec1a1f80481efd85a99412515f5fc0dc

Why:
    REJECT: offline-isolated: exit status 1

Failure (FAILED):
    step offline-isolated -- offline
Requirement:
    §2 no outbound network at run time, 2 vCPU, 2 GiB
Observed:
    exit status 1
    | <frozen site>:101: RuntimeWarning: Unexpected value in sys.prefix, expected ~/Wins/dark-factory-wearedevs/.venv, got ~/Wins/COMMIT/../dark-factory-wearedevs/.venv
    | <frozen site>:101: RuntimeWarning: Unexpected value in sys.exec_prefix, expected ~/Wins/dark-factory-wearedevs/.venv, got ~/Wins/COMMIT/../dark-factory-wearedevs/.venv
    | building calibration/pocketful-stage-1 ...
    |   stage 1: pass  (log: ~/Wins/COMMIT/evidence/calibration/stage-1/run-20261002T052447Z/isolated/stage-1.log)
    |   stage 2: error  (log: ~/Wins/COMMIT/evidence/calibration/stage-1/run-20261002T052447Z/isolated/stage-2.log)
    |   stage 3: fail  (log: ~/Wins/COMMIT/evidence/calibration/stage-1/run-20261002T052447Z/isolated/stage-3.log)
    |   stage 4: fail  (log: ~/Wins/COMMIT/evidence/calibration/stage-1/run-20261002T052447Z/isolated/stage-4.log)
    | highest contiguous stage: 1
    | report: ~/Wins/COMMIT/evidence/calibration/stage-1/run-20261002T052447Z/isolated/report.json
Expected:
    exit status 0 and a consistent report from offline-isolated
Reproduction:
    PYTHONPATH='../dark-factory-wearedevs' '../dark-factory-wearedevs'/.venv/bin/python -m harness run --track pocketful --build calibration/pocketful-stage-1 --mode isolated --stage 1 --out 'evidence/calibration/stage-1/run-20261002T052447Z'/isolated
Evidence:
    logs/offline-isolated.log (sha256 7ac2cd3e3a5be55d…)

Production modification by verifier:
    NONE

Next action:
    Builder repairs and resubmits a new revision.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | PASSED | 1.1 s |  |
| lint | required | yes | PASSED | 1.3 s |  |
| startup | startup | yes | PASSED | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | PASSED | 19.2 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | PASSED | 0.4 s | a stage-1 folder must not pass the stage-2 suite: stage-2 holds must be absent |
| contract | contract | yes | PASSED | 2.8 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | PASSED | 5.1 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | PASSED | 4.5 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | PASSED | 4.8 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | PASSED | 9.7 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | PASSED | 1880.2 s |  |
| clean-build | build | yes | PASSED | 8.9 s |  |
| offline-isolated | offline | yes | FAILED | 376.7 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `2a35faed5ee5581fd179f971226a269c068f04dd46d21ad8561660259530e1f0`
