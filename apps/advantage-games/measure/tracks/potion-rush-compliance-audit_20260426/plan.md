# Implementation Plan: Potion Rush Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (PotionRushGame.tsx, potionRush.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/potionRush.ts' --collectCoverageFrom='src/components/games/sentence/potion-rush/**/*.tsx'`).
- [x] Task: Record lint status (`npm run lint -- --file src/components/games/sentence/potion-rush/PotionRushGame.tsx`).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1' [checkpoint: baseline]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in PotionRushGame.tsx. PASS
- [x] Task: Verify mobile-first portrait (390x844) responsive scaling. FAIL - fixed to 390x844
- [x] Task: Verify pure state + tick function pattern in potionRush.ts. PASS (in store)
- [x] Task: Verify requestAnimationFrame with delta-time clamping. FAIL - converted from useInterval to rAF
- [x] Task: Verify useGameFullscreen integration. FAIL - added hook
- [x] Task: Measure - User Manual Verification 'Phase 2' [checkpoint: arch-fixes]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets >= 44x44px. FAIL - added min-w/h-[44px] to buttons
- [x] Task: Verify text size >= 16px. FAIL - changed fontSize 14 to 16
- [x] Task: Verify accessibility settings consumption. FAIL - added useAccessibilitySettings
- [x] Task: Verify SentenceItem[] typing and API route factories. FAIL - created SentenceItem, replaced VocabularyItem
- [x] Task: Verify i18n and session hooks in page.tsx. FAIL - added useSession
- [x] Task: Measure - User Manual Verification 'Phase 3' [checkpoint: input-fixes]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1-10 scale with bonuses. FAIL - added calculatePotionRushXP
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. FAIL - added difficulty-based spawn rates
- [x] Task: Verify GameStartScreen and GameEndScreen usage. PASS
- [x] Task: Verify camera system (if applicable) and off-screen indicators. N/A
- [x] Task: Verify performance: delta-time clamping, no setState in loops. PASS
- [x] Task: Measure - User Manual Verification 'Phase 4' [checkpoint: systems-fixes]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage >= 80%. FAIL - added component tests (85.58%)
- [x] Task: Audit for `any` types and replace with proper types. PASS
- [x] Task: Audit hook dependency arrays for completeness. PASS
- [x] Task: Audit for unused variables/imports. PASS (after fixes)
- [x] Task: Run full test suite and lint after any fixes. PASS
- [x] Task: Measure - User Manual Verification 'Phase 5' [checkpoint: quality-fixes]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2-5.
- [x] Task: Write tests for any new fix code.
- [x] Task: Run full test suite to confirm no regressions.
- [x] Task: Verify coverage >= 80% post-fix. PASS (85.58%)
- [x] Task: Measure - User Manual Verification 'Phase 6' [checkpoint: regression-pass]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`.
- [x] Task: Update track metadata.json status to completed.
- [x] Task: Commit all changes with `chore(audit): Potion Rush compliance audit complete`.
- [x] Task: Measure - User Manual Verification 'Phase 7' [checkpoint: complete]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in PotionRushGame.tsx.
- [x] Task: Verify mobile-first portrait (390x844) responsive scaling.
- [x] Task: Verify pure state + tick function pattern in potionRush.ts.
- [x] Task: Verify requestAnimationFrame with delta-time clamping.
- [x] Task: Verify useGameFullscreen integration.
- [x] Task: Measure - User Manual Verification 'Phase 2'

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets >= 44x44px.
- [x] Task: Verify text size >= 16px.
- [x] Task: Verify accessibility settings consumption.
- [x] Task: Verify SentenceItem[] typing and API route factories.
- [x] Task: Verify i18n and session hooks in page.tsx.
- [x] Task: Measure - User Manual Verification 'Phase 3'

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1-10 scale with bonuses.
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets.
- [x] Task: Verify GameStartScreen and GameEndScreen usage.
- [x] Task: Verify camera system (if applicable) and off-screen indicators.
- [x] Task: Verify performance: delta-time clamping, no setState in loops.
- [x] Task: Measure - User Manual Verification 'Phase 4'

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage >= 80%.
- [x] Task: Audit for `any` types and replace with proper types.
- [x] Task: Audit hook dependency arrays for completeness.
- [x] Task: Audit for unused variables/imports.
- [x] Task: Run full test suite and lint after any fixes.
- [x] Task: Measure - User Manual Verification 'Phase 5'

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2-5.
- [x] Task: Write tests for any new fix code.
- [x] Task: Run full test suite to confirm no regressions.
- [x] Task: Verify coverage >= 80% post-fix.
- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`.
- [x] Task: Update track metadata.json status to completed.
- [x] Task: Commit all changes with `chore(audit): Potion Rush compliance audit complete`.
- [x] Task: Measure - User Manual Verification 'Phase 7'
