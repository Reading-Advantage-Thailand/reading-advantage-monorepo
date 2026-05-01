# Implementation Plan: Enchanted Library Compliance Audit

## Phase 1: Discovery & Baseline
- [x] Task: Read game source files (EnchantedLibraryGame.tsx, enchantedLibrary.ts, page.tsx, API routes). [c87e5dc]
- [x] Task: Run existing tests and record current coverage (84.81% overall, 78.14% components). [c87e5dc]
- [x] Task: Record lint status (passes). [c87e5dc]
- [x] Task: Check game registry entry in `src/lib/gameCards.ts` (registered, playable). [c87e5dc]
- [x] Task: Verify asset and cover image existence (all present). [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 1'

### Phase 1 Results
- **Initial Coverage:** 84.81% overall, 78.14% components, 96.9% lib
- **Lint:** Passes
- **Audit Preliminary:** 16/25 passing, 9 failures identified

## Phase 2: Architecture & Platform Fixes
- [x] Task: Add useGameFullscreen hook integration. [c87e5dc]
- [x] Task: Convert useInterval game loop to requestAnimationFrame with delta-time clamping. [c87e5dc]
- [x] Task: Fix text sizes to ≥ 16px minimum. [c87e5dc]
- [x] Task: Fix touch targets to ≥ 44×44px minimum. [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 2'

## Phase 3: Input, Accessibility & Data Fixes
- [x] Task: Add useAccessibilitySettings consumption. [c87e5dc]
- [x] Task: Add useCurrentLocale and useSession to page.tsx. [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 3'

## Phase 4: Game Systems Fixes
- [x] Task: Implement standardized calculateEnchantedLibraryXP with 1-10 scale and bonuses. [c87e5dc]
- [x] Task: Add off-screen indicators for books when camera is active. [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 4'

## Phase 5: Code Quality & Testing Fixes
- [x] Task: Add tests for RankingDisplay to improve component coverage. [c87e5dc]
- [x] Task: Add tests for new fix code (calculateEnchantedLibraryXP). [c87e5dc]
- [x] Task: Run full test suite and verify coverage ≥ 80%. [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 5'

## Phase 6: Fixes & Regression Testing
- [x] Task: Fix any failing compliance items from Phases 2–5. [c87e5dc]
- [x] Task: Write tests for any new fix code. [c87e5dc]
- [x] Task: Run full test suite to confirm no regressions. [c87e5dc]
- [x] Task: Verify coverage ≥ 80% post-fix (91.27% overall, 88.31% components). [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Compliance Report
- [x] Task: Write final compliance report to `report.md`. [c87e5dc]
- [x] Task: Update track metadata.json status to completed. [c87e5dc]
- [x] Task: Commit all changes with `chore(audit): Enchanted Library compliance audit complete`. [c87e5dc]
- [x] Task: Measure - User Manual Verification 'Phase 7'
