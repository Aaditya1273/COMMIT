# COMMIT — calibration / pocketful stage 1 factory result

Generated from `evidence.json` (run 20261002T052447Z-482df0); do not edit by hand.

```text
Human dispatches:            not measured in this run
Post-dispatch human input:   not measured in this run

Planner:
    requirements identified: not measured in this run
    acceptance conditions:   not measured in this run
    ambiguities recorded:    not measured in this run

Verifier (this run):
    revision:                80f7caa10c36110b87ebe425d80f9bdb9c554cf7
    independent checks:      13 steps, 12 passed
    adversarial checks:      55/55 campaign rounds, 225 state checks, 50 concurrent
    reference-model runs:    agree (seed 481927, 1000 ops, 2100 invariant checks); agree (seed 7, 1000 ops, 2100 invariant checks); agree (seed 90210, 1000 ops, 2100 invariant checks)
    clean rebuild:           PASSED
    clean startup:           PASSED
    offline execution:       FAILED

Mutation campaign:
    seeded mutants:          483 of 483 discovered
    equivalent excluded:     58
    invalid (never started): 8
    valid mutants:           417
    killed:                  398
    survived:                18
    timeout:                 1
    kill rate:               95.4%

Defect handling:
    rejected revisions:      not measured in this run
    repair cycles:           not measured in this run
    false accepts:           not measured in this run

Resource usage:
    verification time:       2315 s
    model/token usage:       not measured in this run

Final verdict:               REJECT
Evidence manifest:           sha256 2a35faed5ee5581fd179f971226a269c068f04dd46d21ad8561660259530e1f0
```
