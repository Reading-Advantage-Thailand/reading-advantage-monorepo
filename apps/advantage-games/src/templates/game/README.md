# Game Templates

Copy these templates to create a new vocabulary or sentence game.

## Quick Start

### 1. Choose Your Game Type

Determine whether your game is a **vocabulary** (word-based) or **sentence** (phrase-based):

| Type | Best For | Examples |
|------|----------|----------|
| Vocabulary | Word matching, spelling games | dragon-flight, wizard-vs-zombie |
| Sentence | Grammar, translation games | castle-defense, potion-rush |

### 2. Create Directories and Files

Replace placeholders in all template files:

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `game-name` | kebab-case slug | `dragon-flight` |
| `GameName` | PascalCase | `DragonFlight` |
| `gameName` | camelCase | `dragonFlight` |
| `Game Name` | Display title | `Dragon Flight` |
| `{type}` | vocabulary or sentence | `vocabulary` |

```
src/
├── app/[locale]/(student)/student/games/{type}/[game-name]/
│   └── page.tsx              # From vocabulary/page.tsx.template or sentence/page.tsx.template
├── components/games/{type}/[game-name]/
│   └── [GameName]Game.tsx    # From GameNameGame.tsx.template
├── lib/games/
│   └── [gameName].ts             # From gameName.ts.template
└── app/api/v1/games/[game-name]/
    ├── vocabulary/route.ts    # From api/vocabulary-route.ts.template (vocabulary games)
    ├── sentences/route.ts     # From api/sentences-route.ts.template (sentence games)
    ├── complete/route.ts      # From api/complete-route.ts.template
    └── ranking/route.ts       # From api/ranking-route.ts.template (optional)
```

### 3. Copy Templates

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

### 4. Create Assets

```
public/games/{type}/[game-name]/
├── player-3x3-sheet.png      # Animated player sprite
├── enemy-3x3-sheet.png       # Animated enemy sprite (if applicable)
└── background.png            # Background image
```

### 5. Add Translations

Add keys to `src/locales/en.ts`:

```typescript
games: {
  gameName: {
    title: 'Game Name',
    description: 'Game description goes here.',
    loading: 'Loading...',
  },
  // ... other game translations
}
```

## File Checklist

- [ ] `src/app/[locale]/(student)/student/games/{type}/[game-name]/page.tsx`
- [ ] `src/components/games/{type}/[game-name]/[GameName]Game.tsx`
- [ ] `src/lib/games/[gameName].ts`
- [ ] `src/app/api/v1/games/[game-name]/vocabulary|sentences/route.ts`
- [ ] `src/app/api/v1/games/[game-name]/complete/route.ts`
- [ ] `src/app/api/v1/games/[game-name]/ranking/route.ts` (optional)
- [ ] `public/games/{type}/[game-name]/` (assets)
- [ ] Translations added to `src/locales/en.ts`

## Template Files

| Template | Output | Purpose |
|----------|--------|---------|
| `vocabulary/page.tsx.template` | `app/[locale]/(student)/student/games/vocabulary/{game}/page.tsx` | Page wrapper with vocabulary API fetch |
| `sentence/page.tsx.template` | `app/[locale]/(student)/student/games/sentence/{game}/page.tsx` | Page wrapper with sentences API fetch |
| `GameNameGame.tsx.template` | `components/games/{type}/{game}/GameNameGame.tsx` | Main Konva game component |
| `gameName.ts.template` | `lib/games/{gameName}.ts` | Game logic (pure functions) |
| `api/vocabulary-route.ts.template` | `app/api/v1/games/{game}/vocabulary/route.ts` | Vocabulary API route |
| `api/sentences-route.ts.template` | `app/api/v1/games/{game}/sentences/route.ts` | Sentences API route |
| `api/complete-route.ts.template` | `app/api/v1/games/{game}/complete/route.ts` | Game completion API route |
| `api/ranking-route.ts.template` | `app/api/v1/games/{game}/ranking/route.ts` | Rankings API route |

## Key Patterns

### Game Phase State Machine
```tsx
type GamePhase = 'start' | 'playing' | 'ended'
const [phase, setPhase] = useState<GamePhase>('start')
```

### Asset Loading
```tsx
const ASSETS = {
  player: withBasePath('/games/{type}/game-name/player-3x3-sheet.png'),
}
```

### Sprite Grid (3x3 sheets)
```tsx
const buildSpriteGrid = (width: number, height: number): SpriteGrid => { ... }
const getSpriteCrop = (grid: SpriteGrid, col: number, row: number) => ({ ... })
```

### Responsive Canvas
```tsx
const [stageSize, setStageSize] = useState<StageSize>(DEFAULT_STAGE)
useEffect(() => {
  const observer = new ResizeObserver(measureStage)
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])
```

### Input Controls
```tsx
const { input, setVirtualInput, consumeCast } = useDirectionalInput()
// input.dx, input.dy, input.cast
```

### Game Tick Loop
```tsx
useInterval(() => {
  setState((prev) => advanceTime(prev, TICK_MS))
}, state.status === 'running' && phase === 'playing' ? TICK_MS : null)
```

### Results Calculation
```tsx
const results = getGameResults(state)
onComplete?.(results)
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
- [ ] Restart works cleanly (test 3x)
