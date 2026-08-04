# Specification: Standard Multiplayer Capability for the Advantage Play Kit

## Overview

Multiplayer exists in this monorepo as 4,424 lines of tested but entirely
orphaned code inside one app. No package imports it, no process starts its
WebSocket server, and the track that produced it was never planned past a
template. Meanwhile Tutor Advantage runs a parallel-race multiplayer mode in
production against a different implementation that this repository cannot see.

This track makes multiplayer a **platform capability** rather than an app
feature: a versioned protocol contract in `@reading-advantage/game-contracts`,
a session system in `@reading-advantage/advantage-play-kit` that any cartridge
opts into through its manifest, and a deployable session service. Wizard vs
Zombie is the first adopter and the proving ground.

Two topologies are delivered, not one. The **race tier** (independent boards,
shared vocabulary and clock, live scoreboard) matches what Tutor Advantage
already ships and what the orphaned code already assumes. The **shared-world
tier** (one board, players see each other) is what the product actually wants
for Wizard vs Zombie. Shared world is not deferred to a successor track: its
hard prerequisite — a deterministic simulation — begins in parallel with the
protocol work, precisely so the second tier is an extension of the first rather
than a rewrite of it.

**Sprint goal:** Any Play Kit cartridge can declare a multiplayer capability and
get lobby, rounds, scoreboard, and results without writing transport code — and
Wizard vs Zombie runs in both race and shared-world form on that capability.

## Baseline and Evidence

Verified against the working tree on 2026-08-04.

**The existing implementation is orphaned.**

- `apps/advantage-games/src/lib/multiplayer/` contains `ws-server.ts` (232
  lines), `room-manager.ts` (262), `game-session.ts` (352), and
  `scoring-engine.ts` (232), with four test files.
  `apps/advantage-games/src/components/multiplayer/` contains `LobbyScreen.tsx`
  (296), `PodiumScreen.tsx` (150), `ScoreboardOverlay.tsx` (121), and
  `MultiplayerGameWrapper.tsx` (89), with tests.
  `apps/advantage-games/src/types/multiplayer.ts` (144) holds the protocol.
  Total: 4,424 lines.
- No file outside `src/lib/multiplayer/` and `src/components/multiplayer/`
  imports any of it.
- `apps/advantage-games/package.json` declares `ws@^8.20.0` and
  `@types/ws@^8.18.1`, but its scripts are `next dev --turbopack` and
  `next start`. There is no custom server, so `createWebSocketServer` is never
  called.
- Its track, `apps/advantage-games/measure/tracks/competitive_multiplayer_20260425/`,
  has a three-phase plan of unmodified template text with every box unchecked
  and a spec whose acceptance criteria are five generic lines.

**What the existing protocol is.**

- `MessageType` is `JOIN`, `LEAVE`, `STATE_UPDATE`, `SCORE_SUBMIT`,
  `ROUND_START`, `ROUND_END`, `GAME_OVER`.
- `PlayerState` is `{id, name, score, wordsCollected, isConnected}`. There is no
  position, entity, or world state anywhere in the protocol. It describes a race
  between independent boards, not a shared world.
- `deserializeMessage` validates by hand — a `JSON.parse`, three `typeof`
  checks, an `Object.values(MessageType).includes`, then `return parsed as
  MultiplayerMessage`. Payloads are never validated.
- `game-session.ts` `DEFAULT_CONFIG` is `{totalRounds: 3, roundTimeLimitMs:
  120000, tickRateHz: 20}`.

**Defects visible before the audit begins.**

- `ws-server.ts` calls `getGlobalRoomManager()`, holding all room state in a
  process global. This works in single-process development and fails on any
  multi-instance deployment.
- `SCORE_SUBMIT` carries a client-computed `score` that the server accepts. The
  server already receives `submissions` and `currentWords` and could recompute.
- `getPlayerList` hardcodes `score: 0` and `wordsCollected: 0` for every player.
  It is currently reached only from `sendPlayerListUpdate` for `waiting`-state
  lobbies, so this may be intentional; the audit must decide.
- `HEARTBEAT_INTERVAL` is 30 s against a `HEARTBEAT_TIMEOUT` of 90 s.

**The simulation is not deterministic.**

- `apps/advantage-games/src/lib/games/wizardZombie.ts` (437 lines) exposes
  `advanceWizardZombieTime(state, dt, input, vocabulary)` at line 123 — the
  shape a synchronized simulation needs.
- `createWizardZombieState` accepts an injectable `rng` (line 77), but the tick
  path calls `Math.random()` directly at lines 237, 239, 247, 300, 333, 334,
  403, and 426, and builds zombie ids from `Date.now()` at line 316.
- Two clients given identical seeds and identical inputs therefore diverge at
  the first zombie spawn. No lockstep, rollback, or authoritative-simulation
  design can work until this is closed.
- The board is fixed at `GAME_WIDTH = 800` by `GAME_HEIGHT = 600` (lines 55-56),
  while `apps/advantage-games/AGENTS.md` requires mobile-first portrait at a
  390×844 reference.

**Platform seams that exist.**

- `packages/game-contracts/src/` already owns `educational-io.ts`,
  `completion.ts`, `architecture.ts`, and `host-proof-bindings.ts` — the natural
  home for a protocol contract.
- `packages/advantage-play-kit/src/systems/` already owns `bounded-frame-loop.ts`
  (with a 50 ms delta ceiling), `single-completion.ts`, `result-accounting.ts`,
  and `capability-manifest.ts`.
- `MountCartridgeOptions` (`runtime/types.ts:382`) already carries an **optional**
  `responsive` block that the runtime owns when present. An optional
  `multiplayer` block follows an established pattern rather than inventing one.
- Capability ids are governed, not free: `ACCEPTED_CAPABILITY_IDS`
  (`systems/capability-manifest.ts:100`) is a frozen array of exactly seven ids;
  `guards/accepted-inputs.ts:132` throws `APKUnsupportedCapabilityError` for
  anything else; and `systems/__tests__/capability-manifest.test.ts:12` asserts
  the exact array. `ACCEPTED_T10_INPUTS` (line 111) pins
  `acceptedManifestSha256`, which `guards/__tests__/accepted-inputs.test.ts:15`
  enforces.

**What does not exist.**

- No realtime substrate anywhere in the monorepo.
  `packages/activity-runtime/src/transport.ts` and `server.ts` are strict
  request/response session persistence for thin tRPC and HTTP adapters. There is
  no WebSocket, SSE, or push transport in any package.
- No deployment artifact for a long-lived socket process.
- **Tutor Advantage is not in this repository.** The only reference is
  `measure/product.md:49`, which names it as a billing-reconciliation
  counterparty. Its race implementation cannot be read from here and must be
  supplied before the protocol is frozen.

## Product and Boundary Decisions

1. **Two tiers, one protocol.** The race tier and the shared-world tier share
   one envelope, one version negotiation, and one lobby/room/results model. The
   shared-world tier adds message kinds; it does not fork the protocol.

2. **Shared world is not deferred.** Its blocking prerequisite is the
   determinism refactor (Story S2), which begins alongside the protocol work
   rather than after the race tier ships. S2 is independently valuable — it buys
   replay, reproducible bug reports, and deterministic host-proof evidence for a
   game that has none today.

3. **Tutor Advantage wins ties on race semantics.** Where its production
   protocol and the orphaned local one disagree, the production system is the
   reference. This repository does not get to redefine a mode that is already
   live elsewhere.

4. **Adopt-or-discard is decided by audit, not up front.** Story S0 produces a
   per-module verdict. Working room-code, host-transfer, reconnect, and
   heartbeat logic with tests is worth lifting; hand-rolled validation and
   process-global state are not.

5. **The server does not trust client scores.** The session service recomputes
   from submissions. Classroom supervision is not an authorization model.

6. **Rooms are tenant- and class-bound.** Identity comes from
   `packages/auth`; a teacher hosts and students join by code. There is no
   anonymous public matchmaking in this track.

7. **Results use the existing completion path.** Multiplayer outcomes flow
   through `single-completion` and `result-accounting` into the host-proof
   surface. No side channel.

8. **The session service is a standalone deployable, not a Next custom server.**
   A custom server contradicts the app's serverless deployment model and would
   silently reintroduce the process-global room state the audit condemns.

## Stories

### Story S0: Audit the orphaned implementation and harvest the reference protocol

Produce an adopt/lift/discard verdict for each of the nine multiplayer modules,
with a severity-ranked finding list covering at minimum the process-global room
manager, client-trusted scores, the hardcoded lobby player list, heartbeat
timing, room-code entropy and collision handling, host-transfer races, and
reconnect semantics. Obtain the Tutor Advantage protocol and record a semantic
diff against the local one. Read-only with respect to product code.

### Story S1: Freeze the `multiplayer.v1` contract in `game-contracts`

A versioned zod contract covering room, player, session, round, submission,
ranking, and error envelope, with explicit protocol-version negotiation, and
reserved message kinds for the shared-world tier. Replaces
`deserializeMessage`'s hand-rolled validation. Payloads are validated, not cast.

### Story S2: Make the Wizard vs Zombie simulation deterministic

Thread a seeded PRNG through `advanceWizardZombieTime`, replacing all eight
`Math.random()` call sites and the `Date.now()`-derived entity ids with
seed-and-counter derivation. Proven by a property test: two independently
constructed instances, identical seed and identical input sequence, byte-identical
state across a bounded tick count.

### Story S3: Add the multiplayer session capability to the Play Kit

`systems/multiplayer-session.ts` — a transport-agnostic client session covering
join, ready, round lifecycle, submission, and scoreboard, driven by the existing
bounded-frame scheduler. `MountCartridgeOptions` gains an optional `multiplayer`
block mirroring `responsive`. Extends `ACCEPTED_CAPABILITY_IDS` and its frozen
test and guard, with the T10 pin re-accepted.

### Story S4: Give the session service a deployable home

A standalone WebSocket service with room state outside the process, a container
build, and a deploy pipeline consistent with existing Cloud Build artifacts.
Rooms authenticate against Accounts-issued identity and bind to tenant and class.
Server-side score recomputation lands here.

### Story S5: Wizard vs Zombie race tier

The first adopting cartridge. Lobby, scoreboard, and podium bound to the
platform contract. Target-word selection becomes server-distributed so every
player races the same order against the same Thai prompts.

### Story S6: Wizard vs Zombie shared-world tier

Server-authoritative simulation on the deterministic reducer at the session
tick rate, with client prediction and reconciliation, plus a second capability
id. Resolves the fixed-board-versus-portrait-viewport conflict recorded in the
baseline. A second adopting game proves the contract is not Wizard-shaped.

### Story S7: Results and XP integration

Multiplayer results reach the host-proof and XP surfaces through the existing
single-completion and result-accounting systems.

## Non-Functional Requirements

- Every protocol message is schema-validated on both ends before use. No `as`
  casts across the transport boundary.
- The session service survives instance restart and player reconnect without
  losing a room in progress.
- Determinism is proven by test, not asserted in a comment.
- Shared-world play degrades to a stated, tested behavior on packet loss and on
  a dropped player rather than desyncing silently.
- Mobile portrait remains the reference viewport for both tiers.
- Coverage stays above the 80% the app's AGENTS.md requires for game code.

## Track-Level Acceptance Criteria

- [ ] The audit verdict and finding list exist, and every adopted module has a
      recorded justification.
- [ ] The Tutor Advantage protocol diff exists and the frozen contract is
      compatible with its race semantics.
- [ ] `multiplayer.v1` is published from `game-contracts` and consumed by both
      client and service.
- [ ] The determinism property test passes and no `Math.random` or `Date.now`
      remains in the Wizard vs Zombie tick path.
- [ ] A cartridge declares the multiplayer capability and runs a full race
      round — lobby to podium — without transport code of its own.
- [ ] The session service is deployed, tenant-bound, and recomputes scores.
- [ ] Wizard vs Zombie runs a shared-world round with two clients on one board.
- [ ] A second cartridge adopts the capability without protocol changes.
- [ ] Multiplayer results appear through the existing completion path.

## Out of Scope

- Anonymous public matchmaking, ranked ladders, and cross-school play.
- Voice or text chat.
- Spectator mode and replay playback UI, though S2 makes replay data possible.
- Migrating the other Play Kit cartridges beyond the single second adopter
  required to prove the contract.
- Any change to the `apps/advantage-games` legacy React-Konva/R3F surfaces
  beyond what S2 and S5 require of Wizard vs Zombie.
