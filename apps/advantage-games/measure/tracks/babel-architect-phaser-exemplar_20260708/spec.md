# Track: Babel Architect Phaser Exemplar

## Overview

Implement **Babel's Architect** as the app's first Phaser-based 2D game exemplar. The previous compliance audit found that Babel Architect only had catalog metadata and a cover image; this track turns that missing game into the proof point for replacing React-Konva on future 2D games that need tilemaps, spritesheets, physics, collision, camera control, or heavier animation.

The game remains a sentence-order learning game. Players stack or place falling stone blocks in the correct word order to build a tower. Correct placements advance the sentence and stabilize the tower; incorrect placements damage stability, cost time, or create unstable blocks.

## Baseline

- Archived audit: `measure/archive/babel-architect-compliance-audit_20260426/report.md`
- Current catalog entry: `src/lib/gameCards.ts` has `id: 'babel-architect'` marked `coming-soon` with no playable route.
- Missing implementation: page, component, logic module, API routes, tests, and game asset directory.

## Product Goals

1. Ship Babel's Architect as a playable sentence game in the existing student game catalog.
2. Establish the Phaser integration pattern for future 2D games while preserving the app's existing React/Next shell.
3. Validate that Phaser is a better fit than React-Konva for physics/tilemap/spritesheet-heavy 2D games.
4. Ship the first playable version with a simple low-poly/low-color placeholder visual system, then replace placeholders later with an approved fantasy asset pack.

## Rendering Decision

Babel's Architect is a **Phaser 2D** game, not a Konva or R3F game.

Use Phaser for:

- Falling/stacking block physics or collision handling.
- Sprite animation and atlas loading.
- Camera/world scaling for a vertical tower.
- Mobile touch input inside a real game scene.
- A reusable adapter pattern for mounting Phaser inside a Next/React page.

Keep React responsible for:

- Route/page composition.
- Start/end screens when outside active gameplay.
- Completion callback wiring and leaderboard/session hooks.
- Locale/session wrappers.

## Architecture Requirements

- Add Phaser only through a thin renderer adapter; sentence game logic stays in pure TypeScript under `src/lib/games/babelArchitect.ts`.
- Do not put learning rules, XP calculation, sentence validation, or completion logic inside Phaser scene classes.
- The Phaser scene receives a serializable render state and emits typed player intents.
- Use `next/dynamic` with `ssr: false` for the Phaser gameplay surface.
- Ensure 2D Konva routes and R3F routes do not import Phaser by accident.
- Keep all new exported functions/types documented with JSDoc.

## Gameplay Requirements

- Consume sentence data shaped as `{ term, translation }`.
- Split the active sentence into ordered word blocks.
- Present the target translation and current word-order progress clearly.
- Require the player to place/select blocks in the correct sentence order.
- Include at least three difficulty tiers: easy, normal, hard.
- Award XP using the existing completion contract and server-authoritative `/complete` route pattern.
- Use shared start/end UX patterns where practical.

## Asset Requirements

- Initial implementation uses in-repo low-poly/low-color placeholder art: simple stone blocks, tower silhouettes, backgrounds, particles, and UI accents with a constrained palette.
- Placeholder art must be generated or authored directly in the repo and must not block the Phaser architecture, gameplay loop, or browser verification work.
- Build against a stable asset manifest so preferred asset packs can replace placeholders without code changes.
- Preferred future 2D asset family: Pixel Crawler by Anokolisa, or another approved pack selected in a separate asset-ingestion decision.
- Do not commit paid/licensed source art unless licensing and repo policy are explicitly cleared.
- Preserve crisp rendering: integer scaling where practical, no blurry interpolation, and readable word-block labels at the 390x844 viewport.

## Testing Requirements

- Unit-test pure game logic with Jest.
- Component-test React shell behavior with React Testing Library.
- Add focused tests for Phaser adapter lifecycle where practical: mount, destroy, event bridge.
- Add at least one browser/e2e smoke test that starts a session and verifies live gameplay state changes.
- Maintain ≥80% coverage for new logic and shell code.

## Acceptance Criteria

- [ ] Babel's Architect has a real route at `/[locale]/student/games/sentence/babel-architect`.
- [ ] The catalog marks Babel's Architect `playable` only after implementation and browser verification.
- [ ] Phaser dependency and adapter pattern are documented in `measure/tech-stack.md` or this track's closeout notes.
- [ ] Pure logic module covers sentence ordering, scoring, stability/errors, difficulty, and completion summary.
- [ ] Phaser scene renders the tower/blocks, handles player input, and bridges typed events to React.
- [ ] API routes use shared route factories for sentences and completion.
- [ ] Game works at the 390×844 portrait reference viewport.
- [ ] Low-poly/low-color placeholder art renders crisply and can be replaced through the asset manifest.
- [ ] Automated tests pass.
- [ ] Manual browser verification confirms game start, correct/incorrect placement, end screen, XP, and route navigation.

## Out of Scope

- Porting existing finished games to Phaser.
- R3F or 3D implementation.
- Multiplayer.
- Teacher dashboard changes.
- Purchasing or committing commercial asset files without a separate asset-ingestion decision.
- Final preferred asset-pack integration; this track should leave stable replacement paths, not require licensed art.
