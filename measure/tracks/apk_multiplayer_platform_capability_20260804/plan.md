# Implementation Plan: Standard Multiplayer Capability for the Advantage Play Kit

Exemplar for the capability shape is the existing optional `responsive` block:
`MountCartridgeOptions` (`packages/advantage-play-kit/src/runtime/types.ts:382`)
and its handling in `mountCartridge`
(`packages/advantage-play-kit/src/runtime/runtime.ts:61`). Mirror that ownership
model rather than inventing one.

Phases S1 and S2 run in parallel after S0. S2 is the shared-world prerequisite
and must not be pushed behind the race tier.

## Phase S0: Audit the orphaned implementation and harvest the reference protocol
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
- [ ] Task: Harvest the Tutor Advantage reference protocol
    - [ ] Obtain the protocol definition or a written specification; it is not in this repository and `measure/product.md:49` is the only reference to that product here
    - [ ] Record a semantic diff against the local protocol: message kinds, round lifecycle, scoring, reconnect
    - [ ] Record which side wins per disagreement, defaulting to the production system per spec decision 3
- [ ] Task: Run the existing multiplayer test suite and record its true state — BLOCKED 2026-08-04
    - [ ] Execute the nine multiplayer test files and record pass/fail counts and timings in the audit receipt. Blocked on the 2026-08-04 root `node_modules` wipe by a concurrent session: `apps/advantage-games/node_modules` held two entries and `node_modules/.bin/jest` was absent. Every S0 finding is source-derived, not test-derived, until this runs.
- [ ] Task: Measure - User Manual Verification 'Phase S0: Audit the orphaned implementation and harvest the reference protocol' (Protocol in workflow.md)

## Phase S1: Freeze the `multiplayer.v1` contract in `game-contracts`
_Story ref: spec.md#story-s1_

- [ ] Task: Write Red tests for the protocol contract
    - [ ] Add `packages/game-contracts/src/__tests__/multiplayer.test.ts` covering accept and reject cases for every message kind
    - [ ] Assert malformed payloads reject rather than pass through, closing the `deserializeMessage` cast gap
    - [ ] Assert version negotiation rejects an unknown protocol version
- [ ] Task: Define the contract
    - [ ] Add `packages/game-contracts/src/multiplayer.ts` with zod schemas for room, player, session, round, submission, ranking, and error envelope
    - [ ] Include explicit protocol-version negotiation
    - [ ] Reserve shared-world message kinds (input frame, world snapshot) in the same envelope so S6 extends rather than forks
    - [ ] Export from `packages/game-contracts/src/index.ts`
- [ ] Task: Verify against the harvested reference
    - [ ] Confirm every Tutor Advantage race semantic recorded in S0 is expressible in the frozen contract
- [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the multiplayer.v1 contract in game-contracts' (Protocol in workflow.md)

## Phase S2: Make the Wizard vs Zombie simulation deterministic
_Story ref: spec.md#story-s2_

- [ ] Task: Write the Red determinism property test
    - [ ] Add a property test asserting two independently constructed states, identical seed and identical input sequence, produce byte-identical state across a bounded tick count
    - [ ] Confirm it fails against the current implementation before any fix
- [ ] Task: Thread a seeded PRNG through the tick path
    - [ ] Replace the `Math.random()` call sites in `apps/advantage-games/src/lib/games/wizardZombie.ts` at lines 237, 239, 247, 300, 333, 334, 403, and 426 (ten sites in total; see `s2-determinism-inventory-20260804.md`) with the injected generator
    - [ ] Replace `Date.now()`-derived entity ids at line 316 with seed-and-counter derivation
    - [ ] Carry the generator on the state so `advanceWizardZombieTime` stays a pure reducer
- [ ] Task: Guard the property
    - [ ] Add a lint or test guard failing on `Math.random` or `Date.now` reintroduced into the tick path
- [ ] Task: Confirm no behavioral regression
    - [ ] Run the existing `wizardZombie.test.ts`, `wizardZombieLogic.test.ts`, and `wizardZombieIndicators.test.ts` suites
- [ ] Task: Measure - User Manual Verification 'Phase S2: Make the Wizard vs Zombie simulation deterministic' (Protocol in workflow.md)

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
