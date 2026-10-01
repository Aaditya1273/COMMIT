# Reference-model campaign: pocketful-stage-1-reference

| | |
|---|---|
| Result | **AGREE** |
| Seed | 90210 |
| Operations executed / requested | 1000 / 1000 |
| Whole-state comparisons | 1000 |
| Invariant checks | 2100 |
| Expected outcomes | 201: 475, 409 insufficient_funds: 132, 200: 73, 200 replay: 70, 422 validation_failed: 58, 403 forbidden: 54, 409 request_not_pending: 48, 409 idempotency_key_reuse: 38, 422 self_payment: 27, 404 not_found: 9, 422 self_request: 8, 409 handle_taken: 5, 409 email_taken: 3 |
| Duration | 5.1 s |

Reproduce: `node commit/campaign.ts --module calibration/verification/reference.campaign.ts --base-url <url> --seed 90210 --operations 1000`

The full operation sequence is in `reference-report.json`.
