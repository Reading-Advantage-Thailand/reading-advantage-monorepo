# Implementation Plan: Haunted Library Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (HauntedLibraryGame.tsx, hauntedLibrary.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/hauntedLibrary.ts' --collectCoverageFrom='src/components/games/sentence/haunted-library/**/*.tsx'`).
- [x] Task: Record lint status (`npm run lint -- --file src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx`).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1'

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in HauntedLibraryGame.tsx. [PASS]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [PASS]
- [x] Task: Verify pure state + tick function pattern in hauntedLibrary.ts. [PASS]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [FIXED]
- [x] Task: Verify useGameFullscreen integration. [FIXED]
- [x] Task: Measure - User Manual Verification 'Phase 2'

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [PASS]
- [x] Task: Verify text size ≥ 16px. [FIXED]
- [x] Task: Verify accessibility settings consumption. [FIXED]
- [x] Task: Verify SentenceItem[] typing and API route factories. [FIXED]
- [x] Task: Verify i18n and session hooks in page.tsx. [FIXED]
- [x] Task: Measure - User Manual Verification 'Phase 3'

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. [FIXED]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [PASS]
- [x] Task: Verify GameStartScreen and GameEndScreen usage. [PASS]
- [x] Task: Verify camera system (if applicable) and off-screen indicators. [N/A]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [FIXED]
- [x] Task: Measure - User Manual Verification 'Phase 4'

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [FIXED - 93.89%]
- [x] Task: Audit for `any` types and replace with proper types. [PASS]
- [x] Task: Audit hook dependency arrays for completeness. [PASS]
- [x] Task: Audit for unused variables/imports. [PASS]
- [x] Task: Run full test suite and lint after any fixes. [PASS]
- [x] Task: Measure - User Manual Verification 'Phase 5'

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5.
- [x] Task: Write tests for any new fix code.
- [x] Task: Run full test suite to confirm no regressions.
- [x] Task: Verify coverage ≥ 80% post-fix.
- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [ba3c3f0]
- [x] Task: Update track metadata.json status to completed. [ba3c3f0]
- [x] Task: Commit all changes with `chore(audit): Haunted Library compliance audit complete`. [ba3c3f0]
- [x] Task: Measure - User Manual Verification 'Phase 7'
