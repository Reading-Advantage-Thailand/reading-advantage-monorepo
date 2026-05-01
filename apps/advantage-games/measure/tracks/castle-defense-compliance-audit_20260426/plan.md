# Implementation Plan: Castle Defense Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (CastleDefenseGame.tsx, castleDefense.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (`npx jest src/lib/games/castleDefense.test.ts --coverage --collectCoverageFrom='src/lib/games/castleDefense.ts'`).
- [x] Task: Record lint status (`npx eslint src/components/games/sentence/castle-defense/CastleDefenseGame.tsx src/lib/games/castleDefense.ts "src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx"`).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1'

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in CastleDefenseGame.tsx. [12057db]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [12057db]
- [x] Task: Verify pure state + tick function pattern in castleDefense.ts. [12057db]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [12057db]
- [x] Task: Verify useGameFullscreen integration. [12057db]
- [x] Task: Measure - User Manual Verification 'Phase 2' [12057db]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [12057db]
- [x] Task: Verify text size ≥ 16px. [12057db]
- [x] Task: Verify accessibility settings consumption. [12057db]
- [x] Task: Verify SentenceItem[] typing and API route factories. [12057db]
- [x] Task: Verify i18n and session hooks in page.tsx. [12057db]
- [x] Task: Measure - User Manual Verification 'Phase 3' [12057db]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. [12057db]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [12057db]
- [x] Task: Verify GameStartScreen and GameEndScreen usage. [12057db]
- [x] Task: Verify camera system (if applicable) and off-screen indicators. [12057db]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [12057db]
- [x] Task: Measure - User Manual Verification 'Phase 4' [12057db]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [12057db]
- [x] Task: Audit for `any` types and replace with proper types. [12057db]
- [x] Task: Audit hook dependency arrays for completeness. [12057db]
- [x] Task: Audit for unused variables/imports. [12057db]
- [x] Task: Run full test suite and lint after any fixes. [12057db]
- [x] Task: Measure - User Manual Verification 'Phase 5' [12057db]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. [12057db]
- [x] Task: Write tests for any new fix code. [12057db]
- [x] Task: Run full test suite to confirm no regressions. [12057db]
- [x] Task: Verify coverage ≥ 80% post-fix. [12057db]
- [x] Task: Measure - User Manual Verification 'Phase 6' [12057db]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [b255078]
- [x] Task: Update track metadata.json status to completed. [b255078]
- [x] Task: Commit all changes with `chore(audit): Castle Defense compliance audit complete`. [b255078]
- [x] Task: Measure - User Manual Verification 'Phase 7' [b255078]
