# COMMIT — calibration / pocketful stage 1 factory result

```text
Human dispatches:            not measured in this run
Post-dispatch human input:   not measured in this run

Planner:
    requirements identified: not measured in this run
    acceptance conditions:   not measured in this run
    ambiguities recorded:    not measured in this run

Verifier (this run):
    revision:                04563ed924bcfd10564ca84232b96a8fd7241780
    independent checks:      13 steps, 11 passed
    adversarial checks:      55/55 campaign rounds, 225 state checks, 50 concurrent
    reference-model runs:    agree (seed 481927, 1000 ops, 2100 invariant checks); agree (seed 7, 1000 ops, 2100 invariant checks); agree (seed 90210, 1000 ops, 2100 invariant checks)
    clean rebuild:           BLOCKED-ENVIRONMENT
    clean startup:           PASS
    offline execution:       BLOCKED-ENVIRONMENT

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
    verification time:       1934 s
    model/token usage:       not measured in this run

Final verdict:               INCONCLUSIVE
Evidence manifest:           sha256 0e46b1b1e9dd4f810c7c8d9f0de96cc79e8d1c110d9af2a6eb4ab1fd31f6e369
```
