# Specification: APK Shared Developer Kit and Authoring Workflow

## Overview

The APK foundation validates educational I/O, runtime lifecycle, host adapters,
low-level input, editions, and testing seams. It does not yet provide the complete
corpus-derived set of systems, components, responsive composition, test utilities,
and authoring workflow required to make game development substantially simpler.

This track implements only the exact post-approval hashes published by
`apk_independent_acceptance_handoff_20260712`. It standardizes repeated infrastructure
without forcing bespoke games into templates.

## Required predecessor artifacts

Work may not start until the T10 accepted manifest validates and supplies versioned:

- Game corpus and mechanic blueprints.
- Developer-effort baseline.
- Capability usage matrix and developer-capability ontology.
- Responsive composition matrix.
- Asset ontology links required by standard presentation capabilities.
- Gap priorities and dependent-track inputs.

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
- Supply theme-compatible touch controls with accessible labels and target sizes.
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

Components consume semantic theme bindings and layout regions; they do not import
Reading/Primary application state.

### FR7: Provide semantic asset loading and state registration

- Resolve semantic roles/states through edition-owned manifests.
- Deduplicate physical loads and register images, frames, animations, tiles,
  nine-slices, audio, and other accepted physical kinds.
- Fail closed with structured diagnostics when a required role/state is missing.
- Support development fixtures without allowing procedural or placeholder art to
  satisfy production readiness.
- Preserve theme-independent cartridge source.

### FR8: Provide a complete test and QC kit

- Deterministic random, clock, input, content, host, and asset fixtures.
- Unit-test helpers for educational progression and result calculation.
- Simulation helpers for accepted gameplay systems.
- Lifecycle/leak, one-canvas, exactly-once completion, and theme-parity guards.
- Compact/wide geometry fixtures and worst-case Thai/English text fixtures.
- Performance instrumentation for frame time, memory, objects, assets, and bundle size.
- Browser helpers for real input, resize/orientation, theme swap, and completion.

### FR9: Make the authoring workflow simple

- Provide a generator or scaffold for a new cartridge with manifest, scenes,
  logic, tests, responsive profiles, asset requirements, and QC registration.
- Supply one representative exemplar built entirely through public APK APIs.
- Provide focused documentation for the common path, extension path, and bespoke
  escape hatch.
- Provide actionable validation commands and errors.
- Advantage Games must allow fixture selection, theme/profile/input switching,
  diagnostics, safe-region overlays, restart, pause, mute, and result inspection.
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
- All affected lint, type, test, build, graph, generated-doc, and doctor gates pass.

## Acceptance criteria

- Every implemented shared capability traces to accepted corpus evidence.
- Every accepted Must-have developer capability is implemented or explicitly
  dependency-gated with product-owner approval.
- Compact and wide composition contracts pass the complete responsive matrix.
- The exemplar uses both themes and emits the unchanged result contract.
- Advantage Games provides a usable authoring/QC workflow.
- Reading and Primary package-import smokes remain green.
- Developer-effort comparison demonstrates material simplification.
- Independent review leaves no Critical, High, or Medium finding open.
- Product owner explicitly accepts the developer experience and exemplar.

## Out of scope

- Rebuilding the full catalog.
- Producing complete final theme packs.
- Moving authentication or persistence into APK.
- Standardizing a game mechanic without accepted corpus evidence.
- Hiding bespoke mechanics behind title-specific shared APIs.
- Reopening withdrawn production routes.
