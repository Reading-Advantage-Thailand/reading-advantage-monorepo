# Implementation Plan: Dragon Rider Reskin

## Phase 1: Foundation - Core Game Logic

### Task 1.1: Create dragonRider game logic module
- [x] Copy `src/lib/dragonFlight.ts` to `src/lib/dragonRider.ts`
- [x] Update type names: `DragonFlightResults` → `DragonRiderResults`
- [x] Update function names: `calculateDragonFlightXP` → `calculateDragonRiderXP`
- [x] Update comments and documentation to reference "Dragon Rider"
- [x] **Test**: All type exports work correctly
- [x] **Commit**: "feat(dragon-rider): add core game logic module"

### Task 1.2: Create dragonRider logic tests
- [x] Copy `src/lib/dragonFlight.test.ts` to `src/lib/dragonRider.test.ts`
- [x] Update imports to use `dragonRider` module
- [x] Update test descriptions to reference "Dragon Rider"
- [x] **Test**: Run `npm test -- dragonRider.test.ts` - all tests pass
- [x] **Coverage**: Verify >80% coverage for dragonRider.ts
- [x] **Commit**: "test(dragon-rider): add game logic tests"

## Phase 2: React Components

### Task 2.1: Create DragonRiderGame component
- [x] Copy `src/components/dragon-flight/DragonFlightGame.tsx` to `src/components/dragon-rider/DragonRiderGame.tsx`
- [x] Update component name: `DragonFlightGame` → `DragonRiderGame`
- [x] Update asset paths to `/games/dragon-rider/` directory
- [x] Update sprite references for new asset orientations:
  - Player: Use `player-3x3-sheet-facing-camera.png`
  - Army: Use `dragon-army-3x3-sheet-facing-up.png`
  - Boss: Use `boss-3x3-sheet-facing-up.png`
  - Gates: Use `gates-3x3-sheet-facing-up.png`
  - Parallax: Use new parallax-*.png files
- [x] Update imports to use `dragonRider` logic module
- [x] **Test**: Component exports correctly
- [x] **Commit**: "feat(dragon-rider): add DragonRiderGame component"

### Task 2.2: Create DragonRiderGame component tests
- [x] Copy `src/components/dragon-flight/DragonFlightGame.test.tsx` to `src/components/dragon-rider/DragonRiderGame.test.tsx`
- [x] Update imports to use DragonRiderGame component
- [x] Update test descriptions to reference "Dragon Rider"
- [x] **Test**: Run `npm test -- DragonRiderGame.test.tsx` - all tests pass
- [x] **Coverage**: Verify >80% coverage for DragonRiderGame.tsx
- [x] **Commit**: "test(dragon-rider): add component tests"

## Phase 3: Page Route

### Task 3.1: Create dragon-rider page component
- [x] Copy `src/app/games/dragon-flight/page.tsx` to `src/app/games/dragon-rider/page.tsx`
- [x] Update component name to `DragonRiderPage`
- [x] Update imports to use DragonRiderGame component
- [x] Update title: "Dragon Flight" → "Dragon Rider"
- [x] Update description to reflect dragon rider theme
- [x] Update vocabulary loading: `loadVocabulary('dragon-flight')` → `loadVocabulary('dragon-rider')`
- [x] Update type imports: `DragonFlightResults` → `DragonRiderResults`
- [x] **Test**: Page exports correctly
- [x] **Commit**: "feat(dragon-rider): add game page route"

### Task 3.2: Create page component tests
- [x] Copy `src/app/games/dragon-flight/page.test.tsx` to `src/app/games/dragon-rider/page.test.tsx`
- [x] Update imports to reference dragon-rider page
- [x] Update test descriptions to reference "Dragon Rider"
- [x] **Test**: Run `npm test -- games/dragon-rider/page.test.tsx` - all tests pass
- [x] **Coverage**: Verify >80% coverage for dragon-rider page.tsx
- [x] **Commit**: "test(dragon-rider): add page tests"

## Phase 4: Integration & Verification

### Task 4.1: Full test suite verification
- [x] Run complete test suite: `npm test`
- [x] Verify all tests pass (existing + new)
- [x] Verify overall code coverage remains >80%
- [x] Fix any failing tests
- [x] **Test**: `npm test` - zero failures
- [x] **Commit**: "test(dragon-rider): verify full test suite"

### Task 4.2: Manual testing and visual verification
- [x] Start dev server: `npm run dev`
- [x] Navigate to `/games/dragon-rider`
- [x] Verify page loads without errors
- [x] Verify all dragon-rider assets display correctly:
  - Player sprite (facing camera)
  - Dragon army sprites (facing up)
  - Boss sprite (facing up)
  - Gates (facing up)
  - Parallax backgrounds (all three layers)
  - Loading screen background
- [x] Play through a complete game session
- [x] Verify vocabulary questions load correctly
- [x] Verify XP calculation and results tracking
- [x] Test on mobile viewport (responsive behavior)
- [x] **Test**: Game plays with enhanced mechanics
- [x] **Commit**: "chore(dragon-rider): manual testing complete"

### Task 4.3: Final cleanup
- [x] Review all code for consistency
- [x] Remove any leftover issues
- [x] Verify no console errors or warnings
- [x] Update measure plan status
- [x] **Test**: Final review passes
- [x] **Commit**: "chore(dragon-rider): final cleanup and polish"

## Phase 5: Gameplay Adjustments

### Task 5.1: Fix sprite orientations
- [x] Flip player sprite vertically (currently upside down)
  - Update scaleY for player sprite in DragonRiderCanvas
  - Change from `-layout.playerScale` to `layout.playerScale`
- [x] Flip dragon army sprites vertically (currently upside down)
  - Update scaleY for army sprites in DragonRiderCanvas
  - Change from `-layout.armyScale` to `layout.armyScale`
- [x] **Test**: Visual verification - sprites render correctly
- [x] **Commit**: "fix(dragon-rider): correct player and army sprite orientations"

### Task 5.2: Extend game duration
- [x] Change default duration from 30 seconds to 2.5 minutes (150000ms)
  - Update DEFAULT_DURATION_MS constant in dragonRider.ts
  - Update default prop in DragonRiderGame component
- [x] Update tests to work with new duration
- [x] **Test**: Run `npm test -- dragonRider` - all tests pass
- [x] **Commit**: "feat(dragon-rider): extend game duration to 2.5 minutes"

### Task 5.3: Redesign boss battle mechanics
- [x] Add collision/proximity detection before boss starts attacking
  - Implement distance calculation between boss and player/army
  - Boss only starts battle when within collision range
- [x] Add boss health meter UI
  - Display boss health bar on screen during battle
  - Show remaining boss health visually
- [x] Slow down boss battle sequence
  - Increase BOSS_HEALTH_TICK_MS from 450ms to reduce battle speed
  - Add tension and give player time to assess their chances
- [x] Update boss battle state management
  - Track boss battle started/not started state
  - Trigger battle start on collision/proximity
- [x] **Test**: Visual verification and gameplay testing
- [x] **Commit**: "feat(dragon-rider): redesign boss battle with proximity trigger and health meter"

### Task 5.4: Increase difficulty/victory threshold
- [x] Analyze current difficulty with 2.5 minute duration
  - Current: bossPower = max(3, ceil(attempts × 0.6))
  - With ~90-120 attempts in 2.5min, boss power = 54-72
  - Current requires 60% accuracy to win
- [x] Increase difficulty multiplier
  - Change from 0.6 to 0.75 or 0.8 to require 75-80% accuracy
  - Or add minimum boss power threshold (e.g., max(50, ceil(attempts × 0.6)))
- [x] Update tests with new victory calculations
- [x] **Test**: Run full test suite
- [x] **Commit**: "feat(dragon-rider): increase difficulty threshold for victory"

### Task 5.5: Integration testing of gameplay changes
- [x] Run complete test suite
- [x] Verify all tests pass with new mechanics
- [x] Manual gameplay testing
  - Verify sprites render correctly
  - Verify 2.5 minute duration feels appropriate
  - Verify boss battle triggers at fixed position
  - Verify boss health meter displays correctly
  - Verify difficulty feels challenging but fair
- [x] **Test**: Complete playthrough
- [x] **Commit**: "test(dragon-rider): verify gameplay adjustments"

## Task Summary
- **Phase 1**: 2 tasks - Core game logic foundation
- **Phase 2**: 2 tasks - React components
- **Phase 3**: 2 tasks - Page routing
- **Phase 4**: 3 tasks - Integration and verification
- **Phase 5**: 5 tasks - Gameplay adjustments
- **Total**: 14 tasks

## Quality Gates
- All tests must pass before moving to next phase
- Code coverage must remain >80%
- No console errors or warnings
- Manual testing confirms sprites render correctly
- Boss battle mechanics feel tense and engaging
- Difficulty is challenging but achievable
