# Plan: Unified Start and End Screens

## Pre-Implementation Checklist

Before starting ANY phase, the implementer MUST:
1. Read `spec.md` in this directory completely.
2. Review the Castle Defense screens (our reference implementation):
   - `src/components/castle-defense/CastleDefenseStartScreen.tsx`
   - `src/components/castle-defense/CastleDefenseEndScreen.tsx`
3. Review `measure/product-guidelines.md` for design principles.
4. Ensure all games currently work before making changes.

---

## Phase 1: Shared Start Screen Component

### Task 1.1: Create GameStartScreen component
- [x] Sub-task: Create `src/components/game/GameStartScreen.tsx` with TypeScript interfaces: 45ff2f8
  - `GameStartScreenProps` with required (gameTitle, vocabulary, onStart) and optional props
  - `Instruction` type for numbered instructions
  - `ControlHint` type for footer controls
- [x] Sub-task: Implement full-screen overlay with `bg-slate-950/90 backdrop-blur-sm` 45ff2f8
- [x] Sub-task: Implement header with game title, optional subtitle badge (amber styling) 45ff2f8
- [x] Sub-task: Implement two-column layout (instructions + vocabulary) using `lg:grid-cols-2` 45ff2f8
- [x] Sub-task: Implement instructions section with numbered steps and amber accents 45ff2f8
- [x] Sub-task: Implement optional pro tip section with Sparkles icon 45ff2f8
- [x] Sub-task: Implement scrollable vocabulary list with term + translation 45ff2f8
- [x] Sub-task: Implement footer with control hints and amber "Start Game" button 45ff2f8
- [x] Sub-task: Add Framer Motion fade-in animation 45ff2f8
- [x] Sub-task: Ensure responsive design (stacks on mobile) 45ff2f8

### Task 1.2: Write tests for GameStartScreen
- [x] Sub-task: Create `src/components/game/__tests__/GameStartScreen.test.tsx` a93de89
- [x] Sub-task: Test: renders game title a93de89
- [x] Sub-task: Test: renders subtitle badge when provided a93de89
- [x] Sub-task: Test: renders vocabulary list with correct item count a93de89
- [x] Sub-task: Test: renders instructions when provided a93de89
- [x] Sub-task: Test: renders pro tip when provided a93de89
- [x] Sub-task: Test: calls onStart when button clicked a93de89
- [x] Sub-task: Test: uses custom startButtonText when provided a93de89
- [x] Sub-task: Run tests: `CI=true npm test src/components/game/__tests__/GameStartScreen.test.tsx` a93de89

**Verification**: Start screen renders correctly, all tests pass with >80% coverage.

---

## Phase 2: Shared End Screen Component [checkpoint: 1a91c03]

### Task 2.1: Create GameEndScreen component
- [x] Sub-task: Create `src/components/game/GameEndScreen.tsx` with TypeScript interfaces: d3d4b06
  - `GameEndScreenProps` with required (status, score, xp, accuracy, onRestart) and optional props
  - `GameStat` type for custom stats
- [x] Sub-task: Implement full-screen overlay with backdrop blur d3d4b06
- [x] Sub-task: Implement status-conditional styling: d3d4b06
  - Victory: emerald colors, Shield icon
  - Defeat: rose colors, Swords icon
  - Complete: amber colors, Trophy icon
- [x] Sub-task: Implement header with status icon, title, and subtitle d3d4b06
- [x] Sub-task: Implement 2x2 stats grid (Score, Accuracy, + up to 2 custom stats) d3d4b06
- [x] Sub-task: Implement prominent XP display with status-themed border d3d4b06
- [x] Sub-task: Implement "Play Again" button (white background, dark text) d3d4b06
- [x] Sub-task: Implement optional "Exit" button when onExit provided d3d4b06
- [x] Sub-task: Add Framer Motion scale-in animation d3d4b06
- [x] Sub-task: Handle edge cases (0% accuracy, missing custom stats) d3d4b06

### Task 2.2: Write tests for GameEndScreen
- [x] Sub-task: Create `src/components/game/__tests__/GameEndScreen.test.tsx` afeb74a
- [x] Sub-task: Test: renders score correctly afeb74a
- [x] Sub-task: Test: renders accuracy as percentage afeb74a
- [x] Sub-task: Test: renders XP value afeb74a
- [x] Sub-task: Test: applies victory styling when status is 'victory' afeb74a
- [x] Sub-task: Test: applies defeat styling when status is 'defeat' afeb74a
- [x] Sub-task: Test: renders custom stats when provided afeb74a
- [x] Sub-task: Test: calls onRestart when button clicked afeb74a
- [x] Sub-task: Test: renders exit button when onExit provided afeb74a
- [x] Sub-task: Test: handles 0% accuracy edge case afeb74a
- [x] Sub-task: Run tests: `CI=true npm test src/components/game/__tests__/GameEndScreen.test.tsx` afeb74a

**Verification**: End screen renders correctly for all statuses, all tests pass with >80% coverage.

---

## Phase 3: Migrate Canvas Games (No Existing Screens) [checkpoint: 8339887]

### Task 3.0: Create dev preview page for shared screens
- [x] Sub-task: Create `src/app/dev/game-screens/page.test.tsx` e5a23e6
- [x] Sub-task: Create `src/app/dev/game-screens/page.tsx` with sample data and mode toggles e5a23e6
- [x] Sub-task: Run tests: `CI=true npm test src/app/dev/game-screens/page.test.tsx` e5a23e6

### Task 3.1: Migrate Dragon Flight
- [x] Sub-task: Add `gamePhase: 'start' | 'playing' | 'ended'` to game state 0fe61c2
- [x] Sub-task: Import and render GameStartScreen when phase is 'start' 0fe61c2
- [x] Sub-task: Create Dragon Flight instructions array 0fe61c2
- [x] Sub-task: Wire onStart to transition to 'playing' phase 0fe61c2
- [x] Sub-task: Replace inline end screen with GameEndScreen 0fe61c2
- [x] Sub-task: Pass appropriate stats (dragons collected, boss power, etc.) 0fe61c2
- [x] Sub-task: Test manually on desktop and mobile 0fe61c2

### Task 3.2: Migrate Wizard vs Zombie
- [x] Sub-task: Add `gamePhase: 'start' | 'playing' | 'ended'` to game state 23ce668
- [x] Sub-task: Import and render GameStartScreen when phase is 'start' 23ce668
- [x] Sub-task: Create Wizard vs Zombie instructions array 23ce668
- [x] Sub-task: Wire onStart to transition to 'playing' phase 23ce668
- [x] Sub-task: Replace inline end screen with GameEndScreen 23ce668
- [x] Sub-task: Pass appropriate stats (zombies defeated, survival time, etc.) 23ce668
- [x] Sub-task: Test manually on desktop and mobile 23ce668

### Task 3.3: Migrate Enchanted Library
- [x] Sub-task: Add `gamePhase: 'start' | 'playing' | 'ended'` to game state e59a8f5
- [x] Sub-task: Import and render GameStartScreen when phase is 'start' e59a8f5
- [x] Sub-task: Create Enchanted Library instructions array e59a8f5
- [x] Sub-task: Wire onStart to transition to 'playing' phase e59a8f5
- [x] Sub-task: Replace inline victory screen with GameEndScreen e59a8f5
- [x] Sub-task: Pass appropriate stats (books collected, mana, etc.) e59a8f5
- [x] Sub-task: Test manually on desktop and mobile e59a8f5

**Verification**: All 3 canvas games show start screen before gameplay and end screen after.

---

## Phase 4: Migrate Rune Match [checkpoint: ed42ca5]

### Task 4.1: Add start screen before monster selection
- [x] Sub-task: Analyze current flow (MonsterSelection → gameplay) 3efba97
- [x] Sub-task: Add new game phase: `'start' | 'selecting' | 'playing' | 'ended'` 3efba97
- [x] Sub-task: Render GameStartScreen when phase is 'start' 3efba97
- [x] Sub-task: Create Rune Match instructions array (match runes, defeat monster, etc.) 3efba97
- [x] Sub-task: Wire onStart to transition to 'selecting' phase (shows MonsterSelection) 3efba97
- [x] Sub-task: Keep MonsterSelection unchanged - it transitions to 'playing' 3efba97
- [x] Sub-task: Test flow: Start Screen → Monster Selection → Game → End Screen 3efba97

### Task 4.2: Replace inline end screen
- [x] Sub-task: Replace inline victory/defeat JSX with GameEndScreen a9929db
- [x] Sub-task: Pass monster-specific custom stats (monster defeated, XP reward) a9929db
- [x] Sub-task: Wire onRestart to go back to 'selecting' phase (not 'start') a9929db
- [x] Sub-task: Test manually on desktop and mobile a9929db

**Verification**: Rune Match shows vocabulary first, then monster selection, uses shared end screen.

---

## Phase 5: Migrate RPG Battle [checkpoint: 006aabe]

### Task 5.1: Add start screen before battle selection
- [x] Sub-task: Analyze BattleSelectionModal flow (hero → location → enemy → ready) 59a0dc0
- [x] Sub-task: Add new phase before selection: `'start' | 'selecting' | 'battling' | 'ended'` 59a0dc0
- [x] Sub-task: Render GameStartScreen when phase is 'start' 59a0dc0
- [x] Sub-task: Create RPG Battle instructions array (select hero, choose location, battle enemy) 59a0dc0
- [x] Sub-task: Wire onStart to transition to 'selecting' phase (opens BattleSelectionModal) 59a0dc0
- [x] Sub-task: Keep BattleSelectionModal unchanged - it handles hero/location/enemy flow 59a0dc0
- [x] Sub-task: Test flow: Start Screen → Selection Modal → Battle → End Screen 59a0dc0

### Task 5.2: Replace BattleResults with GameEndScreen
- [x] Sub-task: Replace BattleResults component usage with GameEndScreen 45332e0
- [x] Sub-task: Pass battle-specific custom stats (enemy defeated, etc.) 45332e0
- [x] Sub-task: Wire onRestart to go back to 'selecting' phase (not 'start') 45332e0
- [ ] Sub-task: Test manually on desktop and mobile

**Verification**: RPG Battle shows vocabulary first, then selection modal, uses shared end screen.

---

## Phase 6: Migrate Castle Defense & Potion Rush [checkpoint: bd6b283]

### Task 6.1: Migrate Castle Defense
- [x] Sub-task: Replace CastleDefenseStartScreen import with GameStartScreen dc6abe1
- [x] Sub-task: Migrate instructions and controls to new prop format dc6abe1
- [x] Sub-task: Replace CastleDefenseEndScreen import with GameEndScreen dc6abe1
- [x] Sub-task: Pass custom stats (waves, enemies) via customStats prop dc6abe1
- [x] Sub-task: Verify visual parity with original (same amber styling) dc6abe1
- [x] Sub-task: Test manually on desktop and mobile dc6abe1

### Task 6.2: Migrate Potion Rush
- [x] Sub-task: Replace PotionRushStartScreen import with GameStartScreen a897a93
- [x] Sub-task: Migrate instructions to new prop format a897a93
- [x] Sub-task: Replace PotionRushSummary import with GameEndScreen a897a93
- [x] Sub-task: Pass custom stats (customers served) via customStats prop a897a93
- [x] Sub-task: Update styling from purple to amber a897a93
- [x] Sub-task: Test manually on desktop and mobile a897a93

**Verification**: Both games use shared screens, no purple colors, amber styling throughout.

---

## Phase 7: Cleanup [checkpoint: a98b098]

### Task 7.1: Remove deprecated components
- [x] Sub-task: Delete `src/components/castle-defense/CastleDefenseStartScreen.tsx` 556bde6
- [x] Sub-task: Delete `src/components/castle-defense/CastleDefenseEndScreen.tsx` 556bde6
- [x] Sub-task: Delete `src/components/potion-rush/PotionRushStartScreen.tsx` 556bde6
- [x] Sub-task: Delete `src/components/potion-rush/PotionRushSummary.tsx` 556bde6
- [x] Sub-task: Delete `src/components/rpg-battle/BattleResults.tsx` 556bde6
- [x] Sub-task: Delete associated test files for removed components 556bde6
- [x] Sub-task: Verify build succeeds: `CI=true npm run build` 556bde6

### Task 7.2: Update old shared components
- [x] Sub-task: Remove or deprecate `src/components/game/StartScreen.tsx` (old generic) 056afe4
- [x] Sub-task: Remove or deprecate `src/components/game/ResultsScreen.tsx` (old generic) 056afe4
- [x] Sub-task: Add JSDoc comments to GameStartScreen and GameEndScreen 056afe4
- [x] Sub-task: Run final test suite: `CI=true npm test` 056afe4

**Verification**: No unused code, build succeeds, all tests pass.

---

## Summary

**Track Goals:**
1. Create unified `GameStartScreen` and `GameEndScreen` components
2. Use single RPG color palette (amber primary, no purple)
3. Migrate all 7 games to shared components
4. Remove deprecated game-specific screens

**Key Files to Create:**
- `src/components/game/GameStartScreen.tsx`
- `src/components/game/GameEndScreen.tsx`
- Test files for above

**Key Files to Modify:**
- `src/components/dragon-flight/DragonFlightGame.tsx`
- `src/components/wizard-vs-zombie/WizardZombieGame.tsx`
- `src/components/enchanted-library/EnchantedLibraryGame.tsx`
- `src/components/rune-match/RuneMatchGame.tsx`
- `src/app/games/rpg-battle/page.tsx`
- `src/components/castle-defense/CastleDefenseGame.tsx`
- `src/components/potion-rush/PotionRushGame.tsx`

**Key Files to Delete (Phase 7):**
- 5 game-specific screen components
- Associated test files
