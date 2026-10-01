Prediction (written before running): faulty revision = await appendFile(audit) between
idempotency slot lookup and claim.
- shipped stage-1 checks: PASS (replay test sequential; concurrency test uses distinct keys)
- contract: PASS (sequential)
- reference: PASS (sequential)
- adversarial: FAIL same-key-storm / same-key-different-bodies / lost-response-retry
Verdict expected: REJECT, failure class adversarial.
