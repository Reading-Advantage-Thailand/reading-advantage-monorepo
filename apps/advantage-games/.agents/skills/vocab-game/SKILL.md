---
name: vocab-game
description: Build vocabulary learning browser games with Next.js, React, and Konva. Use when creating a new vocabulary game, adding features to existing vocab games, or working with the advantage-games codebase.
argument-hint: "[game-name] [vocabulary|sentence]"
license: MIT
metadata:
  author: AdvantageGames
  version: 3.0.0
  tags: [game, vocabulary, react, nextjs, konva, education]
---

# Vocabulary Game Framework

Build vocabulary or sentence learning games for the advantage-games platform. This skill provides architecture patterns, reusable components, and scaffolding conventions for creating educational browser games.

## Quick Start: Create a New Game

Templates are located in `src/templates/game/`. To create a new game:

### Step 1: Choose Game Type

| Type | Data Source | Best For |
|------|-------------|----------|
| `vocabulary` | Words from user's flashcards | Word matching, spelling games |
| `sentence` | Sentences from user's flashcards | Grammar, translation games |

### Step 2: Create Directories

```bash
# For vocabulary games
mkdir -p src/app/[locale]/(student)/student/games/vocabulary/[game-name]
mkdir -p src/components/games/vocabulary/[game-name]
mkdir -p src/app/api/v1/games/[game-name]/vocabulary
mkdir -p src/app/api/v1/games/[game-name]/complete
mkdir -p public/games/vocabulary/[game-name]

# For sentence games
mkdir -p src/app/[locale]/(student)/student/games/sentence/[game-name]
mkdir -p src/components/games/sentence/[game-name]
mkdir -p src/app/api/v1/games/[game-name]/sentences
mkdir -p src/app/api/v1/games/[game-name]/complete
mkdir -p public/games/sentence/[game-name]
```

### Step 3: Copy Templates

```bash
# For vocabulary games
cp src/templates/game/vocabulary/page.tsx.template src/app/[locale]/(student)/student/games/vocabulary/[game-name]/page.tsx
cp src/templates/game/GameNameGame.tsx.template src/components/games/vocabulary/[game-name]/[GameName]Game.tsx
cp src/templates/game/gameName.ts.template src/lib/games/[gameName].ts
cp src/templates/game/api/vocabulary-route.ts.template src/app/api/v1/games/[game-name]/vocabulary/route.ts
cp src/templates/game/api/complete-route.ts.template src/app/api/v1/games/[game-name]/complete/route.ts

# For sentence games
cp src/templates/game/sentence/page.tsx.template src/app/[locale]/(student)/student/games/sentence/[game-name]/page.tsx
cp src/templates/game/GameNameGame.tsx.template src/components/games/sentence/[game-name]/[GameName]Game.tsx
cp src/templates/game/gameName.ts.template src/lib/games/[gameName].ts
cp src/templates/game/api/sentences-route.ts.template src/app/api/v1/games/[game-name]/sentences/route.ts
cp src/templates/game/api/complete-route.ts.template src/app/api/v1/games/[game-name]/complete/route.ts
```

### Step 4: Replace Placeholders

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `game-name` | kebab-case slug | `dragon-flight` |
| `GameName` | PascalCase | `DragonFlight` |
| `gameName` | camelCase | `dragonFlight` |
| `Game Name` | Display title | `Dragon Flight` |
| `{type}` | vocabulary or sentence | `vocabulary` |

## Core Principles

1. **Vocabulary-First Design** — All games accept `VocabularyItem[]` ({ term, translation }) and output `{ xp, accuracy }`
2. **Shared Screens** — Use `GameStartScreen` and `GameEndScreen` for consistent UX
3. **Event-Driven State** — Zustand stores for state, clear action patterns
4. **Mobile-First Input** — Touch controls via DPad/VirtualDPad + keyboard fallback
5. **Canvas Rendering** — Konva for 2D games with >10 moving objects; DOM for simpler games

## Game Types

| Type | Rendering | Best For | Example |
|------|-----------|----------|---------|
| `typing` | DOM | Typing/translation games | magic-defense |
| `runner` | Konva | Gate/choice runners | dragon-flight, dragon-rider |
| `survival` | Konva | Collection/survival | wizard-vs-zombie, enchanted-library |
| `puzzle` | Konva | Match-3, grid games | rune-match |
| `tower` | Konva | Tower defense | castle-defense |
| `battle` | DOM | Turn-based RPG | rpg-battle |
| `tycoon` | Konva | Restaurant/sim games | potion-rush |

## Required Architecture

Every game MUST follow this structure:

```
src/
├── app/[locale]/(student)/student/games/{type}/[game-name]/
│   └── page.tsx              # Page wrapper (load data, render game)
├── app/api/v1/games/[game-name]/
│   ├── vocabulary/route.ts   # Vocabulary API (vocabulary games)
│   ├── sentences/route.ts    # Sentences API (sentence games)
│   ├── complete/route.ts     # Game completion API
│   └── ranking/route.ts      # Rankings API (optional)
├── components/games/{type}/[game-name]/
│   └── [GameName]Game.tsx    # Main game component
├── lib/games/
│   ├── [gameName].ts         # Game logic (pure functions)
│   └── [gameName]Config.ts   # Constants (if complex)
├── store/
│   └── use[GameName]Store.ts # Zustand store (if needed)
└── public/
    └── games/{type}/[game-name]/    # Assets (sprites, backgrounds)
```

## Shared Components

All games MUST use these shared components:

### Screens

```tsx
import { GameStartScreen } from '@/components/games/game/GameStartScreen'
import { GameEndScreen } from '@/components/games/game/GameEndScreen'
```

### Input

```tsx
import { useDirectionalInput } from '@/hooks/useDirectionalInput'
import { DPad } from '@/components/ui/DPad'
```

### Utilities

```tsx
import { useInterval } from '@/hooks/useInterval'
import { useSound } from '@/hooks/useSound'
import { withBasePath } from '@/lib/games/basePath'
import { calculateXP } from '@/lib/games/xp'
```

### Stores

```tsx
import { useGameStore } from '@/store/useGameStore'
import type { VocabularyItem } from '@/store/useGameStore'
```

### i18n Hooks

```tsx
import { useScopedI18n, useCurrentLocale } from '@/locales/client'

const t = useScopedI18n('games.gameName')
const locale = useCurrentLocale()

// Usage in JSX
<h1>{t('title')}</h1>
<p>{t('description')}</p>
```

### Session Hook

```tsx
import { useSession } from '@/hooks/useSession'

const { data: { user } } = useSession()
// user.id, user.name, user.xp
```

## API Routes

Use the unified route factories from `@/lib/games/api`:

### Vocabulary Route

```typescript
import { createVocabularyRoute } from "@/lib/games/api";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

export const dynamic = "force-static";

const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY);

export { GET };
```

### Sentences Route

```typescript
import { createSentencesRoute } from "@/lib/games/api";
import { SAMPLE_SENTENCES } from "@/lib/games/sampleSentences";

export const dynamic = "force-static";

const { GET } = createSentencesRoute(SAMPLE_SENTENCES);

export { GET };
```

### Complete Route

```typescript
import { createCompleteRoute } from "@/lib/games/api";

export const dynamic = "force-static";

const { POST } = createCompleteRoute();

export { POST };
```

### Ranking Route

```typescript
import { createRankingRoute } from "@/lib/games/api";

export const dynamic = "force-static";

const { GET } = createRankingRoute();

export { GET };
```

## Key Patterns

### Game Phase State Machine

```tsx
type GamePhase = 'start' | 'playing' | 'ended'
const [phase, setPhase] = useState<GamePhase>('start')
```

### Unified Input (Keyboard + Touch)

```tsx
const { input, setVirtualInput, consumeCast } = useDirectionalInput()

// Read unified input
const { dx, dy, cast } = input

// Connect DPad for touch
<DPad onInput={setVirtualInput} />
```

### Responsive Canvas

```tsx
const [stageSize, setStageSize] = useState({ width: 960, height: 540 })

useEffect(() => {
  const observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    setStageSize({ width, height })
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])
```

### Sprite Grid (3x3 Sheets)

```tsx
const buildSpriteGrid = (width: number, height: number): SpriteGrid => {
  const columnBase = Math.floor(width / 3)
  const rowBase = Math.floor(height / 3)
  // ... see template for full implementation
}

const getSpriteCrop = (grid: SpriteGrid, col: number, row: number) => ({
  x: grid.columnOffsets[col] ?? 0,
  y: grid.rowOffsets[row] ?? 0,
  width: grid.columns[col] ?? 0,
  height: grid.rows[row] ?? 0,
})
```

### Game Tick Loop

```tsx
useInterval(() => {
  setState((prev) => advanceTime(prev, TICK_MS))
}, state.status === 'running' && phase === 'playing' ? TICK_MS : null)
```

### Asset Loading

```tsx
const ASSETS = {
  player: withBasePath('/games/{type}/game-name/player-3x3-sheet.png'),
  background: withBasePath('/games/{type}/game-name/background.png'),
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
```

## Input Controls

### DPad vs VirtualDPad

| Control | Best For | Output |
|---------|----------|--------|
| `DPad` | Discrete 4-direction + action button | `{ dx, dy, cast }` |
| `VirtualDPad` | Analog-style movement, continuous | `{ dx, dy }` |

### useDirectionalInput Hook

- Handles keyboard (WASD/Arrows/Space) automatically
- Accepts virtual input from DPad/VirtualDPad via `setVirtualInput`
- Outputs unified `{ dx, dy, cast }` object
- Use `consumeCast()` to reset cast state after processing

## XP Calculation

```tsx
// From lib/games/xp.ts
export function calculateXP(score: number, correctAnswers: number, totalAttempts: number): number {
  if (totalAttempts === 0) return 0
  const accuracy = correctAnswers / totalAttempts
  return Math.floor(correctAnswers * accuracy)
}
```

## Vocabulary Format

```json
[
  { "term": "สวัสดี", "translation": "Hello" },
  { "term": "ขอบคุณ", "translation": "Thank you" }
]
```

## Asset Organization

```
public/games/{type}/[game-name]/
├── player-3x3-sheet.png      # Animated player sprite
├── enemy-3x3-sheet.png       # Animated enemy sprite
├── background.png            # Background image
└── ...
```

### Sprite Sheet Convention

- Use 3x3 or 3x4 pose sheets for animated sprites
- Frame order: [idle, action, hurt, death] or [up, right, down, left]
- Use `withBasePath()` for all asset paths

## Translations

Add game keys to `src/locales/en.ts`:

```typescript
games: {
  gameName: {
    title: 'Game Name',
    description: 'Game description goes here.',
    loading: 'Loading...',
    // Add game-specific keys
  },
}
```

## Pre-Ship Checklist

- [ ] Vocabulary/sentences load from API
- [ ] GameStartScreen shows instructions + vocab preview
- [ ] GameEndScreen shows XP + accuracy
- [ ] Touch input works (DPad or VirtualDPad)
- [ ] Keyboard input works (arrows + WASD)
- [ ] Canvas resizes responsively
- [ ] All magic numbers in config/constants
- [ ] `npm run build` succeeds
- [ ] No console errors at runtime
- [ ] Restart works cleanly (3x test)
- [ ] Translations added to `src/locales/en.ts`

## Exporting to reading-advantage

See `docs/reading-advantage-integration.md` for the complete guide.

Key steps:
1. Copy page, components, lib files
2. Create controller in `server/controllers/{game}-controller.ts`
3. Create API routes using `next-connect` EdgeRouter
4. Add ActivityType and GameType to Prisma enum
5. Add translations to `locales/{lang}.ts`

## Reference Files

| File | Topic |
|------|-------|
| `src/templates/game/README.md` | Template usage instructions |
| `src/templates/game/*.template` | Copy-paste game scaffolding |
| `src/lib/games/api/` | Unified API route factories |
| `docs/reading-advantage-integration.md` | Export to reading-advantage guide |
