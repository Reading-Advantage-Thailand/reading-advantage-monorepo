# Templates

Template examples for scaffolding new vocabulary games.

## Available Templates

| Template | Description | Game Types |
|----------|-------------|-----------|
| `konva-runner` | Gate/choice runner game | runner, |
| `konva-survival` | Collection/survival game | survival |
| `konva-puzzle` | Match-3/grid puzzle | puzzle |
| `dom-typing` | Typing/translation game | typing |
| `dom-battle` | Turn-based RPG | battle |

## Using Templates

Templates are reference implementations, not copy-paste scaffolding. To create a new game from a template:

```bash
# Example: Create a new runner game
/vocab-game my-runner runner
```

The will:
1. Create page at `src/app/games/my-runner/page.tsx`
2. Create component at `src/components/my-runner/MyRunnerGame.tsx`
3. Create logic at `src/lib/myRunner.ts`
4. Create vocab file at `public/vocab/my-runner.json`
```

## Template: konva-runner

**Files:**
- `src/app/games/[name]/page.tsx` - Page wrapper
- `src/components/[name]/[Name]Game.tsx` - Main game component
- `src/lib/[name].ts` - Game logic functions
- `public/vocab/[name].json` - Vocabulary data

**Game Flow:**
1. Player moves through gates
2. Each gate shows term,3. Correct gate adds to army/score
4. Incorrect gate removes army
5. Boss fight at end

## Template: konva-survival

**Files:**
- `src/app/games/[name]/page.tsx` - Page wrapper
- `src/components/[name]/[Name]Game.tsx` - Main game component
- `src/lib/[name].ts` - Game logic functions
- `src/hooks/useDirectionalInput.ts` - (shared)
- `public/vocab/[name].json` - Vocabulary data

**Game Flow:**
1. Player collects items
2. Items show vocabulary
3. Correct collection adds points
4. Hazards drain health
5. Survive as long as possible

## Template: konva-puzzle

**Files:**
- `src/app/games/[name]/page.tsx` - Page wrapper
- `src/components/[name]/[Name]Game.tsx` - Main game component
- `src/lib/[name].ts` - Game logic (grid + matching)
- `src/lib/[name]Config.ts` - Puzzle configuration
- `public/vocab/[name].json` - Vocabulary data

**Game Flow:**
1. Grid of tiles with vocabulary
2. Swap adjacent tiles
3. Match 3+ to score
4. Combos for bonuses
5. Reach target score

## Template: dom-typing

**Files:**
- `src/app/games/[name]/page.tsx` - Page wrapper
- `src/components/[name]/[Name]Game.tsx` - Main game component
- `src/lib/[name].ts` - Game logic
- `public/vocab/[name].json` - Vocabulary data

**Game Flow:**
1. Words fall/appear on screen
2. Type translation
3. Correct = points
4. Incorrect = penalty
5. Survive waves

## Template: dom-battle

**Files:**
- `src/app/games/[name]/page.tsx` - Page wrapper
- `src/components/[name]/[Name]Game.tsx` - Main game component
- `src/lib/[name].ts` - Game logic (turn-based)
- `src/lib/[name]Selection.ts` - Character/enemy selection
- `src/store/use[Name]Store.ts` - Zustand store
- `public/vocab/[name].json` - Vocabulary data

**Game Flow:**
1. Select character/loadout
2. Turn-based combat
3. Type translations to attack
4. Correct = damage dealt
5. Defeat enemy
