# Implementation Plan: Spellweaver's Run Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (SpellweaversRunGame.tsx, spellweaversRun.ts, page.tsx, API routes). [afd4c24]
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/spellweaversRun.ts' --collectCoverageFrom='src/components/games/sentence/spellweavers-run/**/*.tsx'`). [afd4c24]
- [x] Task: Record lint status (`npm run lint -- --file src/components/games/sentence/spellweavers-run/SpellweaversRunGame.tsx`). [afd4c24]
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`. [afd4c24]
- [x] Task: Verify asset and cover image existence. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 1' [checkpoint: afd4c24]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in SpellweaversRunGame.tsx. [afd4c24]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [afd4c24]
- [x] Task: Verify pure state + tick function pattern in spellweaversRun.ts. [afd4c24]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [afd4c24]
- [x] Task: Verify useGameFullscreen integration. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 2' [checkpoint: afd4c24]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [afd4c24]
- [x] Task: Verify text size ≥ 16px. [afd4c24]
- [x] Task: Verify accessibility settings consumption. [afd4c24]
- [x] Task: Verify SentenceItem[] typing and API route factories. [afd4c24]
- [x] Task: Verify i18n and session hooks in page.tsx. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 3' [checkpoint: afd4c24]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. [afd4c24]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [afd4c24]
- [x] Task: Verify GameStartScreen and GameEndScreen usage. [afd4c24]
- [x] Task: Verify camera system (if applicable) and off-screen indicators. [afd4c24]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 4' [checkpoint: afd4c24]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [afd4c24]
- [x] Task: Audit for `any` types and replace with proper types. [afd4c24]
- [x] Task: Audit hook dependency arrays for completeness. [afd4c24]
- [x] Task: Audit for unused variables/imports. [afd4c24]
- [x] Task: Run full test suite and lint after any fixes. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 5' [checkpoint: afd4c24]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. [afd4c24]
- [x] Task: Write tests for any new fix code. [afd4c24]
- [x] Task: Run full test suite to confirm no regressions. [afd4c24]
- [x] Task: Verify coverage ≥ 80% post-fix. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 6' [checkpoint: afd4c24]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [afd4c24]
- [x] Task: Update track metadata.json status to completed. [afd4c24]
- [x] Task: Commit all changes with `chore(audit): Spellweaver's Run compliance audit complete`. [afd4c24]
- [x] Task: Measure - User Manual Verification 'Phase 7' [checkpoint: afd4c24]
