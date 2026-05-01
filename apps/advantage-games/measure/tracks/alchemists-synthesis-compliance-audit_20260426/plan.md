# Implementation Plan: Alchemists Synthesis Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (AlchemistsSynthesisGame.tsx, alchemistsSynthesis.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/alchemistsSynthesis.ts' --collectCoverageFrom='src/components/games/vocabulary/alchemists-synthesis/**/*.tsx'`).
- [x] Task: Record lint status (`npm run lint -- --file src/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.tsx`).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1'

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in AlchemistsSynthesisGame.tsx.
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling.
- [x] Task: Verify pure state + tick function pattern in alchemistsSynthesis.ts.
- [x] Task: Verify requestAnimationFrame with delta-time clamping.
- [x] Task: Verify useGameFullscreen integration.
- [x] Task: Measure - User Manual Verification 'Phase 2'

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px.
- [x] Task: Verify text size ≥ 16px.
- [x] Task: Verify accessibility settings consumption.
- [x] Task: Verify VocabularyItem[] typing and API route factories.
- [x] Task: Verify i18n and session hooks in page.tsx.
- [x] Task: Measure - User Manual Verification 'Phase 3'

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses.
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets.
- [x] Task: Verify GameStartScreen and GameEndScreen usage.
- [x] Task: Verify camera system (if applicable) and off-screen indicators.
- [x] Task: Verify performance: delta-time clamping, no setState in loops.
- [x] Task: Measure - User Manual Verification 'Phase 4'

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%.
- [x] Task: Audit for `any` types and replace with proper types.
- [x] Task: Audit hook dependency arrays for completeness.
- [x] Task: Audit for unused variables/imports.
- [x] Task: Run full test suite and lint after any fixes.
- [x] Task: Measure - User Manual Verification 'Phase 5'

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5.
- [x] Task: Write tests for any new fix code.
- [x] Task: Run full test suite to confirm no regressions.
- [x] Task: Verify coverage ≥ 80% post-fix.
- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`.
- [x] Task: Update track metadata.json status to completed.
- [x] Task: Commit all changes with `chore(audit): Alchemists Synthesis compliance audit complete`. [6fc59ca]
- [x] Task: Measure - User Manual Verification 'Phase 7'
