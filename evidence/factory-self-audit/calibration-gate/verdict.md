```text
INCONCLUSIVE

Run:
    20261002T081100Z-0f8bcc (factory 1.0.0-rc.3)
Revision:
    f9837321d140e35eef340bde368db31bb16583c0 on main
    candidate digest f8c1a458f4d9411512fac334aa89715dec1a1f80481efd85a99412515f5fc0dc

Why:
    INCONCLUSIVE: mutation: skipped by --skip for this run; a skipped blocking step can never yield ACCEPT

Production modification by verifier:
    NONE

Next action:
    Provide the missing evidence (environment, clean commit, skipped steps) and re-run.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | PASSED | 1.1 s |  |
| lint | required | yes | PASSED | 1.2 s |  |
| startup | startup | yes | PASSED | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | PASSED | 19.2 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | PASSED | 0.4 s | a stage-1 folder must not pass the stage-2 suite: stage-2 holds must be absent |
| contract | contract | yes | PASSED | 2.8 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | PASSED | 5.2 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | PASSED | 4.6 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | PASSED | 4.9 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | PASSED | 9.8 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | SKIPPED | 0.0 s |  |
| clean-build | build | yes | PASSED | 2.6 s |  |
| offline-isolated | offline | yes | PASSED | 367.6 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `8dcb2ea33a982302797c84891b163831ab9c1daf3f6ce7c90149ef12967e5324`
