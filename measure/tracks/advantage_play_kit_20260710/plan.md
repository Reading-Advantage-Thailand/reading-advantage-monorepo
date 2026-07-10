# Implementation Plan: Phaser 4 Advantage Play Kit

> **Track ID:** `advantage_play_kit_20260710`
> **Track type:** Story-shaped feature
> **Successor to:** `wave3_product_alignment_20260628`, `babel-architect-phaser-exemplar_20260708` (cancelled), and `r3f_rendering_tier_20260708` (cancelled)

## Planning Evidence

- The fresh graph contains 23,009 nodes across 2,777 files and finds duplicated `GameStartScreen`, `VocabularyItem`, and `gameCards` surfaces in Advantage Games and Reading, but no retained Phaser symbol.
- Existing game-builder/templates establish `{ term, translation }[]` inputs and `GameResults` with `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`; these are compatibility constraints even though renderer internals are not.
- `apps/advantage-games/measure/tech-stack.md` and `apps/advantage-games/AGENTS.md` still describe React-Konva/Phaser 3/R3F tiers; architecture documentation must change before code.
- Wave 3 delivered canonical server-authoritative completion/persistence and a narrow Haunted Library import harness, but intentionally deferred a real shared runtime package and the remaining catalog.
- The app-local Babel and R3F tracks were cancelled on 2026-07-10; their specifications are evidence only and their implementation code is not a baseline.
- Existing dirty worktree changes, including cancelled-track cleanup and asset experiments, are user-owned and must not be overwritten or staged by this track.

## Phase S1: Freeze the APK architecture
_Story ref: spec.md#story-s1_

- [x] Task: Freeze the educational I/O compatibility contracts
  - [ ] Define browser-safe Zod schemas for `VocabularyItem[]`, `SentenceInput`, and `GameResults`
  - [ ] Preserve established field names, units, array calling convention, and display-XP semantics
  - [ ] Document host mapping from `GameResults` to the authoritative server completion contract
- [x] Task: Define the APK architecture decision and package map
  - [ ] Specify `GameCartridgeDefinition`, `GameEdition`, `APKHostAdapter`, and package ownership at decision-record level
  - [ ] Record mechanic intent, not legacy renderer compatibility, as the rebuild invariant
  - [ ] Record Advantage Games as the QC host and defer the authenticated arcade product
- [x] Task: Write failing compatibility, architecture, and version guards
  - [ ] Add counterexample-backed tests that reject drift in the stable educational I/O ABI
  - [ ] Add a guard rejecting new React-Konva/R3F cartridges outside a named legacy allowlist
  - [ ] Add guards requiring stable Phaser 4 and forbidding Next/auth/DB/app-private imports in cartridges
- [x] Task: Update root and app-local architecture guidance
  - [ ] Replace renderer-tier guidance with Phaser 4 APK policy for new and rebuilt games
  - [ ] Document Primary Chibi and Secondary Epic editions
  - [ ] Mark the cancelled Phaser 3/R3F experiments as superseded evidence
- [x] Task: Update game-agent and game-builder guidance
  - [ ] Rewrite `apps/advantage-games/AGENTS.md` around APK cartridges, stable I/O, and QC workflow
  - [ ] Replace React-Konva-first builder instructions with Phaser 4 cartridge and edition rules
  - [ ] Preserve unrelated user edits in the currently dirty skill file
- [~] Task: Pin Phaser 4 and complete phase verification
  - [ ] Select the current stable Phaser 4 release under repository version policy
  - [ ] Update workspace catalog, affected manifests, lockfile, and a minimal client-only build proof
  - [ ] Run graph update/audit, `measure/generate.sh`, and `measure/doctor.sh`
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the APK architecture' (Protocol in workflow.md)

## Phase S2: Build the Phaser runtime
_Story ref: spec.md#story-s2_

- [x] Task: Define strict APK runtime and host schemas
  - [ ] Define runtime API version, cartridge manifest, lifecycle, input, navigation, telemetry, and structured errors
  - [ ] Reference the frozen vocabulary/sentence/result schemas rather than replacing them
  - [ ] Separate browser-safe exports from server/host adapters and document all exports
- [x] Task: Write failing runtime contract and lifecycle tests
  - [ ] Validate accepted/rejected manifests, array inputs, and game-result outputs
  - [ ] Prove mount/restart/destroy idempotency and completion-once behavior
  - [ ] Prove invalid capabilities and missing content fail with structured errors
- [x] Task: Implement the Phaser 4 runtime core
  - [ ] Implement boot/configuration, scene registration, resize/scaling, visibility pause, restart, and teardown
  - [ ] Implement normalized keyboard, pointer, touch, virtual controls, and browser-gesture handling
  - [ ] Add timing, tween, animation, physics, camera, particle, audio, and object-pool helpers only where exercised
- [x] Task: Implement the React/Next host bridge
  - [ ] Add client-only dynamic mounting without importing Phaser into server bundles
  - [ ] Provide accessible DOM loading, instruction, pause, error, and result overlays
  - [ ] Expose navigation, telemetry, and completion mapping without application-global imports
- [x] Task: Implement the APK test kit
  - [ ] Provide deterministic RNG/input fixtures and a mock host adapter
  - [ ] Provide scene/lifecycle and stable-I/O assertions with counterexamples
  - [ ] Detect leaked canvases, listeners, timers, and animation frames
- [x] Task: Verify runtime quality and bundle isolation
  - [ ] Achieve more than 80% coverage for new runtime/contracts code
  - [ ] Run lint, type-check, unit tests, package builds, and a Next build
  - [ ] Verify unrelated routes do not include Phaser or cartridge chunks
- [~] Task: Generate runtime docs and complete phase verification
  - [ ] Document cartridge authoring, extension rules, and host mapping
  - [ ] Run graph update/audit, `measure/generate.sh`, and `measure/doctor.sh`
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Build the Phaser runtime' (Protocol in workflow.md)

## Phase S3: Support audience editions
_Story ref: spec.md#story-s3_

- [x] Task: Define edition and asset-pack contracts
  - [ ] Define semantic slots, atlas/animation/audio/font metadata, audience tuning, licensing, and version schemas
  - [ ] Separate required game slots from optional edition presentation capabilities
  - [ ] Define safe tuning ranges without changing educational I/O shapes
- [x] Task: Write failing edition validation tests
  - [ ] Reject missing slots, invalid frames, unsupported tuning, missing provenance, and incompatible runtime versions
  - [ ] Prove one game source resolves two editions without hard-coded asset branches
  - [ ] Add counterexample packs for every source-scan guard
- [x] Task: Implement edition resolution and asset loading
  - [ ] Resolve semantic keys to Phaser preload operations
  - [ ] Support local development manifests and host-resolved versioned URLs
  - [ ] Report actionable preload, decoding, and compatibility failures
- [x] Task: Create base Primary and Secondary editions
  - [ ] Create Primary Chibi tokens, placeholders, feedback, and audience tuning
  - [ ] Create Secondary Epic tokens, placeholders/approved assets, feedback, and tuning
  - [ ] Record original or properly licensed artwork provenance
- [x] Task: Document the generated-asset import boundary
  - [ ] Specify normalization, naming, sizing, transparency, atlas packing, compression, and manifest output
  - [ ] Document how `pixelart-benchmark` or another authoring tool can feed the importer later
  - [ ] Define asset review and rejection evidence
- [~] Task: Verify editions and complete phase verification
  - [ ] Run schema, asset, memory-budget, lint, type-check, test, and build gates
  - [ ] Run graph update/audit, `measure/generate.sh`, and `measure/doctor.sh`
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Support audience editions' (Protocol in workflow.md)

## Phase S4: Operate the QC testbed
_Story ref: spec.md#story-s4_

- [x] Task: Define the Advantage Games QC-host contract
  - [ ] Define catalog, launch, edition selection, vocabulary/sentence fixtures, debug, and mock-completion states
  - [ ] Define structured QC evidence per cartridge/edition
  - [ ] Keep real auth/database persistence out of the testbed contract
- [x] Task: Write failing testbed UI and routing tests
  - [ ] Test discovery, dynamic loading, edition switching, fixtures, errors, and navigation
  - [ ] Test compatible `GameResults` inspection and reset/restart behavior
  - [ ] Test mobile and desktop control affordances
- [x] Task: Implement the APK catalog and launcher
  - [ ] Add registry-driven dynamic APK cartridge loading
  - [ ] Add edition, fixture, locale, and difficulty controls
  - [ ] Preserve unmigrated games behind an explicit legacy catalog section
- [x] Task: Implement QC diagnostics
  - [ ] Add FPS/frame-time, viewport, input, asset, runtime, scene, and result diagnostics
  - [ ] Add pause, mute, restart, debug overlay, and crash recovery
  - [ ] Render errors outside the canvas with actionable context
- [x] Task: Add browser QC smoke coverage
  - [ ] Start the documented dev server and verify hot reload plus direct cartridge navigation
  - [ ] Add Playwright smoke for desktop and 390x844 touch viewports
  - [ ] Verify repeated launch/destroy cycles do not accumulate canvases or listeners
- [~] Task: Document QC workflow and complete phase verification
  - [ ] Write the product-owner checklist for both editions and result evidence
  - [ ] Run lint, type-check, unit, Playwright, build, graph, generate, and doctor gates
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Operate the QC testbed' (Protocol in workflow.md)

## Phase S5: Prove representative cartridges
_Story ref: spec.md#story-s5_

- [x] Task: Approve three representative mechanic blueprints
  - [ ] Define a gate runner inspired by Dragon Flight
  - [ ] Define a sentence-order collection game inspired by the sentence-game inventory
  - [ ] Define a defense or typing game inspired by Magic Defense or another approved prototype
- [x] Task: Write failing learning-loop and cartridge-contract tests
  - [ ] Test correct/incorrect handling, progression, win/loss, result metrics, and seeded behavior
  - [ ] Test required APK capabilities and edition slots
  - [ ] Assert stable I/O and mechanic intent without legacy visual/behavior parity
- [x] Task: Build the Phaser-native gate-runner cartridge
  - [ ] Use APK input, physics/collision, camera, spawning, animation, pooling, and result systems
  - [ ] Implement Primary and Secondary edition tuning
  - [ ] Verify keyboard and touch play
- [x] Task: Build the Phaser-native sentence-collection cartridge
  - [ ] Use APK sequencing, collision, feedback, difficulty, and result systems
  - [ ] Implement Primary and Secondary edition tuning
  - [ ] Verify sentence progress is pedagogically sound without leaking answers
- [x] Task: Build the Phaser-native defense/typing cartridge
  - [ ] Use APK typing, wave, projectile/pool, timing, feedback, and result systems
  - [ ] Implement Primary and Secondary edition tuning
  - [ ] Verify keyboard-first and touch-accessible paths
- [x] Task: Validate cartridge quality
  - [ ] Achieve more than 80% coverage for new cartridge logic and adapters
  - [ ] Run restart, resize, pause, asset-failure, result-shape, and completion-once tests
  - [ ] Meet frame-time, memory, readability, and bundle budgets
- [~] Task: Complete gameplay QC and phase verification
  - [ ] Run lint, type-check, unit, Playwright, build, graph, generate, and doctor gates
  - [ ] Present all three cartridges in both editions through the dev server
  - [ ] Task: Measure - User Manual Verification 'Phase S5: Prove representative cartridges' (Protocol in workflow.md)

## Phase S6: Prove host consumption
_Story ref: spec.md#story-s6_
_Graph context: game shells, `VocabularyItem`, and catalogs are duplicated across Advantage Games and Reading; the new host contract replaces this copy boundary._

- [x] Task: Define registry and host-adapter contracts
  - [ ] Define enabled-game configuration, edition selection, stable array input, navigation, telemetry, and result mapping
  - [ ] Define dynamic loader failure behavior without eager cartridge imports
  - [ ] Define server-derived identity/tenant requirements for production adapters
- [x] Task: Write failing package-consumption tests
  - [ ] Prove hosts consume cartridges through public package exports and unchanged educational I/O
  - [ ] Prove app-private aliases, copied asset paths, and direct DB/auth imports fail guards
  - [ ] Prove host completion mapping rejects cartridge-supplied identity, tenant, and authoritative XP
- [x] Task: Implement the shared registry and generic host component
  - [ ] Build typed dynamic cartridge/edition registration
  - [ ] Build generic loading/error/accessibility/result orchestration
  - [ ] Preserve tree-shaking and client-only Phaser isolation
- [x] Task: Add the Reading Advantage import smoke
  - [ ] Supply representative vocabulary/sentence arrays through the stable ABI
  - [ ] Select Secondary Epic edition
  - [ ] Validate navigation and host mapping from `GameResults` to canonical completion
- [x] Task: Add the Primary Advantage import smoke
  - [ ] Supply representative vocabulary/sentence arrays through the same ABI
  - [ ] Select Primary Chibi edition
  - [ ] Validate navigation and host mapping from `GameResults` to canonical completion
- [~] Task: Verify cross-host consumption and complete phase verification
  - [ ] Run affected package/app lint, type-check, test, build, and no-copy guards
  - [ ] Run graph update/audit, `measure/generate.sh`, and `measure/doctor.sh`
  - [ ] Task: Measure - User Manual Verification 'Phase S6: Prove host consumption' (Protocol in workflow.md)

## Phase S7: Plan catalog rebuild waves
_Story ref: spec.md#story-s7_

- [x] Task: Create the prototype-to-mechanic inventory
  - [ ] Record each game's mechanic, learning-input mode, controls, audience, reusable systems, assets, copies, and disposition
  - [ ] Treat current implementation as evidence, not a compatibility obligation
  - [ ] Reconcile catalog, route, source, and shared game-enum drift
- [x] Task: Group games into rebuild cohorts
  - [ ] Define runner/collector, arena/shooter, defense, sequencing, puzzle/matching, and justified additional families
  - [ ] Identify APK prerequisites per cohort
  - [ ] Rank cohorts by product value, unfinished-game priority, duplication, and asset readiness
- [x] Task: Define cartridge cutover and deletion criteria
  - [ ] Require product-owner QC, host smoke, stable I/O, canonical completion mapping, mobile controls, and asset provenance
  - [ ] Identify exact legacy routes, components, logic, APIs, and assets removable after cutover
  - [ ] Prohibit deletion without track-scoped evidence
- [b] Task: Create bounded successor Measure tracks — deferred:product-owner
  - [ ] Create one track per approved cohort or exceptional game
  - [ ] Carry blueprints, edition requirements, APK dependencies, stable I/O, and acceptance gates forward
  - [ ] Keep authenticated standalone-arcade work in a separate product track
- [b] Task: Close the foundation track — deferred:product-owner
  - [ ] Run final lint, type-check, test, Playwright, build, coverage, graph, generate, and doctor gates
  - [ ] Record product-owner QC evidence, deviations, remaining debt, and retrospective lessons
  - [ ] Task: Measure - User Manual Verification 'Phase S7: Plan catalog rebuild waves' (Protocol in workflow.md)
