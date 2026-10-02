# Reference-model campaign: pocketful-stage-1-reference

| | |
|---|---|
| Result | **AGREE** (0 divergences -- agreement is not proof of correctness) |
| Run | 20261002T040659Z-e2e228 (factory 1.0.0-rc.2) |
| Seed | 481927 |
| Campaign module sha256 | `d271b4f1cc77ee22e289013a181304308dd4e6149793d5a902d6558538b63f94` |
| Operations executed / requested | 1000 / 1000 |
| Whole-state comparisons | 1000 |
| Invariant checks | 2100 |
| Expected outcomes | 201: 473, 409 insufficient_funds: 124, 200: 82, 422 validation_failed: 77, 200 replay: 59, 403 forbidden: 57, 409 request_not_pending: 45, 422 self_payment: 29, 409 idempotency_key_reuse: 26, 404 not_found: 14, 422 self_request: 7, 409 handle_taken: 4, 409 email_taken: 3 |
| Duration | 5.0 s |

Reproduce: `node commit/campaign.ts --module calibration/verification/reference.campaign.ts --base-url <url> --seed 481927 --operations 1000`

The full operation sequence is in `reference-report.json`.
