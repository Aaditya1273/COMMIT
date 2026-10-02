# COMMIT — calibration / pocketful stage 1 factory result

Generated from `evidence.json` (run 20261002T072952Z-db9f5a); do not edit by hand.

```text
Human dispatches:            not measured in this run
Post-dispatch human input:   not measured in this run

Planner:
    requirements identified: not measured in this run
    acceptance conditions:   not measured in this run
    ambiguities recorded:    not measured in this run

Verifier (this run):
    revision:                a899d17e549a35e126c77e602036b92337e2dfc0
    independent checks:      13 steps, 13 passed
    adversarial checks:      55/55 campaign rounds, 225 state checks, 50 concurrent
    reference-model runs:    agree (seed 481927, 1000 ops, 2100 invariant checks); agree (seed 7, 1000 ops, 2100 invariant checks); agree (seed 90210, 1000 ops, 2100 invariant checks)
    clean rebuild:           PASSED
    clean startup:           PASSED
    offline execution:       PASSED

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
    verification time:       2317 s
    model/token usage:       not measured in this run

Final verdict:               ACCEPT
Evidence manifest:           sha256 4b2e99cfbc8f21ebb593bf99e46a358c7f955cca28222263a3d0856a870e7741
```
