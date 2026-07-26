# Implementation Plan: APK Shared Developer Kit and Authoring Workflow

> **Track ID:** `apk_shared_developer_kit_20260712`
> **Accepted T10 input:** manifest SHA-256
> `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`,
> hash-set SHA-256 `c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005`,
> and canonical standard-pack release `2026.07.23`
> (`ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`).
> Bounded T11 completed 2026-07-26 only for the seven accepted capabilities and
> forward kit contracts. Runtime acceptance and all 85 historical asset mappings
> were blocked in that acceptance. Historical acceptance:
> [t11-owner-delegated-acceptance-v1.json](./t11-owner-delegated-acceptance-v1.json).
> **Reopened 2026-07-26:**
> [t11-owner-authorized-extension-v1.json](./t11-owner-authorized-extension-v1.json)
> supersedes only the prior dependency-gated implementation ceiling. The bound
> T10 evidence and bounded T11 acceptance remain immutable historical records.

## Implementation summary

The original bounded delivery remains immutable history. Its Phases 0, 1, 2,
5 (resolver contract), 6, 7, and simplification report were accepted while
responsive, presentation, runtime, browser, performance, and QC-host behavior
failed closed. Former `[b]` rows below preserve those historical dispositions.

The additive owner-authorized extension is complete. Phases 2-8 now provide
forward responsive, presentation, semantic binding, gameplay/runtime, QC,
browser-helper, scaffold/exemplar, and Advantage Games `/qc` behavior without
reclassifying T10 evidence. Acceptance with disclosures is hash-bound at
`60fbb63f846cd19873578393684c71e742a73595cf13efd4d96949812598215d` in
[t11-owner-extension-acceptance-v1.json](./t11-owner-extension-acceptance-v1.json).
The owner-authorized API contract is version `2.0.0`; package distribution
version remains `0.1.0`. This acceptance is intentionally uncommitted and
requires a follow-up commit and reference refresh before it is an immutable
release record.

## Owner-authorized extension checklist (phases 2-8)

- [x] Phase 2 extension: implement reusable gameplay/runtime systems required by the specification, deterministic tests, and teardown behavior.
  - Added deterministic movement/bounds, strict AABB collision, pooling, spawning, projectiles, responsive Phaser scene hooks, gesture cancellation, and no-recreation resize behavior.
- [x] Phase 3 extension: implement strict responsive schemas, compact/wide resolution, independent input modes, regions, transforms, text diagnostics, resize-state preservation, overlays, and viewport-matrix tests.
  - `src/responsive/` validates all external configuration with Zod and covers the six required viewports, safe areas, hysteresis, transforms, Thai text overflow, unsupported sizes, geometry checks, and atomic state-preserving transitions.
- [x] Phase 4 extension: implement accessible presentation components and semantic DOM equivalents across loading, instructions, controls, prompt/progress, HUD, feedback, and results.
  - `src/presentation/` provides native controls, dialogs, progress semantics, live regions, complete prompt text, non-color status, results, and required attribution; focused coverage is 100% statements/lines.
- [x] Phase 5 extension: publish owner-approved canonical product bindings, semantic role/state resolution, registration, selected-union, and attribution behavior without claiming legacy evidence.
  - Product decision SHA-256 `393cbadfeaea145c87c0173c497949fca654a83e1c4a13c3e6e79e8faa417867`; seven forward role/state bindings remain explicitly distinct from T10's 85 historical rows.
- [x] Phase 6 extension: add deterministic QC controls, runtime/performance probes, and browser-test helpers.
  - Added six viewport fixtures, worst-case Thai/English fixtures, strict authoring controls, deterministic frame/object/asset/memory/bundle budgets, and provider-neutral real-browser helpers.
- [x] Phase 7 extension: deliver a working Advantage Games authoring/QC surface and a complete public-API scaffold/exemplar.
  - `/qc` now provides fixture/profile/input/accessibility controls, safe-region overlays, diagnostics, pause/mute/restart/result inspection, semantic selected-union inspection, searchable release gallery, and attribution. Scaffold output expands from 7 to 10 public-API files.
- [x] Phase 8 extension: run focused package/app lint, type, test, coverage, build, graph, and browser verification; publish honest accepted/open states and extension hashes.
  - Package lint/type/build and all 234 tests passed; coverage is 89.69% statements, 78.81% branches, 95.12% functions, and 92.72% lines.
  - Advantage Games targeted lint/type/Jest passed (8 tests across 3 suites); Chromium Playwright passed 2/2 including real-browser horizontal-overflow assertions at 390px and 320px; React Doctor reported 100/100 for `src/app/qc` and 94/100 for `src/components/apk` (one performance warning).
  - The acceptance artifact records the unrelated nondeterministic legacy aggregate-Jest failures, absent Reading/Primary consumers, unrun representative-device FPS benchmark, and unclaimed manual owner browser inspection as open verifiable gaps.

## Phase 0: Enforce accepted inputs and architecture [checkpoint: bounded-owner-accepted]

- [x] Task: Validate the exact T10 manifest/hash-set/owner hashes and accepted canonical-pack release; reject every stale, revoked, mismatched, or broader-scope input
  - Implemented in `src/guards/accepted-inputs.ts` and verified by `scripts/check-accepted-inputs.mjs` and `src/guards/__tests__/architecture-guards.test.ts` against on-disk SHA-256 digests.
- [x] Task: Use `createAcceptedStandardAssetResolver` as the only downstream resolver entry point and reject absent, stale, or mismatched accepted-release bindings before shared-kit initialization
  - Enforced by `assertAcceptedStandardPackBinding` and the cartridge manifest Zod schema.
- [x] Task: Map each of the seven accepted capabilities to owning package, public contract, source games, tests, and planned implementation slice
  - Implemented in `src/systems/capability-manifest.ts` (`ACCEPTED_CAPABILITY_REGISTRY`).
- [x] Task: Write architecture and dependency guards for contracts, runtime, cartridges, hosts, and client-only Phaser imports
  - Implemented in `src/guards/` (accepted-inputs, blocked-scopes, legacy-edition-policy) and verified by `src/guards/__tests__/architecture-guards.test.ts` (edition-free module scan).
- [x] Task: Audit surviving APK foundation APIs as retain, revise, replace, or remove
  - Audited: `runtime/` retained (lifecycle); `editions/` marked deprecated legacy surface; `assets/` retained (accepted resolver); `testing/` extended.
- [x] Task: Retire or refactor the 75-file dual-pack ABI and edition/theme asset bindings behind the canonical standard-pack resolver without preserving them as a production compatibility surface
  - Implemented in `src/guards/legacy-edition-policy.ts`: editions module marked `deprecated-legacy-compatibility-surface`, `productionSurfaceForNewCartridges: false`; new shared-kit modules verified edition-free.
- [x] Task: Publish versioned developer-kit API and compatibility plan bound to the accepted canonical-pack release, resolver schema, selected-union contract, attribution contract, and zero-approved-mapping boundary
  - Implemented in `src/compatibility/developer-kit-api.ts` (`DEVELOPER_KIT_COMPATIBILITY`, `buildDeveloperKitCompatibilityReport`).
- [x] Task: Complete bounded owner acceptance for Phase 0 - unsupported scopes remain dependency-gated

## Phase 1: Build session and educational progression primitives [checkpoint: bounded-owner-accepted]

- [x] Task: Define typed contracts for session phases, deterministic content, attempts, feedback, optional state modules, and result accumulation
  - Implemented in `src/systems/` for the four accepted session/result capabilities: `nonempty-content.ts`, `language-target-progression.ts`, `single-completion.ts`, `result-accounting.ts`.
- [x] Task: Write Red tests including empty content, duplicates, restart, terminal races, invalid results, and exactly-once completion
  - 34 tests across the four system test files covering empty content, blank entries, re-entrancy, duplicate completion, wrong candidates, and terminal races.
- [x] Task: Implement accepted primitives without game-title-specific behavior
  - All four systems are pure, transport-independent, and expose no title-specific flags.
- [x] Task: Migrate the exemplar to the public primitives and prove extensibility
  - `src/scaffolding/exemplar.ts` composes all four systems through public APIs.
- [x] Task: Run focused coverage, lint, type, graph, and review gates
  - 195 tests pass; lint, check-types, and build green; systems coverage >91%.
- [x] Task: Complete bounded owner acceptance for Phase 1 - unsupported scopes remain dependency-gated

## Phase 2: Build input and reusable Phaser systems [checkpoint: bounded-owner-accepted]

- [x] Task: Define input/action maps and accepted gameplay-system contracts from the capability ontology
  - Implemented in `src/systems/input-actions.ts` (bounded `INPUT_ACTION_IDS`) and the two timing systems.
- [x] Task: Write deterministic Red tests for held/edge input, touch/pointer transforms, focus/cancel, movement, collision, spawning/pooling, and teardown
  - 24 tests across `input-actions.test.ts`, `bounded-frame-loop.test.ts`, `time-threshold.test.ts` covering edge/press, drag threshold, 50 ms clamp, countdown/stopwatch threshold, cancellation.
- [x] Task: Implement only accepted shared systems with bounded extension points
  - Three systems implemented; no collision/spawning/pooling/projectile systems (not in the seven accepted capabilities; fail closed for unsupported capabilities).
- [x] Task: Add accessible semantic touch-control components and hybrid-mode support
  - `createInputActionNormalizer` supports keyboard, pointer-tap, and pointer-drag with configurable thresholds; no DOM coupling.
- [x] Task: Prove no listeners, timers, objects, scenes, or browser gesture traps leak
  - The scheduler `cancel()` and timer `reset()` are covered by tests; the existing `createInputController` teardown is retained.
- [x] Task: Complete bounded owner acceptance for Phase 2 - unsupported scopes remain dependency-gated

## Phase 3: Implement responsive composition [checkpoint: blocked-fail-closed-guard-implemented]

- [b] Task: Define schemas for geometry, profiles, input modes, safe areas, regions, camera policy, text classes, and cartridge layout declarations - deferred:T10-responsive-contracts-blocked
- [b] Task: Write Red geometry, hysteresis, overlap, text, safe-area, coordinate, and state-preservation tests across the required viewport matrix - deferred:T10-responsive-contracts-blocked
- [b] Task: Implement compact/wide resolution, region planning, gameplay viewport, coordinate transforms, camera helpers, and unsupported-size behavior - deferred:T10-responsive-contracts-blocked
- [b] Task: Implement Thai/English text measurement, fit diagnostics, and enlarged-accessibility recomposition - deferred:T10-responsive-contracts-blocked
- [b] Task: Implement resize/orientation/fullscreen transitions and QC region overlays - deferred:T10-responsive-contracts-blocked
- [b] Task: Verify real input and worst-case content in both compact and wide profiles using the canonical standard-pack binding - deferred:T10-responsive-contracts-blocked
- [x] Task: Implement fail-closed guard that rejects every responsive composition call with a structured diagnostic documenting the 354 contracts / 5664 cells blocked by T10
  - Implemented in `src/guards/blocked-scopes.ts` (`assertResponsiveCompositionBlocked`, `createResponsiveCompositionGuard`).
- [x] Task: Record Phase 3 dependency-gated disposition; no responsive success claim

## Phase 4: Build standard game presentation components [checkpoint: blocked-fail-closed-guard-implemented]

- [b] Task: Define semantic contracts for loading/error, instructions/start, pause/navigation, prompt/progress, HUD, feedback, and results - deferred:T10-responsive-and-asset-mappings-blocked
- [b] Task: Write Red accessibility, layout, localization, lifecycle, canonical-pack, resolver, selected-union, and attribution tests - deferred:T10-responsive-and-asset-mappings-blocked
- [b] Task: Implement Phaser/DOM presentation seams using standard regions and semantic canonical-pack bindings - deferred:T10-responsive-and-asset-mappings-blocked
- [b] Task: Prove persistent/transient UI cannot obscure protected gameplay regions - deferred:T10-responsive-and-asset-mappings-blocked
- [b] Task: Verify keyboard, pointer, touch, compact, wide, Thai, English, and enlarged text - deferred:T10-responsive-and-asset-mappings-blocked
- [x] Task: Implement fail-closed guard that rejects every presentation component call with a structured diagnostic
  - Implemented in `src/guards/blocked-scopes.ts` (`assertPresentationBlocked`, `PRESENTATION_BLOCKED_DIAGNOSTIC`).
- [x] Task: Record Phase 4 dependency-gated disposition; no presentation success claim

## Phase 5: Harden semantic asset and audio loading [checkpoint: resolver-contract-implemented-mappings-blocked]

- [x] Task: Align loader contracts to the accepted semantic/physical asset ontology and canonical-pack version, catalog digest, typed resolver, selected-union materializer, and attribution record
  - Pre-existing `src/assets/` module (`createAcceptedStandardAssetResolver`, `materializeStandardAssetUnion`, `ACCEPTED_STANDARD_ASSET_RELEASE`); wired as the only entry point by `assertAcceptedStandardPackBinding` and the manifest schema.
- [x] Task: Write Red tests for missing roles/states, stale release/catalog digests, resolver parity, selected unions, deduplication, paths, frames, animations, tiles, nine-slices, audio, attribution, and development fallbacks
  - Pre-existing tests in `src/assets/standard-pack-release.test.ts` (7 tests) and `src/assets/standard-asset-contract.test.ts` (5 tests) cover stale bindings, unknown keys, physical-path rejection, deduplication, and attribution.
- [x] Task: Implement semantic preload/registration helpers and structured failures
  - Pre-existing `resolveAssetBinding` and `preloadAssetBindings` in `src/editions/editions.ts`; the accepted resolver fails closed for unknown semantic keys.
- [x] Task: Prove cartridges contain no edition/theme paths, direct physical imports, copied pack files, private asset trees, or unpinned standard-pack bindings
  - `assertNoDirectAssetPaths` in `src/testing/assertions.ts`; architecture guard test verifies edition-free modules; manifest schema rejects physical paths.
- [b] Task: Verify production readiness cannot be satisfied by placeholders or procedural art - deferred:T10-asset-mappings-blocked (85 mappings remain blocked; the resolver contract is implemented but no mappings are approved)
- [x] Task: Complete bounded owner acceptance for Phase 5; 85 mappings remain dependency-gated

## Phase 6: Deliver deterministic testing and performance tooling [checkpoint: implemented-for-accepted-scope-pending-owner-verification]

- [x] Task: Implement clocks, RNG, input, content, host, asset, simulation, and result fixtures using accepted public contracts
  - Implemented in `src/testing/deterministic-fixtures.ts` (`createDeterministicClock`, `createDeterministicRandom`, `createDeterministicInputSequence`); pre-existing `createMockGameFactory` and `createMockHost` retained.
- [x] Task: Implement lifecycle/leak, one-canvas, canonical-pack, selected-union, attribution, responsive, text, and educational behavior assertion helpers
  - Implemented in `src/testing/assertions.ts` (`assertExactlyOnceCompletion`, `assertAttributionRegistered`, `assertNoDirectAssetPaths`, `assertSelectedUnionOnly`).
- [b] Task: Implement frame-time, object, memory, asset, and bundle diagnostics - deferred:T10-runtime-contracts-blocked (performance instrumentation requires accepted runtime contracts)
- [b] Task: Add browser helpers for real input, resize/orientation, standard-pack gallery/search and attribution inspection, completion, restart, and navigation - deferred:T10-runtime-contracts-blocked (browser helpers require accepted runtime contracts)
- [x] Task: Dogfood all helpers against the exemplar and adversarial fixtures
  - `src/scaffolding/exemplar.test.ts` dogfoods the shared systems; `src/testing/__tests__/` covers the fixtures and assertions.
- [x] Task: Complete bounded owner acceptance for Phase 6; browser/performance gates remain unclaimed

## Phase 7: Ship scaffold, documentation, and Advantage Games QC [checkpoint: scaffold-and-docs-implemented-qc-dependency-gated]

- [x] Task: Implement a non-interactive cartridge generator/scaffold with manifest, logic, scenes, responsive declarations, canonical-pack version/digest, semantic requirements, selected-union materialization, attribution, tests, and QC registration
  - Implemented in `src/scaffolding/scaffold.ts` (`generateCartridgeScaffold`); generates 7 files without copying another game's source tree.
- [x] Task: Build a representative exemplar entirely through public APK APIs
  - Implemented in `src/scaffolding/exemplar.ts` (`runExemplarSimulation`, `buildExemplarCartridgeDefinition`).
- [x] Task: Document quickstart, canonical-pack contracts, standard systems, composition, resolver use, selected-union builds, attribution, testing, extension, bespoke escape hatch, migration, and troubleshooting
  - Implemented in `docs/developer-kit.md`.
- [b] Task: Build QC controls for content, difficulty, canonical-pack release and searchable gallery, profile, input mode, safe regions, text fixtures, diagnostics, attribution, pause, mute, restart, and results - deferred:T10-runtime-and-responsive-contracts-blocked (a full browser QC host requires accepted runtime and responsive contracts; the scaffold generates QC registration but the interactive QC host is dependency-gated)
- [x] Task: Verify a clean generated cartridge runs without copied game infrastructure
  - `src/scaffolding/__tests__/scaffold.test.ts` verifies generated files use only public APK APIs, fail closed for responsive, and register attribution.
- [x] Task: Record bounded scaffold/docs acceptance; Advantage Games QC host remains dependency-gated

## Phase 8: Prove simplification and accept the kit [checkpoint: bounded-owner-accepted]

- [x] Task: Compare exemplar implementation and workflow to the accepted developer baseline
  - Implemented in `docs/simplification-report.md`.
- [x] Task: Record authored versus generated files, bespoke LOC, steps, reusable systems, tests, and duplicated infrastructure avoided
  - Recorded in `docs/simplification-report.md`.
- [x] Task: Run full affected lint, type, test, coverage, build, graph, generated-doc, doctor, performance, package-boundary, canonical-pack static enforcement, selected-union, attribution, and browser gates
  - Lint, check-types, test (201 pass), build, and coverage (89.71% statements) green. Performance and browser gates are dependency-gated (T10 blocked runtime contracts; `browserSuccessClaimed: false`).
- [b] Task: Re-run Reading/Primary import smokes and stable I/O compatibility tests - deferred:T10-runtime-contracts-blocked (runtime contract migration is dependency-gated; the shared systems are pure and do not alter the existing runtime ABI)
- [x] Task: Run independent review and remediate every Critical, High, and Medium finding - plan-review.md; no Critical/High remain
- [x] Task: Obtain bounded product-owner developer-experience and exemplar acceptance - t11-owner-delegated-acceptance-v1.json
- [x] Task: Publish versioned kit inputs for cartridge cohort tracks with future-game scaffold defaults pinned to the accepted canonical-pack release - accepted only for bounded T11 scope; cartridge cutover remains gated
- [x] Task: Complete bounded owner acceptance for Phase 8 - unsupported scopes remain dependency-gated
