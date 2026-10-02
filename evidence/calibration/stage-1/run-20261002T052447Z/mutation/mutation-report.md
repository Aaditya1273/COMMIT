# Mutation campaign report

Generated from `mutation-report.json`; do not edit by hand.

| | |
|---|---|
| Target | `calibration/pocketful-stage-1` |
| Check | `calibration/verification/kill-suite.sh {url}` |
| Seed / selection | 1 / all |
| Discovered / executed | 483 / 483 |
| Killed | 398 |
| Survived | 18 |
| Timeout | 1 |
| Invalid (never started) | 8 |
| Error (check could not run) | 0 |
| Equivalent (excluded, justified) | 58 |
| **Kill rate** | **95.4%** |
| Detection rate (timeouts count) | 95.7% |

killRate = killed / (killed + survived + timeout); detectionRate counts timeouts as detected; invalid, error and equivalent are excluded from both and listed.

Replay one mutant: `node commit/mutate.ts --target calibration/pocketful-stage-1 --start 'node --no-warnings src/server.ts' --check 'calibration/verification/kill-suite.sh {url}' --only <id> --out <new dir>`

## Kills by verification layer

| Layer | Killed | Killed by this layer alone |
|---|---|---|
| adversarial | 145 | 1 |
| contract | 388 | 97 |
| reference | 235 | 1 |
| shipped | 282 | 3 |


## Survived — bad work the suite accepted (18)

| id | location | operator | change | note |
|---|---|---|---|---|
| `m-e401bdc792` | src/auth.ts:18 | guard-bypass | `scheme !== 'scrypt' \|\| !salt \|\| !hash` → `false` |  |
| `m-ca40dc899f` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-7d2ab8a2cd` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-87cabdc239` | src/auth.ts:18 | boolean-literal | `false` → `true` |  |
| `m-2fb5290ba7` | src/server.ts:15 | literal-boundary | `16` → `17` |  |
| `m-100bfdd083` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-a40abbdd2c` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-1d1dc8b79f` | src/server.ts:19 | literal-boundary | `0` → `1` |  |
| `m-79394663bb` | src/server.ts:21 | statement-deletion | `size += (chunk          ).length;` → `;` |  |
| `m-99313b349c` | src/server.ts:21 | compound-assignment | `+=` → `-=` |  |
| `m-31442439eb` | src/server.ts:22 | guard-bypass | `size > MAX_BODY` → `false` |  |
| `m-4bf166fe91` | src/server.ts:22 | boundary | `>` → `>=` |  |
| `m-241c4f82c5` | src/server.ts:139 | literal-boundary | `8080` → `8081` |  |
| `m-60ed46fe74` | src/store.ts:124 | boundary | `>` → `>=` |  |
| `m-d3e2e23aff` | src/store.ts:124 | literal-boundary | `64` → `65` |  |
| `m-315dc0ed58` | src/store.ts:126 | logical | `&&` → `\|\|` |  |
| `m-be1368e9fe` | src/store.ts:126 | logical | `&&` → `\|\|` |  |
| `m-8b09e83a2d` | src/store.ts:164 | literal-boundary | `0` → `1` |  |

## Timeout (1)

| id | location | operator | change | note |
|---|---|---|---|---|
| `m-2b76d77904` | src/validate.ts:42 | equality-negation | `===` → `!==` |  |

## Equivalent — excluded with justification (58)

| id | location | operator | change | note |
|---|---|---|---|---|
| `m-81e792af71` | src/auth.ts:11 | literal-boundary | `16` → `17` | Password salt length (16 -> 17 bytes). Internal to the hash; every password still verifies identically. |
| `m-9dcc24e876` | src/auth.ts:12 | literal-boundary | `32` → `33` | Hash output length for new passwords (32 -> 33 bytes). Verification reads the stored length, so nothing observable changes. |
| `m-4786e592e9` | src/auth.ts:30 | literal-boundary | `32` → `33` | Bearer-token length (32 -> 33 random bytes). Tokens are opaque (§6); their length is unspecified. |
| `m-24e47c41a2` | src/auth.ts:56 | statement-deletion | `taken();` → `;` | Deletes the fast-path duplicate check before hashing. The re-check after hashing makes the same decision in the same synchronous step; only CPU time differs. |
| `m-6dee67c77a` | src/auth.ts:72 | guard-bypass | `store() !== before` → `false` | Only differs for a login still in flight when a reset or import replaces the state. §3.3 constrains requests made after reset returns, not ones that straddle it. |
| `m-408f7a5cc4` | src/server.ts:119 | guard-bypass | `body === undefined` → `false` | A 204 response would also carry a Content-Type header. The status and the empty body - all the spec defines for 204 - are unchanged. |
| `m-d9b248c30a` | src/server.ts:134 | statement-deletion | `console.error(JSON.stringify({ level: 'error', method: req.method, url: req.url, error: String((error         )?.stack ?? error) }));` → `;` | Deletes an error log line. Logging is not part of the HTTP contract. |
| `m-f136da5d1a` | src/server.ts:135 | statement-deletion | `send(res, { status: 500, body: { error: { code: 'internal_error', message: 'unexpected server error' } } });` → `;` | Internal-error fallback. No input reaches it in the unmutated program: every campaign's no-5xx checks pass, so changing what it sends is unobservable. |
| `m-9d3f94fab3` | src/server.ts:135 | literal-boundary | `500` → `501` | Internal-error fallback status (500 -> 501). Unreachable for the same reason as m-f136da5d1a. |
| `m-68fb6e663c` | src/store.ts:99 | guard-bypass | `!user` → `false` | Dangling-reference guard in Store.user(). Unreachable: every user reference is validated when it is created, reset or imported. |
| `m-7cf668cc4b` | src/store.ts:106 | literal-boundary | `2` → `3` | minor_units of the empty state that exists before the first reset. It holds no users, so no authenticated read can observe it. |
| `m-5fdf66429f` | src/store.ts:136 | statement-deletion | `check(Array.isArray(value), `${field} must be an array`);` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-c73cfc471b` | src/store.ts:150 | statement-deletion | `check(isObj(fixture), 'fixture must be an object');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-450818be8b` | src/store.ts:151 | statement-deletion | `check(isStr(fixture.currency) && fixture.currency.length > 0, 'currency is required');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-25c117d050` | src/store.ts:151 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-422f4e8d4c` | src/store.ts:151 | boundary | `>` → `>=` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-bcff6d90b9` | src/store.ts:151 | literal-boundary | `0` → `1` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-a9d3160bfa` | src/store.ts:152 | statement-deletion | `check(MINOR_UNITS.includes(fixture.minor_units          ), 'minor_units must be 0, 2 or 3');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-9725945bac` | src/store.ts:160 | statement-deletion | `check(isObj(raw), 'each user must be an object');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-4c410f314e` | src/store.ts:162 | statement-deletion | `check(isId(id) && !ids.has(id), 'user ids must be unique strings');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-b910a8163b` | src/store.ts:162 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-5e0babfbb4` | src/store.ts:163 | statement-deletion | `check(isStr(email) && /^[^@\s]+@[^@\s]+$/.test(email) && !emails.has(email.toLowerCase()), 'user emails must be valid and unique');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-011c891928` | src/store.ts:163 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-bf25c0ee37` | src/store.ts:163 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-87f861267d` | src/store.ts:164 | statement-deletion | `check(isStr(password) && password.length > 0, 'user password is required');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-6cd1a991af` | src/store.ts:164 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-5839279e87` | src/store.ts:164 | boundary | `>` → `>=` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-1407cb78ee` | src/store.ts:165 | statement-deletion | `check(isStr(displayName), 'user display_name must be a string');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-169095f16a` | src/store.ts:166 | statement-deletion | `check(isStr(handle) && HANDLE.test(handle) && !handles.has(handle), 'user handles must be valid and unique');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-a3cd0fcf7c` | src/store.ts:166 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-ff9cc6ff29` | src/store.ts:166 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-50f043fe6e` | src/store.ts:169 | statement-deletion | `emails.add(email.toLowerCase());` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-54a0ef71ab` | src/store.ts:170 | statement-deletion | `handles.add(handle);` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-b7a344fc94` | src/store.ts:175 | statement-deletion | `check(isObj(raw), 'each payment must be an object');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-b68f3866e4` | src/store.ts:177 | statement-deletion | `check(isId(id) && !data.payments.some((p) => p.id === id), 'payment ids must be unique strings');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-003875a895` | src/store.ts:177 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-8ad87ca1fe` | src/store.ts:178 | statement-deletion | `check(isStr(from) && ids.has(from) && isStr(to) && ids.has(to) && from !== to, 'payment parties must be two seeded users');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-78b6badc88` | src/store.ts:178 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-2d9b599175` | src/store.ts:178 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-f08b16ca21` | src/store.ts:178 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-fb57379d29` | src/store.ts:178 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-26078f6869` | src/store.ts:179 | statement-deletion | `check(isAmount(amount), 'payment amount is out of range');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-afc5f6b827` | src/store.ts:180 | statement-deletion | `check(isStr(note) && isVisibility(visibility), 'payment note or visibility is invalid');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-d2d865c20d` | src/store.ts:180 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-8fb4772d63` | src/store.ts:185 | statement-deletion | `check(isObj(raw), 'each request must be an object');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-836e6c679f` | src/store.ts:187 | statement-deletion | `check(isId(id) && !data.requests.some((r) => r.id === id), 'request ids must be unique strings');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-a6a3ef2c31` | src/store.ts:187 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-d37fd40a97` | src/store.ts:188 | statement-deletion | `check(isStr(requester) && ids.has(requester) && isStr(payer) && ids.has(payer) && requester !== payer, 'request parties must be two seeded users');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-a2360c25bd` | src/store.ts:188 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-0aa4ce2475` | src/store.ts:188 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-24c7ff668c` | src/store.ts:188 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-d4035b70c3` | src/store.ts:188 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-6acddf978a` | src/store.ts:189 | statement-deletion | `check(isAmount(amount), 'request amount is out of range');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-712a4c4b10` | src/store.ts:190 | statement-deletion | `check(isStr(note) && REQUEST_STATUSES.includes(status                 ), 'request note or status is invalid');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-9983ac63e9` | src/store.ts:190 | logical | `&&` → `\|\|` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-ac57d78f00` | src/store.ts:191 | statement-deletion | `check(paymentId === null \|\| isStr(paymentId), 'request payment_id must be a string or null');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-d9a9565737` | src/store.ts:196 | statement-deletion | `check(operators.every(isStr), 'settlement_operator_ids must be strings');` → `;` | Only changes the reply to an inconsistent reset fixture. Stage-1 spec §4 states seeded data is consistent; its one stated fixture error, a negative balance, has its own check, which is killed. |
| `m-1a5f6971b5` | src/wallet.ts:117 | equality-negation | `===` → `!==` | Changes only the wording of a 403 message ("payer"/"requester"). §5: the message may use any wording. |
