# Implementation Plan: Griffin Sky-Joust

This plan outlines the steps to build "Griffin Sky-Joust" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure

- [x] Task: Create configuration file `src/lib/games/griffinSkyJoustConfig.ts` with all balance values.
- [x] Task: Define game state types and interfaces in `src/lib/games/griffinSkyJoust.ts`.
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/sentence/griffin-sky-joust/page.tsx`.
- [x] Task: Create API route `src/app/api/v1/games/griffin-sky-joust/sentences/route.ts`.
- [x] Task: Create API route `src/app/api/v1/games/griffin-sky-joust/complete/route.ts`.
- [x] Task: Create `GriffinSkyJoustGame` container component with React-Konva Stage.

---

## Phase 2: Core Game Logic (TDD)

- [x] Task: Implement `createGriffinSkyJoustState()` initialization function.
- [x] Task: Implement `tickGriffinSkyJoust()` basic physics (gravity, flap, horizontal drift).
- [x] Task: Implement horizontal wrap-around logic.
- [x] Task: Implement enemy spawning and movement logic.
- [x] Task: Implement jousting collision logic (above vs below check).
- [x] Task: Implement word collection logic (correct order tracking).
- [x] Task: Implement damage and HP system.
- [x] Task: Implement win/lose condition detection.

---

## Phase 3: Rendering

- [x] Task: Render sky background with floating islands (parallaxes if possible).
- [x] Task: Render player griffin with flap animation (simple frame toggle).
- [x] Task: Render enemy knights with word orbs.
- [x] Task: Render target word display and translation.
- [x] Task: Render HP (hearts) and score HUD.
- [x] Task: Implement responsive scaling using `ResizeObserver`.

---

## Phase 4: Input & Controls

- [x] Task: Implement tap/click to flap and move horizontally toward pointer.
- [x] Task: Implement keyboard controls (Space to flap, Arrows for drift).
- [x] Task: Ensure all touch targets follow 44×44px rule.
- [x] Task: Implement rAF game loop with 60 FPS target.

---

## Phase 5: Game States & Polish

- [x] Task: Integrate `GameStartScreen` with difficulty/opponent choice.
- [x] Task: Integrate `GameEndScreen` with XP and stats.
- [x] Task: Add sound effects for flap, hit, collection, victory, defeat.
- [x] Task: Add visual feedback (sparkles, screen shake).
- [x] Task: Register game in `src/lib/gameCards.ts`.
- [x] Task: Final audit against `game-fidelity-checklist.md`.

---

## Technical Notes
- Momentum-based physics require sub-pixel accuracy.
- Jousting logic is the core differentiator—must feel fair (precise hitboxes).
- Mobile-first: test on 390×844 viewport.
- Target >80% coverage on `griffinSkyJoust.ts`.
