# Implementation Plan: Realm Carver Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (RealmCarverGame.tsx, realmCarver.ts, page.tsx, API routes). [70d4f01]
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/realmCarver.ts' --collectCoverageFrom='src/components/games/sentence/realm-carver/**/*.tsx'`). [70d4f01]
- [x] Task: Record lint status (`npx eslint src/components/games/sentence/realm-carver/RealmCarverGame.tsx src/lib/games/realmCarver.ts`). [70d4f01]
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`. [70d4f01]
- [x] Task: Verify asset and cover image existence. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 1' [70d4f01]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in RealmCarverGame.tsx. [70d4f01]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [70d4f01]
- [x] Task: Verify pure state + tick function pattern in realmCarver.ts. [70d4f01]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [70d4f01]
- [x] Task: Verify useGameFullscreen integration. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 2' [70d4f01]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [70d4f01]
- [x] Task: Verify text size ≥ 16px. [70d4f01]
- [x] Task: Verify accessibility settings consumption. [70d4f01]
- [x] Task: Verify SentenceItem[] typing and API route factories. [70d4f01]
- [x] Task: Verify i18n and session hooks in page.tsx. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 3' [70d4f01]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. [70d4f01]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [70d4f01]
- [x] Task: Verify GameStartScreen and GameEndScreen usage. [70d4f01]
- [x] Task: Verify camera system (if applicable) and off-screen indicators. [70d4f01]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 4' [70d4f01]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [70d4f01]
- [x] Task: Audit for `any` types and replace with proper types. [70d4f01]
- [x] Task: Audit hook dependency arrays for completeness. [70d4f01]
- [x] Task: Audit for unused variables/imports. [70d4f01]
- [x] Task: Run full test suite and lint after any fixes. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 5' [70d4f01]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. [70d4f01]
- [x] Task: Write tests for any new fix code. [70d4f01]
- [x] Task: Run full test suite to confirm no regressions. [70d4f01]
- [x] Task: Verify coverage ≥ 80% post-fix. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 6' [70d4f01]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [70d4f01]
- [x] Task: Update track metadata.json status to completed. [70d4f01]
- [x] Task: Commit all changes with `chore(audit): Realm Carver compliance audit complete`. [70d4f01]
- [x] Task: Measure - User Manual Verification 'Phase 7' [70d4f01]
