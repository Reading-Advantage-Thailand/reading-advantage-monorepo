---
name: apk-game-builder
description: Build and rebuild Reading Advantage vocabulary or sentence games as Phaser 4 Advantage Play Kit cartridges. Use this skill whenever a user asks for a new language-learning game, a Phaser game, an APK cartridge, a Primary or Secondary game edition, a game rebuild, or QC work in advantage-games. New gameplay must use the APK packages rather than React-Konva or R3F.
---

# APK Game Builder

Create Phaser 4 language-learning cartridges for the Reading Advantage monorepo.

## Start with Measure

1. Read the root `measure/index.md`, `measure/workflow.md`, and active track.
2. Do not begin significant implementation without an active Measure track.
3. Mark the current task `[~]`, use TDD, and record exact verification evidence.
4. Preserve unrelated work in the shared monorepo; stage explicit owned paths only.

## Stable educational ABI

Import the contracts from `@reading-advantage/game-contracts`.

```ts
interface VocabularyItem {
  term: string;
  translation: string;
}

type VocabularyInput = VocabularyItem[];
type SentenceInput = VocabularyItem[];

interface GameResults {
  accuracy: number;
  xp: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
}
```

Preserve these calling shapes. A host adapter may normalize richer host records to
`{ term, translation }` and maps `GameResults` into the server-authoritative
completion contract. Identity, school tenancy, idempotency, timestamps, and
authoritative XP never come from a cartridge.

## Cartridge architecture

Place reusable cartridges in `packages/game-cartridges/src/cartridges/<slug>/`.

Each cartridge owns:

- `blueprint.md` — recognizable mechanic, learning loop, controls, win/loss.
- `definition.ts` — manifest, input mode, scene factory, semantic asset slots.
- `scene.ts` — Phaser-native gameplay.
- `systems.ts` — cartridge-specific rules or helpers that are not shared yet.
- tests — seeded learning-loop and result-contract tests.

Use `@reading-advantage/advantage-play-kit` for runtime lifecycle, normalized input,
scaling, pause/resume, audio, diagnostics, edition resolution, completion-once, and
the React host bridge.

Phaser should own gameplay. Use its physics, cameras, tweens, animation, timers,
particles, audio, input, and object pools when they improve the mechanic. Do not
preserve React/Konva/R3F architecture for compatibility.

## Mechanic blueprint

Before code, reduce the old prototype or new concept to:

1. Player verb: what repeats moment to moment.
2. Learning mode: vocabulary or sentence array.
3. Prompt/answer relationship.
4. Correct and incorrect consequences.
5. Win and loss conditions.
6. Keyboard/pointer/touch controls.
7. Shared APK capabilities required.
8. Required semantic asset slots.

Preserve the concept, not exact legacy behavior.

## Editions

Every production cartridge supports:

- `primary-chibi` — bright, friendly, large targets, generous pacing and hitboxes.
- `secondary-epic` — original mature-fantasy presentation with denser effects and tuning.

One cartridge source consumes an edition manifest. Never fork scene code by product
name or hard-code app asset paths. Editions may adjust presentation and bounded game
feel, but cannot change the educational input or result ABI.

Generated and third-party assets require provenance, license, dimensions, version,
and atlas metadata. Asset-generation tools such as `pixelart-benchmark` feed the
manifest/import boundary; they are not runtime dependencies.

## TDD sequence

1. Write contract and learning-loop tests that fail for the intended reason.
2. Implement the minimum cartridge/runtime behavior that makes them pass.
3. Add both editions and validate every semantic slot.
4. Run package test, coverage, type-check, lint, and build gates.
5. Load the cartridge through the Advantage Games `/qc` host.
6. Verify desktop plus 390x844 touch behavior in a real browser.
7. Repeatedly restart/remount and confirm one canvas, no listener/timer leaks, and
   exactly one validated `GameResults` emission.
8. Obtain explicit product-owner visual/gameplay approval before calling a cartridge ready.

## QC workflow

Use `pnpm --filter vocabulary-games dev` and open the `/qc` route. Test both editions
with representative vocabulary and sentence fixtures. Inspect runtime version, active
scene, FPS/frame time, viewport, input, assets, canvas count, lifecycle generation,
and emitted results. The testbed completion mapping must be visibly labeled as not
persisted.

## Boundaries

Cartridges must not import:

- `next/*` or application aliases.
- `@reading-advantage/auth` or `@reading-advantage/db`.
- React-Konva, Konva, Three.js, or R3F.
- provider SDKs or files under `apps/`.

Cartridges must not own login, tenancy, routing, persistence, or authoritative XP.

## Definition of ready

A cartridge is ready for host adoption only when:

- Stable input/output contract tests pass.
- Both editions validate and load.
- Keyboard and touch flows work.
- Restart, pause, visibility, and destroy behavior are leak-free.
- Completion emits exactly once.
- Package and affected host builds pass.
- Browser QC evidence exists for both editions.
- The product owner explicitly approves gameplay and presentation.
