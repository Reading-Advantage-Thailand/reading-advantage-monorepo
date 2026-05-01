# Realm Carver Compliance Audit Report

**Date:** 2026-04-26
**Game:** Realm Carver
**Track ID:** realm-carver-compliance-audit_20260426
**Commit:** 70d4f01

## Summary

Audited the Realm Carver game against 25 shared game specifications.

**Result: 25/25 passing after fixes (13 passing at start, 12 failures)**

## Baseline

- Component coverage: 84.73%
- Logic coverage: 39.20%
- Overall coverage: 64.05%
- Lint warnings: 5 (hook deps, any type)

## Fixes Applied

1. **useGameFullscreen** — Added hook with enter/exit on phase changes
2. **useAccessibilitySettings** — Added `getEffectiveTextSize` for all text elements
3. **Text sizes** — Increased base fontSize from 10px/14px to 16px minimum
4. **calculateXP** — Added standardized XP calculation with accuracy/speed/survival bonuses capped at 10
5. **Difficulty tiers** — Changed default from 'normal' to 'medium', added easy/medium/hard presets with varying monster counts and player HP
6. **Hook dependencies** — Fixed useEffect deps by extracting primitives (`targetWordIndex`, `playerHp`)
7. **i18n/session** — Added `useCurrentLocale` and `useSession` to page.tsx
8. **API routes** — Switched to `createSentencesRoute` / `createCompleteRoute`
9. **Component tests** — Expanded RealmCarverGame.test.tsx from 2 to 7 tests
10. **Logic tests** — Wrote realmCarver.test.ts with 24 tests achieving 100% logic coverage
11. **Asset directory** — Created `/public/games/sentence/realm-carver/`

## Final Coverage

- **Overall: 91.01%**
- **Logic (realmCarver.ts): 100%**
- **Component (RealmCarverGame.tsx): 82.85%**

## Compliance Checklist

| # | Specification | Status |
|---|---------------|--------|
| 1 | React-Konva Canvas | PASS |
| 2 | Mobile-First Portrait | PASS |
| 3 | Pure State + Tick Functions | PASS |
| 4 | Game Loop (rAF + delta clamp) | PASS |
| 5 | Fullscreen (useGameFullscreen) | PASS |
| 6 | Touch Targets ≥ 44×44px | PASS |
| 7 | Text Size ≥ 16px | PASS |
| 8 | Accessibility Settings | PASS |
| 9 | SentenceItem[] Typing | PASS |
| 10 | API Route Factories | PASS |
| 11 | i18n & Session Hooks | PASS |
| 12 | XP/Scoring (1–10 scale) | PASS |
| 13 | Difficulty Tiers | PASS |
| 14 | Shared Screens | PASS |
| 15 | Camera System | N/A |
| 16 | Off-screen Indicators | N/A |
| 17 | Performance | PASS |
| 18 | Test Coverage ≥ 80% | PASS |
| 19 | No `any` Types | PASS |
| 20 | Hook Dependencies | PASS |
| 21 | No Unused Variables/Imports | PASS |
| 22 | Game Registry | PASS |
| 23 | Asset Location | PASS |
| 24 | Cover Image | PASS |
| 25 | Directory Structure | PASS |

## Notes

- Camera system and off-screen indicators are not applicable since the game fits within the viewport (no scrolling required).
- The game uses a 100×100 logical grid rendered within a 390×600 canvas, with responsive scaling via ResizeObserver.
