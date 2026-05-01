# Reading Advantage Games Migration

## Overview

Import all games from the reading-advantage repository, restructuring advantage-games to match reading-advantage's architecture for seamless two-way synchronization.

## Problem Statement

Currently:
- advantage-games uses flat `/games/{game}/` structure
- reading-advantage uses `/games/{type}/{game}/` (vocabulary/sentence split)
- advantage-games uses local `vocabLoader.ts` for data
- reading-advantage uses API endpoints
- advantage-games has no i18n infrastructure
- reading-advantage uses `useScopedI18n()` and `useSession()`

When developing new games in advantage-games, the reading-advantage developer must manually restructure, add API routes, add translations, etc.

## Goals

1. **Minimal integration friction** - reading-advantage dev can copy-paste with ~5 changes
2. **Same directory structure** - vocabulary/sentence split matches exactly
3. **Same data interface** - mock API routes use same endpoints
4. **Same hooks** - i18n and session stubs match reading-advantage signatures
5. **Port dungeon-liberator** - migrate to new structure

## Target Structure

```
src/
├── app/
│   ├── games/
│   │   ├── vocabulary/
│   │   │   ├── dragon-flight/
│   │   │   ├── dragon-rider/
│   │   │   ├── enchanted-library/
│   │   │   ├── magic-defense/
│   │   │   ├── rpg-battle/
│   │   │   ├── rune-match/
│   │   │   ├── wizard-vs-zombie/
│   │   │   └── dungeon-liberator/  (ported)
│   │   └── sentence/
│   │       ├── castle-defense/
│   │       └── potion-rush/
│   └── api/v1/games/
│       ├── {game}/vocabulary/route.ts
│       ├── {game}/sentences/route.ts
│       └── {game}/complete/route.ts
├── components/
│   └── games/
│       ├── game/           # Shared: GameStartScreen, GameEndScreen, etc.
│       ├── vocabulary/
│       ├── sentence/
│       └── ui/
├── lib/
│   └── games/
├── hooks/
│   ├── useSession.ts       # Stub
│   ├── useScopedI18n.ts    # Stub
│   └── useCurrentLocale.ts # Stub
├── locales/
│   └── en.ts
└── store/
    └── useGameStore.ts     # Extended version
```

## Games to Import

| Type | Game | Source |
|------|------|--------|
| vocabulary | dragon-flight | reading-advantage |
| vocabulary | dragon-rider | reading-advantage |
| vocabulary | enchanted-library | reading-advantage |
| vocabulary | magic-defense | reading-advantage |
| vocabulary | rpg-battle | reading-advantage |
| vocabulary | rune-match | reading-advantage |
| vocabulary | wizard-vs-zombie | reading-advantage |
| sentence | castle-defense | reading-advantage |
| sentence | potion-rush | reading-advantage |

## Games to Port

| Type | Game | Source |
|------|------|--------|
| vocabulary | dungeon-liberator | advantage-games (port to new structure) |

## Stub Interfaces

### useSession
```typescript
export function useSession() {
  return {
    data: {
      user: {
        xp: 0,
        name: 'Player',
        id: 'mock-id',
      },
    },
    status: 'authenticated',
  };
}
```

### useScopedI18n
```typescript
export function useScopedI18n(scope: string) {
  return (key: string) => {
    const fullKey = `${scope}.${key}`;
    return translations[fullKey] || key;
  };
}
```

### useCurrentLocale
```typescript
export function useCurrentLocale() {
  return 'en';
}
```

## Functional Requirements

### FR1: Directory Structure
- Games organized under `vocabulary/` or `sentence/` subdirectories
- Components mirror this structure under `components/games/`
- Lib files live in `lib/games/`

### FR2: Mock API Routes
- Each game has `/api/v1/games/{game}/vocabulary/route.ts` (vocabulary games)
- Sentence games have `/api/v1/games/{game}/sentences/route.ts`
- All games have `/api/v1/games/{game}/complete/route.ts`
- Routes return data from local sample files

### FR3: i18n Infrastructure
- `useScopedI18n(scope)` returns translation function
- `useCurrentLocale()` returns current locale string
- All UI strings extractable to `locales/en.ts`

### FR4: Session Stub
- `useSession()` returns mock authenticated user
- Compatible with next-auth interface

### FR5: Extended Store
- Merge reading-advantage's useGameStore additions:
  - `missedWords: VocabularyItem[]`
  - `combo: number`
  - `mana: number`
  - `Difficulty` type with 'extreme' option

### FR6: Unified Mock API Routes
- Create reusable factory functions for API routes:
  - `createVocabularyRoute(vocabulary)` - returns GET handler for `/vocabulary`
  - `createSentencesRoute(sentences)` - returns GET handler for `/sentences`
  - `createCompleteRoute()` - returns POST handler for `/complete`
  - `createRankingRoute()` - returns GET handler for `/ranking`
- Routes return data matching reading-advantage API schemas
- Easy one-liner setup for new games

### FR7: Modernized Game Templates
- Templates use `[locale]/(student)/student/games/{type}/{game}/` structure
- Templates include API route scaffolding
- Templates reference `@/components/games/game/` for shared components
- Templates reference `@/lib/games/` for game logic
- Clear game type distinction (vocabulary vs sentence)

## Non-Functional Requirements

### NFR1: Compatibility
- All imports use `@/` alias
- No reading-advantage-specific paths in code

### NFR2: Test Coverage
- New stubs have unit tests
- Imported components pass existing tests
- Target: >80% coverage maintained

### NFR3: Build Success
- `CI=true npm run build` succeeds
- `CI=true npm test` passes

## Acceptance Criteria

### Must Have
- [ ] All 9 games imported with vocabulary/sentence structure
- [ ] Mock API routes for vocabulary/sentences/complete
- [ ] i18n stubs matching reading-advantage signatures
- [ ] Session stub matching reading-advantage signature
- [ ] Extended useGameStore merged
- [ ] All games playable after migration
- [ ] All tests pass
- [ ] dungeon-liberator ported to new structure

### Should Have
- [ ] Main menu updated with new paths
- [ ] Old flat-structure code removed
- [ ] Documentation for reading-advantage integration
- [ ] Unified mock API route factories
- [ ] Updated game templates matching new directory structure
- [ ] Updated vocab-game skill documentation

## Out of Scope

- Real authentication
- Real API backend
- Translation files beyond English stubs
- Dungeon-liberator gameplay changes
- New game features

## Integration Checklist for reading-advantage Dev

When importing a new game from advantage-games:
- [ ] Copy `src/app/[locale]/(student)/student/games/{type}/{game}/` → `app/[locale]/(student)/student/games/{type}/{game}/`
- [ ] Copy `src/components/games/{type}/{game}/` → `components/games/{type}/{game}/`
- [ ] Copy `src/lib/games/{game}.ts` → `lib/games/{game}.ts`
- [ ] Update navigation paths (usually no change needed)
- [ ] Replace mock API routes with real controllers:
  - [ ] `server/controllers/{game}-controller.ts` for vocabulary/sentences
  - [ ] `server/controllers/{game}-ranking-controller.ts` if game has rankings
- [ ] Add translations to `locales/{lang}.ts`
- [ ] Update `useSession()` to use real auth if needed

## Creating a New Game in advantage-games

When creating a new game for eventual reading-advantage import:
- [ ] Determine game type: `vocabulary` or `sentence`
- [ ] Use templates from `src/templates/game/`
- [ ] Create page at `src/app/[locale]/(student)/student/games/{type}/{game}/page.tsx`
- [ ] Create components at `src/components/games/{type}/{game}/`
- [ ] Create lib at `src/lib/games/{gameName}.ts`
- [ ] Create API routes using unified factories:
  ```typescript
  // src/app/api/v1/games/{game}/vocabulary/route.ts
  import { createVocabularyRoute } from '@/lib/games/api/vocabularyRoute'
  import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary'
  export const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY)
  ```
- [ ] Add assets to `public/games/{type}/{game}/`
- [ ] Add i18n keys to `src/locales/en.ts`
- [ ] Test with `CI=true npm run build && CI=true npm test`

## Files to Create

### Infrastructure
- `src/hooks/useSession.ts`
- `src/hooks/useScopedI18n.ts`
- `src/hooks/useCurrentLocale.ts`
- `src/locales/en.ts`
- `src/locales/client.ts`

### Mock API Route Factories (Phase 7)
- `src/lib/games/api/vocabularyRoute.ts`
- `src/lib/games/api/sentencesRoute.ts`
- `src/lib/games/api/completeRoute.ts`
- `src/lib/games/api/rankingRoute.ts`
- `src/lib/games/api/types.ts`

### Updated Templates (Phase 7)
- `src/templates/game/page.tsx.template` (updated paths)
- `src/templates/game/GameNameGame.tsx.template` (updated imports)
- `src/templates/game/gameName.ts.template` (updated imports)
- `src/templates/game/README.md` (updated instructions)
- `src/templates/game/api/vocabulary/route.ts.template`
- `src/templates/game/api/sentences/route.ts.template`
- `src/templates/game/api/complete/route.ts.template`
- `src/templates/game/api/ranking/route.ts.template`

### Documentation (Phase 7)
- `docs/reading-advantage-integration.md`

### Mock API Routes (per game)
- `src/app/api/v1/games/{game}/vocabulary/route.ts`
- `src/app/api/v1/games/{game}/sentences/route.ts` (sentence games only)
- `src/app/api/v1/games/{game}/complete/route.ts`

## Files to Eventually Remove

After migration:
- `src/app/games/castle-defense/` (flat structure)
- `src/app/games/dragon-flight/` (flat structure)
- `src/app/games/dragon-rider/` (flat structure)
- `src/app/games/enchanted-library/` (flat structure)
- `src/app/games/magic-defense/` (flat structure)
- `src/app/games/potion-rush/` (flat structure)
- `src/app/games/rpg-battle/` (flat structure)
- `src/app/games/rune-match/` (flat structure)
- `src/app/games/wizard-vs-zombie/` (flat structure)
- `src/app/games/dungeon-liberator/` (flat structure)
- `src/components/castle-defense/`
- `src/components/dragon-flight/`
- `src/components/dragon-rider/`
- `src/components/enchanted-library/`
- `src/components/potion-rush/`
- `src/components/rpg-battle/`
- `src/components/rune-match/`
- `src/components/wizard-vs-zombie/`
- `src/components/dungeon-liberator/`
- `src/lib/castleDefense.ts`
- `src/lib/dragonFlight.ts`
- `src/lib/dragonRider.ts`
- `src/lib/enchantedLibrary.ts`
- `src/lib/potionRushEffects.ts`
- `src/lib/rpgBattle*.ts`
- `src/lib/runeMatch.ts`
- `src/lib/wizardZombie*.ts`
- `src/lib/dungeonLiberator.ts`
- `src/lib/vocabLoader.ts` (replaced by API routes)
