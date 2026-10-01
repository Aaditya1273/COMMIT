# Mutation campaign report

| | |
|---|---|
| Target | `calibration/pocketful-stage-1` |
| Check | `calibration/verification/kill-suite.sh {url}` |
| Seed | 1 |
| Discovered / executed | 477 / 477 |
| Killed | 300 |
| Survived | 168 |
| Timeout | 1 |
| Invalid (never started) | 8 |
| Error (check could not run) | 0 |
| Equivalent (excluded, justified) | 0 |
| **Kill rate** | **64.0%** |
| Detection rate (timeouts count) | 64.2% |

killRate = killed / (killed + survived + timeout); detectionRate counts timeouts as detected; invalid, error and equivalent are excluded from both and listed.

## Kills by verification layer

| Layer | Killed | Killed by this layer alone |
|---|---|---|
| adversarial | 139 | 1 |
| reference | 236 | 16 |
| shipped | 282 | 61 |


## Survived — bad work the suite accepted (168)

| id | location | operator | change | note |
|---|---|---|---|---|
| `m-81e792af71` | src/auth.ts:11 | literal-boundary | `16` → `17` |  |
| `m-9dcc24e876` | src/auth.ts:12 | literal-boundary | `32` → `33` |  |
| `m-e401bdc792` | src/auth.ts:18 | guard-bypass | `scheme !== 'scrypt' \|\| !salt \|\| !hash` → `false` |  |
| `m-ca40dc899f` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-7d2ab8a2cd` | src/auth.ts:18 | logical | `\|\|` → `&&` |  |
| `m-87cabdc239` | src/auth.ts:18 | boolean-literal | `false` → `true` |  |
| `m-4786e592e9` | src/auth.ts:30 | literal-boundary | `32` → `33` |  |
| `m-ee2d83f80f` | src/auth.ts:49 | guard-bypass | `!/^[^@\s]+@[^@\s]+$/.test(email)` → `false` |  |
| `m-02dc4f6231` | src/auth.ts:50 | guard-bypass | `password.length < 8` → `false` |  |
| `m-dce8dcea91` | src/auth.ts:50 | boundary | `<` → `<=` |  |
| `m-abd2998b1a` | src/auth.ts:50 | literal-boundary | `8` → `9` |  |
| `m-24e47c41a2` | src/auth.ts:56 | statement-deletion | `taken();` → `;` |  |
| `m-e426553237` | src/auth.ts:59 | statement-deletion | `taken();` → `;` |  |
| `m-6dee67c77a` | src/auth.ts:72 | guard-bypass | `store() !== before` → `false` |  |
| `m-2fb5290ba7` | src/server.ts:15 | literal-boundary | `16` → `17` |  |
| `m-100bfdd083` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-a40abbdd2c` | src/server.ts:15 | literal-boundary | `1024` → `1025` |  |
| `m-1d1dc8b79f` | src/server.ts:19 | literal-boundary | `0` → `1` |  |
| `m-79394663bb` | src/server.ts:21 | statement-deletion | `size += (chunk          ).length;` → `;` |  |
| `m-99313b349c` | src/server.ts:21 | compound-assignment | `+=` → `-=` |  |
| `m-31442439eb` | src/server.ts:22 | guard-bypass | `size > MAX_BODY` → `false` |  |
| `m-4bf166fe91` | src/server.ts:22 | boundary | `>` → `>=` |  |
| `m-1f4d087ff0` | src/server.ts:33 | guard-bypass | `typeof parsed !== 'object' \|\| parsed === null \|\| Array.isArray(parsed)` → `false` |  |
| `m-a173ee9fde` | src/server.ts:33 | logical | `\|\|` → `&&` |  |
| `m-10d48f9daf` | src/server.ts:33 | logical | `\|\|` → `&&` |  |
| `m-150d17d883` | src/server.ts:45 | boundary | `>` → `>=` |  |
| `m-6f16ac2118` | src/server.ts:45 | literal-boundary | `255` → `256` |  |
| `m-24643440d2` | src/server.ts:67 | guard-bypass | `body.track !== 'pocketful' \|\| body.format_version !== 1` → `false` |  |
| `m-8986b4c79c` | src/server.ts:67 | logical | `\|\|` → `&&` |  |
| `m-89a0528882` | src/server.ts:88 | logical | `&&` → `\|\|` |  |
| `m-bd90c83cd1` | src/server.ts:89 | logical | `&&` → `\|\|` |  |
| `m-8bbf99cafc` | src/server.ts:90 | logical | `&&` → `\|\|` |  |
| `m-90ebe5dcfa` | src/server.ts:90 | logical | `&&` → `\|\|` |  |
| `m-9b41bb707b` | src/server.ts:90 | logical | `&&` → `\|\|` |  |
| `m-f0b3ddaca4` | src/server.ts:91 | guard-bypass | `!known` → `false` |  |
| `m-408f7a5cc4` | src/server.ts:119 | guard-bypass | `body === undefined` → `false` |  |
| `m-d9b248c30a` | src/server.ts:134 | statement-deletion | `console.error(JSON.stringify({ level: 'error', method: req.method, url: req.url, error: String((error         )?.stack ?? error) }));` → `;` |  |
| `m-f136da5d1a` | src/server.ts:135 | statement-deletion | `send(res, { status: 500, body: { error: { code: 'internal_error', message: 'unexpected server error' } } });` → `;` |  |
| `m-9d3f94fab3` | src/server.ts:135 | literal-boundary | `500` → `501` |  |
| `m-241c4f82c5` | src/server.ts:139 | literal-boundary | `8080` → `8081` |  |
| `m-a9c2d612a7` | src/store.ts:86 | statement-deletion | `this.data.users.push(user);` → `;` |  |
| `m-4286f6f846` | src/store.ts:92 | statement-deletion | `this.paymentsById.set(payment.id, payment);` → `;` |  |
| `m-70614d9f68` | src/store.ts:102 | guard-bypass | `!user` → `false` |  |
| `m-ac22788885` | src/store.ts:109 | literal-boundary | `2` → `3` |  |
| `m-59f0ede7d3` | src/store.ts:125 | logical | `&&` → `\|\|` |  |
| `m-221baf5583` | src/store.ts:125 | logical | `&&` → `\|\|` |  |
| `m-644d23be9b` | src/store.ts:127 | logical | `&&` → `\|\|` |  |
| `m-02bf6df196` | src/store.ts:127 | boundary | `>` → `>=` |  |
| `m-4ce4dfeb6d` | src/store.ts:127 | literal-boundary | `0` → `1` |  |
| `m-a93ac6b65d` | src/store.ts:127 | logical | `&&` → `\|\|` |  |
| `m-1de3e85ff8` | src/store.ts:127 | boundary | `<=` → `<` |  |
| `m-10ca1db7ce` | src/store.ts:127 | literal-boundary | `64` → `65` |  |
| `m-13d6482d46` | src/store.ts:129 | logical | `&&` → `\|\|` |  |
| `m-4a9861dde8` | src/store.ts:129 | boundary | `>=` → `>` |  |
| `m-5257ac100a` | src/store.ts:129 | literal-boundary | `1` → `2` |  |
| `m-5c0c391913` | src/store.ts:129 | logical | `&&` → `\|\|` |  |
| `m-e0953b830b` | src/store.ts:129 | boundary | `<=` → `<` |  |
| `m-ec08ad71d2` | src/store.ts:139 | statement-deletion | `check(Array.isArray(value), `${field} must be an array`);` → `;` |  |
| `m-e869dceb51` | src/store.ts:153 | statement-deletion | `check(isObj(fixture), 'fixture must be an object');` → `;` |  |
| `m-09855906fc` | src/store.ts:154 | statement-deletion | `check(isStr(fixture.currency) && fixture.currency.length > 0, 'currency is required');` → `;` |  |
| `m-621ce5effa` | src/store.ts:154 | logical | `&&` → `\|\|` |  |
| `m-6911ae2b20` | src/store.ts:154 | boundary | `>` → `>=` |  |
| `m-5bb081aadd` | src/store.ts:154 | literal-boundary | `0` → `1` |  |
| `m-5dc4b6f168` | src/store.ts:155 | statement-deletion | `check(MINOR_UNITS.includes(fixture.minor_units          ), 'minor_units must be 0, 2 or 3');` → `;` |  |
| `m-5af4064d4c` | src/store.ts:163 | statement-deletion | `check(isObj(raw), 'each user must be an object');` → `;` |  |
| `m-4d220d8399` | src/store.ts:165 | statement-deletion | `check(isId(id) && !ids.has(id), 'user ids must be unique strings');` → `;` |  |
| `m-67288a8c81` | src/store.ts:165 | logical | `&&` → `\|\|` |  |
| `m-0fe0f1eda8` | src/store.ts:166 | statement-deletion | `check(isStr(email) && /^[^@\s]+@[^@\s]+$/.test(email) && !emails.has(email.toLowerCase()), 'user emails must be valid and unique');` → `;` |  |
| `m-0871606717` | src/store.ts:166 | logical | `&&` → `\|\|` |  |
| `m-41f8be4974` | src/store.ts:166 | logical | `&&` → `\|\|` |  |
| `m-c94f668766` | src/store.ts:167 | statement-deletion | `check(isStr(password) && password.length > 0, 'user password is required');` → `;` |  |
| `m-ca4ef18f8f` | src/store.ts:167 | logical | `&&` → `\|\|` |  |
| `m-166205683b` | src/store.ts:167 | boundary | `>` → `>=` |  |
| `m-9c5046e47e` | src/store.ts:167 | literal-boundary | `0` → `1` |  |
| `m-616b96280e` | src/store.ts:168 | statement-deletion | `check(isStr(displayName), 'user display_name must be a string');` → `;` |  |
| `m-348c46120e` | src/store.ts:169 | statement-deletion | `check(isStr(handle) && HANDLE.test(handle) && !handles.has(handle), 'user handles must be valid and unique');` → `;` |  |
| `m-482561762d` | src/store.ts:169 | logical | `&&` → `\|\|` |  |
| `m-8450a08c4d` | src/store.ts:169 | logical | `&&` → `\|\|` |  |
| `m-e1b4671010` | src/store.ts:172 | statement-deletion | `emails.add(email.toLowerCase());` → `;` |  |
| `m-c43238d1b8` | src/store.ts:173 | statement-deletion | `handles.add(handle);` → `;` |  |
| `m-139d2ca5f3` | src/store.ts:178 | statement-deletion | `check(isObj(raw), 'each payment must be an object');` → `;` |  |
| `m-7567539f64` | src/store.ts:180 | statement-deletion | `check(isId(id) && !data.payments.some((p) => p.id === id), 'payment ids must be unique strings');` → `;` |  |
| `m-acaf928b44` | src/store.ts:180 | logical | `&&` → `\|\|` |  |
| `m-038275041d` | src/store.ts:180 | equality-negation | `===` → `!==` |  |
| `m-b743532392` | src/store.ts:181 | statement-deletion | `check(isStr(from) && ids.has(from) && isStr(to) && ids.has(to) && from !== to, 'payment parties must be two seeded users');` → `;` |  |
| `m-53b7c91439` | src/store.ts:181 | logical | `&&` → `\|\|` |  |
| `m-24b7ca1290` | src/store.ts:181 | logical | `&&` → `\|\|` |  |
| `m-e8096609a6` | src/store.ts:181 | logical | `&&` → `\|\|` |  |
| `m-55ac5a00cf` | src/store.ts:181 | logical | `&&` → `\|\|` |  |
| `m-a4007b9e20` | src/store.ts:182 | statement-deletion | `check(isAmount(amount), 'payment amount is out of range');` → `;` |  |
| `m-23493c034f` | src/store.ts:183 | statement-deletion | `check(isStr(note) && isVisibility(visibility), 'payment note or visibility is invalid');` → `;` |  |
| `m-438fdcdfa9` | src/store.ts:183 | logical | `&&` → `\|\|` |  |
| `m-cfd4b2d65f` | src/store.ts:188 | statement-deletion | `check(isObj(raw), 'each request must be an object');` → `;` |  |
| `m-f7e800ad9f` | src/store.ts:190 | statement-deletion | `check(isId(id) && !data.requests.some((r) => r.id === id), 'request ids must be unique strings');` → `;` |  |
| `m-b206906507` | src/store.ts:190 | logical | `&&` → `\|\|` |  |
| `m-02bee0d605` | src/store.ts:190 | equality-negation | `===` → `!==` |  |
| `m-2a6774fef5` | src/store.ts:191 | statement-deletion | `check(isStr(requester) && ids.has(requester) && isStr(payer) && ids.has(payer) && requester !== payer, 'request parties must be two seeded users');` → `;` |  |
| `m-5c728a9076` | src/store.ts:191 | logical | `&&` → `\|\|` |  |
| `m-42f17d885c` | src/store.ts:191 | logical | `&&` → `\|\|` |  |
| `m-0dc49bff48` | src/store.ts:191 | logical | `&&` → `\|\|` |  |
| `m-ec8d50f11c` | src/store.ts:191 | logical | `&&` → `\|\|` |  |
| `m-bce42e2ebb` | src/store.ts:192 | statement-deletion | `check(isAmount(amount), 'request amount is out of range');` → `;` |  |
| `m-9d339c17ea` | src/store.ts:193 | statement-deletion | `check(isStr(note) && REQUEST_STATUSES.includes(status                 ), 'request note or status is invalid');` → `;` |  |
| `m-fc180345ea` | src/store.ts:193 | logical | `&&` → `\|\|` |  |
| `m-e1588d2350` | src/store.ts:194 | statement-deletion | `check(paymentId === null \|\| isStr(paymentId), 'request payment_id must be a string or null');` → `;` |  |
| `m-68f08e0313` | src/store.ts:199 | statement-deletion | `check(operators.every(isStr), 'settlement_operator_ids must be strings');` → `;` |  |
| `m-6fa39d5489` | src/store.ts:210 | statement-deletion | `check(isObj(state), 'state must be an object');` → `;` |  |
| `m-dc8dd8e81c` | src/store.ts:212 | statement-deletion | `check(isStr(currency) && MINOR_UNITS.includes(minorUnits          ), 'state currency is invalid');` → `;` |  |
| `m-88668f19ee` | src/store.ts:212 | logical | `&&` → `\|\|` |  |
| `m-ce8e0f47ec` | src/store.ts:213 | statement-deletion | `check(Array.isArray(users) && Array.isArray(payments) && Array.isArray(requests), 'state lists are missing');` → `;` |  |
| `m-7f4fb063a9` | src/store.ts:213 | logical | `&&` → `\|\|` |  |
| `m-9478f53369` | src/store.ts:213 | logical | `&&` → `\|\|` |  |
| `m-b8dad80f96` | src/store.ts:214 | statement-deletion | `check(isObj(tokens) && isObj(idempotency) && Array.isArray(operatorIds), 'state maps are missing');` → `;` |  |
| `m-c52a037af7` | src/store.ts:214 | logical | `&&` → `\|\|` |  |
| `m-34656ecf8a` | src/store.ts:214 | logical | `&&` → `\|\|` |  |
| `m-3e414d43b0` | src/store.ts:218 | logical | `&&` → `\|\|` |  |
| `m-3f6ad607e6` | src/store.ts:218 | logical | `&&` → `\|\|` |  |
| `m-4bd294f1a3` | src/store.ts:218 | logical | `&&` → `\|\|` |  |
| `m-232843ac42` | src/store.ts:218 | logical | `&&` → `\|\|` |  |
| `m-aaa62fed76` | src/store.ts:219 | logical | `&&` → `\|\|` |  |
| `m-ea36bbf777` | src/store.ts:219 | logical | `&&` → `\|\|` |  |
| `m-f6c0335501` | src/store.ts:219 | logical | `&&` → `\|\|` |  |
| `m-2f325a82d7` | src/store.ts:220 | statement-deletion | `check(!userIds.has(u.id) && !handles.has(u.handle), 'state users are duplicated');` → `;` |  |
| `m-efee28c9a9` | src/store.ts:220 | logical | `&&` → `\|\|` |  |
| `m-ff5170d03d` | src/store.ts:222 | statement-deletion | `handles.add(u.handle);` → `;` |  |
| `m-b52fdabc13` | src/store.ts:225 | logical | `&&` → `\|\|` |  |
| `m-6c296ef265` | src/store.ts:225 | logical | `&&` → `\|\|` |  |
| `m-219e776a89` | src/store.ts:225 | logical | `&&` → `\|\|` |  |
| `m-a892e8035c` | src/store.ts:226 | logical | `&&` → `\|\|` |  |
| `m-b7051d29ea` | src/store.ts:226 | logical | `&&` → `\|\|` |  |
| `m-9a7e148e8f` | src/store.ts:226 | logical | `&&` → `\|\|` |  |
| `m-d537b5a94c` | src/store.ts:226 | logical | `&&` → `\|\|` |  |
| `m-d42a9b08b3` | src/store.ts:229 | logical | `&&` → `\|\|` |  |
| `m-2cc579abe5` | src/store.ts:229 | logical | `&&` → `\|\|` |  |
| `m-4421b8df5b` | src/store.ts:229 | logical | `&&` → `\|\|` |  |
| `m-f6ab5eabba` | src/store.ts:230 | logical | `&&` → `\|\|` |  |
| `m-d168d65d4b` | src/store.ts:230 | logical | `&&` → `\|\|` |  |
| `m-0b2f58930f` | src/store.ts:230 | logical | `&&` → `\|\|` |  |
| `m-6245892e08` | src/store.ts:231 | logical | `&&` → `\|\|` |  |
| `m-ae93db0c6f` | src/store.ts:233 | statement-deletion | `check(Object.values(tokens).every((id) => userIds.has(id          )), 'state token names an unknown user');` → `;` |  |
| `m-93962d2f9d` | src/store.ts:234 | statement-deletion | `check(Object.values(idempotency).every((rec) => isObj(rec) && isStr(rec.fingerprint) && 'body' in rec), 'state idempotency record is invalid');` → `;` |  |
| `m-da5fc406d3` | src/store.ts:234 | logical | `&&` → `\|\|` |  |
| `m-3a65963ac8` | src/store.ts:234 | logical | `&&` → `\|\|` |  |
| `m-c29a15adf8` | src/validate.ts:36 | guard-bypass | `typeof value !== 'string'` → `false` |  |
| `m-6c80ce6640` | src/validate.ts:57 | guard-bypass | `Array.isArray(value)` → `false` |  |
| `m-59e4730491` | src/validate.ts:58 | guard-bypass | `value !== null && typeof value === 'object'` → `false` |  |
| `m-ee8cb8a4b2` | src/validate.ts:58 | equality-negation | `!==` → `===` |  |
| `m-e06201a967` | src/validate.ts:58 | equality-negation | `===` → `!==` |  |
| `m-1a5f6971b5` | src/wallet.ts:117 | equality-negation | `===` → `!==` |  |
| `m-4292d27f83` | src/wallet.ts:132 | boundary | `>` → `>=` |  |
| `m-564378c114` | src/wallet.ts:147 | guard-bypass | `handles === undefined` → `false` |  |
| `m-14d027cf70` | src/wallet.ts:148 | guard-bypass | `!Array.isArray(handles) \|\| !handles.every((h) => typeof h === 'string')` → `false` |  |
| `m-1e0b1aa083` | src/wallet.ts:148 | logical | `\|\|` → `&&` |  |
| `m-40004daf63` | src/wallet.ts:172 | boundary | `>` → `>=` |  |
| `m-e8daf45fd1` | src/wallet.ts:172 | arithmetic | `+` → `-` |  |
| `m-5eb174907e` | src/wallet.ts:176 | literal-boundary | `50` → `51` |  |
| `m-23f51c879c` | src/wallet.ts:176 | literal-boundary | `1` → `2` |  |
| `m-e2f93c4ca9` | src/wallet.ts:185 | guard-bypass | `!Array.isArray(transfers) \|\| transfers.length < 1 \|\| transfers.length > 32` → `false` |  |
| `m-cf44641145` | src/wallet.ts:185 | logical | `\|\|` → `&&` |  |
| `m-7a2c6909b9` | src/wallet.ts:185 | logical | `\|\|` → `&&` |  |
| `m-d96e918ce3` | src/wallet.ts:185 | boundary | `>` → `>=` |  |
| `m-c6e3d29274` | src/wallet.ts:185 | literal-boundary | `32` → `33` |  |
| `m-1b183791f8` | src/wallet.ts:188 | guard-bypass | `typeof t !== 'object' \|\| t === null \|\| Array.isArray(t)` → `false` |  |
| `m-cebe3ff27e` | src/wallet.ts:188 | logical | `\|\|` → `&&` |  |
| `m-68429b47bd` | src/wallet.ts:188 | logical | `\|\|` → `&&` |  |
| `m-1b3e940b03` | src/wallet.ts:190 | guard-bypass | `typeof entry.from_handle !== 'string' \|\| typeof entry.to_handle !== 'string'` → `false` |  |
| `m-f50bc9ffd6` | src/wallet.ts:190 | logical | `\|\|` → `&&` |  |
| `m-f3c481a8f0` | src/wallet.ts:202 | literal-boundary | `0` → `1` |  |
