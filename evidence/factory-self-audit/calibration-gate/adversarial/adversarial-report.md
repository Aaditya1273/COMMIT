# Adversarial campaigns

55/55 campaign rounds passed, 225 state checks, 50 concurrent requests per burst.
Reproduce: `node calibration/verification/adversarial.ts --base-url <url> --seed 20261001 --workers 50 --rounds 5`

| Campaign | Round | Seed | Requests | Responses | Result |
|---|---|---|---|---|---|
| same-key-storm | 0 | 20261001 | 50 | 200×49, 201×1 | PASS |
| same-key-different-bodies | 0 | 20261002 | 50 | 200×15, 201×1, 409 idempotency_key_reuse×34 | PASS |
| drain-race | 0 | 20261003 | 50 | 201×14, 409 insufficient_funds×36 | PASS |
| fan-in | 0 | 20261004 | 50 | 201×35, 409 insufficient_funds×15 | PASS |
| ring | 0 | 20261005 | 50 | 201×36, 409 insufficient_funds×14 | PASS |
| request-double-pay | 0 | 20261006 | 50 | 201×1, 409 request_not_pending×49 | PASS |
| pay-versus-cancel | 0 | 20261007 | 20 | 200×10, 409 request_not_pending×10 | PASS |
| settlement-under-drain | 0 | 20261008 | 50 | 201×4, 409 insufficient_funds×46 | PASS |
| lost-response-retry | 0 | 20261009 | 20 | 200×8, 201×12 | PASS |
| signup-race | 0 | 20261010 | 50 | 201×1, 409 email_taken×49 | PASS |
| mixed-garbage | 0 | 20261011 | 50 | 201×10, 422 validation_failed×10, 400 missing_idempotency_key×15, 401 unauthenticated×4, 400 malformed_request×2, 422 self_payment×3, 404 not_found×5, 409 insufficient_funds×1 | PASS |
| same-key-storm | 1 | 20262001 | 50 | 200×49, 201×1 | PASS |
| same-key-different-bodies | 1 | 20262002 | 50 | 200×18, 201×1, 409 idempotency_key_reuse×31 | PASS |
| drain-race | 1 | 20262003 | 50 | 201×19, 409 insufficient_funds×31 | PASS |
| fan-in | 1 | 20262004 | 50 | 201×29, 409 insufficient_funds×21 | PASS |
| ring | 1 | 20262005 | 50 | 201×27, 409 insufficient_funds×23 | PASS |
| request-double-pay | 1 | 20262006 | 50 | 201×1, 409 request_not_pending×49 | PASS |
| pay-versus-cancel | 1 | 20262007 | 20 | 200×10, 409 request_not_pending×10 | PASS |
| settlement-under-drain | 1 | 20262008 | 50 | 201×4, 409 insufficient_funds×46 | PASS |
| lost-response-retry | 1 | 20262009 | 20 | 200×5, 201×15 | PASS |
| signup-race | 1 | 20262010 | 50 | 201×1, 409 email_taken×49 | PASS |
| mixed-garbage | 1 | 20262011 | 50 | 201×11, 422 validation_failed×6, 401 unauthenticated×13, 400 malformed_request×3, 422 self_payment×3, 400 missing_idempotency_key×11, 404 not_found×2, 409 insufficient_funds×1 | PASS |
| same-key-storm | 2 | 20263001 | 50 | 200×49, 201×1 | PASS |
| same-key-different-bodies | 2 | 20263002 | 50 | 200×16, 201×1, 409 idempotency_key_reuse×33 | PASS |
| drain-race | 2 | 20263003 | 50 | 201×20, 409 insufficient_funds×30 | PASS |
| fan-in | 2 | 20263004 | 50 | 201×35, 409 insufficient_funds×15 | PASS |
| ring | 2 | 20263005 | 50 | 201×40, 409 insufficient_funds×10 | PASS |
| request-double-pay | 2 | 20263006 | 50 | 201×1, 409 request_not_pending×49 | PASS |
| pay-versus-cancel | 2 | 20263007 | 20 | 200×10, 409 request_not_pending×10 | PASS |
| settlement-under-drain | 2 | 20263008 | 50 | 201×5, 409 insufficient_funds×45 | PASS |
| lost-response-retry | 2 | 20263009 | 20 | 200×6, 201×14 | PASS |
| signup-race | 2 | 20263010 | 50 | 201×1, 409 email_taken×49 | PASS |
| mixed-garbage | 2 | 20263011 | 50 | 201×5, 400 missing_idempotency_key×13, 422 validation_failed×20, 401 unauthenticated×8, 404 not_found×3, 400 malformed_request×1 | PASS |
| same-key-storm | 3 | 20264001 | 50 | 200×49, 201×1 | PASS |
| same-key-different-bodies | 3 | 20264002 | 50 | 200×16, 201×1, 409 idempotency_key_reuse×33 | PASS |
| drain-race | 3 | 20264003 | 50 | 201×21, 409 insufficient_funds×29 | PASS |
| fan-in | 3 | 20264004 | 50 | 201×34, 409 insufficient_funds×16 | PASS |
| ring | 3 | 20264005 | 50 | 201×36, 409 insufficient_funds×14 | PASS |
| request-double-pay | 3 | 20264006 | 50 | 201×1, 409 request_not_pending×49 | PASS |
| pay-versus-cancel | 3 | 20264007 | 20 | 200×10, 409 request_not_pending×10 | PASS |
| settlement-under-drain | 3 | 20264008 | 50 | 201×4, 409 insufficient_funds×46 | PASS |
| lost-response-retry | 3 | 20264009 | 20 | 200×7, 201×13 | PASS |
| signup-race | 3 | 20264010 | 50 | 201×1, 409 email_taken×49 | PASS |
| mixed-garbage | 3 | 20264011 | 50 | 201×11, 422 self_payment×5, 401 unauthenticated×11, 422 validation_failed×11, 400 malformed_request×3, 400 missing_idempotency_key×9 | PASS |
| same-key-storm | 4 | 20265001 | 50 | 200×49, 201×1 | PASS |
| same-key-different-bodies | 4 | 20265002 | 50 | 200×19, 201×1, 409 idempotency_key_reuse×30 | PASS |
| drain-race | 4 | 20265003 | 50 | 201×16, 409 insufficient_funds×34 | PASS |
| fan-in | 4 | 20265004 | 50 | 201×33, 409 insufficient_funds×17 | PASS |
| ring | 4 | 20265005 | 50 | 201×27, 409 insufficient_funds×23 | PASS |
| request-double-pay | 4 | 20265006 | 50 | 201×1, 409 request_not_pending×49 | PASS |
| pay-versus-cancel | 4 | 20265007 | 20 | 200×10, 409 request_not_pending×10 | PASS |
| settlement-under-drain | 4 | 20265008 | 50 | 201×6, 409 insufficient_funds×44 | PASS |
| lost-response-retry | 4 | 20265009 | 20 | 200×8, 201×12 | PASS |
| signup-race | 4 | 20265010 | 50 | 201×1, 409 email_taken×49 | PASS |
| mixed-garbage | 4 | 20265011 | 50 | 201×12, 401 unauthenticated×12, 404 not_found×4, 422 self_payment×4, 422 validation_failed×13, 400 missing_idempotency_key×5 | PASS |

## Properties attacked

- **same-key-storm** — N concurrent identical requests under one unused key: exactly one 201, the rest 200 with the identical body, money moves once
- **same-key-different-bodies** — concurrent requests sharing a key but not a body: at most one takes effect, the rest are 409 reuse or identical replays
- **drain-race** — concurrent payments from one wallet whose sum exceeds it: accepted payments never overdraw, refusals move nothing
- **fan-in** — many senders paying one recipient at once: the recipient gains exactly what was accepted
- **ring** — payments around a cycle in both directions at once: no wallet goes negative, nothing is created or lost
- **request-double-pay** — one request paid concurrently under different keys: it moves money at most once
- **pay-versus-cancel** — payer pays while requester cancels: the request ends paid xor cancelled, and money matches the outcome
- **settlement-under-drain** — a settlement races ordinary payments draining its senders: all-or-nothing, never negative
- **lost-response-retry** — the client abandons a request mid-flight and retries with the same key and body: one effect in total
- **signup-race** — concurrent signups for one email: exactly one account is created, every other attempt is 409 email_taken
- **mixed-garbage** — a burst of valid, invalid, malformed and unauthenticated writes: no 5xx, no partial effects
