# Implementation Plan: Standard Multiplayer Capability for the Advantage Play Kit

Exemplar for the capability shape is the existing optional `responsive` block:
`MountCartridgeOptions` (`packages/advantage-play-kit/src/runtime/types.ts:382`)
and its handling in `mountCartridge`
(`packages/advantage-play-kit/src/runtime/runtime.ts:61`). Mirror that ownership
model rather than inventing one.

Phases S1 and S2 run in parallel after S0. S2 is the shared-world prerequisite
and must not be pushed behind the race tier.

## Phase S0: Audit the orphaned implementation and harvest the reference protocol [checkpoint: 0724fd7]
_Story ref: spec.md#story-s0_

- [x] Task: Produce a per-module adopt/lift/discard verdict `s0-audit-20260804.md`
    - [x] Review `apps/advantage-games/src/lib/multiplayer/room-manager.ts`, `game-session.ts`, `scoring-engine.ts`, `ws-server.ts` and record a verdict with justification for each
    - [x] Review `apps/advantage-games/src/components/multiplayer/LobbyScreen.tsx`, `ScoreboardOverlay.tsx`, `PodiumScreen.tsx`, `MultiplayerGameWrapper.tsx` and record a verdict for each
    - [x] Review `apps/advantage-games/src/types/multiplayer.ts` against the contract intent in S1
- [x] Task: Record a severity-ranked finding list `s0-audit-20260804.md`
    - [x] `getGlobalRoomManager()` process-global room state in `ws-server.ts` and its multi-instance consequences
    - [x] Client-supplied `score` accepted by `SCORE_SUBMIT` when the server holds `submissions` and `currentWords` — resolved into M-2, three disagreeing trust models
    - [x] `getPlayerList` hardcoding `score: 0` and `wordsCollected: 0`; confirm whether the `waiting`-only call path makes this correct — correct today, recorded as M-9 trap
    - [x] `HEARTBEAT_INTERVAL` 30 s against `HEARTBEAT_TIMEOUT` 90 s — M-10, defensible, for S4 to confirm
    - [x] Room-code entropy, collision handling, host-transfer races, kick and reconnect semantics in `room-manager.ts` — M-3, M-4, M-8
    - [x] `deserializeMessage` payload validation gap in `types/multiplayer.ts` — module marked discard, semantics harvested
    - [x] Additional findings not anticipated when the plan was written: M-1 `cleanupExpiredRooms` never called, M-5 union round-end truncates the race, M-6 disconnected players hold capacity, M-7 full-state broadcast per tick
- [x] Task: Harvest the Tutor Advantage reference protocol `s0-protocol-harvest-20260804.md`
    - [x] Obtain the protocol definition. It is not in this repository but is in the sibling checkout `/home/daniel-bo/Desktop/tutor-advantage`, identified by the product owner after the audit wrongly concluded it was unobtainable
    - [x] Record a semantic diff against the local protocol: message kinds, round lifecycle, scoring, reconnect, plus identity, membership, room state, and determinism
    - [x] Record which side wins per disagreement — production wins on round lifecycle, reconnect, identity, and membership; neither wins on message kinds or room state; the race protocol there is orphaned exactly as ours is, and our copy is a one-field fork of it
- [x] Task: Amend spec decision 3 to match what the harvest found
    - [x] Scope it to session, identity, and lifecycle semantics, where the live lesson service is genuinely the stronger reference, and record that its race-protocol premise did not hold
    - [x] Record that scoring is governed by decision 5, which already says the server does not trust client scores. Decision 3 was the general rule and decision 5 the specific one, so this was a spec-internal conflict to resolve rather than a new product decision — the conflict only became visible once the harvest showed the live service accepts a client score and pushes the total to parents over LINE
    - [x] Update the constraint section: Tutor Advantage is readable as a sibling checkout, and `services/learning-service` is the realtime precedent S4 should reason from
    - [x] Flag the new tension in decision 6 — code-based join against the live enrollment gate — for S4 to decide rather than inherit
- [x] Task: Settle whether the Play Kit session should speak to the lesson session rather than reimplement it — PRODUCT OWNER DECISION
    - [x] The classroom already has lobby, roster, ready, kick, countdown, and result intake in `services/learning-service`. S3 and S5 currently plan a second one. No decision in the spec covers this, because the spec was written believing Tutor Advantage was a billing counterparty rather than a system running classroom game sessions today
    - [x] Scope before S3, not after. Does not block S1 or S2 — RULED 2026-08-04: a multiplayer room is the class group the teacher runs in Lesson plan mode; students outside the group cannot join. The Play Kit session binds to the lesson session's roster/grouping model rather than reimplementing open lobbies; membership is roster-gated, codes are not access credentials. Recorded in spec decision 6. The deployable home for the binding remains S4's spike, constrained by this ruling. `multiplayer.v1` needs no contract change (`join_room.roomCode` is an opaque identifier; the gate is service-side)
- [x] Task: Run the existing multiplayer test suite and record its true state
    - [x] Execute the multiplayer test files and record pass/fail counts and timings in the audit receipt. Was blocked on the 2026-08-04 root `node_modules` wipe by a concurrent session; the install has since been restored and the suite ran: fourteen files, 13 suites passed / 1 failed, 202 tests passed / 1 failed, 36.4 s. The single failure is a wall-clock threshold in `performance-benchmark.test.ts` against the dead `ScoringEngine`, not a correctness assertion.
    - [x] Record why the green does not clear the High findings: the suite tests each module against itself, while M-1, M-2 and M-3 all live in the seams between modules or in an absent caller. Recorded in `s0-audit-20260804.md#test-state-executed-2026-08-04` as the coverage gap S1's contract tests must close.
- [x] Task: Measure - User Manual Verification 'Phase S0: Audit the orphaned implementation and harvest the reference protocol' (Protocol in workflow.md) — preliminary gates executed by orchestrator, confirmed YES by product owner 2026-08-04; receipt `preliminary-verification-s0-s1-s2-20260804.md`; verification report in git notes on checkpoint 0724fd7

## Phase S1: Freeze the `multiplayer.v1` contract in `game-contracts` [checkpoint: e1a7ee5]
_Story ref: spec.md#story-s1_

- [x] Task: Write Red tests for the protocol contract
    - [x] Add `packages/game-contracts/src/__tests__/multiplayer.test.ts` covering accept and reject cases for every message kind — 55 tests, Red-first (all 55 failed `parseMultiplayerMessage is not a function` before implementation)
    - [x] Assert malformed payloads reject rather than pass through, closing the `deserializeMessage` cast gap — malformed envelopes, wrong types, unknown kinds, and `v !== 1` all throw `ZodError`; tests also prove no kind accepts a client-asserted `userId` or a submission carrying `score`
    - [x] Assert version negotiation rejects an unknown protocol version — `client_hello` with any `v ≠ 1` yields the `unsupported_version` error shape carrying `supportedVersions`
- [x] Task: Define the contract
    - [x] Add `packages/game-contracts/src/multiplayer.ts` with zod schemas for room, player, session, round, submission, ranking, and error envelope — 12 message kinds on a `{ v: 1, type, payload }` envelope discriminated on `type`; identity server-issued only (`join_room` carries just `{ roomCode, displayName }`); reconnect is a `Player.connection` state flip, no rejoin kind; round lifecycle server→client only, `round_start` carries `seed` + `targetSequence`
    - [x] Include explicit protocol-version negotiation
    - [x] Reserve shared-world message kinds (input frame, world snapshot) in the same envelope so S6 extends rather than forks — `input_frame`/`world_snapshot` with intentionally generic payloads
    - [x] Export from `packages/game-contracts/src/index.ts`
- [x] Task: Verify against the harvested reference
    - [x] Confirm every Tutor Advantage race semantic recorded in S0 is expressible in the frozen contract — mapping table recorded in the implementation report: harvest items 8–12 and audit items 1–7 all expressed. Six flags are enforcement-side (entitlement gate, capacity counting, kick persistence, per-player round termination, broadcast cadence, tenant binding) and belong to S4/S6 service logic by design, not to message shape; recorded here so S4 does not mistake them for contract gaps. Orchestrator re-ran the gate: 8 files / 178 tests green; the package `check-types` failure is a pre-existing baseline in `dragon-rider-host-proof-binding.ts` (file untouched, error reproduces at HEAD)
- [x] Task: Measure - User Manual Verification 'Phase S1: Freeze the multiplayer.v1 contract in game-contracts' (Protocol in workflow.md) — preliminary gates executed by orchestrator, confirmed YES by product owner 2026-08-04; receipt `preliminary-verification-s0-s1-s2-20260804.md`; verification report in git notes on checkpoint e1a7ee5

## Phase S2: Make the Wizard vs Zombie simulation deterministic [checkpoint: d027b6f]
_Story ref: spec.md#story-s2_

- [x] Task: Write the Red determinism property test
    - [x] Add a property test asserting two independently constructed states, identical seed and identical input sequence, produce byte-identical state across a bounded tick count — `apps/advantage-games/src/lib/games/wizardZombieDeterminism.test.ts`, 400 ticks at dt 50 ms with a deterministic steer-to-orb bot; witness blocks confirm ≥3 concurrent zombies (observed 20), orb collection (39 attempts), and correct answers (8) so spawn, wander, and target-reselect sites are all exercised
    - [x] Confirm it fails against the current implementation before any fix — fails at tick 0: orb ids embed `Math.random()` at construction (inventory sites 403/426); positions and target identical across runs. Orchestrator re-ran the gate, 1 failed / 2 passed
- [x] Task: Thread a seeded PRNG through the tick path
    - [x] Replace the `Math.random()` call sites in `apps/advantage-games/src/lib/games/wizardZombie.ts` at lines 237, 239, 247, 300, 333, 334, 403, and 426 (ten sites in total; see `s2-determinism-inventory-20260804.md`) with the injected generator — all draws now flow through a pure mulberry32 step (`nextRandom`); construction `rng` injection is reinterpreted as a seed source (first draw seeds the stream) so the tick path and layout share one stream; `rg` confirms zero `Math.random`/`Date.now` remain in the module
    - [x] Replace `Date.now()`-derived entity ids at line 316 with seed-and-counter derivation — all entity ids (`zombie-*`, `orb-correct-*`, `orb-decoy-*`) mint from `state.nextEntityId`
    - [x] Carry the generator on the state so `advanceWizardZombieTime` stays a pure reducer — `rngState` (numeric mulberry32 accumulator, not a function, so JSON byte-identity stays sensitive to generator position) and `nextEntityId` carried on `WizardZombieState`
- [x] Task: Guard the property
    - [x] Add a lint or test guard failing on `Math.random` or `Date.now` reintroduced into the tick path — `wizardZombieDeterminismGuard.test.ts` scans the module source; residual gap recorded: the guard catches reintroduction but not draw-order/count changes, which only the 400-tick property test pins
- [x] Task: Confirm no behavioral regression
    - [x] Run the existing `wizardZombie.test.ts`, `wizardZombieLogic.test.ts`, and `wizardZombieIndicators.test.ts` suites — orchestrator re-ran the gate: 7 suites, 44/44 passed including the determinism property. One caller-visible regression caught at integration: seedless construction now starts from seed 1, making every play session identical; fixed at the call site (`WizardZombieGame.tsx` passes `seed: Date.now()` at mount, outside the tick path) pending S5/S6 session-distributed seeds. The remotion renderer stays deterministic by default, which is desirable for reproducible renders
- [x] Task: Measure - User Manual Verification 'Phase S2: Make the Wizard vs Zombie simulation deterministic' (Protocol in workflow.md) — preliminary gates executed by orchestrator, confirmed YES by product owner 2026-08-04; receipt `preliminary-verification-s0-s1-s2-20260804.md`; verification report in git notes on checkpoint d027b6f

## Phase S3: Add the multiplayer session capability to the Play Kit
_Story ref: spec.md#story-s3_

- [ ] Task: Write Red tests for the session system
    - [ ] Add `packages/advantage-play-kit/src/systems/__tests__/multiplayer-session.test.ts` covering join, ready, round lifecycle, submission, scoreboard, and disconnect
    - [ ] Drive it through an injected fake transport; no socket in the test path
- [ ] Task: Implement the session system
    - [ ] Add `packages/advantage-play-kit/src/systems/multiplayer-session.ts`, transport-agnostic and consuming only `multiplayer.v1`
    - [ ] Drive its cadence from `createBoundedFrameScheduler` in `systems/bounded-frame-loop.ts`
    - [ ] Export from `packages/advantage-play-kit/src/systems/index.ts`
- [ ] Task: Extend the runtime mount surface
    - [ ] Add an optional `multiplayer` block to `MountCartridgeOptions` in `runtime/types.ts`, mirroring `responsive`
    - [ ] Own its lifecycle in `mountCartridge` and tear it down on destroy
    - [ ] Extend `runtime.test.ts` for mount, destroy, and restart with multiplayer present and absent
- [ ] Task: Register the capability
    - [ ] Add the capability id to `ACCEPTED_CAPABILITY_IDS` in `systems/capability-manifest.ts`
    - [ ] Update the frozen assertion in `systems/__tests__/capability-manifest.test.ts`
    - [ ] Confirm `guards/accepted-inputs.ts` accepts it and still throws `APKUnsupportedCapabilityError` for unknown ids
    - [ ] Re-accept the `acceptedManifestSha256` pin enforced by `guards/__tests__/accepted-inputs.test.ts` and record the old and new hashes in a receipt
- [ ] Task: Measure - User Manual Verification 'Phase S3: Add the multiplayer session capability to the Play Kit' (Protocol in workflow.md)

## Phase S4: Give the session service a deployable home
_Story ref: spec.md#story-s4_

- [ ] Task: Spike the deployment target
    - [ ] Decide the runtime host for a long-lived socket process and record why, given no realtime precedent exists in this monorepo
    - [ ] Confirm the choice supports multi-instance operation with room affinity or shared state
- [ ] Task: Move room state out of the process
    - [ ] Replace `getGlobalRoomManager()` with a store that survives instance restart
    - [ ] Test room recovery after a simulated instance loss
- [ ] Task: Recompute scores server-side
    - [ ] Derive score from `submissions` and `currentWords` and stop accepting the client `score` field
    - [ ] Test that a forged client score does not change the ranking
- [ ] Task: Bind rooms to identity
    - [ ] Authenticate connections against Accounts-issued identity through `packages/auth`
    - [ ] Scope rooms to tenant and class; test that a cross-tenant join is refused
- [ ] Task: Build and deploy artifacts
    - [ ] Add the container build and deploy pipeline consistent with existing Cloud Build artifacts
- [ ] Task: Measure - User Manual Verification 'Phase S4: Give the session service a deployable home' (Protocol in workflow.md)

## Phase S5: Wizard vs Zombie race tier
_Story ref: spec.md#story-s5_

- [ ] Task: Adopt the capability in the cartridge
    - [ ] Declare the multiplayer capability in the Wizard vs Zombie manifest
    - [ ] Remove app-local transport code superseded by the platform session
- [ ] Task: Bind the presentation components
    - [ ] Wire the lobby, scoreboard, and podium surfaces to `multiplayer.v1` per the S0 verdicts
    - [ ] Verify against the mobile portrait reference viewport
- [ ] Task: Make target selection server-distributed
    - [ ] Distribute target-word order from the session so every player races the same Thai prompts in the same order
    - [ ] Test that two clients in one room receive an identical target sequence
- [ ] Task: Prove the full round
    - [ ] Exercise lobby through podium with multiple clients and record the run
- [ ] Task: Measure - User Manual Verification 'Phase S5: Wizard vs Zombie race tier' (Protocol in workflow.md)

## Phase S6: Wizard vs Zombie shared-world tier
_Story ref: spec.md#story-s6_

- [ ] Task: Resolve the viewport conflict
    - [ ] Decide and record how one 800×600 world is presented across portrait 390×844 clients without giving any player an information advantage
- [ ] Task: Write Red tests for authoritative simulation
    - [ ] Assert the server advances the deterministic reducer and that a client diverging from the authoritative state is corrected
    - [ ] Assert stated, tested degradation on packet loss and on a dropped player
- [ ] Task: Implement server-authoritative simulation
    - [ ] Advance the deterministic reducer at the session tick rate and broadcast snapshots on the reserved S1 message kinds
    - [ ] Implement client prediction and reconciliation in the session system
    - [ ] Add the shared-world capability id with the same registration and pin steps as S3
- [ ] Task: Prove the tier with a second adopter
    - [ ] Adopt the capability in one further cartridge without changing the protocol
- [ ] Task: Measure - User Manual Verification 'Phase S6: Wizard vs Zombie shared-world tier' (Protocol in workflow.md)

## Phase S7: Results and XP integration
_Story ref: spec.md#story-s7_

- [ ] Task: Route multiplayer results through the existing completion path
    - [ ] Emit results through `systems/single-completion.ts` and `systems/result-accounting.ts`
    - [ ] Confirm no side channel bypasses the host-proof surface
- [ ] Task: Test the reward path
    - [ ] Cover ranking-derived XP against `packages/domain/src/games/xp.ts`
- [ ] Task: Measure - User Manual Verification 'Phase S7: Results and XP integration' (Protocol in workflow.md)
