# Mutation campaign report

| | |
|---|---|
| Target | `calibration/pocketful-stage-1` |
| Check | `calibration/verification/kill-suite.sh {url}` |
| Seed | 1 |
| Discovered / executed | 475 / 475 |
| Killed | 372 |
| Survived | 94 |
| Timeout | 1 |
| Invalid (never started) | 8 |
| Error (check could not run) | 0 |
| Equivalent (excluded, justified) | 0 |
| **Kill rate** | **79.7%** |
| Detection rate (timeouts count) | 79.9% |

killRate = killed / (killed + survived + timeout); detectionRate counts timeouts as detected; invalid, error and equivalent are excluded from both and listed.

## Kills by verification layer

| Layer | Killed | Killed by this layer alone |
|---|---|---|
| adversarial | 145 | 1 |
| contract | 352 | 72 |
| reference | 235 | 1 |
| shipped | 281 | 12 |


## Survived — bad work the suite accepted (94)

| id | location | operator | change | note |
|---|---|---|---|---|
| `m-81e792af71` | src/auth.ts:11 | literal-boundary | `16` → `17` |  |
| `m-9dcc24e876` | src/auth.ts:12 | literal-boundary | `32` → `33` |  |
| `m-e401bdc792` | src/auth.ts:18 | guard-bypass | `scheme !== 'scrypt' \|\| !salt \|\| !hash` → `false` |  |
| `m-ca40dc899f` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-7d2ab8a2cd` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-87cabdc239` | src/auth.ts:18 | boolean-literal | `false` → `true` |  |
| `m-4786e592e9` | src/auth.ts:30 | literal-boundary | `32` → `33` |  |
| `m-24e47c41a2` | src/auth.ts:56 | statement-deletion | `taken();` → `;` |  |
| `m-6dee67c77a` | src/auth.ts:72 | guard-bypass | `store() !== before` → `false` |  |
| `m-2fb5290ba7` | src/server.ts:15 | literal-boundary | `16` → `17` |  |
| `m-100bfdd083` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-a40abbdd2c` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-1d1dc8b79f` | src/server.ts:19 | literal-boundary | `0` → `1` |  |
| `m-79394663bb` | src/server.ts:21 | statement-deletion | `size += (chunk          ).length;` → `;` |  |
| `m-99313b349c` | src/server.ts:21 | compound-assignment | `+=` → `-=` |  |
| `m-31442439eb` | src/server.ts:22 | guard-bypass | `size > MAX_BODY` → `false` |  |
| `m-4bf166fe91` | src/server.ts:22 | boundary | `>` → `>=` |  |
| `m-408f7a5cc4` | src/server.ts:119 | guard-bypass | `body === undefined` → `false` |  |
| `m-d9b248c30a` | src/server.ts:134 | statement-deletion | `console.error(JSON.stringify({ level: 'error', method: req.method, url: req.url, error: String((error         )?.stack ?? error) }));` → `;` |  |
| `m-f136da5d1a` | src/server.ts:135 | statement-deletion | `send(res, { status: 500, body: { error: { code: 'internal_error', message: 'unexpected server error' } } });` → `;` |  |
| `m-9d3f94fab3` | src/server.ts:135 | literal-boundary | `500` → `501` |  |
| `m-241c4f82c5` | src/server.ts:139 | literal-boundary | `8080` → `8081` |  |
| `m-68fb6e663c` | src/store.ts:99 | guard-bypass | `!user` → `false` |  |
| `m-7cf668cc4b` | src/store.ts:106 | literal-boundary | `2` → `3` |  |
| `m-60ed46fe74` | src/store.ts:124 | boundary | `>` → `>=` |  |
| `m-d8516445ec` | src/store.ts:124 | literal-boundary | `0` → `1` |  |
| `m-652f4e8881` | src/store.ts:124 | boundary | `<=` → `<` |  |
| `m-d3e2e23aff` | src/store.ts:124 | literal-boundary | `64` → `65` |  |
| `m-315dc0ed58` | src/store.ts:126 | logical | `&&` → `\|\|` |  |
| `m-5eb5da090d` | src/store.ts:126 | boundary | `>=` → `>` |  |
| `m-cc00d6e378` | src/store.ts:126 | literal-boundary | `1` → `2` |  |
| `m-be1368e9fe` | src/store.ts:126 | logical | `&&` → `\|\|` |  |
| `m-b16687b3b4` | src/store.ts:126 | boundary | `<=` → `<` |  |
| `m-5fdf66429f` | src/store.ts:136 | statement-deletion | `check(Array.isArray(value), `${field} must be an array`);` → `;` |  |
| `m-c73cfc471b` | src/store.ts:150 | statement-deletion | `check(isObj(fixture), 'fixture must be an object');` → `;` |  |
| `m-450818be8b` | src/store.ts:151 | statement-deletion | `check(isStr(fixture.currency) && fixture.currency.length > 0, 'currency is required');` → `;` |  |
| `m-25c117d050` | src/store.ts:151 | logical | `&&` → `\|\|` |  |
| `m-422f4e8d4c` | src/store.ts:151 | boundary | `>` → `>=` |  |
| `m-bcff6d90b9` | src/store.ts:151 | literal-boundary | `0` → `1` |  |
| `m-a9d3160bfa` | src/store.ts:152 | statement-deletion | `check(MINOR_UNITS.includes(fixture.minor_units          ), 'minor_units must be 0, 2 or 3');` → `;` |  |
| `m-9725945bac` | src/store.ts:160 | statement-deletion | `check(isObj(raw), 'each user must be an object');` → `;` |  |
| `m-4c410f314e` | src/store.ts:162 | statement-deletion | `check(isId(id) && !ids.has(id), 'user ids must be unique strings');` → `;` |  |
| `m-b910a8163b` | src/store.ts:162 | logical | `&&` → `\|\|` |  |
| `m-5e0babfbb4` | src/store.ts:163 | statement-deletion | `check(isStr(email) && /^[^@\s]+@[^@\s]+$/.test(email) && !emails.has(email.toLowerCase()), 'user emails must be valid and unique');` → `;` |  |
| `m-011c891928` | src/store.ts:163 | logical | `&&` → `\|\|` |  |
| `m-bf25c0ee37` | src/store.ts:163 | logical | `&&` → `\|\|` |  |
| `m-87f861267d` | src/store.ts:164 | statement-deletion | `check(isStr(password) && password.length > 0, 'user password is required');` → `;` |  |
| `m-6cd1a991af` | src/store.ts:164 | logical | `&&` → `\|\|` |  |
| `m-5839279e87` | src/store.ts:164 | boundary | `>` → `>=` |  |
| `m-8b09e83a2d` | src/store.ts:164 | literal-boundary | `0` → `1` |  |
| `m-1407cb78ee` | src/store.ts:165 | statement-deletion | `check(isStr(displayName), 'user display_name must be a string');` → `;` |  |
| `m-169095f16a` | src/store.ts:166 | statement-deletion | `check(isStr(handle) && HANDLE.test(handle) && !handles.has(handle), 'user handles must be valid and unique');` → `;` |  |
| `m-a3cd0fcf7c` | src/store.ts:166 | logical | `&&` → `\|\|` |  |
| `m-ff9cc6ff29` | src/store.ts:166 | logical | `&&` → `\|\|` |  |
| `m-50f043fe6e` | src/store.ts:169 | statement-deletion | `emails.add(email.toLowerCase());` → `;` |  |
| `m-54a0ef71ab` | src/store.ts:170 | statement-deletion | `handles.add(handle);` → `;` |  |
| `m-b7a344fc94` | src/store.ts:175 | statement-deletion | `check(isObj(raw), 'each payment must be an object');` → `;` |  |
| `m-b68f3866e4` | src/store.ts:177 | statement-deletion | `check(isId(id) && !data.payments.some((p) => p.id === id), 'payment ids must be unique strings');` → `;` |  |
| `m-003875a895` | src/store.ts:177 | logical | `&&` → `\|\|` |  |
| `m-4f2df9cb2f` | src/store.ts:177 | equality-negation | `===` → `!==` |  |
| `m-8ad87ca1fe` | src/store.ts:178 | statement-deletion | `check(isStr(from) && ids.has(from) && isStr(to) && ids.has(to) && from !== to, 'payment parties must be two seeded users');` → `;` |  |
| `m-78b6badc88` | src/store.ts:178 | logical | `&&` → `\|\|` |  |
| `m-2d9b599175` | src/store.ts:178 | logical | `&&` → `\|\|` |  |
| `m-f08b16ca21` | src/store.ts:178 | logical | `&&` → `\|\|` |  |
| `m-fb57379d29` | src/store.ts:178 | logical | `&&` → `\|\|` |  |
| `m-26078f6869` | src/store.ts:179 | statement-deletion | `check(isAmount(amount), 'payment amount is out of range');` → `;` |  |
| `m-afc5f6b827` | src/store.ts:180 | statement-deletion | `check(isStr(note) && isVisibility(visibility), 'payment note or visibility is invalid');` → `;` |  |
| `m-d2d865c20d` | src/store.ts:180 | logical | `&&` → `\|\|` |  |
| `m-8fb4772d63` | src/store.ts:185 | statement-deletion | `check(isObj(raw), 'each request must be an object');` → `;` |  |
| `m-836e6c679f` | src/store.ts:187 | statement-deletion | `check(isId(id) && !data.requests.some((r) => r.id === id), 'request ids must be unique strings');` → `;` |  |
| `m-a6a3ef2c31` | src/store.ts:187 | logical | `&&` → `\|\|` |  |
| `m-14d271b045` | src/store.ts:187 | equality-negation | `===` → `!==` |  |
| `m-d37fd40a97` | src/store.ts:188 | statement-deletion | `check(isStr(requester) && ids.has(requester) && isStr(payer) && ids.has(payer) && requester !== payer, 'request parties must be two seeded users');` → `;` |  |
| `m-a2360c25bd` | src/store.ts:188 | logical | `&&` → `\|\|` |  |
| `m-0aa4ce2475` | src/store.ts:188 | logical | `&&` → `\|\|` |  |
| `m-24c7ff668c` | src/store.ts:188 | logical | `&&` → `\|\|` |  |
| `m-d4035b70c3` | src/store.ts:188 | logical | `&&` → `\|\|` |  |
| `m-6acddf978a` | src/store.ts:189 | statement-deletion | `check(isAmount(amount), 'request amount is out of range');` → `;` |  |
| `m-712a4c4b10` | src/store.ts:190 | statement-deletion | `check(isStr(note) && REQUEST_STATUSES.includes(status                 ), 'request note or status is invalid');` → `;` |  |
| `m-9983ac63e9` | src/store.ts:190 | logical | `&&` → `\|\|` |  |
| `m-ac57d78f00` | src/store.ts:191 | statement-deletion | `check(paymentId === null \|\| isStr(paymentId), 'request payment_id must be a string or null');` → `;` |  |
| `m-d9a9565737` | src/store.ts:196 | statement-deletion | `check(operators.every(isStr), 'settlement_operator_ids must be strings');` → `;` |  |
| `m-3d711b8e79` | src/store.ts:217 | statement-deletion | `check(!userIds.has(u.id) && !handles.has(u.handle), 'state users are duplicated');` → `;` |  |
| `m-2d26c6a1a3` | src/store.ts:217 | logical | `&&` → `\|\|` |  |
| `m-7004541f7b` | src/store.ts:219 | statement-deletion | `handles.add(u.handle);` → `;` |  |
| `m-b761d7d3aa` | src/store.ts:231 | logical | `&&` → `\|\|` |  |
| `m-6c80ce6640` | src/validate.ts:57 | guard-bypass | `Array.isArray(value)` → `false` |  |
| `m-1a5f6971b5` | src/wallet.ts:117 | equality-negation | `===` → `!==` |  |
| `m-564378c114` | src/wallet.ts:147 | guard-bypass | `handles === undefined` → `false` |  |
| `m-14d027cf70` | src/wallet.ts:148 | guard-bypass | `!Array.isArray(handles) \|\| !handles.every((h) => typeof h === 'string')` → `false` |  |
| `m-1e0b1aa083` | src/wallet.ts:148 | logical | `\|\|` → `&&` |  |
| `m-1b183791f8` | src/wallet.ts:188 | guard-bypass | `typeof t !== 'object' \|\| t === null \|\| Array.isArray(t)` → `false` |  |
| `m-cebe3ff27e` | src/wallet.ts:188 | logical | `\|\|` → `&&` |  |
| `m-68429b47bd` | src/wallet.ts:188 | logical | `\|\|` → `&&` |  |
