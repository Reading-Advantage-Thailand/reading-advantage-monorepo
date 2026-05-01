# Plan: Reading Advantage Games Migration

## Pre-Implementation Checklist

Before starting, ensure:
1. Reading-advantage repo is available at `../reading-advantage/`
2. Current tests pass: `CI=true npm test`
3. Current build succeeds: `CI=true npm run build`

---

## Phase 1: Infrastructure Setup

### Task 1.1: Create directory structure
- [ ] Sub-task: Create `src/app/[locale]/(student)/student/games/vocabulary/`
- [ ] Sub-task: Create `src/app/[locale]/(student)/student/games/sentence/`
- [x] Sub-task: Create `src/app/api/v1/games/`
- [x] Sub-task: Create `src/components/games/vocabulary/`
- [x] Sub-task: Create `src/components/games/sentence/`
- [x] Sub-task: Create `src/components/games/game/`
- [x] Sub-task: Create `src/lib/games/`
- [x] Sub-task: Create `src/hooks/`
- [x] Sub-task: Create `src/locales/`
- [ ] Sub-task: Verify directories exist with `ls -la`
- [ ] **Commit**: "chore: create reading-advantage-compatible directory structure"

### Task 1.2: Create i18n stubs
- [x] Sub-task: Create `src/locales/en.ts` with extracted UI strings from games page
- [x] Sub-task: Create `src/locales/client.ts` exporting useScopedI18n, useCurrentLocale
- [x] Sub-task: Create `src/hooks/useScopedI18n.ts` - returns key lookup function
- [x] Sub-task: Create `src/hooks/useCurrentLocale.ts` - returns 'en'
- [x] Sub-task: Write tests in `src/locales/client.test.ts`
- [x] Sub-task: Run tests: `CI=true npm test src/locales/`
- [x] **Commit**: "feat: add i18n stub infrastructure"

### Task 1.3: Create session stub
- [x] Sub-task: Create `src/hooks/useSession.ts` returning mock session
- [x] Sub-task: Write tests in `src/hooks/useSession.test.ts`
- [x] Sub-task: Run tests: `CI=true npm test src/hooks/useSession.test.ts`
- [x] **Commit**: "feat: add useSession stub for reading-advantage compatibility"

### Task 1.4: Update useGameStore
- [x] Sub-task: Add `missedWords: VocabularyItem[]` to state
- [x] Sub-task: Add `combo: number` to state
- [x] Sub-task: Add `mana: number` to state
- [x] Sub-task: Add `Difficulty` type with 'extreme' option
- [x] Sub-task: Add `addMissedWord`, `incrementCombo`, `resetCombo`, `addMana`, `spendMana` actions
- [x] Sub-task: Update existing tests for new fields
- [x] Sub-task: Run tests: `CI=true npm test src/store/`
- [x] **Commit**: "feat: extend useGameStore with reading-advantage features"

- [x] Task: Measure - User Manual Verification 'Phase 1: Infrastructure Setup' (Protocol in workflow.md)
  - NOTE: Task 1.1 page directories need correct `[locale]/(student)/student/` structure

---

## Phase 2: Import Shared Components

### Task 2.1: Import shared game components
- [x] Sub-task: Copy `reading-advantage/web/components/games/game/*` to `src/components/games/game/`
- [x] Sub-task: Review and update any reading-advantage-specific imports
- [x] Sub-task: Copy associated test files
- [x] Sub-task: Run tests: `CI=true npm test src/components/games/game/`
- [x] **Commit**: "feat: import shared game screen components from reading-advantage"

### Task 2.2: Import shared UI components (if needed)
- [x] Sub-task: Compare `reading-advantage/web/components/games/ui/` with `src/components/ui/`
- [x] Sub-task: Copy any missing components
- [x] Sub-task: Copy associated test files
- [x] Sub-task: Run tests: `CI=true npm test src/components/ui/`
- [x] **Commit**: "feat: import additional UI components from reading-advantage"

- [x] Task: Measure - User Manual Verification 'Phase 2: Import Shared Components' (Protocol in workflow.md)

---

## Phase 3: Import Vocabulary Games

### Task 3.1: Import dragon-flight
- [x] Sub-task: Copy `reading-advantage/web/app/[locale]/(student)/student/games/vocabulary/dragon-flight/` to `src/app/[locale]/(student)/student/games/vocabulary/dragon-flight/`
- [x] Sub-task: Copy `reading-advantage/web/components/games/vocabulary/dragon-flight/` to `src/components/games/vocabulary/dragon-flight/`
- [x] Sub-task: Copy `reading-advantage/web/lib/games/dragonFlight*.ts` to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create `src/app/api/v1/games/dragon-flight/vocabulary/route.ts`
- [x] Sub-task: Create `src/app/api/v1/games/dragon-flight/complete/route.ts`
- [x] Sub-task: Copy test files and update imports
- [~] Sub-task: Run tests: `CI=true npm test -- dragon-flight` (lib tests pass, component tests timeout)
- [x] Sub-task: Manual test: game loads and plays
- [x] **Commit**: "feat: import dragon-flight from reading-advantage"

### Task 3.2: Import dragon-rider
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/dragon-rider/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [x] Sub-task: Copy and update tests
- [~] Sub-task: Run tests and manual verify (lib tests pass)
- [x] **Commit**: "feat: import dragon-rider from reading-advantage"

### Task 3.3: Import enchanted-library
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/enchanted-library/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [x] Sub-task: Copy and update tests
- [~] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import enchanted-library from reading-advantage"

### Task 3.4: Import magic-defense
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/magic-defense/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/magic-defense/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [~] Sub-task: Copy and update tests
- [~] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import magic-defense from reading-advantage"

### Task 3.5: Import rpg-battle
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/rpg-battle/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [~] Sub-task: Copy and update tests
- [~] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import rpg-battle from reading-advantage"

### Task 3.6: Import rune-match
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/rune-match/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/rune-match/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [~] Sub-task: Copy and update tests
- [~] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import rune-match from reading-advantage"

### Task 3.7: Import wizard-vs-zombie
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/`
- [x] Sub-task: Copy components to `src/components/games/vocabulary/wizard-vs-zombie/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes
- [x] Sub-task: Copy and update tests
- [x] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import wizard-vs-zombie from reading-advantage"

- [x] Task: Measure - User Manual Verification 'Phase 3: Import Vocabulary Games' (Protocol in workflow.md)
  - NOTE: All 7 vocabulary games imported successfully
  - Games: dragon-flight, dragon-rider, enchanted-library, magic-defense, rpg-battle, rune-match, wizard-vs-zombie
  - Added: API routes, components, lib files, translations, assets
  - Build: Passing

---

## Phase 4: Import Sentence Games

### Task 4.1: Import castle-defense
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/sentence/castle-defense/`
- [x] Sub-task: Copy components to `src/components/games/sentence/castle-defense/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create `src/app/api/v1/games/castle-defense/sentences/route.ts`
- [x] Sub-task: Create `src/app/api/v1/games/castle-defense/complete/route.ts`
- [x] Sub-task: Copy and update tests
- [x] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import castle-defense from reading-advantage"

### Task 4.2: Import potion-rush
- [x] Sub-task: Copy page to `src/app/[locale]/(student)/student/games/sentence/potion-rush/`
- [x] Sub-task: Copy components to `src/components/games/sentence/potion-rush/`
- [x] Sub-task: Copy lib files to `src/lib/games/`
- [x] Sub-task: Update imports to use local paths
- [x] Sub-task: Create mock API routes (sentences, complete)
- [x] Sub-task: Copy and update tests
- [x] Sub-task: Run tests and manual verify
- [x] **Commit**: "feat: import potion-rush from reading-advantage"

- [x] Task: Measure - User Manual Verification 'Phase 4: Import Sentence Games' (Protocol in workflow.md)

---

## Phase 5: Port dungeon-liberator (Sentence Game)

### Task 5.1: Restructure dungeon-liberator page
- [x] Sub-task: Page already exists at `src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/`
- [x] Sub-task: Page already uses reading-advantage patterns (API fetch, i18n)
- [x] Sub-task: Create `src/app/api/v1/games/dungeon-liberator/sentences/route.ts`
- [x] Sub-task: Create `src/app/api/v1/games/dungeon-liberator/complete/route.ts`
- [x] **Commit**: "feat: create dungeon-liberator API routes"

### Task 5.2: Restructure dungeon-liberator components
- [x] Sub-task: Create `src/components/games/sentence/dungeon-liberator/`
- [x] Sub-task: Move DungeonLiberatorGame.tsx to new location
- [x] Sub-task: Already has GameStartScreen wrapper
- [x] Sub-task: Already has GameEndScreen wrapper
- [x] Sub-task: Update imports to use `@/lib/games/dungeonLiberator`
- [x] **Commit**: "feat: restructure dungeon-liberator components"

### Task 5.3: Move dungeon-liberator lib
- [x] Sub-task: Lib already at `src/lib/games/dungeonLiberator.ts`
- [x] Sub-task: Imports updated
- [x] Sub-task: No tests exist for dungeon-liberator (skipped - existing lib)
- [x] Sub-task: No tests to run
- [x] **Commit**: combined with Task 5.2

### Task 5.4: Add dungeon-liberator to game cards
- [x] Sub-task: Game cards handled in Phase 6
- [x] Sub-task: Assets already in `public/games/dungeon-liberator/`
- [x] Sub-task: Manual test from main menu
- [x] **Commit**: deferred to Phase 6

- [x] Task: Measure - User Manual Verification 'Phase 5: Port dungeon-liberator' (Protocol in workflow.md)
  - NOTE: Game works with no errors, imported correctly to sentence/dungeon-liberator

---

## Phase 6: Update Main Menu & Cleanup

### Task 6.1: Update main menu
- [x] Sub-task: Update `src/app/page.tsx` with new game paths
- [x] Sub-task: Update `src/lib/gameCards.ts` with vocabulary/sentence structure
- [x] Sub-task: Ensure all game cards link to correct paths
- [x] Sub-task: Manual test all links work
- [x] **Commit**: "feat: update main menu for new game structure"

### Task 6.2: Remove old flat-structure pages
- [x] Sub-task: Delete `src/app/games/castle-defense/` (old flat)
- [x] Sub-task: Delete `src/app/games/dragon-flight/` (old flat)
- [x] Sub-task: Delete `src/app/games/dragon-rider/` (old flat)
- [x] Sub-task: Delete `src/app/games/dungeon-liberator/` (old flat)
- [x] Sub-task: Delete `src/app/games/enchanted-library/` (old flat)
- [x] Sub-task: Delete `src/app/games/magic-defense/` (old flat)
- [x] Sub-task: Delete `src/app/games/potion-rush/` (old flat)
- [x] Sub-task: Delete `src/app/games/rpg-battle/` (old flat)
- [x] Sub-task: Delete `src/app/games/rune-match/` (old flat)
- [x] Sub-task: Delete `src/app/games/wizard-vs-zombie/` (old flat)
- [x] **Commit**: "chore: remove old flat-structure game pages"

### Task 6.3: Remove old flat-structure components
- [x] Sub-task: Delete `src/components/castle-defense/`
- [x] Sub-task: Delete `src/components/dragon-flight/`
- [x] Sub-task: Delete `src/components/dragon-rider/`
- [x] Sub-task: Delete `src/components/dungeon-liberator/`
- [x] Sub-task: Delete `src/components/enchanted-library/`
- [x] Sub-task: Delete `src/components/potion-rush/`
- [x] Sub-task: Delete `src/components/rpg-battle/`
- [x] Sub-task: Delete `src/components/rune-match/`
- [x] Sub-task: Delete `src/components/wizard-vs-zombie/`
- [x] Sub-task: Delete `src/components/game/` (old shared, replaced by games/game/)
- [x] **Commit**: "chore: remove old flat-structure game components"

### Task 6.4: Remove old flat-structure lib files
- [x] Sub-task: Delete `src/lib/castleDefense.ts`
- [x] Sub-task: Delete `src/lib/dragonFlight.ts`
- [x] Sub-task: Delete `src/lib/dragonRider.ts`
- [x] Sub-task: Delete `src/lib/dungeonLiberator.ts`
- [x] Sub-task: Delete `src/lib/enchantedLibrary.ts`
- [x] Sub-task: Delete `src/lib/potionRushEffects.ts`
- [x] Sub-task: Delete `src/lib/rpgBattleScaling.ts`
- [x] Sub-task: Delete `src/lib/rpgBattleSelection.ts`
- [x] Sub-task: Delete `src/lib/gameCards.ts` (moved if needed)
- [x] Sub-task: Delete `src/lib/vocabLoader.ts` (replaced by API)
- [x] **Commit**: "chore: remove old flat-structure lib files"

### Task 6.5: Final verification
- [x] Sub-task: Run full test suite: `CI=true npm test`
- [x] Sub-task: Run build: `CI=true npm run build`
- [x] Sub-task: Manual test all 10 games load and play
- [x] Sub-task: Verify no console errors
- [x] **Commit**: "test: verify migration complete"

- [x] Task: Measure - User Manual Verification 'Phase 6: Update Main Menu & Cleanup' (Protocol in workflow.md)

---

## Phase 7: Template & API Route Modernization

### Task 7.1: Create unified mock API route utilities
- [x] Sub-task: Create `src/lib/games/api/types.ts` with shared types
- [x] Sub-task: Create `src/lib/games/api/vocabularyRoute.ts` - factory for vocabulary routes
- [x] Sub-task: Create `src/lib/games/api/sentencesRoute.ts` - factory for sentence routes
- [x] Sub-task: Create `src/lib/games/api/completeRoute.ts` - factory for completion routes
- [x] Sub-task: Create `src/lib/games/api/rankingRoute.ts` - factory for ranking routes
- [x] Sub-task: Create `src/lib/games/api/index.ts` barrel export
- [x] Sub-task: Write tests for `src/lib/games/api/*.test.ts`
- [x] Sub-task: Run tests: `CI=true npm test src/lib/games/api/`
- [x] **Commit**: "feat: add unified mock API route factories"

### Task 7.2: Update game templates for new directory structure
- [x] Sub-task: Create `src/templates/game/` restructure with game type support:
  - `vocabulary/page.tsx.template` - for vocabulary games
  - `sentence/page.tsx.template` - for sentence games
- [x] Sub-task: Update page templates to use `[locale]/(student)/student/games/{type}/{game}/` paths
- [x] Sub-task: Update page templates to fetch from `/api/v1/games/{game}/vocabulary` or `/sentences`
- [x] Sub-task: Update `GameNameGame.tsx.template` imports:
  - `@/components/games/game/GameStartScreen`
  - `@/components/games/game/GameEndScreen`
  - `@/components/games/game/InputController`
  - `@/lib/games/{gameName}`
- [x] Sub-task: Update `gameName.ts.template` to import from `@/lib/games/xp`
- [x] Sub-task: Update `README.md` with new structure and game type selection
- [x] Sub-task: Create `src/templates/game/api/` directory:
  - `vocabulary/route.ts.template` - uses `createVocabularyRoute()`
  - `sentences/route.ts.template` - uses `createSentencesRoute()`
  - `complete/route.ts.template` - uses `createCompleteRoute()`
  - `ranking/route.ts.template` - uses `createRankingRoute()` (optional)
- [x] Sub-task: Add `TEMPLATE-GUIDE.md` with step-by-step new game creation (covered in README.md)
- [x] **Commit**: "feat: update game templates for reading-advantage structure" (already done)

### Task 7.3: Update vocab-game skill documentation
- [x] Sub-task: Update SKILL.md directory structure section:
  - `src/app/[locale]/(student)/student/games/{type}/{game}/page.tsx`
  - `src/components/games/{type}/{game}/GameNameGame.tsx`
  - `src/lib/games/{gameName}.ts`
  - `src/app/api/v1/games/{game}/vocabulary|sentences/route.ts`
  - `src/app/api/v1/games/{game}/complete/route.ts`
- [x] Sub-task: Add game type selection guide (vocabulary vs sentence)
- [x] Sub-task: Update Quick Start with new template paths
- [x] Sub-task: Add API route creation using factories:
  ```typescript
  import { createVocabularyRoute } from '@/lib/games/api'
  export const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY)
  ```
- [x] Sub-task: Add i18n hook usage:
  ```typescript
  import { useScopedI18n, useCurrentLocale } from '@/locales/client'
  const t = useScopedI18n('games.gameName')
  const locale = useCurrentLocale()
  ```
- [x] Sub-task: Add session hook usage:
  ```typescript
  import { useSession } from '@/hooks/useSession'
  const { data: { user } } = useSession()
  ```
- [x] Sub-task: Update asset paths: `public/games/{type}/{game}/`
- [x] Sub-task: Update shared component imports to `@/components/games/game/`
- [x] **Commit**: "docs: update vocab-game skill for reading-advantage compatibility"

### Task 7.4: Create reading-advantage integration guide
- [x] Sub-task: Create `docs/reading-advantage-integration.md`
- [x] Sub-task: Add "Export Checklist" section:
  - Copy page, components, lib files
  - Create controller in `server/controllers/{game}-controller.ts`
  - Add ActivityType and GameType to Prisma enum
  - Create API routes using `next-connect` EdgeRouter
- [x] Sub-task: Add "Controller Implementation" section:
  - `getVocabulary()` - query `userWordRecord`, return `{ vocabulary: [{ term, translation }] }`
  - `getSentences()` - query `userSentenceRecord`, return `{ sentences: [{ term, translation }] }`
  - `completeGame()` - create `userActivity`, `xPLog`, update `gameRanking`
  - `getRanking()` - query `gameRanking` grouped by difficulty
- [x] Sub-task: Add "API Response Formats" section with exact schemas from reading-advantage
- [x] Sub-task: Add "i18n Key Conventions" section:
  - Game UI: `games.{gameName}.{key}`
  - Shared: `games.shared.{key}`
- [x] Sub-task: Add "Session Data Requirements" section:
  - `req.session.user.id` - required for all game endpoints
  - `req.session.user.xp` - updated after complete
- [x] Sub-task: Add "Troubleshooting" section with common issues
- [x] Sub-task: Add "Example Migration" section using dragon-flight as reference
- [x] **Commit**: "docs: add reading-advantage integration guide" (already done)

### Task 7.5: Refactor existing API routes to use utilities
- [x] Sub-task: Refactor vocabulary game routes to use `vocabularyRoute` factory
- [x] Sub-task: Refactor sentence game routes to use `sentencesRoute` factory
- [x] Sub-task: Refactor complete routes to use `completeRoute` factory
- [x] Sub-task: Refactor ranking routes to use `rankingRoute` factory
- [x] Sub-task: Run tests: `CI=true npm test`
- [x] Sub-task: Run build: `CI=true npm run build`
- [x] **Commit**: "refactor: migrate API routes to unified factories" (already done)

- [ ] Task: Measure - User Manual Verification 'Phase 7: Template & API Route Modernization' (Protocol in workflow.md)

---

## Summary

**Track Goals:**
1. Match reading-advantage directory structure exactly (including `[locale]/(student)/student/` segments)
2. Create mock API routes for data loading
3. Add i18n and session stubs
4. Import 9 games from reading-advantage
5. Port dungeon-liberator to new structure
6. Remove old flat-structure code
7. Modernize templates and API routes for seamless two-way sync

**Task Counts:**
- Phase 1: 4 tasks (Infrastructure)
- Phase 2: 2 tasks (Shared Components)
- Phase 3: 7 tasks (Vocabulary Games)
- Phase 4: 2 tasks (Sentence Games)
- Phase 5: 4 tasks (Port dungeon-liberator)
- Phase 6: 5 tasks (Cleanup)
- Phase 7: 5 tasks (Template & API Modernization)
- **Total: 29 tasks**

**Quality Gates:**
- All tests pass after each task
- Build succeeds after each phase
- Manual verification required for each phase
- No console errors
