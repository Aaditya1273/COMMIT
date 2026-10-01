```text
INCONCLUSIVE

Revision:
    57e088bbcfc010867dbabca1fb615707d6bb8987
    candidate digest 4927dc9981c63a977e6c771ecf847ace820c1c201fb114ad9d758643527fbab5

Not run -- blocked by the environment or skipped (not implementation failures):
    mutation: skipped by --skip for this run; a skipped blocking step can never yield ACCEPT
    clean-build: environment precondition failed: docker info
    offline-isolated: environment precondition failed: docker info

Production modification by verifier:
    NONE

Next action:
    Restore the environment and re-run; nothing is accepted until these steps run.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | pass | 0.9 s |  |
| lint | required | yes | pass | 1.0 s |  |
| startup | startup | yes | pass | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | pass | 19.4 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | pass | 0.3 s | a stage-1 folder must not pass the stage-2 suite |
| contract | contract | yes | pass | 2.8 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | pass | 5.3 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | pass | 4.8 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | pass | 5.5 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | pass | 10.0 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | skipped | 0.0 s |  |
| clean-build | build | yes | blocked-environment | 0.0 s |  |
| offline-isolated | offline | yes | blocked-environment | 0.0 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `8a6c3432cbc268715c37c4a158883cb2b4dd590360d28ef4305f24b262495afc`
