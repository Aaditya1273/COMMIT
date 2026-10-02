```text
INCONCLUSIVE

Run:
    20261002T040633Z-5dd507 (factory 1.0.0-rc.2)
Revision:
    72aa9ed4fbcf80c6d73cffc3d8662be41a70d4cd on main
    candidate digest f8c1a458f4d9411512fac334aa89715dec1a1f80481efd85a99412515f5fc0dc

Why:
    INCONCLUSIVE: mutation: skipped by --skip for this run; a skipped blocking step can never yield ACCEPT
    INCONCLUSIVE: clean-build: environment precondition not met: docker info
    INCONCLUSIVE: offline-isolated: environment precondition not met: docker info

Production modification by verifier:
    NONE

Next action:
    Provide the missing evidence (environment, clean commit, skipped steps) and re-run.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | PASSED | 1.1 s |  |
| lint | required | yes | PASSED | 1.1 s |  |
| startup | startup | yes | PASSED | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | PASSED | 19.4 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | PASSED | 0.4 s | a stage-1 folder must not pass the stage-2 suite: stage-2 holds must be absent |
| contract | contract | yes | PASSED | 2.7 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | PASSED | 5.1 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | PASSED | 4.5 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | PASSED | 4.7 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | PASSED | 9.7 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | SKIPPED | 0.0 s |  |
| clean-build | build | yes | BLOCKED | 0.0 s |  |
| offline-isolated | offline | yes | BLOCKED | 0.0 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `adab9b347aa8fa4b46cdb6de34dd9d72661fca00fa31abcc02889aaae3fe38bd`
