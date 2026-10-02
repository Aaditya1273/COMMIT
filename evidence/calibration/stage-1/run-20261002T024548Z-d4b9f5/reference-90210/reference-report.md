# Reference-model campaign: pocketful-stage-1-reference

| | |
|---|---|
| Result | **AGREE** (0 divergences -- agreement is not proof of correctness) |
| Run | 20261002T024622Z-9f2c57 (factory 1.0.0-rc.1) |
| Seed | 90210 |
| Campaign module sha256 | `d271b4f1cc77ee22e289013a181304308dd4e6149793d5a902d6558538b63f94` |
| Operations executed / requested | 1000 / 1000 |
| Whole-state comparisons | 1000 |
| Invariant checks | 2100 |
| Expected outcomes | 201: 475, 409 insufficient_funds: 132, 200: 73, 200 replay: 70, 422 validation_failed: 58, 403 forbidden: 54, 409 request_not_pending: 48, 409 idempotency_key_reuse: 38, 422 self_payment: 27, 404 not_found: 9, 422 self_request: 8, 409 handle_taken: 5, 409 email_taken: 3 |
| Duration | 4.9 s |

Reproduce: `node commit/campaign.ts --module calibration/verification/reference.campaign.ts --base-url <url> --seed 90210 --operations 1000`

The full operation sequence is in `reference-report.json`.
