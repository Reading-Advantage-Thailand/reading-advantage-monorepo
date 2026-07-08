# Implementation Plan: Babel Architect Phaser Exemplar

Track: babel-architect-phaser-exemplar_20260708

## Phase 1: Track Activation and Baseline

- [x] Task: Confirm archived audit baseline
  - [x] Read `measure/archive/babel-architect-compliance-audit_20260426/report.md`
  - [x] Confirm no current Babel Architect implementation files exist
  - [x] Confirm catalog entry is still `coming-soon` before implementation
- [x] Task: Update project routing docs
  - [x] Add active track entry to `measure/tracks.md`
  - [x] Ensure this active implementation track links back to the archived audit

## Phase 2: Phaser Stack Contract

- [x] Task: Define Phaser renderer contract
  - [x] Update `measure/tech-stack.md` with Phaser as a candidate Tier 1B / 2D engine for tilemap, physics, sprite, and camera-heavy games
  - [x] Document React shell + Phaser scene boundary
  - [x] Document bundle isolation rule: Phaser games loaded dynamically, non-Phaser routes must not import Phaser
- [x] Task: Add Phaser dependency
  - [x] Add `phaser` using the repo's package manager/catalog pattern
  - [x] Verify install/build constraints before coding against it

## Phase 3: Contract-First Game Logic

- [x] Task: Write failing logic tests (Red)
  - [x] Sentence splitting and block queue creation
  - [x] Correct placement advances progress
  - [x] Incorrect placement affects stability/errors
  - [x] Difficulty presets adjust timing/drop speed/error tolerance
  - [x] Completion summary calculates score, accuracy, and XP inputs
- [x] Task: Implement pure logic module (Green)
  - [x] Create `src/lib/games/babelArchitect.ts`
  - [x] Keep logic deterministic with injectable RNG/time where needed
  - [x] Add JSDoc for exported functions/types

[checkpoint: 7391da8] (Phase 1-2) [checkpoint: 53a2254] (Phase 3)

## Phase 4: API and Route Shell

- [x] Task: Add API routes
  - [x] `src/app/api/v1/games/babel-architect/sentences/route.ts` using `createSentencesRoute`
  - [x] `src/app/api/v1/games/babel-architect/complete/route.ts` using `createCompleteRoute`
- [x] Task: Add route page and React shell
  - [x] Create `/[locale]/student/games/sentence/babel-architect/page.tsx`
  - [x] Wire locale/session hooks following existing sentence games
  - [x] Keep catalog status `coming-soon` until gameplay verification passes

## Phase 5: Phaser Adapter and Scene

- [x] Task: Write adapter lifecycle tests where practical
  - [x] Mount creates Phaser game instance
  - [x] Unmount destroys Phaser game instance
  - [x] Typed scene events reach React callback
- [x] Task: Implement Phaser mount component
  - [x] Create `src/components/games/sentence/babel-architect/BabelArchitectGame.tsx`
  - [x] Load Phaser client-side only
  - [x] Bridge logic state and player intents without putting learning rules in Phaser
- [x] Task: Implement Phaser scene
  - [x] Render tower, falling/placed blocks, target word, stability, progress, and feedback
  - [x] Support touch and keyboard input
  - [x] Fit 390×844 portrait viewport
  - [x] Preserve crisp low-color placeholder rendering and readable word labels

[checkpoint: 43e3feb] (Phase 4 API) [checkpoint: 5622683] (Phase 5 adapter) [checkpoint: 12e0361] (Phase 4 page)

## Phase 6: Low-Color Placeholder Assets and Manifest

- [ ] Task: Create low-poly/low-color placeholder asset set
  - [ ] Author or generate simple in-repo placeholders for blocks, background, particles, UI accents, and characters/mascot if used
  - [ ] Use a constrained palette and crisp scaling so the first playable build has a coherent visual baseline
  - [ ] Do not depend on licensed or paid asset packs for implementation, tests, or browser verification
- [ ] Task: Create asset manifest
  - [ ] Define stable replacement paths for blocks, background, particles, UI accents, and characters/mascot if used
  - [ ] Document preferred future asset-pack targets separately from placeholder file paths
  - [ ] Keep asset names stable so Pixel Crawler or another approved pack can replace placeholders later

## Phase 7: Catalog, QA, and Closeout

- [ ] Task: Promote game to playable
  - [ ] Update `src/lib/gameCards.ts` to add href/status only after route and gameplay are verified
  - [ ] Ensure cover path matches existing catalog conventions
- [ ] Task: Automated verification
  - [ ] Run focused Jest tests for logic, page, route, adapter/component
  - [ ] Run `pnpm check-types`
  - [ ] Run `pnpm lint`
  - [ ] Run a browser/e2e smoke for start → play → completion
- [ ] Task: Manual verification
  - [ ] Verify 390×844 portrait gameplay with low-poly/low-color placeholder art
  - [ ] Verify correct and incorrect placements
  - [ ] Verify completion, XP, leaderboard/session history, and back navigation
- [ ] Task: Closeout docs
  - [ ] Record Phaser exemplar lessons in `measure/lessons-learned.md`
  - [ ] Update `measure/tech-debt.md` for deferred preferred asset-pack ingestion or Phaser testing gaps
