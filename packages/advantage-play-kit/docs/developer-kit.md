# APK Shared Developer Kit

> **Track:** `apk_shared_developer_kit_20260712` (T11)
> **Current boundary:** The immutable T10 and bounded-T11 records remain
> historical evidence. The owner-authorized T11 extension adds forward product
> behavior for runtime systems, compact/wide composition, presentation,
> owner-approved semantic bindings, testing/QC, and authoring. Product bindings
> are normative decisions and are not claims about legacy behavior.

## Versioning

The owner-authorized developer-kit API contract is version **`2.0.0`**. The
package distribution version remains **`0.1.0`** intentionally; these are
separate version axes and the package version is not the API contract version.

## Quickstart

A new cartridge is built from public APK APIs only. It does not copy another
game's source tree.

```ts
import {
  validateCartridgeManifest,
  ACCEPTED_STANDARD_PACK_BINDING,
  generateCartridgeScaffold,
} from "@reading-advantage/advantage-play-kit/scaffolding";

const scaffold = generateCartridgeScaffold({
  id: "my-vocab-game",
  title: "My Vocabulary Game",
  description: "A scaffolded cartridge.",
  inputMode: "vocabulary",
  capabilities: [
    "capability:nonempty-content-precondition",
    "capability:language-target-progression",
    "capability:single-completion-emission",
    "capability:result-accounting",
  ],
  semanticAssetRequirements: ["ui/16x16/controls/gamepad-buttons"],
});
```

The scaffold generates `manifest.json`, `logic.ts`, `scene.ts`, `responsive.ts`,
`presentation.tsx`, `assets.ts`, `attribution.ts`, `logic.test.ts`,
`browser.test.ts`, and `qc-registration.json`. Every generated
file pins the accepted standard-pack release, declares only accepted
capabilities, registers the required ElvGames attribution, and uses public
responsive, presentation, selected-union, and browser-QC APIs.

## Canonical standard-pack contract

The only accepted standard-pack release is `2026.07.23`.

| Field | Value |
|-------|-------|
| Version | `2026.07.23` |
| Catalog digest | `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087` |
| Source-receipt digest | `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9` |
| Catalog artifact SHA-256 | `ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932` |
| Required credit | `Pixel art assets by ElvGames` |

Resolve canonical semantic keys through `createAcceptedStandardAssetResolver`,
or owner-approved role/state requirements through
`createAcceptedSemanticAssetResolver`. The latter binds only forward product
decisions; it does not alter T10's 85 blocked historical adoption rows. Both
verify the catalog and binding against the accepted release and fail closed
for stale, mismatched, or non-standard-pack input.

```ts
import { createAcceptedStandardAssetResolver } from "@reading-advantage/advantage-play-kit/assets";

const resolver = await createAcceptedStandardAssetResolver(catalog, {
  version: "2026.07.23",
  catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
});
```

## Standard systems (seven accepted capabilities)

Each system is a pure, transport-independent shared core. Games own
game-specific rules, vocabularies, and terminal effects.

| Capability | Shared core | Game owns |
|------------|-------------|-----------|
| `capability:nonempty-content-precondition` | `validateNonEmptyContent` | Error copy, content initialization |
| `capability:language-target-progression` | `createLanguageTargetProgression` | Spatial selection, penalties, rewards |
| `capability:single-completion-emission` | `createCompletionLatch` | Result construction, terminal phase |
| `capability:result-accounting` | `createResultAccountant`, `finalizeResult`, `calculateXp` | XP weights, bonus policies |
| `capability:input-action-normalization` | `createInputActionNormalizer` | Action vocabularies, hit regions |
| `capability:bounded-frame-delta` | `createBoundedFrameScheduler`, `clampFrameDelta` | Tick, adapter, rendering |
| `capability:time-and-frame-loop` | `createCountdownTimer`, `createStopwatchTimer` | Count direction, terminal state |

Reusable deterministic primitives also cover bounded movement, strict AABB
collision, object pooling, interval spawning, and projectile stepping through
`advanceBody`, `intersects`, `createObjectPool`,
`createDeterministicSpawner`, and `stepProjectile`. Game-specific mechanic
composition remains in cartridges.

### Example: composing the four session/result systems

```ts
import {
  validateNonEmptyContent,
  createLanguageTargetProgression,
  createCompletionLatch,
  createResultAccountant,
  finalizeResult,
} from "@reading-advantage/advantage-play-kit/systems";

const content = validateNonEmptyContent(input, "vocabulary");
const progression = createLanguageTargetProgression(content.items.map((i) => i.term));
const accountant = createResultAccountant();
const latch = createCompletionLatch((result) => host.complete(result));

for (const item of content.items) {
  const match = progression.match(item.term);
  accountant.recordAttempt({ correct: match.matched });
}

latch.complete(finalizeResult(accountant, { xpPerCorrect: 10, xpPerAccuracyPoint: 20 }));
```

## Responsive composition

`resolveResponsiveComposition` strictly validates viewport, safe-area,
capability, accessibility, and policy input. It selects `compact` or `wide` from
usable geometry, resolves touch/pointer-keyboard/hybrid independently, applies
hysteresis, reserves standard regions, and returns an actionable unsupported
state instead of shrinking below minimums. Coordinate transforms,
production-font text-fit adapters, geometry inspection, safe-region overlays,
and atomic capture/recompose/restore transitions share the same contract.

```ts
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";

const composition = resolveResponsiveComposition({
  viewport: { width: 1440, height: 900 },
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  inputCapabilities: { touch: false, pointer: true, keyboard: true },
  accessibility: { textScale: 1, touchScale: 1 },
  config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
});
```

## Accessible presentation

The `/presentation` entry exposes semantic DOM components for loading, errors,
instructions, prompts, progress, HUD, feedback, navigation, and terminal
results. Native buttons, progress semantics, live regions, complete text, and
required attribution remain available to assistive technology outside the
canvas. Components consume standard regions and do not import application state.

## Selected-union materialization

Cartridges materialize only their selected union of semantic keys. The
materializer rejects physical paths, deduplicates, and sorts.

```ts
import { materializeStandardAssetUnion } from "@reading-advantage/advantage-play-kit/assets";

const paths = materializeStandardAssetUnion(catalog, [
  "ui/16x16/controls/gamepad-buttons",
  "effects/32x32/combat/hit-01",
]);
```

## Attribution

Every cartridge must register the required ElvGames credit in the shared
Credits/About or end-screen contract. The manifest schema enforces this.

```ts
attributionRegistration: {
  requiredCredit: "Pixel art assets by ElvGames",
  placement: "end-screen",
}
```

## Testing

The kit provides deterministic clocks, RNG, input sequences, compact/wide
viewport and worst-case Thai/English fixtures, plus assertion
helpers for lifecycle/leak, exactly-once completion, canonical-pack binding,
selected-union, and attribution.

```ts
import {
  createDeterministicClock,
  createDeterministicRandom,
  assertExactlyOnceCompletion,
  assertAttributionRegistered,
  assertNoDirectAssetPaths,
  assertSelectedUnionOnly,
} from "@reading-advantage/advantage-play-kit/testing";
```

`@reading-advantage/advantage-play-kit/qc` adds strict authoring controls,
frame/object/asset/memory/bundle performance reports, and a provider-neutral
browser adapter for real input, viewport changes, control activation,
completion text, and attribution inspection. The working Advantage Games route
is `/qc`.

## Extension and bespoke escape hatch

- **Extension:** games replace game-owned rules while reusing the shared
  session/result/input/timing infrastructure.
- **Bespoke escape hatch:** games may implement mechanic-specific behavior in
  their cartridge code; they must not push title-specific flags into the shared
  systems or import edition/theme bindings.

## Migration

The `editions` module (the retired 75-file dual-pack ABI) is a deprecated
legacy compatibility surface. New cartridges must not import it in production.
It remains importable only by the existing runtime host adapter and its tests
while the runtime contract migrates to the canonical resolver.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Standard-pack binding does not pin the accepted release` | Stale or mismatched binding | Pin version `2026.07.23` and both digests |
| `UNSUPPORTED_VIEWPORT_SIZE` | Neither profile meets gameplay and reserved-region minimums | Increase the game area, rotate, or reduce accessibility scaling |
| `Unmapped semantic asset role/state` | No owner-approved forward binding exists | Add a reviewed owner product binding; do not infer legacy evidence |
| `Capability ... is not in the T10-accepted registry` | Title-specific capability requested | Use only the seven accepted capability ids |
| `Source contains a direct physical asset path` | Physical path imported | Request semantic keys through the resolver |
