# Specification: Phaser 4 Advantage Play Kit

## Overview

Build the **Advantage Play Kit (APK)** as the canonical Phaser 4 platform for Reading Advantage language-learning games. Existing games are mechanic references, not renderer or behavior compatibility targets: each rebuild preserves its recognizable learning/gameplay concept while allowing Phaser-native changes to movement, physics, scenes, controls, timing, scoring details, and presentation.

The established educational I/O ABI remains stable. Vocabulary games receive an array of `{ term, translation }` items, sentence games receive the corresponding sentence array, and games emit the established result object with `accuracy`, display `xp`, `score`, `correctAnswers`, and `totalAttempts`. The host adapter may add server-only completion context and authoritative persistence, but Phaser migration must not force host mini-game callers to adopt a different cartridge-facing contract.

`apps/advantage-games` remains the developer-facing testbed where the product owner can run a dev server, select a cartridge, switch between Primary and Secondary editions, inject representative learning content, and manually QC gameplay before a cartridge is enabled in a host product.

This is a monorepo-level track because it creates shared packages and validates consumption by Advantage Games, Reading Advantage, and Primary Advantage. It supersedes the copy-by-directory workflow and does not continue the cancelled Babel Architect Phaser or R3F implementations.

## Frozen Educational I/O ABI

The first phase must encode these existing shapes as strict, browser-safe Zod contracts and compatibility tests before the runtime is implemented:

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

- Vocabulary and sentence inputs are distinct semantic modes even though their item shapes currently match.
- Field names, units, and array calling convention remain compatible with existing mini-game callers.
- `xp` in `GameResults` is the established client/display result. It is not trusted as authoritative persistence input.
- A production host adapter maps `GameResults` plus host-known fields into the existing strict server completion contract. User identity, school tenancy, idempotency, timestamps, authoritative XP, and database writes remain host/server responsibilities.
- Any proposed future ABI change requires a separately reviewed, versioned migration; it cannot enter this track as an incidental cleanup.

## Architectural Principles

1. Phaser 4 is the gameplay runtime and may directly own physics, cameras, animations, tweens, timers, input, particles, audio, object pools, and scene lifecycle.
2. The established learning input arrays and game-result output are stable; existing React/Konva/R3F internals are disposable implementation references.
3. A deployable cartridge combines one game implementation with a selected `GameEdition` and host adapter.
4. Primary and Secondary editions may differ in assets, audiovisual intensity, target size, pacing, collision generosity, enemy density, and other audience tuning without forking game source.
5. Games consume semantic learning inputs and asset contracts rather than Next.js routes, application sessions, hard-coded public paths, or database APIs.
6. The host derives identity and tenancy server-side and delegates persistence to the canonical games domain.
7. `advantage-games` is a QC workshop in this track, not yet the production authenticated student arcade.

## Stories

### Story S1: Freeze the APK architecture
**As a** game-platform developer
**I want** the repository architecture, stable I/O ABI, and development guidance to declare Phaser 4 and the APK cartridge model
**So that** new work no longer extends the legacy renderer tiers or copy-based integration model.

**Acceptance Criteria:**
- Given existing mini-game callers, When APK contracts are frozen, Then vocabulary arrays, sentence arrays, and `GameResults` remain compatible with the established shapes and have counterexample-backed Zod tests.
- Given the current app guidance mandates React-Konva, Phaser 3, and R3F tiers, When the architecture phase is complete, Then product, tech-stack, AGENTS, and game-builder guidance identify Phaser 4 APK cartridges as the target for all new and rebuilt games.
- Given legacy games remain present during migration, When architecture guards run, Then legacy renderer imports are allowlisted but new cartridge code cannot introduce React-Konva or R3F gameplay implementations.
- Given the cancelled Babel and R3F tracks, When the decision record is reviewed, Then it describes this track as a clean platform reset and does not claim their implementation code is retained.
- Given Phaser 4 is a major dependency change, When the workspace is updated, Then the selected current stable Phaser 4 version is pinned and validated through package-manager and build gates.

**Estimate:** M
**Priority:** Must

### Story S2: Build the Phaser runtime
**As a** game developer
**I want** a reusable Phaser-native APK package
**So that** cartridges share proven gameplay infrastructure while retaining the established educational I/O ABI.

**Acceptance Criteria:**
- Given vocabulary or sentence arrays, When a cartridge is launched, Then the runtime supplies the unchanged array input to the game and validates the emitted `GameResults` shape.
- Given a cartridge definition, When it is mounted by an APK host, Then the runtime boots, resizes, pauses, resumes, restarts, and destroys its Phaser game without leaked canvases, listeners, timers, or animation frames.
- Given keyboard, pointer, and touch input, When a cartridge declares supported controls, Then the runtime provides normalized input and disables conflicting browser gestures inside the play surface.
- Given a game session, When it completes, Then exactly one compatible `GameResults` object is emitted; authoritative persistence is delegated to the host.
- Given common Phaser capabilities, When cartridges use cameras, physics, animations, tweens, timers, particles, audio, and object pools, Then they consume shared APK systems where reuse is justified.
- Given browser and server bundles, When applications build, Then Phaser is isolated to client-only dynamic imports and does not leak into server-only packages or non-game routes.

**Estimate:** XL
**Priority:** Must

### Story S3: Support audience editions
**As a** product and art team
**I want** Primary and Secondary editions for the same cartridge
**So that** one gameplay concept can serve younger and older students without copied game implementations.

**Acceptance Criteria:**
- Given a cartridge edition contract, When Primary Chibi and Secondary Epic editions are validated, Then both provide every required semantic asset, animation, audio, UI, and presentation slot.
- Given audience tuning, When editions are selected, Then they may adjust pacing, target size, hitboxes, visual intensity, enemy density, and similar game-feel settings within declared safe bounds without changing the educational I/O ABI.
- Given a game source file, When edition assets change, Then no game-scene source modification is required solely to replace artwork, animation atlases, audio, fonts, or effects.
- Given generated or third-party assets, When an edition manifest is built, Then source, license, version, dimensions, atlas frames, and optimization metadata are recorded.
- Given the external pixel-art experimentation workflow, When generated assets are later imported, Then they enter through a documented manifest/import boundary rather than becoming a runtime dependency on the generation tool.

**Estimate:** L
**Priority:** Must

### Story S4: Operate the QC testbed
**As a** product owner
**I want** Advantage Games to remain a fast local testbed
**So that** I can run a dev server and QC each cartridge and edition before host rollout.

**Acceptance Criteria:**
- Given the normal workspace setup, When `pnpm --filter vocabulary-games dev` runs, Then the testbed loads the APK catalog and launches cartridges without requiring production authentication or database connectivity.
- Given an APK cartridge, When it is opened in the testbed, Then the operator can select Primary or Secondary edition, choose vocabulary or sentence fixtures and difficulty, restart, pause, mute, toggle debug information, and return to the catalog.
- Given runtime or asset failure, When QC is performed, Then the testbed displays actionable loading, contract, and performance diagnostics rather than a blank canvas.
- Given desktop and mobile viewports, When the same cartridge is exercised, Then the testbed supports keyboard/mouse and touch controls at documented reference sizes.
- Given a QC session, When the game completes, Then the testbed displays the emitted `GameResults` and mock-host completion mapping without pretending to persist production progress.

**Estimate:** L
**Priority:** Must

### Story S5: Prove representative cartridges
**As a** game developer
**I want** several mechanically different Phaser-native cartridges
**So that** the APK is shaped by real reuse rather than one exemplar's assumptions.

**Acceptance Criteria:**
- Given the existing prototype inventory, When representative mechanics are chosen, Then at least three blueprints cover a gate runner, a sentence-order collection game, and a defense or typing game.
- Given each blueprint, When its cartridge is built, Then Phaser-native gameplay may differ from the legacy implementation while preserving the recognizable learning mechanic and win/loss loop.
- Given the representative cartridges, When they run in the testbed, Then each accepts the appropriate stable input array, emits compatible `GameResults`, uses both editions, and demonstrates relevant shared runtime systems.
- Given deterministic content and injected random seeds where practical, When learning-loop tests run, Then correct/incorrect answer handling and result metrics are reproducible without requiring visual or behavioral parity with the legacy game.
- Given manual QC, When the product owner tests each cartridge and edition, Then the phase cannot close until explicit visual/gameplay approval is recorded.

**Estimate:** XL
**Priority:** Must

### Story S6: Prove host consumption
**As an** application developer
**I want** Reading and Primary to consume APK cartridges through a stable host contract
**So that** enabling a game no longer requires copying components, logic, routes, and assets.

**Acceptance Criteria:**
- Given a host application, When a game ID is enabled, Then a shared registry dynamically imports the cartridge and host-selected edition without importing every game into the initial bundle.
- Given Reading Advantage, When the import smoke runs, Then it supplies the established vocabulary/sentence array ABI, selects Secondary edition configuration, and receives compatible `GameResults`.
- Given Primary Advantage, When the import smoke runs, Then it supplies the same established array ABI, selects Primary Chibi edition configuration, and receives compatible `GameResults`.
- Given a game result, When a production host adapter handles it, Then it maps the stable cartridge result into the existing strict server-completion contract while deriving user, school, idempotency, and timestamp fields from authenticated host context.
- Given package consumption, When repository guards run, Then host apps contain no copied APK cartridge source or hard-coded cartridge asset trees.

**Estimate:** L
**Priority:** Must

### Story S7: Plan catalog rebuild waves
**As a** product owner
**I want** the existing catalog reduced to mechanic blueprints and rebuild waves
**So that** future Phaser work is prioritized by reusable gameplay systems and product value rather than legacy directory order.

**Acceptance Criteria:**
- Given every catalogued prototype, When the inventory is complete, Then it records the essential mechanic, learning-input mode, controls, target audience, reusable APK systems, asset needs, and disposition.
- Given overlapping prototypes, When rebuild cohorts are defined, Then games are grouped by mechanic families such as runner/collector, arena/shooter, defense, sentence sequencing, and puzzle/matching.
- Given a cartridge cutover, When its host integration is approved, Then the migration plan identifies the exact legacy components, routes, logic, and assets that may be removed while preserving the stable host I/O contract.
- Given the remaining catalog, When this foundation track closes, Then each rebuild wave has a bounded follow-on Measure track rather than unchecked tasks appended to this plan.

**Estimate:** M
**Priority:** Should

## Non-Functional Requirements

- TypeScript strictness and Zod validation at package, asset, host, and educational I/O boundaries.
- JSDoc on all exported functions, classes, interfaces, and type aliases.
- More than 80% coverage for new APK packages and representative cartridge logic.
- Mobile-first validation at 390x844 plus desktop keyboard/mouse validation.
- Stable 60 FPS target on supported mid-range devices, with documented frame-time and asset-memory budgets.
- No hard-coded provider SDK coupling; asset locations resolve through logical manifests and host/runtime adapters.
- Accessibility overlays keep prompts, instructions, results, and non-canvas controls readable by assistive technology.
- Dynamic imports prevent Phaser and unused cartridges from inflating unrelated application bundles.
- All new packages participate in root lint, type-check, test, build, generated-doc, and Measure doctor gates.

## Track-Level Acceptance Criteria

- Strict compatibility tests freeze vocabulary-array, sentence-array, and `GameResults` shapes before runtime implementation.
- The current stable Phaser 4 release is pinned and an architecture guard prevents new legacy-renderer cartridges.
- APK contracts, runtime, test kit, edition system, and host adapter compile as reusable workspace packages.
- Advantage Games runs as the documented development/QC host with both editions and diagnostic controls.
- Three representative Phaser-native cartridges receive explicit manual gameplay approval in both editions.
- Reading and Primary import smoke tests consume the same cartridge package without source copying or I/O contract changes.
- Host mapping remains compatible with the existing strict server-authoritative games domain contract.
- A catalog rebuild matrix and bounded successor tracks cover the remaining prototypes.
- Required lint, type-check, unit, E2E, build, graph update/audit, generated-doc, and doctor gates pass for affected packages/apps.

## Out of Scope

- Rebuilding every existing game inside this foundation track.
- Preserving exact legacy movement, scoring details, scene structure, renderer code, or visual appearance.
- Changing the established vocabulary-array, sentence-array, or `GameResults` cartridge-facing ABI.
- Maintaining compatibility with copied Reading or Primary component internals beyond their stable educational I/O contract.
- Shipping final production-quality Chibi or mature-fantasy art for the entire catalog.
- Directly integrating Gemini/Nanobanana or `pixelart-benchmark` into the runtime; only the future asset-import contract is specified.
- Turning Advantage Games into the authenticated, database-backed student arcade; that is a successor product track after the APK and host contract are proven.
- Migrating production Reading/Primary routes beyond the bounded import smoke required to prove package consumption.
- Multiplayer, teacher dashboards, public signup, cross-app SSO, or production deployment.
