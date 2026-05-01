# Track: Potion Rush Compliance Audit

## Overview

Audit the **Potion Rush** game against the 25 shared specifications that have been standardized across all vocabulary/sentence games in the advantage-games platform (March–April 2026). This track produces a pass/fail compliance report and fixes any non-compliant items.

## Game Under Audit

| Property | Value |
|----------|-------|
| **Game ID** | `potion-rush` |
| **Title** | Potion Rush |
| **Type** | sentence |
| **Component** | `src/components/games/sentence/potion-rush/PotionRushGame.tsx` |
| **Logic** | `src/lib/games/potionRush.ts` |
| **Page** | `src/app/[locale]/(student)/student/games/sentence/potion-rush/page.tsx` |
| **API** | `src/app/api/v1/games/potion-rush/sentences/route.ts` |
| **Assets** | `public/games/sentence/potion-rush/` |

## Compliance Checklist

### Architecture & Platform
- [ ] **React-Konva Canvas** — Game renders via React-Konva `<Stage>` / `<Layer>`.
- [ ] **Mobile-First Portrait** — 390×844 reference viewport, responsive scaling.
- [ ] **Pure State + Tick Functions** — Game logic uses immutable state objects updated by pure `tick` functions.
- [ ] **Game Loop** — Uses `requestAnimationFrame` with delta-time (clamped to 50ms).
- [ ] **Fullscreen** — Uses `useGameFullscreen` hook during gameplay.

### Input & Accessibility
- [ ] **Touch Targets ≥ 44×44px** — Minimum size for all interactive elements.
- [ ] **Text Size ≥ 16px** — Readability minimum.
- [ ] **Accessibility Settings** — Consumes shared accessibility/assist layer.

### Data & API Integration
- [ ] **Sentence Data** — Uses `SentenceItem[]` with `{ sentence, words }`.
- [ ] **API Route Factories** — Uses `createSentencesRoute` / `createCompleteRoute` from `@/lib/games/api`.
- [ ] **i18n & Session** — Uses `useScopedI18n`, `useCurrentLocale`, and `useSession` hooks.

### Game Systems
- [ ] **XP/Scoring (1–10 scale)** — Consistent XP calculation with accuracy/speed/survival bonuses.
- [ ] **Difficulty Tiers** — Easy/Medium/Hard with standardized spawn rates, word counts, and speed presets.
- [ ] **Shared Screens** — Uses `GameStartScreen` and `GameEndScreen`.
- [ ] **Camera System** — If world > 500px, uses scrolling camera centered on player.
- [ ] **Off-screen Indicators** — Required when camera is used.
- [ ] **Performance** — Target 30+ FPS on mobile; delta-time clamping.

### Code Quality & Testing
- [ ] **Test Coverage ≥ 80%** — Jest + React Testing Library; strict TDD.
- [ ] **No `any` Types** — Proper TypeScript typing.
- [ ] **Hook Dependencies** — Complete `useEffect`/`useCallback` dependency arrays.
- [ ] **No Unused Variables/Imports** — Clean lint passes.

### Project Integration
- [ ] **Game Registry** — Registered in `src/lib/gameCards.ts` with correct `type: 'sentence'` and `status: 'playable'`.
- [ ] **Asset Location** — PNGs/sprite sheets in `/public/games/sentence/potion-rush/`.
- [ ] **Cover Image** — Cover image at `/public/games/cover/potion-rush-cover.png`.
- [ ] **Directory Structure** — Standard paths for page, component, logic, and API routes.

## Acceptance Criteria

- [ ] All 25 compliance items audited and marked pass/fail.
- [ ] Any failing items have associated fix tasks created.
- [ ] Fix tasks completed and re-verified.
- [ ] Final compliance report written to `measure/tracks/potion-rush-compliance-audit_20260426/report.md`.
- [ ] Coverage remains ≥ 80% after any fixes.

## Out of Scope

- New gameplay features.
- Visual redesigns.
- Multiplayer integration.
- Backend API changes.
