# Implementation Plan: Village Guardian Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (VillageGuardianGame.tsx, villageGuardian.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (54.08% baseline).
- [x] Task: Record lint status (2 warnings: unused Clock, unused index).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1'

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in VillageGuardianGame.tsx. PASS
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. PASS
- [x] Task: Verify pure state + tick function pattern in villageGuardian.ts. PASS
- [x] Task: Verify requestAnimationFrame with delta-time clamping. PASS
- [x] Task: Verify useGameFullscreen integration. FIXED
- [x] Task: Measure - User Manual Verification 'Phase 2'

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. PASS (VirtualDPad + accessibility hook)
- [x] Task: Verify text size ≥ 16px. FIXED (all Text components use getEffectiveTextSize with base ≥ 14, min 16)
- [x] Task: Verify accessibility settings consumption. FIXED (useAccessibilitySettings added)
- [x] Task: Verify SentenceItem[] typing and API route factories. FIXED (routes now use createSentencesRoute/createCompleteRoute)
- [x] Task: Verify i18n and session hooks in page.tsx. FIXED (useSession + useScopedI18n added)
- [x] Task: Measure - User Manual Verification 'Phase 3'

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. PASS
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. PASS
- [x] Task: Verify GameStartScreen and GameEndScreen usage. PASS
- [x] Task: Verify camera system (if applicable) and off-screen indicators. N/A (no scrolling camera)
- [x] Task: Verify performance: delta-time clamping, no setState in loops. PASS
- [x] Task: Measure - User Manual Verification 'Phase 4'

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. FIXED (94.58% overall, 92.03% component)
- [x] Task: Audit for `any` types and replace with proper types. PASS
- [x] Task: Audit hook dependency arrays for completeness. FIXED (removed gameState object from deps)
- [x] Task: Audit for unused variables/imports. FIXED (removed Clock, fixed index param)
- [x] Task: Run full test suite and lint after any fixes. PASS (0 errors, 0 warnings)
- [x] Task: Measure - User Manual Verification 'Phase 5'

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5.
- [x] Task: Write tests for any new fix code.
- [x] Task: Run full test suite to confirm no regressions.
- [x] Task: Verify coverage ≥ 80% post-fix. PASS (94.58%)
- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`.
- [x] Task: Update track metadata.json status to completed.
- [x] Task: Commit all changes with `chore(audit): Village Guardian compliance audit complete`. [c513109]
- [x] Task: Measure - User Manual Verification 'Phase 7'
