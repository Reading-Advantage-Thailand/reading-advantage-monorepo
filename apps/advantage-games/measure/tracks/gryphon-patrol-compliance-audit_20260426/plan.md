# Implementation Plan: Gryphon Patrol Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (GryphonPatrolGame.tsx, gryphonPatrol.ts, page.tsx, API routes). [4f3974f]
- [x] Task: Run existing tests and record current coverage (`CI=true npm test -- --coverage --collectCoverageFrom='src/lib/games/gryphonPatrol.ts' --collectCoverageFrom='src/lib/games/gryphonPatrolConfig.ts' --collectCoverageFrom='src/components/games/sentence/gryphon-patrol/**/*.tsx'`). [4f3974f]
- [x] Task: Record lint status (`npm run lint -- --file src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.tsx`). [4f3974f]
- [x] Task: Check game registry entry in `src/lib/gameCards.ts`. [4f3974f]
- [x] Task: Verify asset and cover image existence. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 1' [4f3974f]

## Phase 2: Architecture & Platform Audit
- [x] Task: Verify React-Konva usage in GryphonPatrolGame.tsx. [4f3974f]
- [x] Task: Verify mobile-first portrait (390×844) responsive scaling. [4f3974f]
- [x] Task: Verify pure state + tick function pattern in gryphonPatrol.ts. [4f3974f]
- [x] Task: Verify requestAnimationFrame with delta-time clamping. [4f3974f]
- [x] Task: Verify useGameFullscreen integration. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 2' [4f3974f]

## Phase 3: Input, Accessibility & Data Audit
- [x] Task: Verify touch targets ≥ 44×44px. [4f3974f]
- [x] Task: Verify text size ≥ 16px. [4f3974f]
- [x] Task: Verify accessibility settings consumption. [4f3974f]
- [x] Task: Verify SentenceItem[] typing and API route factories. [4f3974f]
- [x] Task: Verify i18n and session hooks in page.tsx. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 3' [4f3974f]

## Phase 4: Game Systems Audit
- [x] Task: Verify XP/scoring 1–10 scale with bonuses. [4f3974f]
- [x] Task: Verify difficulty tiers (easy/medium/hard) with standardized presets. [4f3974f]
- [x] Task: Verify GameStartScreen and GameEndScreen usage. [4f3974f]
- [x] Task: Verify camera system (if applicable) and off-screen indicators. [4f3974f]
- [x] Task: Verify performance: delta-time clamping, no setState in loops. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 4' [4f3974f]

## Phase 5: Code Quality & Testing Audit
- [x] Task: Verify test coverage ≥ 80%. [4f3974f]
- [x] Task: Audit for `any` types and replace with proper types. [4f3974f]
- [x] Task: Audit hook dependency arrays for completeness. [4f3974f]
- [x] Task: Audit for unused variables/imports. [4f3974f]
- [x] Task: Run full test suite and lint after any fixes. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 5' [4f3974f]

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. [4f3974f]
- [x] Task: Write tests for any new fix code. [4f3974f]
- [x] Task: Run full test suite to confirm no regressions. [4f3974f]
- [x] Task: Verify coverage ≥ 80% post-fix. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 6' [4f3974f]

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [4f3974f]
- [x] Task: Update track metadata.json status to completed. [4f3974f]
- [x] Task: Commit all changes with `chore(audit): Gryphon Patrol compliance audit complete`. [4f3974f]
- [x] Task: Measure - User Manual Verification 'Phase 7' [4f3974f]
