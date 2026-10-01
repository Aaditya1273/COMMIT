```text
REJECT

Revision:
    6020598c7be11c2fa445c124826539190a5cdb06
    candidate digest 90e45cc0010266c85d09c7fc9e592a85eab47913c1e2a9b609e60883a35c0268

Failure class:
    adversarial check failed (fail)
Requirement:
    §1 invariants, §2 concurrency, §7, §11
Observed:
    FAIL same-key-storm round 4 seed 20265001 :: every other reply is 200 with the same body: {"200":14,"201":1,"409 insufficient_funds":35}
    FAIL same-key-different-bodies round 4 seed 20265002 :: exactly one 201: {"200":13,"201":24,"409 idempotency_key_reuse":13}; losers are 409 reuse or same-body 200: {"200":13,"201":24,"409 idempotency_key_reuse":13}; only the winner moved money: {"ada":600,"bob":4400}
    PASS drain-race round 4 seed 20265003
    PASS fan-in round 4 seed 20265004
    PASS ring round 4 seed 20265005
    PASS request-double-pay round 4 seed 20265006
    PASS pay-versus-cancel round 4 seed 20265007
    PASS settlement-under-drain round 4 seed 20265008
    PASS lost-response-retry round 4 seed 20265009
    PASS signup-race round 4 seed 20265010
    PASS mixed-garbage round 4 seed 20265011
    46/55 passed, 225 checks
Expected:
    exit status 0 from the adversarial step
Reproduction:
    node --no-warnings calibration/verification/adversarial.ts --base-url http://127.0.0.1:41651 --seed 20261001 --workers 50 --rounds 5 --out evidence/calibration/stage-1/repair-loop/1-faulty-revision/adversarial
Evidence:
    logs/adversarial.log (sha256 4a4daa82349b4099…)

Production modification by verifier:
    NONE

Next action:
    Builder repairs and resubmits a new revision.
```

| Step | Kind | Blocking | Status | Duration | Requirements |
|---|---|---|---|---|---|
| typecheck | required | yes | pass | 1.0 s |  |
| lint | required | yes | pass | 1.0 s |  |
| startup | startup | yes | pass | 0.0 s | §3.1 §3.2 |
| shipped-checks | required | yes | pass | 19.4 s | stage-1 sample and shipped suites |
| overshoot-probe | required | yes | pass | 0.3 s | a stage-1 folder must not pass the stage-2 suite |
| contract | contract | yes | pass | 2.8 s | §3 §4 §5 §6 §7 §8 §9 §10 §11 |
| reference-481927 | reference-model | yes | pass | 5.3 s | §1 invariants §7 §8 §9 §11 |
| reference-7 | reference-model | yes | pass | 4.6 s | §1 invariants §7 §8 §9 §11 |
| reference-90210 | reference-model | yes | pass | 5.2 s | §1 invariants §7 §8 §9 §11 |
| adversarial | adversarial | yes | fail | 10.2 s | §1 invariants §2 concurrency §7 §11 |
| mutation | mutation | yes | skipped | 0.0 s |  |
| clean-build | build | yes | blocked-environment | 0.0 s |  |
| offline-isolated | offline | yes | blocked-environment | 0.0 s | §2 no outbound network at run time, 2 vCPU, 2 GiB |

Evidence manifest: `evidence.json`, sha256 `2346e400d1c296782754bb91224ad980c7f089ec4c4eeb207007583bb918742d`
