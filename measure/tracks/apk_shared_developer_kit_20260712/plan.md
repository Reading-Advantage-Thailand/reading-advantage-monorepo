# Implementation Plan: APK Shared Developer Kit and Authoring Workflow

> **Track ID:** `apk_shared_developer_kit_20260712`
> **Blocked by:** exact accepted `apk_independent_acceptance_handoff_20260712`
> manifest hashes and accepted canonical standard-pack release `2026.07.23`
> (`ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`)

## Phase 0: Enforce accepted inputs and architecture [checkpoint: pending]

- [ ] Task: Validate the T10 acceptance record and accepted canonical-pack release; record exact predecessor artifact versions, catalog/source-receipt digests, and hashes
- [ ] Task: Use `createAcceptedStandardAssetResolver` as the only downstream
  resolver entry point and reject absent, stale, or mismatched accepted-release
  bindings before shared-kit initialization
- [ ] Task: Map each Must-have capability to owning package, public contract,
  source games, tests, and planned implementation slice
- [ ] Task: Write architecture and dependency guards for contracts, runtime,
  cartridges, hosts, and client-only Phaser imports
- [ ] Task: Audit surviving APK foundation APIs as retain, revise, replace, or remove
- [ ] Task: Retire or refactor the 75-file dual-pack ABI and edition/theme asset bindings behind the canonical standard-pack resolver without preserving them as a production compatibility surface
- [ ] Task: Publish versioned developer-kit API and compatibility plan bound to the accepted canonical-pack release, resolver schema, selected-union contract, and attribution contract
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Build session and educational progression primitives [checkpoint: pending]

- [ ] Task: Define typed contracts for session phases, deterministic content,
  attempts, feedback, optional state modules, and result accumulation
- [ ] Task: Write Red tests including empty content, duplicates, restart, terminal
  races, invalid results, and exactly-once completion
- [ ] Task: Implement accepted primitives without game-title-specific behavior
- [ ] Task: Migrate the exemplar to the public primitives and prove extensibility
- [ ] Task: Run focused coverage, lint, type, graph, and review gates
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Build input and reusable Phaser systems [checkpoint: pending]

- [ ] Task: Define input/action maps and accepted gameplay-system contracts from
  the capability ontology
- [ ] Task: Write deterministic Red tests for held/edge input, touch/pointer
  transforms, focus/cancel, movement, collision, spawning/pooling, and teardown
- [ ] Task: Implement only accepted shared systems with bounded extension points
- [ ] Task: Add accessible semantic touch-control components and hybrid-mode support
- [ ] Task: Prove no listeners, timers, objects, scenes, or browser gesture traps leak
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Implement responsive composition [checkpoint: pending]

- [ ] Task: Define schemas for geometry, profiles, input modes, safe areas,
  regions, camera policy, text classes, and cartridge layout declarations
- [ ] Task: Write Red geometry, hysteresis, overlap, text, safe-area, coordinate,
  and state-preservation tests across the required viewport matrix
- [ ] Task: Implement compact/wide resolution, region planning, gameplay viewport,
  coordinate transforms, camera helpers, and unsupported-size behavior
- [ ] Task: Implement Thai/English text measurement, fit diagnostics, and
  enlarged-accessibility recomposition
- [ ] Task: Implement resize/orientation/fullscreen transitions and QC region overlays
- [ ] Task: Verify real input and worst-case content in both compact and wide profiles using the canonical standard-pack binding
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Build standard game presentation components [checkpoint: pending]

- [ ] Task: Define semantic contracts for loading/error, instructions/start,
  pause/navigation, prompt/progress, HUD, feedback, and results
- [ ] Task: Write Red accessibility, layout, localization, lifecycle, canonical-pack, resolver, selected-union, and attribution tests
- [ ] Task: Implement Phaser/DOM presentation seams using standard regions and
  semantic canonical-pack bindings
- [ ] Task: Prove persistent/transient UI cannot obscure protected gameplay regions
- [ ] Task: Verify keyboard, pointer, touch, compact, wide, Thai, English, and enlarged text
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Harden semantic asset and audio loading [checkpoint: pending]

- [ ] Task: Align loader contracts to the accepted semantic/physical asset ontology and canonical-pack version, catalog digest, typed resolver, selected-union materializer, and attribution record
- [ ] Task: Write Red tests for missing roles/states, stale release/catalog digests, resolver parity, selected unions, deduplication, paths, frames, animations, tiles, nine-slices, audio, attribution, and development fallbacks
- [ ] Task: Implement semantic preload/registration helpers and structured failures
- [ ] Task: Prove cartridges contain no edition/theme paths, direct physical imports, copied pack files, private asset trees, or unpinned standard-pack bindings
- [ ] Task: Verify production readiness cannot be satisfied by placeholders or procedural art
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner

## Phase 6: Deliver deterministic testing and performance tooling [checkpoint: pending]

- [ ] Task: Implement clocks, RNG, input, content, host, asset, simulation, and
  result fixtures using accepted public contracts
- [ ] Task: Implement lifecycle/leak, one-canvas, canonical-pack, selected-union, attribution, responsive, text, and
  educational behavior assertion helpers
- [ ] Task: Implement frame-time, object, memory, asset, and bundle diagnostics
- [ ] Task: Add browser helpers for real input, resize/orientation, standard-pack gallery/search and attribution inspection, completion, restart, and navigation
- [ ] Task: Dogfood all helpers against the exemplar and adversarial fixtures
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md) — deferred:product-owner

## Phase 7: Ship scaffold, documentation, and Advantage Games QC [checkpoint: pending]

- [ ] Task: Implement a non-interactive cartridge generator/scaffold with manifest,
  logic, scenes, responsive declarations, canonical-pack version/digest, semantic
  requirements, selected-union materialization, attribution, tests, and QC registration
- [ ] Task: Build a representative exemplar entirely through public APK APIs
- [ ] Task: Document quickstart, canonical-pack contracts, standard systems,
  composition, resolver use, selected-union builds, attribution, testing, extension,
  bespoke escape hatch, migration, and troubleshooting
- [ ] Task: Build QC controls for content, difficulty, canonical-pack release and
  searchable gallery, profile, input mode, safe regions, text fixtures, diagnostics,
  attribution, pause, mute, restart, and results
- [ ] Task: Verify a clean generated cartridge runs without copied game infrastructure
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md) — deferred:product-owner

## Phase 8: Prove simplification and accept the kit [checkpoint: pending]

- [ ] Task: Compare exemplar implementation and workflow to the accepted developer baseline
- [ ] Task: Record authored versus generated files, bespoke LOC, steps, reusable
  systems, tests, and duplicated infrastructure avoided
- [ ] Task: Run full affected lint, type, test, coverage, build, graph, generated-doc,
  doctor, performance, package-boundary, canonical-pack static enforcement,
  selected-union, attribution, and browser gates
- [ ] Task: Re-run Reading/Primary import smokes and stable I/O compatibility tests
- [ ] Task: Run independent review and remediate every Critical, High, and Medium finding
- [ ] Task: BLOCKED — Obtain explicit product-owner developer-experience and exemplar acceptance — deferred:product-owner
- [ ] Task: Publish versioned kit inputs for cartridge cohort tracks with future-game scaffold defaults pinned to the accepted canonical-pack release
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 8' (Protocol in workflow.md) — deferred:product-owner
