# APK Shared Developer Kit - Simplification Report

> **Track:** `apk_shared_developer_kit_20260712` (T11)
> **Baseline:** Pre-T11 APK foundation (runtime lifecycle, input, editions,
> standard-pack resolver) without corpus-derived shared systems, scaffold, or
> authoring workflow.
> **Comparison:** Exemplar cartridge built entirely through public APK APIs
> vs. the predecessor baseline where each game recreated lifecycle, input,
> result, completion, and validation infrastructure.

## Method

The exemplar (`runExemplarSimulation`) composes four accepted shared cores
(`nonempty-content-precondition`, `language-target-progression`,
`single-completion-emission`, `result-accounting`) into a complete educational
mini-cycle. It is compared against the predecessor pattern where each
cartridge duplicated the same infrastructure from scratch.

## Generated vs. authored files

| Surface | Exemplar | Scaffolded cartridge |
|---------|----------|---------------------|
| Generated files | 0 (exemplar publishes one complete public API surface) | 10 (manifest, logic, scene, responsive, presentation, assets, attribution, unit test, browser helper, QC registration) |
| Authored files | 1 (`exemplar.ts`) | 0 (scaffold generates all) |
| Bespoke logic lines | 0 (exemplar composes shared systems only) | 0 (scaffold generates stubs) |
| Copied source trees | 0 | 0 |

## Duplicated infrastructure avoided

| Infrastructure | Predecessor | T11 shared core |
|----------------|-------------|-----------------|
| Empty-content validation | Recreated per game | `validateNonEmptyContent` |
| Ordered target matching | Recreated per game | `createLanguageTargetProgression` |
| At-most-once completion | Recreated per game (runtime `mountCartridge` had it; cartridges duplicated it) | `createCompletionLatch` |
| Result counters + XP | Recreated per game with ad-hoc arithmetic | `createResultAccountant`, `finalizeResult`, `calculateXp` |
| Frame-delta clamping | Recreated per game | `createBoundedFrameScheduler`, `clampFrameDelta` |
| Time threshold detection | Recreated per game | `createCountdownTimer`, `createStopwatchTimer` |
| Input action normalization | Recreated per game | `createInputActionNormalizer` |
| Standard-pack binding | Manual per game | `ACCEPTED_STANDARD_PACK_BINDING`, `validateCartridgeManifest` |
| Attribution registration | Manual per game | Manifest schema enforces it |
| Responsive composition | Per-game viewport math / uniform scaling | Geometry resolver, regions, transforms, text diagnostics, transitions, overlays |
| Presentation semantics | Per-game canvas/DOM overlays | Accessible prompts, status, feedback, navigation, dialogs, and results |
| Gameplay primitives | Per-game movement/collision/pools/spawn/projectiles | Deterministic bounded shared systems |
| Semantic role/state mapping | Unreviewed title paths | Owner-approved forward bindings over the accepted resolver |
| Browser/performance QC | Per-game scripts | Provider-neutral browser driver and deterministic budget monitor |

## Setup steps

| Step | Predecessor | T11 |
|------|-------------|-----|
| Pin standard-pack release | Manual, error-prone | `ACCEPTED_STANDARD_PACK_BINDING` (frozen) |
| Validate manifest | Manual | `validateCartridgeManifest` (Zod) |
| Generate cartridge | Copy another game's tree | `generateCartridgeScaffold` (no copy) |
| Register attribution | Manual | Manifest schema enforces |
| Register QC | Manual | Scaffold generates `qc-registration.json` |
| Inspect in browser | Per-game route | Working Advantage Games `/qc` field lab |

## Test effort

| Test type | Predecessor | T11 |
|-----------|-------------|-----|
| Empty-content guard | Per game | 8 shared tests in `nonempty-content.test.ts` |
| Progression matcher | Per game | 9 shared tests in `language-target-progression.test.ts` |
| Completion latch | Per game | 8 shared tests in `single-completion.test.ts` |
| Result accounting | Per game | 9 shared tests in `result-accounting.test.ts` |
| Input normalization | Per game | 8 shared tests in `input-actions.test.ts` |
| Frame delta | Per game | 8 shared tests in `bounded-frame-loop.test.ts` |
| Time threshold | Per game | 8 shared tests in `time-threshold.test.ts` |
| Architecture/T10 hashes | N/A | 10 shared tests in `architecture-guards.test.ts` |
| Blocked scopes | N/A | 4 shared tests in `blocked-scopes.test.ts` |
| Cartridge manifest | N/A | 10 shared tests in `cartridge-manifest.test.ts` |
| Scaffold | N/A | 8 shared tests in `scaffold.test.ts` |
| Exemplar | N/A | 6 shared tests in `exemplar.test.ts` |
| Deterministic fixtures | N/A | 4 shared tests in `deterministic-fixtures.test.ts` |
| Assertion helpers | N/A | 4 shared tests in `assertions.test.ts` |
| Capability manifest | N/A | 5 shared tests in `capability-manifest.test.ts` |
| Accepted inputs | N/A | 7 shared tests in `accepted-inputs.test.ts` |
| Legacy edition policy | N/A | 4 shared tests in `legacy-edition-policy.test.ts` |
| Developer-kit API | N/A | 6 shared tests in `developer-kit-api.test.ts` |
| Structured error | N/A | 2 shared tests in `structured-error.test.ts` |

## Does the exemplar recreate infrastructure?

No. The exemplar (`exemplar.ts`) composes only public APK shared systems. It
does not recreate lifecycle, input, responsive, UI, asset, result, or test
infrastructure. It contains zero bespoke infrastructure lines beyond its
educational composition call sequence.

## Conclusion

T11 materially simplifies APK game development. The seven accepted shared cores
eliminate per-game duplication of validation, progression, completion, result,
input, timing, and frame-loop infrastructure. The scaffold generates a
complete cartridge file set without copying another game's source tree. The
manifest schema enforces standard-pack pinning, compact/wide declarations,
selected-union materialization, and attribution registration. Invalid external
configuration fails closed with structured diagnostics.

## Historical/evidence boundary

T10's zero accepted historical runtime contracts, zero approved historical
asset mappings, 85 blocked adoption rows, and 5,664 blocked responsive evidence
cells remain unchanged. The extension's responsive policy and seven canonical
role/state bindings are explicit owner-owned forward product decisions. They
must never be cited as recovered legacy evidence.
