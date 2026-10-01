```text
INCONCLUSIVE

Revision:
    04563ed924bcfd10564ca84232b96a8fd7241780
    candidate digest f8c1a458f4d9411512fac334aa89715dec1a1f80481efd85a99412515f5fc0dc

Not run -- blocked by the environment or skipped (not implementation failures):
    clean-build: environment precondition failed: docker info
    offline-isolated: environment precondition failed: docker info

Production modification by verifier:
    NONE

Next action:
    Restore the environment and re-run; nothing is accepted until these steps run.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | pass | 1.0 s |  |
| lint | required | yes | pass | 1.0 s |  |
| startup | startup | yes | pass | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | pass | 20.3 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | pass | 0.3 s | a stage-1 folder must not pass the stage-2 suite |
| contract | contract | yes | pass | 2.8 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | pass | 5.2 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | pass | 4.5 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | pass | 4.8 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | pass | 9.8 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | pass | 1884.2 s |  |
| clean-build | build | yes | blocked-environment | 0.0 s |  |
| offline-isolated | offline | yes | blocked-environment | 0.0 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `0e46b1b1e9dd4f810c7c8d9f0de96cc79e8d1c110d9af2a6eb4ab1fd31f6e369`
