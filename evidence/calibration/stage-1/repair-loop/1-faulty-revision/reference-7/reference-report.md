# Reference-model campaign: pocketful-stage-1-reference

| | |
|---|---|
| Result | **AGREE** |
| Seed | 7 |
| Operations executed / requested | 1000 / 1000 |
| Whole-state comparisons | 1000 |
| Invariant checks | 2100 |
| Expected outcomes | 201: 444, 409 insufficient_funds: 138, 422 validation_failed: 100, 409 request_not_pending: 86, 200 replay: 53, 403 forbidden: 52, 200: 46, 409 idempotency_key_reuse: 31, 422 self_payment: 28, 404 not_found: 10, 422 self_request: 7, 409 handle_taken: 5 |
| Duration | 4.6 s |

Reproduce: `node commit/campaign.ts --module calibration/verification/reference.campaign.ts --base-url <url> --seed 7 --operations 1000`

The full operation sequence is in `reference-report.json`.
