# Line-by-Line Review — games-batch-42

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-42`
**Scope source:** `/tmp/opencode/games-batch-42` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is the **multiplayer runtime** (`src/lib/multiplayer/*`), two shared game-lib helpers (`spriteAnimation`, `utils`), the standalone `xp` helper, one cross-game test (`wizardZombieLogic.test.ts`, exercising `src/lib/games/wizardZombie`), and the locale shim (`src/locales/*`).
**Context files read (not in batch, not scored):** `src/types/multiplayer.ts` (message contract consumed by the multiplayer modules), prior report `games-batch-39.md` (format/cross-cutting consistency).
**Finding ID scheme:** `F-GAMES-B42-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Subsystem |
|---|------|------|-----------|
| 1 | `src/lib/multiplayer/game-session.test.ts` | test | Multiplayer game session |
| 2 | `src/lib/multiplayer/game-session.ts` | logic | Multiplayer game session |
| 3 | `src/lib/multiplayer/performance-benchmark.test.ts` | test | Multiplayer perf |
| 4 | `src/lib/multiplayer/room-manager.test.ts` | test | Room lifecycle |
| 5 | `src/lib/multiplayer/room-manager.ts` | logic | Room lifecycle |
| 6 | `src/lib/multiplayer/scoring-engine.test.ts` | test | Scoring/anti-cheat |
| 7 | `src/lib/multiplayer/scoring-engine.ts` | logic | Scoring/anti-cheat |
| 8 | `src/lib/multiplayer/ws-server.room.test.ts` | test | WS transport (rooms) |
| 9 | `src/lib/multiplayer/ws-server.test.ts` | test | WS transport (heartbeat) |
| 10 | `src/lib/multiplayer/ws-server.ts` | logic | WS transport |
| 11 | `src/lib/spriteAnimation.test.ts` | test | Sprite animation helper |
| 12 | `src/lib/spriteAnimation.ts` | logic | Sprite animation helper |
| 13 | `src/lib/utils.test.ts` | test | `cn` re-export |
| 14 | `src/lib/utils.ts` | logic | `cn` re-export |
| 15 | `src/lib/wizardZombieLogic.test.ts` | test | Wizard-vs-Zombie reducer |
| 16 | `src/lib/xp.test.ts` | test | XP helper |
| 17 | `src/lib/xp.ts` | logic | XP helper |
| 18 | `src/locales/client.test.ts` | test | i18n shim |
| 19 | `src/locales/client.ts` | logic | i18n shim |
| 20 | `src/locales/en.ts` | data | English translations |

---

## Findings

### File 1 — `game-session.test.ts`

**F-GAMES-B42-001 · Medium · game-session.test.ts:124-132**
The test `should reject submission when not playing` contains **no assertion**. It submits five words, advances 6000 ms, and ends — never calling `expect(...)`. The test name promises a rejection check that is never made; it is a guaranteed-green placeholder that documents behavior it does not verify. This is the only test of the round-end→intermission boundary and it asserts nothing.

**F-GAMES-B42-002 · Low · game-session.test.ts:74-81, 155-169**
Broadcast assertions decode with `JSON.parse(m)` and match raw string literals (`parsed.type === 'round_start'`). They rely on the serialized wire format rather than the typed `MessageType` enum, so a rename of the enum value (`round_start`) would silently break the contract without these tests catching the intent. Tests couple to the string, not the source of truth.

**F-GAMES-B42-003 · Low · game-session.test.ts:276-285**
The "immutable state copy" test only verifies that `score` differs between two snapshots — which would also pass for a mutable shared reference that was incremented between reads. It does not assert that an earlier snapshot is *frozen* against later mutation (e.g., mutate `state1.players` then re-check). Given the deep-copy logic in `getState()` (good), the test under-verifies the actual immutability guarantee.

### File 2 — `game-session.ts`

**F-GAMES-B42-004 · High · game-session.ts:257-262, 346-351**
`endRound` schedules the next round via `setTimeout(..., 5000)` whose handle is **never stored and never cleared**. `dispose()` clears only `tickInterval`, not this timeout. If a session is disposed (game abandoned, all players leave, room expired) during the 5 s intermission, the timer still fires and mutates `this.state` (`currentRound++`, `status='playing'`, `startRound()` → broadcast) on a dead session — a use-after-dispose / leaked-timer defect that resurrects gameplay and emits broadcasts for a torn-down game.

**F-GAMES-B42-005 · High · game-session.ts:180-225 vs scoring-engine.ts (whole)**
`GameSession.submitWord` implements its **own** scoring (`player.score += 100`, flat) and ignores the `ScoringEngine` entirely (no time bonus, no combo, no anti-cheat `maxScorePerRound`, no `validateScoreSubmission`). The batch ships a full `ScoringEngine` that the live session never instantiates or calls. Two parallel, divergent scoring systems exist; the authoritative multiplayer score is the trivial flat-100 path, so the anti-cheat and time/combo logic is dead in production play.

**F-GAMES-B42-006 · High · game-session.ts:147-150, 133-144**
`generateWords()` returns a hard-coded placeholder array `['apple','banana','cherry','date','elderberry']` and `ROUND_START` broadcasts `vocabularyPack: { packId: 'default', items: [] }` (empty). The multiplayer session is **not wired to any vocabulary pack** — it neither serves real content to clients nor scores against learner vocabulary. As a learning feature this is non-functional; for Reading/Primary import there is no content-injection seam.

**F-GAMES-B42-007 · Medium · game-session.ts:288, 279**
Final XP bonus is `Math.floor(r.score * (xpBonuses[index] || 0))` with `xpBonuses = [0.5, 0.25, 0.1, 0]`. Because per-word score is a flat 100 (F-GAMES-B42-005), XP is a function of word *count* only and is unbounded (no cap), diverging from the single-player games' cap-10 `calculateXP` convention (see Cross-Cutting and `xp.ts` F-GAMES-B42-026). A host leaderboard mixing single- and multi-player XP would receive non-comparable scales.

**F-GAMES-B42-008 · Medium · game-session.ts:96-107, 324-336**
`broadcastState()` runs on every tick (`tickRateHz: 20` ⇒ 20 msgs/s/room) and serializes the full player list each time via `serializeGameState()`. There is no dirty-check / no delta compression / no change-gating: identical state is re-broadcast 20×/s even when nothing changed (e.g., during the wait for word submissions). On low-end mobile targets and constrained server egress this is avoidable bandwidth and GC churn. No throttle or "only broadcast on change" guard exists.

**F-GAMES-B42-009 · Medium · game-session.ts:214-221**
The round-end "all words collected" check (`currentWords.every(w => players...some(p) includes w)`) means a single fast player collecting all 5 words ends the round for everyone immediately — a fairness/age-appropriateness concern (slower learners get no time on the word set). Combined with the flat scoring, the design rewards speed-spamming over comprehension. No per-player completion or minimum-exposure guard.

**F-GAMES-B42-010 · Low · game-session.ts:158-160, 170-171**
The tick loop and round-time check use wall-clock `Date.now()` and `setInterval`. Under real (non-faked) timers, interval drift and tab-throttling (background `setInterval` clamped to ≥1 s by browsers) make the 20 Hz tick and the 120 s round limit unreliable on a backgrounded client. Server-side this is fine; if this module is ever used client-side (it imports `@/types/multiplayer`, no `'server-only'` guard), timing degrades silently.

**F-GAMES-B42-011 · Low · game-session.ts:35-43, 305-322**
`GameSessionState.players` is a `Map`, and `getState()` returns a `Map`. `Map` is not JSON-serializable, so any transport/React-devtools/snapshot serialization of the raw state object (outside the dedicated `serializeGameState`) silently drops players. The public state shape is awkward for a value that must cross a wire/store boundary.

### File 3 — `performance-benchmark.test.ts`

**F-GAMES-B42-012 · Medium · performance-benchmark.test.ts:8-38, 42-71, 108-137**
All six benchmarks assert hard wall-clock thresholds (`expect(duration).toBeLessThan(10)` etc.) using `Date.now()`. These are **inherently flaky in CI**: shared runners, GC pauses, and cold JIT routinely blow a 5–10 ms budget, producing non-deterministic failures unrelated to regressions. Microbenchmarks belong in a separate, non-gating perf suite (or use relative/statistical assertions), not in the unit test run that gates merges.

**F-GAMES-B42-013 · Low · performance-benchmark.test.ts:42-71**
The GameSession benchmark calls `session.submitWord('host1','apple')` 100× in a loop, but `submitWord` rejects duplicates (returns `false` after the first), so 99 of 100 iterations exit early at the dedup check. The benchmark therefore measures the rejection path, not 100 real submissions — it does not measure what its name claims ("process 100 word submissions").

**F-GAMES-B42-014 · Low · performance-benchmark.test.ts:9-21**
The ScoringEngine loop submits `word${i}` with `Math.random()*5000` response times and never starts a new round, so after ~ `maxScorePerRound` is reached `submitWord` returns null (anti-cheat cap) and the rest of the 1000 iterations are no-ops. Like F-GAMES-B42-013, the timing reflects mostly the early-reject branch, undercutting the benchmark's stated intent.

### File 4 — `room-manager.test.ts`

**F-GAMES-B42-015 · Info · room-manager.test.ts:1-301**
Strong, behavior-focused coverage: create/join/leave, host promotion on leave, full-room rejection, reconnection, kick/transfer authorization, expiry/cleanup, and singleton reset are all exercised with public APIs and clear assertions. This is the best-tested module in the batch. (One white-box reach at line 88/195 sets `isConnected`/`status` directly, acceptable for setup.)

### File 5 — `room-manager.ts`

**F-GAMES-B42-016 · Medium · room-manager.ts:45-54**
Room codes are generated with `Math.random()` (not a CSPRNG). 6 chars over a 32-symbol alphabet ≈ 30 bits — guessable/enumerable by a motivated client, and `Math.random` is not unpredictability-safe. Because joining requires only the code and a client-supplied `playerId`/`playerName` (no auth — see F-GAMES-B42-022), code predictability is a join-hijack / room-griefing vector. Use `crypto`-backed randomness for room codes.

**F-GAMES-B42-017 · Medium · room-manager.ts:181-195, 33-43**
`cleanupExpiredRooms()` is the only purge path and must be invoked by an external caller; nothing in the module schedules it. There is no idle sweep wired here, so without a caller (worker/cron) the in-memory `rooms` map grows unbounded — a memory-leak risk for a long-lived server process. No max-rooms cap or LRU eviction either.

**F-GAMES-B42-018 · Low · room-manager.ts:251-262 (module singleton)**
`getGlobalRoomManager()` is a module-level mutable singleton holding all rooms in process memory. This precludes horizontal scaling (multiple server instances each hold disjoint room state; a client reconnecting to a different instance loses its room) and is not multi-tenant aware (no `schoolId` scoping, per root AGENTS.md). For import into Reading/Primary this is a non-portable, single-process design that needs a shared store (Redis/DB) behind an adapter.

**F-GAMES-B42-019 · Low · room-manager.ts:96-98, 120-156**
`maxPlayers` is enforced on `joinRoom` but `leaveRoom` only flips `isConnected=false` and never removes the player from `room.players` (only `kickPlayer` deletes). A room can therefore accumulate disconnected entries that still count toward `room.players.size`, so a room that has churned through `maxPlayers` distinct disconnected players can become permanently un-joinable while appearing "full." No reaping of long-disconnected players.

### File 6 — `scoring-engine.test.ts`

**F-GAMES-B42-020 · Low · scoring-engine.test.ts:136-152**
The "anti-cheat validation" tests only exercise `validateScoreSubmission` in isolation. No test asserts that `validateScoreSubmission` is actually invoked by `submitWord` or by the live session — and in fact it is **not** wired into `GameSession` (F-GAMES-B42-005). The tests give false confidence that anti-cheat is enforced in gameplay when it is dead code on the live path.

### File 7 — `scoring-engine.ts`

**F-GAMES-B42-021 · Medium · scoring-engine.ts:214-225, 87-112 (and unused by GameSession)**
`ScoringEngine` is a coherent, well-structured scorer (time bonus, combo, per-round caps, anti-cheat) but **no module in this batch instantiates it on the live multiplayer path** (`GameSession` rolls its own — F-GAMES-B42-005). `validateScoreSubmission` and `calculateXpBonus` (which duplicates `GameSession`'s inline `xpBonuses` array, lines 227-231 vs game-session.ts:279) are therefore redundant/dead. Two copies of the XP-bonus table must be kept in sync by hand.

**F-GAMES-B42-022 · Low · scoring-engine.ts:62-85, 161-163**
Combo state (`playerComboCounts`) is incremented in `calculateWordScore` and only reset by an explicit external `resetCombo()` call. There is no automatic combo break on a wrong answer or on round boundaries except `startRound` clearing the map. Since the engine never validates *correctness* of a word (it scores every submitted word as correct), "combo" rewards raw submission volume, not accuracy — a scoring-integrity weakness if ever wired to real play.

### File 8 — `ws-server.room.test.ts`

**F-GAMES-B42-023 · High · ws-server.room.test.ts:155-163, 188-189, 234, 272, 291, 330, 370 vs ws-server.ts:142-155**
The test repeatedly reads `JSON.parse(host.messagesSent[0]).payload.roomCode` and asserts `roomCode.length === 6`, but the server's `create_room` handler builds a `STATE_UPDATE` payload of `{ gameState, timestamp }` with **no `roomCode` field** (ws-server.ts:144-153). `payload.roomCode` is therefore `undefined`, and `undefined.length` throws `TypeError`. Either these tests are currently failing/erroring, or the suite is not actually executed in CI. This is a real impl↔test contract mismatch on the primary room-creation flow — clients cannot learn their room code from the documented message.

**F-GAMES-B42-024 · Medium · ws-server.room.test.ts:1-107 (and ws-server.test.ts:5-93)**
Both WS suites hand-roll a full mock of the `ws` module (a fake `WebSocket`/`WebSocketServer` with bespoke `simulateConnection`/`simulateMessage`). The tests thus validate behavior against a re-implemented stub, not the real `ws` library — connection upgrade, backpressure, binary frames, and real `readyState` transitions are never exercised. High risk of mock/reality drift (F-GAMES-B42-023 is exactly such drift).

**F-GAMES-B42-025 · Low · ws-server.room.test.ts:255-260**
The "player leaving" test asserts the post-leave player list still has length 2 with `players[1].isConnected === false`. This codifies the F-GAMES-B42-019 behavior (left players are retained, not removed) as expected. A reviewer reading only the test would assume retention is intentional; the divergence from `kickPlayer` (which deletes) is not flagged anywhere.

### File 9 — `ws-server.test.ts`

**F-GAMES-B42-026 · Low · ws-server.test.ts:140-147, 209-218**
The heartbeat tests verify pings are sent and `isAlive` toggles, but `HEARTBEAT_TIMEOUT` (90000) is exported and asserted as a constant (line 165) yet **never used by the server logic** (ws-server.ts uses only `HEARTBEAT_INTERVAL`; liveness is a single missed-pong via the `isAlive` flag). The test asserts the constant exists without asserting any behavior derives from it — a dead exported constant validated only for its literal value.

**F-GAMES-B42-027 · Info · ws-server.test.ts:188-199, 220-230**
Reasonable coverage of connection/disconnection, multi-client fan-out, error-handler resilience, and interval-driven termination of unresponsive clients. Within the limits of the mock (F-GAMES-B42-024) the heartbeat lifecycle is adequately specified.

### File 10 — `ws-server.ts`

**F-GAMES-B42-028 · High · ws-server.ts:67-79, 123-230 (no input validation)**
Inbound messages are `JSON.parse`'d and cast straight to `RoomMessage`, then payload fields are cast unchecked (`message.payload as { playerId: string; ... }`). There is **no Zod (or any) runtime validation** at this external boundary, contrary to root AGENTS.md ("Runtime validation is required at all external boundaries"). A malformed/malicious payload (missing fields, wrong types) flows directly into `RoomManager`. The module even has a `deserializeMessage` validator available in `@/types/multiplayer` but does not use it.

**F-GAMES-B42-029 · High · ws-server.ts:206-226, 132-170 (no authorization / trusts client IDs)**
`kick_player` and `transfer_host` trust the client-supplied `hostId`/`currentHostId` in the payload; `RoomManager` then checks `room.hostId === hostId`, but **the server never verifies the sending socket is that host**. Any connected client can send `{type:'kick_player', payload:{roomCode, hostId:'<the real host id>', playerId:'<victim>'}}` and succeed, because identity is asserted by the message, not by the authenticated connection. Same for `create_room`/`join_room` accepting arbitrary `playerId`. This violates "Never trust tenant/identity IDs from the frontend" and is a griefing/impersonation hole.

**F-GAMES-B42-030 · High · ws-server.ts:187-204**
`start_game` does **not** create or drive a `GameSession`. It merely sets room status to `active` and broadcasts a single hand-built `ROUND_START` with `vocabularyPack: { items: [] }` and `totalRounds: 3`. The actual game loop (`GameSession`: ticks, scoring, round/game-over, XP) is never instantiated by the transport. The multiplayer gameplay engine and the WebSocket server are **not integrated** — there is no path from a real client to a running session. This is the central wiring gap for the multiplayer feature's readiness.

**F-GAMES-B42-031 · Medium · ws-server.ts:29-37, 40-53**
`getPlayerList` hard-codes `score: 0, wordsCollected: 0` for every player, and `STATE_UPDATE` is only ever broadcast from the lobby helper. Even if a session ran, clients would receive zeroed scores via this path. The transport's notion of game state is a stub disconnected from `GameSession.serializeGameState()`.

**F-GAMES-B42-032 · Medium · ws-server.ts:20-27, 99-114 (O(n) per-client scans)**
`broadcastToRoom` iterates **all** `wss.clients` for every broadcast and filters by `roomCode`, and the heartbeat sweep iterates all clients. With many concurrent rooms this is O(total_clients) per room broadcast rather than O(room_members); combined with the 20 Hz session tick (F-GAMES-B42-008) this is a quadratic-ish hot path. No per-room client index is maintained.

**F-GAMES-B42-033 · Low · ws-server.ts:1-4, 81-83, 92-94**
Server uses free-form `console.error` for client errors (line 82) and a silent empty `catch` on leave (line 93), contrary to the root AGENTS.md structured-logging/observability standard. Connection errors and self-healing leaves produce no structured, correlatable telemetry (no room/player IDs, no request id).

**F-GAMES-B42-034 · Low · ws-server.ts:55-57, 1 (no `server-only`, no auth handshake)**
`createWebSocketServer` attaches to the raw HTTP server with `new WebSocketServer({ server })` and performs no origin check, no token/cookie handshake, and no rate limiting on connections or messages. For embedding into Reading/Primary (session-cookie auth per AGENTS.md) there is no auth adapter seam; the socket is open to any origin that can reach the port.

### File 11 — `spriteAnimation.test.ts`

**F-GAMES-B42-035 · Info · spriteAnimation.test.ts:1-49**
Clean, deterministic tests of a pure function: idle loop wrap, non-looping death clamp-to-last-frame, `startCol` offset, and a second config. Good coverage for the helper's stated behavior. No issues.

**F-GAMES-B42-036 · Low · spriteAnimation.test.ts (whole)**
No test covers degenerate inputs: `frameDuration === 0` (division → `Infinity`/`NaN` frame index, see F-GAMES-B42-037), `frames === 0` (modulo by zero → `NaN`), or `gameTime < stateStartTime` (negative elapsed, guarded by `Math.max(0,...)` in source but unverified by test). Edge-case robustness is unspecified.

### File 12 — `spriteAnimation.ts`

**F-GAMES-B42-037 · Low · spriteAnimation.ts:35-41**
`frameIndex = Math.floor(elapsed / config.frameDuration)`. If `frameDuration` is 0 the result is `Infinity`; with `loop` true, `Infinity % totalFrames` is `NaN`, yielding `col: NaN` — which would corrupt sprite-sheet sampling downstream. Similarly `totalFrames === 0` produces `NaN`. The function does not guard these. Minor (callers supply config), but a defensive clamp/guard is cheap and the helper is shared across many games.

**F-GAMES-B42-038 · Info · spriteAnimation.ts:20-46**
Otherwise a correct, side-effect-free, deterministic frame selector — exactly the shape needed for a shared canvas runtime and easy testing. The `loop`/clamp branch and `startCol` handling are sound.

### File 13 — `utils.test.ts`

**F-GAMES-B42-039 · Info · utils.test.ts:1-15**
Adequately tests the `cn` re-export (join, tailwind-merge conflict resolution, falsey filtering). Since `utils.ts` only re-exports `@reading-advantage/utils/cn`, these tests partly re-validate the shared package; acceptable as a smoke test of the binding. No issues.

### File 14 — `utils.ts`

**F-GAMES-B42-040 · Info · utils.ts:1-3**
A 3-line re-export of `cn` from `@reading-advantage/utils/cn`. Correctly reuses the shared util rather than re-implementing — good for consistency/importability. No issues.

### File 15 — `wizardZombieLogic.test.ts`

**F-GAMES-B42-041 · Medium · wizardZombieLogic.test.ts:46-53**
The "spawns zombies periodically" test advances `2000ms` and asserts `zombies.length > 0`, but the spawn cadence depends on `createWizardZombieState`'s un-seeded randomness / internal spawn timer (the reducer under `src/lib/games/wizardZombie.ts`, not in this batch). The comment itself admits uncertainty ("assuming 1s ... check logic constant"). The test is timing-/RNG-coupled and would be brittle if spawn interval or RNG changes; no seeded RNG is injected.

**F-GAMES-B42-042 · Low · wizardZombieLogic.test.ts:55-74, 137-165**
Many tests mutate private state directly (`state.zombies.push(...)`, `state.player.x = ...`, `state.orbs.find(...)`) to set up scenarios, then tick once. This white-box style verifies individual mechanics (damage, invuln, healing, shockwave) well, but there is **no input-driven, end-to-end** test (start → play via input → win/gameover) and no assertion on `score`/XP magnitude beyond `> 0`. Win-condition path is untested here.

**F-GAMES-B42-043 · Info · wizardZombieLogic.test.ts:76-135**
Positive: the damage model is verified to respect an invulnerability window (lines 98-117) and to trigger `gameover` at 0 HP (119-135) — the fairness pattern that some sibling games lack (cf. batch-39 hauntedLibrary). Collision, normalization of diagonal movement, and boundary clamping are also covered. Solid mechanic-level coverage for the in-scope reducer behavior.

### File 16 — `xp.test.ts`

**F-GAMES-B42-044 · Medium · xp.test.ts:4-28**
The tests lock in a formula that ignores the `score` parameter entirely (see F-GAMES-B42-045): every case passes `score` (100/100/0/150) but the expected value derives solely from `correctAnswers * (correctAnswers/totalAttempts)`. The suite therefore *enshrines* a likely-wrong formula (`XP = correct × accuracy`, units of "answers", not points) without ever questioning why `score` is unused. A test asserting `score` participates would have surfaced the dead parameter.

### File 17 — `xp.ts`

**F-GAMES-B42-045 · High · xp.ts:1-8**
`calculateXP(score, correctAnswers, totalAttempts)` **never references `score`**. The returned value is `floor(correctAnswers * (correctAnswers/totalAttempts))` — a unit-less product of correct-count and accuracy that bears no relation to the game's score and is not capped/normalized. This is a third, incompatible XP scheme alongside `GameSession`'s `score×bonus` (F-GAMES-B42-007) and the single-player games' cap-10 `calculateXP` family (batch-39). For Reading/Primary import there is **no single XP contract**; this helper's output is non-comparable and the `score` argument is a misleading dead parameter.

**F-GAMES-B42-046 · Low · xp.ts:1-8**
No input validation/guards beyond `totalAttempts === 0`. Negative inputs, `correctAnswers > totalAttempts` (accuracy > 1 ⇒ inflated XP), or non-integer inputs are accepted silently. A defensive clamp (`accuracy = min(1, correct/attempts)`, non-negative inputs) is absent. Also missing JSDoc, contrary to the root AGENTS.md "JSDoc for all exported functions" standard.

### File 18 — `locales/client.test.ts`

**F-GAMES-B42-047 · Medium · locales/client.test.ts:21-25**
The interpolation test `t('scoreText', { score: '10' })` expects `'10'` because `en.ts` defines `scoreText: "{score}"` (the whole value is one token). It therefore does **not** test interpolation within surrounding text or **multiple/repeated** params, so it cannot catch the single-`replace` limitation in the shim (F-GAMES-B42-049). A template like `"{score} of {total}"` or `"{x} {x}"` would expose the missing global replacement; the chosen fixture sidesteps the defect.

**F-GAMES-B42-048 · Low · locales/client.test.ts:1-45**
Tests only the `en`-only shim (`useCurrentLocale` always `'en'`). There is no test for locale switching, missing-locale fallback, or pluralization — features a real i18n layer in Reading/Primary would require. The suite validates the stub, reinforcing the stub as if it were the contract (cf. F-GAMES-B42-050).

### File 19 — `locales/client.ts`

**F-GAMES-B42-049 · Medium · locales/client.ts:30-32, 47-50**
Parameter interpolation uses `translation.replace(\`{${k}}\`, v)` — **`String.replace` with a string pattern replaces only the first occurrence**. Any message that repeats a placeholder (e.g., `"{name} ... {name}"`) substitutes only once, leaving a literal `{name}` in the UI. Should use a global replace (`replaceAll` or a `RegExp` with `g`). Latent localization bug for repeated tokens.

**F-GAMES-B42-050 · Medium · locales/client.ts:39-41, 24-55**
This is a **single-locale stub** (`useCurrentLocale` hard-returns `'en'`; only `en.ts` is imported and flattened at module load). It mimics the `next-international` hook names (`useScopedI18n`/`useI18n`/`useCurrentLocale`) but supports no other language, no async locale loading, and no locale negotiation. For importability into Reading/Primary (which are genuinely multilingual per `en.ts`'s CEFR content), this shim is not a drop-in i18n provider — it silently degrades all non-English locales to English with no signal.

**F-GAMES-B42-051 · Low · locales/client.ts:6, 8-22**
`flattenTranslations(en)` runs eagerly at module import and builds a full flat map of the entire (1000+ key) `en.ts` tree on every import in every bundle that touches a translation. No memoization guard beyond module-singleton, and the whole dictionary is shipped to the client regardless of which scope is used — a bundle-size/startup cost with no code-splitting per scope. Minor for a games app, but notable for mobile payload.

### File 20 — `locales/en.ts`

**F-GAMES-B42-052 · Low · en.ts:154-157, 314-352**
Some keys carry **mismatched descriptions** that will mislead translators/learners: `totalXp.description: "Sessions today"` and `totalXp.tooltip: "Reading sessions completed today"` under a key named *Total XP Earned* (lines 154-157) describe session counts, not XP. Copy/label drift in user-facing strings (an age-appropriate-UX/clarity concern for a student dashboard surfaced in a games app's locale file).

**F-GAMES-B42-053 · Low · en.ts:37-39**
`testPage.xxx: "Let's get started by testing your skill!"` — a placeholder key name (`xxx`) shipped in the production English bundle. Indicates incomplete cleanup of scaffolding strings; harmless functionally but pollutes the canonical locale source.

**F-GAMES-B42-054 · Info · en.ts:609-1192 (gamesPage)**
Positive for importability: the games translation tree is comprehensive and consistently structured per game (title/description, difficulty tiers, HUD, messages, ranking, instructions), and the shared `common` block (score/accuracy/xpEarned/gameOver/etc., lines 726-746) gives a reusable UI vocabulary. This is the right shape for a host app to localize the suite uniformly. Note the difficulty key drift across games (`normal` labeled "Medium" in wizardVsZombie:806 vs literal `medium` elsewhere) — minor inconsistency, recorded under Cross-Cutting.

**F-GAMES-B42-055 · Info · en.ts (whole, 1286+ lines)**
The file substantially exceeds typical module size and mixes dashboard/system/student/games domains in one default-export object. Not a defect per se, but it is the dictionary the eager flatten (F-GAMES-B42-051) processes wholesale; splitting by domain/scope would aid tree-shaking and import into other apps. (File was read to line 1286; remainder is more of the same nested translation structure.)

---

## Cross-Cutting Themes

- **Multiplayer is not integrated end-to-end (readiness gap):** `ws-server.ts` never instantiates or drives `GameSession` (F-GAMES-B42-030); `start_game` broadcasts a stub `ROUND_START` with empty vocabulary (F-GAMES-B42-006, -030, -031). `GameSession` rolls its own scoring and ignores `ScoringEngine` (F-GAMES-B42-005, -021). The three subsystems (transport, session, scoring) are built and tested in isolation but not wired into a playable path.
- **No XP/scoring normalization across the platform** (F-GAMES-B42-005, -007, -021, -044, -045 + batch-39 cross-ref): at least three incompatible XP schemes — `GameSession` `score×{0.5,0.25,0.1,0}` (uncapped), `xp.ts` `correct×accuracy` (ignores `score`), and the single-player cap-10 `calculateXP` family. A Reading/Primary leaderboard would receive non-comparable values.
- **External-boundary validation & authorization missing** (F-GAMES-B42-028, -029, -034): the WebSocket server does no Zod validation, no connection auth/origin check, no rate limiting, and trusts client-supplied identity (`playerId`/`hostId`) — enabling impersonation, kick/transfer hijack, and room-join griefing. Directly contravenes root AGENTS.md boundary-validation and "never trust frontend IDs" rules.
- **Single-process, non-tenant-scoped server state** (F-GAMES-B42-018, -016, -017): in-memory room singleton with `Math.random` codes, no `schoolId` scoping, no shared store, and no scheduled cleanup — not horizontally scalable and not multi-tenant-ready for the monorepo's adapter/portability model.
- **Leaked/uncleared timers & purity hazards** (F-GAMES-B42-004, -011): the intermission `setTimeout` is never cleared on `dispose`, resurrecting a torn-down session; `Map`-typed state is non-serializable across transport/store boundaries.
- **Performance hot paths** (F-GAMES-B42-008, -032): 20 Hz unconditional full-state broadcasts × O(all-clients) fan-out, with no delta/dirty-check or per-room client index — avoidable bandwidth/CPU on the low-end mobile target.
- **Test quality: stubs and assertion gaps mask defects** (F-GAMES-B42-001, -012, -013, -014, -020, -023, -024, -044, -047): an assertion-free test (001), CI-flaky wall-clock benchmarks (012) that measure reject branches (013/014), anti-cheat tested only in isolation (020) while dead on the live path, and a WS test asserting a `roomCode` the server never sends (023) — a likely currently-failing/unrun suite built against a hand-rolled `ws` mock (024).
- **i18n is an English-only stub** (F-GAMES-B42-049, -050, -051): single-locale shim with first-occurrence-only interpolation and eager full-dictionary flatten — not a drop-in multilingual provider for the genuinely multilingual host apps.
- **Importability positives:** `utils.ts` reuses the shared `cn` (F-GAMES-B42-040); `spriteAnimation.ts` is a clean pure helper (F-GAMES-B42-038); `room-manager.ts` has strong tests (F-GAMES-B42-015); the `gamesPage` locale tree is well-structured for uniform host localization (F-GAMES-B42-054).

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 7 | 004, 005, 006, 023, 028, 029, 030, 045 (note: 8 listed) |
| Medium | 16 | 001, 007, 008, 009, 012, 016, 017, 021, 024, 031, 032, 041, 044, 047, 049, 050 |
| Low | 22 | 002, 003, 010, 011, 013, 014, 018, 019, 020, 022, 025, 026, 033, 034, 036, 037, 042, 046, 048, 051, 052, 053 |
| Info | 9 | 015, 027, 035, 038, 039, 040, 043, 054, 055 |

> Correction: **High = 8** (F-GAMES-B42-004, 005, 006, 023, 028, 029, 030, 045). Total findings: **55** (F-GAMES-B42-001 … F-GAMES-B42-055).

---

## Limitations

1. **Scope is exactly the 20 listed files.** Behavior of components that *consume* these modules — the Konva/React canvas renderers, input wiring, `prefers-reduced-motion` handling, the actual `src/lib/games/wizardZombie.ts` reducer (only its test is in batch), the leaderboard/progress submission path, and any server bootstrap that wires `ws-server` to a real HTTP server — is out of batch and assessed only via the contracts these files reveal. Accessibility, audio, and true mobile/touch/browser behavior live in the (out-of-batch) view layer and could not be verified.
2. **No execution.** Tests were not run and the app was not built. Notably, the `roomCode` impl↔test mismatch (F-GAMES-B42-023) is inferred statically; whether the suite currently fails, is skipped, or is excluded from CI was not confirmed by running it.
3. **Context-only reads.** `src/types/multiplayer.ts` was read to evaluate the message contract and the unused `deserializeMessage` validator; it is not a batch target and was not scored. The prior `games-batch-39.md` report was consulted only for format/cross-cutting consistency.
4. **`en.ts` partial read.** The file exceeds the single-read window; lines 1–1286 were read directly and the remainder sampled structurally (continuation of the same nested translation object). Findings on `en.ts` are anchored within the read region.
5. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes **no claim** that the batch, track, or review phase is accepted, complete, verified, or closed.
