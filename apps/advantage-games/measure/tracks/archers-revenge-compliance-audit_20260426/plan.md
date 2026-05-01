# Implementation Plan: Archer's Revenge Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (ArchersRevengeGame.tsx, archersRevenge.ts, page.tsx, API routes).
- [x] Task: Run existing tests and record current coverage (91.87% baseline).
- [x] Task: Record lint status (passed).
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`.
- [x] Task: Verify asset and cover image existence.
- [x] Task: Measure - User Manual Verification 'Phase 1' [checkpoint: TBD]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in ArchersRevengeGame.tsx. — PASS
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. — PASS
- [x] Task: Verify pure state + tick function pattern in archersRevenge.ts. — PASS
- [x] Task: Verify requestAnimationFrame with delta-time clamping. — PASS
- [x] Task: Verify useGameFullscreen integration. — PASS
- [x] Task: Measure - User Manual Verification 'Phase 2' [checkpoint: TBD]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. — PASS
- [x] Task: Verify text size ≥ 16px. — PASS
- [x] Task: Verify accessibility settings consumption. — PASS
- [x] Task: Verify VocabularyItem[] typing and API route factories. — PASS
- [x] Task: Verify i18n and session hooks in page.tsx. — PASS
- [x] Task: Measure - User Manual Verification 'Phase 3' [checkpoint: TBD]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. — PASS
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. — PASS
- [x] Task: Verify GameStartScreen and GameEndScreen usage. — PASS
- [x] Task: Verify camera system (if applicable) and off-screen indicators. — N/A
- [x] Task: Verify performance: delta-time clamping, no setState in loops. — PASS
- [x] Task: Measure - User Manual Verification 'Phase 4' [checkpoint: TBD]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. — PASS (93.14%)
- [x] Task: Audit for `any` types and replace with proper types. — PASS
- [x] Task: Audit hook dependency arrays for completeness. — FAIL (gameState in deps, fixed)
- [x] Task: Audit for unused variables/imports. — FAIL (locale/session in page.tsx, fixed)
- [x] Task: Run full test suite and lint after any fixes. — PASS
- [x] Task: Measure - User Manual Verification 'Phase 5' [checkpoint: TBD]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. — Fixed 2 items [c4a1d86]
- [x] Task: Write tests for any new fix code. — Added onComplete call-count test [c4a1d86]
- [x] Task: Run full test suite to confirm no regressions. — 33 tests passing [c4a1d86]
- [x] Task: Verify coverage ≥ 80% post-fix. — 93.14% overall [c4a1d86]
- [x] Task: Measure - User Manual Verification 'Phase 6' [checkpoint: c4a1d86]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`.
- [x] Task: Update track metadata.json status to completed.
- [x] Task: Commit all changes with `chore(audit): Archer's Revenge compliance audit complete`.
- [x] Task: Measure - User Manual Verification 'Phase 7' [checkpoint: TBD]
