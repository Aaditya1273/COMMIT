```text
ACCEPT

Run:
    20261002T072952Z-db9f5a (factory 1.0.0-rc.2)
Revision:
    a899d17e549a35e126c77e602036b92337e2dfc0 on main
    candidate digest f8c1a458f4d9411512fac334aa89715dec1a1f80481efd85a99412515f5fc0dc

Why:
    every blocking step ran and passed

Checks independently executed:
    typecheck: PASSED
    lint: PASSED
    startup: PASSED
    shipped-checks: PASSED
    overshoot-probe: PASSED
    contract: PASSED
    reference-481927: PASSED
    reference-7: PASSED
    reference-90210: PASSED
    adversarial: PASSED
    mutation: PASSED
    clean-build: PASSED
    offline-isolated: PASSED

Production modification by verifier:
    NONE

Accepted revision is frozen: any change is a new revision and needs a new verification.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | PASSED | 1.0 s |  |
| lint | required | yes | PASSED | 1.0 s |  |
| startup | startup | yes | PASSED | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | PASSED | 18.8 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | PASSED | 0.4 s | a stage-1 folder must not pass the stage-2 suite: stage-2 holds must be absent |
| contract | contract | yes | PASSED | 2.7 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | PASSED | 5.1 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | PASSED | 4.6 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | PASSED | 5.0 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | PASSED | 10.0 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | PASSED | 1895.0 s |  |
| clean-build | build | yes | PASSED | 2.5 s |  |
| offline-isolated | offline | yes | PASSED | 370.1 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `4b2e99cfbc8f21ebb593bf99e46a358c7f955cca28222263a3d0856a870e7741`
