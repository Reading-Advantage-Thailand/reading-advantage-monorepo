# Specification: APK Shared Developer Kit and Authoring Workflow

## Overview

The APK foundation validates educational I/O, runtime lifecycle, host adapters,
low-level input, legacy edition seams, and testing seams. It does not yet provide the complete
corpus-derived set of systems, components, responsive composition, test utilities,
and authoring workflow required to make game development substantially simpler.

This track implements only the exact post-approval hashes published by
`apk_independent_acceptance_handoff_20260712`. It standardizes repeated infrastructure
without forcing bespoke games into templates.

## Required predecessor artifacts

Work may not start until the T10 accepted manifest validates and supplies versioned:

- Accepted manifest SHA-256 `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`.
- Successor hash-set SHA-256 `c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005`.
- Owner-acceptance SHA-256 `165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753`.

- Game corpus and mechanic blueprints.
- Developer-effort baseline.
- Capability usage matrix and developer-capability ontology.
- Responsive composition matrix.
- Asset ontology links required by standard presentation capabilities.
- Gap priorities and dependent-track inputs.
- An accepted `apk_dual_theme_asset_production_20260712` canonical-pack release
  record, including pack version, catalog digest, source-receipt digest, resolver
  schema, selected-union materializer contract, and required attribution text.

The accepted boundary includes seven capability contracts but zero accepted
runtime contracts and zero approved asset mappings. T11 must not treat blocked
responsive evidence, any of the 85 blocked mappings, or non-exact claim rows as
accepted historical behavior.

## Owner-authorized extension (2026-07-26)

`t11-owner-authorized-extension-v1.json` additively supersedes only the prior
dependency-gated implementation ceiling. The T10 hashes above and the bounded
T11 acceptance remain immutable historical records. Under this extension:

- The responsive specification is a normative forward product contract, not a
  claim that T10 accepted responsive legacy evidence.
- Explicit canonical mappings may be published as owner-approved product
  bindings; they do not approve or reclassify T10's 85 historical adoption rows.
- Phases 2-8 may implement runtime, responsive, presentation, semantic asset,
  testing/QC, authoring, exemplar, and scaffold behavior without another scope
  approval gate.
- Invalid geometry, configuration, release bindings, semantic requirements,
  attribution, and unsupported sizes must fail closed.

## Functional requirements

### FR1: Preserve the package and host boundaries

- `@reading-advantage/game-contracts` owns browser-safe vocabulary, sentence,
  result, and manifest contracts.
- `@reading-advantage/advantage-play-kit` owns shared Phaser runtime, systems,
  responsive composition, UI/runtime adapters, diagnostics, and test primitives.
- `@reading-advantage/game-cartridges` owns game-specific cartridge code and
  justified shared family modules.
- Advantage Games owns authoring/QC application surfaces, not reusable gameplay logic.
- Reading and Primary hosts import packages and retain identity/persistence ownership.

### FR2: Provide standard session and educational progression systems

Implement the accepted corpus-backed capabilities for:

- Start, playing, paused, terminal, result, restart, and destroy transitions.
- Deterministic vocabulary/sentence selection and progression.
- Correct/incorrect attempt recording and feedback events.
- Standard result accumulation for score, accuracy, correct answers, total
  attempts, and display XP.
- Optional corpus-approved modules for combo, health/lives, timers, waves, and
  other repeated state without requiring unused systems.
- Exactly-once completion and host-owned authoritative persistence.

Cartridges must be able to replace or extend game-specific rules while reusing
session infrastructure.

### FR3: Provide standard input and control capabilities

- Normalize keyboard, pointer, touch, tap, drag, typing, directional/D-pad,
  action, and hybrid modes proven by the corpus.
- Provide edge-triggered and held-state inputs, coordinate conversion, gesture
  cancellation, focus handling, and deterministic injected test input.
- Supply standard-pack-compatible touch controls with accessible labels and target sizes.
- Keep input mode independent from compact/wide layout selection.
- Guarantee teardown without leaked listeners or trapped browser gestures.

### FR4: Implement accepted reusable gameplay systems

- Implement only systems accepted by the capability ontology.
- Expected domains include movement, bounds, collision, collection, spawning,
  pooling, projectiles, target action, sequencing, camera, indicators, timers,
  animation, VFX, and audio where corpus evidence supports reuse.
- Each system exposes bounded configuration and extension points rather than
  game-title-specific flags.
- Shared systems must be deterministic or controllably clocked where practical.
- Game-specific mechanic composition stays in cartridges.

### FR5: Implement responsive composition

Implement `/measure/apk-responsive-game-composition-spec.md`, including:

- Geometry-based `compact`/`wide` profile resolution.
- Independent touch/pointer-keyboard/hybrid input-mode resolution.
- Safe areas, reserved regions, gameplay viewport, anchors, coordinate transforms,
  and unsupported-size handling.
- Camera and world adaptation helpers.
- Standard HUD, prompt, feedback, control, navigation, modal, and result regions.
- Locale-aware Thai/English text measurement and overflow diagnostics.
- State-preserving resize, orientation, and fullscreen transitions.
- QC debug overlays and automated geometry/overlap checks.

Phaser `FIT`, CSS breakpoints, or uniform scaling alone cannot satisfy this requirement.

### FR6: Provide standard presentation components

Implement accepted shared components for:

- Loading and actionable error states.
- Instructions and start flow.
- Pause, mute, restart, exit, and confirmation.
- Educational prompt and progress.
- HUD/status and optional secondary statistics.
- Correct/incorrect and transient gameplay feedback.
- Victory/defeat/complete results and replay/exit actions.
- Accessible DOM equivalents for required non-canvas information.

Components consume semantic canonical-pack bindings and layout regions; they do not import
Reading/Primary application state.

### FR7: Provide semantic asset loading and state registration

- Resolve semantic roles/states through the accepted canonical standard-pack
  binding and typed resolver; cartridge manifests pin the pack version and
  catalog digest rather than an edition or theme path.
- Deduplicate physical loads and register images, frames, animations, tiles,
  nine-slices, audio, and other accepted physical kinds.
- Fail closed with structured diagnostics when a required role/state is missing.
- Support development fixtures without allowing procedural or placeholder art to
  satisfy production readiness.
- Preserve pack-independent cartridge source: cartridges request semantic
  roles/states and cannot import physical files, vendor filenames, or private pack trees.
- Carry required ElvGames attribution into the shared Credits/About or end-screen
  contract used by cartridge hosts and QC.

### FR8: Provide a complete test and QC kit

- Deterministic random, clock, input, content, host, and asset fixtures.
- Unit-test helpers for educational progression and result calculation.
- Simulation helpers for accepted gameplay systems.
- Lifecycle/leak, one-canvas, exactly-once completion, canonical-pack binding,
  selected-union, attribution, and resolver-parity guards.
- Compact/wide geometry fixtures and worst-case Thai/English text fixtures.
- Performance instrumentation for frame time, memory, objects, assets, and bundle size.
- Browser helpers for real input, resize/orientation, canonical-pack gallery and
  attribution inspection, and completion.

### FR9: Make the authoring workflow simple

- Provide a generator or scaffold for a new cartridge with manifest, scenes,
  logic, tests, responsive profiles, canonical-pack version/digest binding,
  semantic asset requirements, attribution registration, and QC registration.
- Supply one representative exemplar built entirely through public APK APIs.
- Provide focused documentation for the common path, extension path, and bespoke
  escape hatch.
- Provide actionable validation commands and errors.
- Advantage Games must allow fixture selection, canonical-pack gallery/search and
  release inspection, profile/input switching, diagnostics, safe-region overlays,
  restart, pause, mute, attribution inspection, and result inspection.
- The common workflow must not require copying another game's source tree.

### FR10: Prove development is simpler

Against the predecessor baseline:

- Implement a bounded representative game or vertical slice using the new kit.
- Record generated versus authored files, bespoke logic size, duplicated
  infrastructure avoided, setup steps, and test effort.
- Demonstrate that the exemplar does not recreate lifecycle, input, responsive,
  UI, asset, result, or test infrastructure.
- Treat failure to materially simplify the workflow as a track blocker.

## Non-functional requirements

- TypeScript strictness and Zod validation at external/configuration boundaries.
- JSDoc for all exported APIs.
- More than 80% focused coverage for new shared code.
- Stable 60 FPS target on supported mid-range devices with documented budgets.
- Tree-shakeable/client-only Phaser imports and no unrelated app bundle inflation.
- No provider-specific asset or application coupling.
- No new legacy renderer use in cartridges.
- Static and package-boundary enforcement rejects the retired 75-file dual-pack
  ABI, edition/theme asset bindings, direct physical asset imports, copied pack
  trees, unpinned standard-pack releases, and missing attribution registration.
- All affected lint, type, test, build, graph, generated-doc, and doctor gates pass.

## Acceptance criteria

- Every implemented shared capability traces to accepted corpus evidence.
- Every accepted Must-have developer capability is implemented or explicitly
  dependency-gated with product-owner approval.
- Compact and wide composition contracts pass the complete responsive matrix.
- The exemplar and every newly scaffolded cartridge use the accepted canonical
  standard-pack binding, materialize only their selected union, expose required
  attribution, and emit the unchanged result contract.
- Advantage Games provides a usable authoring/QC workflow.
- Reading and Primary package-import smokes remain green.
- Developer-effort comparison demonstrates material simplification.
- Independent review leaves no Critical, High, or Medium finding open.
- Product owner explicitly accepts the developer experience and exemplar.

## Out of scope

- Rebuilding the full catalog.
- Producing an alternative production asset pack or restoring the retired
  dual-pack ABI.
- Moving authentication or persistence into APK.
- Standardizing a game mechanic without accepted corpus evidence.
- Hiding bespoke mechanics behind title-specific shared APIs.
- Reopening withdrawn production routes.
