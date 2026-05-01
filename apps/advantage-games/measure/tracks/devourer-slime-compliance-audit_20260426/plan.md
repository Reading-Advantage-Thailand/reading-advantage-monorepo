# Implementation Plan: Devourer Slime Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (DevourerSlimeGame.tsx, devourerSlime.ts, page.tsx, API routes). [commit: 0c24a1e]
- [x] Task: Run existing tests and record current coverage (baseline: 97.9% stmts, 80.55% branch). [commit: baseline]
- [x] Task: Record lint status (eslint passes with no errors). [commit: baseline]
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`. [commit: baseline]
- [x] Task: Verify asset and cover image existence. [commit: baseline]
- [x] Task: Measure - User Manual Verification 'Phase 1' [commit: baseline]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in DevourerSlimeGame.tsx. [commit: baseline]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [commit: baseline]
- [x] Task: Verify pure state + tick function pattern in devourerSlime.ts. [commit: baseline]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [commit: baseline]
- [x] Task: Verify useGameFullscreen integration. [commit: baseline]
- [x] Task: Measure - User Manual Verification 'Phase 2' [commit: baseline]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [commit: baseline]
- [x] Task: Verify text size ≥ 16px. [commit: baseline]
- [x] Task: Fix accessibility settings consumption (add useAccessibilitySettings hook). [commit: TBD]
- [x] Task: Verify SentenceItem[] typing and API route factories. [commit: baseline]
- [x] Task: Fix i18n and session hooks in page.tsx (add useScopedI18n, useSession). [commit: TBD]
- [x] Task: Measure - User Manual Verification 'Phase 3' [commit: baseline]

## Phase 4: Game Systems Audit
- [x] Task: Fix XP/scoring to use shared calculateXP from @/lib/xp. [commit: TBD]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [commit: baseline]
- [x] Task: Add GameStartScreen and GameEndScreen integration. [commit: TBD]
- [x] Task: Add off-screen indicators for camera system. [commit: TBD]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [commit: baseline]
- [x] Task: Measure - User Manual Verification 'Phase 4' [commit: baseline]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [commit: baseline]
- [x] Task: Audit for `any` types and replace with proper types. [commit: baseline]
- [x] Task: Audit hook dependency arrays for completeness. [commit: baseline]
- [x] Task: Audit for unused variables/imports. [commit: TBD]
- [x] Task: Run full test suite and lint after fixes. [commit: TBD]
- [x] Task: Measure - User Manual Verification 'Phase 5' [commit: baseline]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix failing compliance items from Phases 2–5. [commit: TBD]
- [x] Task: Write tests for new fix code. [commit: TBD]
- [x] Task: Run full test suite to confirm no regressions. [commit: TBD]
- [x] Task: Verify coverage ≥ 80% post-fix. [commit: TBD]
- [x] Task: Measure - User Manual Verification 'Phase 6' [commit: TBD]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [commit: TBD]
- [ ] Task: Update track metadata.json status to completed.
- [ ] Task: Commit all changes with `chore(audit): Devourer Slime compliance audit complete`.
- [ ] Task: Measure - User Manual Verification 'Phase 7'
