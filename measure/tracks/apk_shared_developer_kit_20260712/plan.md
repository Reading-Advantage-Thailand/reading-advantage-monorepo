# Implementation Plan: APK Shared Developer Kit and Authoring Workflow

> **Track ID:** `apk_shared_developer_kit_20260712`
> **Blocked by:** exact accepted `apk_independent_acceptance_handoff_20260712`
> manifest hashes and accepted canonical standard-pack release `2026.07.23`
> (`ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`)

## Phase 0: Enforce accepted inputs and architecture [checkpoint: pending]

- [b] Task: Validate the T10 acceptance record and accepted canonical-pack release; record exact predecessor artifact versions, catalog/source-receipt digests, and hashes — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Use `createAcceptedStandardAssetResolver` as the only downstream — deferred:apk_independent_acceptance_handoff_20260712
  resolver entry point and reject absent, stale, or mismatched accepted-release
  bindings before shared-kit initialization
- [b] Task: Map each Must-have capability to owning package, public contract, — deferred:apk_independent_acceptance_handoff_20260712
  source games, tests, and planned implementation slice
- [b] Task: Write architecture and dependency guards for contracts, runtime, — deferred:apk_independent_acceptance_handoff_20260712
  cartridges, hosts, and client-only Phaser imports
- [b] Task: Audit surviving APK foundation APIs as retain, revise, replace, or remove — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Retire or refactor the 75-file dual-pack ABI and edition/theme asset bindings behind the canonical standard-pack resolver without preserving them as a production compatibility surface — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Publish versioned developer-kit API and compatibility plan bound to the accepted canonical-pack release, resolver schema, selected-union contract, and attribution contract — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Build session and educational progression primitives [checkpoint: pending]

- [b] Task: Define typed contracts for session phases, deterministic content, — deferred:apk_independent_acceptance_handoff_20260712
  attempts, feedback, optional state modules, and result accumulation
- [b] Task: Write Red tests including empty content, duplicates, restart, terminal — deferred:apk_independent_acceptance_handoff_20260712
  races, invalid results, and exactly-once completion
- [b] Task: Implement accepted primitives without game-title-specific behavior — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Migrate the exemplar to the public primitives and prove extensibility — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Run focused coverage, lint, type, graph, and review gates — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Build input and reusable Phaser systems [checkpoint: pending]

- [b] Task: Define input/action maps and accepted gameplay-system contracts from — deferred:apk_independent_acceptance_handoff_20260712
  the capability ontology
- [b] Task: Write deterministic Red tests for held/edge input, touch/pointer — deferred:apk_independent_acceptance_handoff_20260712
  transforms, focus/cancel, movement, collision, spawning/pooling, and teardown
- [b] Task: Implement only accepted shared systems with bounded extension points — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Add accessible semantic touch-control components and hybrid-mode support — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Prove no listeners, timers, objects, scenes, or browser gesture traps leak — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Implement responsive composition [checkpoint: pending]

- [b] Task: Define schemas for geometry, profiles, input modes, safe areas, — deferred:apk_independent_acceptance_handoff_20260712
  regions, camera policy, text classes, and cartridge layout declarations
- [b] Task: Write Red geometry, hysteresis, overlap, text, safe-area, coordinate, — deferred:apk_independent_acceptance_handoff_20260712
  and state-preservation tests across the required viewport matrix
- [b] Task: Implement compact/wide resolution, region planning, gameplay viewport, — deferred:apk_independent_acceptance_handoff_20260712
  coordinate transforms, camera helpers, and unsupported-size behavior
- [b] Task: Implement Thai/English text measurement, fit diagnostics, and — deferred:apk_independent_acceptance_handoff_20260712
  enlarged-accessibility recomposition
- [b] Task: Implement resize/orientation/fullscreen transitions and QC region overlays — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Verify real input and worst-case content in both compact and wide profiles using the canonical standard-pack binding — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Build standard game presentation components [checkpoint: pending]

- [b] Task: Define semantic contracts for loading/error, instructions/start, — deferred:apk_independent_acceptance_handoff_20260712
  pause/navigation, prompt/progress, HUD, feedback, and results
- [b] Task: Write Red accessibility, layout, localization, lifecycle, canonical-pack, resolver, selected-union, and attribution tests — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Implement Phaser/DOM presentation seams using standard regions and — deferred:apk_independent_acceptance_handoff_20260712
  semantic canonical-pack bindings
- [b] Task: Prove persistent/transient UI cannot obscure protected gameplay regions — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Verify keyboard, pointer, touch, compact, wide, Thai, English, and enlarged text — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Harden semantic asset and audio loading [checkpoint: pending]

- [b] Task: Align loader contracts to the accepted semantic/physical asset ontology and canonical-pack version, catalog digest, typed resolver, selected-union materializer, and attribution record — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Write Red tests for missing roles/states, stale release/catalog digests, resolver parity, selected unions, deduplication, paths, frames, animations, tiles, nine-slices, audio, attribution, and development fallbacks — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Implement semantic preload/registration helpers and structured failures — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Prove cartridges contain no edition/theme paths, direct physical imports, copied pack files, private asset trees, or unpinned standard-pack bindings — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Verify production readiness cannot be satisfied by placeholders or procedural art — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner

## Phase 6: Deliver deterministic testing and performance tooling [checkpoint: pending]

- [b] Task: Implement clocks, RNG, input, content, host, asset, simulation, and — deferred:apk_independent_acceptance_handoff_20260712
  result fixtures using accepted public contracts
- [b] Task: Implement lifecycle/leak, one-canvas, canonical-pack, selected-union, attribution, responsive, text, and — deferred:apk_independent_acceptance_handoff_20260712
  educational behavior assertion helpers
- [b] Task: Implement frame-time, object, memory, asset, and bundle diagnostics — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Add browser helpers for real input, resize/orientation, standard-pack gallery/search and attribution inspection, completion, restart, and navigation — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Dogfood all helpers against the exemplar and adversarial fixtures — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md) — deferred:product-owner

## Phase 7: Ship scaffold, documentation, and Advantage Games QC [checkpoint: pending]

- [b] Task: Implement a non-interactive cartridge generator/scaffold with manifest, — deferred:apk_independent_acceptance_handoff_20260712
  logic, scenes, responsive declarations, canonical-pack version/digest, semantic
  requirements, selected-union materialization, attribution, tests, and QC registration
- [b] Task: Build a representative exemplar entirely through public APK APIs — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Document quickstart, canonical-pack contracts, standard systems, — deferred:apk_independent_acceptance_handoff_20260712
  composition, resolver use, selected-union builds, attribution, testing, extension,
  bespoke escape hatch, migration, and troubleshooting
- [b] Task: Build QC controls for content, difficulty, canonical-pack release and — deferred:apk_independent_acceptance_handoff_20260712
  searchable gallery, profile, input mode, safe regions, text fixtures, diagnostics,
  attribution, pause, mute, restart, and results
- [b] Task: Verify a clean generated cartridge runs without copied game infrastructure — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md) — deferred:product-owner

## Phase 8: Prove simplification and accept the kit [checkpoint: pending]

- [b] Task: Compare exemplar implementation and workflow to the accepted developer baseline — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Record authored versus generated files, bespoke LOC, steps, reusable — deferred:apk_independent_acceptance_handoff_20260712
  systems, tests, and duplicated infrastructure avoided
- [b] Task: Run full affected lint, type, test, coverage, build, graph, generated-doc, — deferred:apk_independent_acceptance_handoff_20260712
  doctor, performance, package-boundary, canonical-pack static enforcement,
  selected-union, attribution, and browser gates
- [b] Task: Re-run Reading/Primary import smokes and stable I/O compatibility tests — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: Run independent review and remediate every Critical, High, and Medium finding — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Obtain explicit product-owner developer-experience and exemplar acceptance — deferred:product-owner
- [b] Task: Publish versioned kit inputs for cartridge cohort tracks with future-game scaffold defaults pinned to the accepted canonical-pack release — deferred:apk_independent_acceptance_handoff_20260712
- [b] Task: BLOCKED — Measure - User Manual Verification 'Phase 8' (Protocol in workflow.md) — deferred:product-owner
