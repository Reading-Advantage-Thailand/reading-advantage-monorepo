# Babel Architect Compliance Audit Report

**Track:** babel-architect-compliance-audit_20260426  
**Date:** 2026-04-26  
**Game ID:** babel-architect  
**Game Type:** sentence  

---

## Executive Summary

Babel Architect is **registered as playable** in `src/lib/gameCards.ts` with correct metadata and has a **cover image**, but **no game implementation exists**. The game is a placeholder — all source files, logic modules, API routes, tests, and assets are missing.

| Metric | Value |
|--------|-------|
| **Specs Audited** | 25 |
| **Pass** | 2 |
| **Fail** | 23 |
| **Coverage** | 0% |
| **Status** | Non-compliant — requires full implementation |

---

## Compliance Results

### Pass (2/25)

| # | Spec | Evidence |
|---|------|----------|
| 1 | **Game Registry** | Registered in `src/lib/gameCards.ts` with `id: 'babel-architect'`, `title: "Babel's Architect"`, `status: 'playable'`, `href: '/en/student/games/sentence/babel-architect'` |
| 2 | **Cover Image** | `public/games/cover/cover-babel-architect.png` exists |

### Fail (23/25)

#### Architecture & Platform (5 failures)

| # | Spec | Finding |
|---|------|---------|
| 3 | **React-Konva Canvas** | `src/components/games/sentence/babel-architect/BabelArchitectGame.tsx` does not exist |
| 4 | **Mobile-First Portrait** | Component missing — cannot verify 390×844 reference viewport |
| 5 | **Pure State + Tick Functions** | `src/lib/games/babelArchitect.ts` does not exist |
| 6 | **Game Loop** | Component missing — cannot verify `requestAnimationFrame` or delta-time clamping |
| 7 | **Fullscreen** | Component missing — cannot verify `useGameFullscreen` integration |

#### Input & Accessibility (3 failures)

| # | Spec | Finding |
|---|------|---------|
| 8 | **Touch Targets ≥ 44×44px** | Component missing — no interactive elements to measure |
| 9 | **Text Size ≥ 16px** | Component missing — no text elements to verify |
| 10 | **Accessibility Settings** | Component missing — cannot verify shared accessibility/assist layer consumption |

#### Data & API Integration (3 failures)

| # | Spec | Finding |
|---|------|---------|
| 11 | **Sentence Data** | Logic module missing — no `SentenceItem[]` typing or `{ term, translation }` usage |
| 12 | **API Route Factories** | `src/app/api/v1/games/babel-architect/sentence/route.ts` does not exist; `src/app/api/v1/games/babel-architect/complete/route.ts` does not exist |
| 13 | **i18n & Session** | `src/app/[locale]/(student)/student/games/sentence/babel-architect/page.tsx` does not exist |

#### Game Systems (6 failures)

| # | Spec | Finding |
|---|------|---------|
| 14 | **XP/Scoring (1–10 scale)** | Logic module missing — no accuracy/speed/survival bonus calculation |
| 15 | **Difficulty Tiers** | Logic module missing — no easy/medium/hard presets or standardized spawn rates |
| 16 | **Shared Screens** | Component missing — no `GameStartScreen` or `GameEndScreen` usage |
| 17 | **Camera System** | Component missing — no scrolling camera or world size verification |
| 18 | **Off-screen Indicators** | Component missing — cannot verify indicators |
| 19 | **Performance** | Component missing — cannot verify 30+ FPS target or delta-time clamping |

#### Code Quality & Testing (4 failures)

| # | Spec | Finding |
|---|------|---------|
| 20 | **Test Coverage ≥ 80%** | 0% — no source code or tests exist |
| 21 | **No any Types** | No code to audit |
| 22 | **Hook Dependencies** | No code to audit |
| 23 | **No Unused Variables/Imports** | No code to audit |

#### Project Integration (2 failures)

| # | Spec | Finding |
|---|------|---------|
| 24 | **Asset Location** | `public/games/sentence/babel-architect/` directory does not exist |
| 25 | **Directory Structure** | Standard paths for page, component, logic, and API routes are all missing |

---

## Test Results

**Compliance test file:** `src/lib/games/babelArchitectCompliance.test.ts`

```
Test Suites: 1 failed, 1 total
Tests:       8 failed, 2 passed, 10 total

Pass:
  - should be registered in gameCards with correct metadata
  - should have a cover image

Fail:
  - should have game assets directory
  - should have BabelArchitectGame.tsx component
  - should have game logic module
  - should have page.tsx
  - should have sentences API route
  - should have complete API route
  - should have game logic tests
  - should have component tests
```

---

## Remediation Required

Full game implementation is required to achieve compliance. The following components must be created:

1. **Game Logic Module** — `src/lib/games/babelArchitect.ts`
   - Immutable state objects with pure `tick` functions
   - Sentence data typing (`SentenceItem[]`)
   - XP/scoring calculation (1–10 scale with accuracy/speed/survival bonuses)
   - Difficulty tiers (easy/medium/hard) with standardized presets
   - Delta-time clamping to 50ms

2. **React Component** — `src/components/games/sentence/babel-architect/BabelArchitectGame.tsx`
   - React-Konva `<Stage>` / `<Layer>` rendering
   - Mobile-first portrait (390×844 reference)
   - `requestAnimationFrame` game loop
   - `useGameFullscreen` integration
   - Touch targets ≥ 44×44px
   - Text size ≥ 16px
   - Shared accessibility settings consumption
   - `GameStartScreen` and `GameEndScreen`
   - Camera system (if world > 500px) with off-screen indicators
   - Target 30+ FPS performance

3. **Page** — `src/app/[locale]/(student)/student/games/sentence/babel-architect/page.tsx`
   - `useScopedI18n`, `useCurrentLocale`, `useSession` hooks
   - Game component integration

4. **API Routes**
   - `src/app/api/v1/games/babel-architect/sentence/route.ts` (using `createSentenceRoute`)
   - `src/app/api/v1/games/babel-architect/complete/route.ts` (using `createCompleteRoute`)

5. **Tests**
   - `src/lib/games/babelArchitect.test.ts` (logic tests, ≥80% coverage)
   - `src/components/games/sentence/babel-architect/BabelArchitectGame.test.tsx` (component tests)

6. **Assets**
   - `public/games/sentence/babel-architect/` directory with game sprites/images

---

## Out of Scope

Per track specification, the following are **not** addressed in this audit:
- New gameplay features
- Visual redesigns
- Multiplayer integration
- Backend API changes

---

## Conclusion

**Babel Architect is non-compliant with the shared game specifications.** Only 2 of 25 compliance items pass (game registry and cover image). All game implementation — logic, component, page, API routes, tests, and assets — is missing. A full implementation track is required to bring this game to compliance.
