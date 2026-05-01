# Vocabulary Game Conventions

These conventions are **mandatory** for all vocabulary games. They ensure consistency, maintainability, and a unified player experience.

## 1. Input/Output Contract

Every game MUST:

**Accept:**
```typescript
interface GameProps {
  vocabulary: VocabularyItem[]  // { term: string; translation: string }
  onComplete: (result: GameResult) => void
}
```

**Emit on completion:**
```typescript
interface GameResult {
  xp: number        // Floor(correctAnswers * accuracy)
  accuracy: number  // correctAnswers / totalAttempts (0-1)
}
```

## 2. Screen Flow

All games follow the same phase flow:

```
'start' → 'playing' → 'ended'
    ↑                      |
    └──────────────────────┘
```

- **start**: Show `GameStartScreen` with instructions + vocab preview
- **playing**: Main gameplay
- **ended**: Show `GameEndScreen` with XP + accuracy + restart

### Required Imports

```tsx
import { GameStartScreen } from '@/components/game/GameStartScreen'
import { GameEndScreen } from '@/components/game/GameEndScreen'
```

### GameStartScreen Props

```tsx
<GameStartScreen
  gameTitle='Game Title'           // Required
  gameSubtitle='Subtitle'          // Optional
  vocabulary={vocabulary}          // Required
  instructions={[                  // Recommended
    { step: 1, text: 'Instruction 1' },
    { step: 2, text: 'Instruction 2' },
  ]}
  proTip='Helpful tip'             // Optional
  controls={[                      // Optional
    { label: 'Move', keys: 'Arrows', color: 'bg-amber-500' },
  ]}
  startButtonText='Start'          // Optional, default 'Start Game'
  icon={LucideIcon}                // Optional
  onStart={() => setPhase('playing')}
/>
```

### GameEndScreen Props

```tsx
<GameEndScreen
  status='victory' | 'defeat' | 'complete'  // Required
  score={score}                    // Required
  xp={xp}                          // Required
  accuracy={accuracy}              // Required (0-1)
  onRestart={handleRestart}        // Required
  onExit={handleExit}              // Optional
  customStats={[                   // Optional
    { label: 'Streak', value: 10 },
  ]}
  title='Custom Title'             // Optional
  subtitle='Custom subtitle'       // Optional
  restartButtonText='Play Again'   // Optional
/>
```

## 3. State Management

### For Simple Games

Use the shared `useGameStore`:

```tsx
import { useGameStore } from '@/store/useGameStore'

const vocabulary = useGameStore(s => s.vocabulary)
const setVocabulary = useGameStore(s => s.setVocabulary)
const setLastResult = useGameStore(s => s.setLastResult)
```

### For Complex Games

Create a dedicated Zustand store in `store/use[GameName]Store.ts`:

```tsx
import { create } from 'zustand'

interface GameState {
  // State
  status: 'idle' | 'playing' | 'paused' | 'victory' | 'defeat'
  
  // Actions
  reset: () => void
}
```

**Rules:**
- Store must have a `reset()` action for clean restarts
- State should be serializable (no functions, no DOM refs)
- Actions should be pure (no side effects)

## 4. Input Handling

### Unified Input Hook

All games with directional input MUST use `useDirectionalInput`:

```tsx
import { useDirectionalInput } from '@/hooks/useDirectionalInput'

const { input, setVirtualInput, triggerCast, consumeCast } = useDirectionalInput()
```

### Input Structure

```tsx
interface InputVector {
  dx: number    // -1, 0, or 1
  dy: number    // -1, 0, or 1
  cast: boolean // Action button pressed
}
```

### Touch Control Rendering

Choose ONE:

**DPad** (discrete, 4-direction + action button):
```tsx
import { DPad } from '@/components/ui/DPad'

<DPad onInput={setVirtualInput} />
```

**VirtualDPad** (analog-style, continuous movement):
```tsx
import { VirtualDPad } from '@/components/ui/VirtualDPad'

<VirtualDPad onInput={setVirtualInput} />
```

### Keyboard Support

The hook automatically handles:
- Arrow keys (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
- WASD keys (KeyW, KeyA, KeyS, KeyD)
- Action keys (Space, Enter)

## 5. Asset Loading

### Konva Games

Load assets before rendering:

```tsx
import { withBasePath } from '@/lib/basePath'

const [assets, setAssets] = useState<Assets | null>(null)

useEffect(() => {
  let mounted = true
  const load = async () => {
    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const img = new Image()
        img.src = withBasePath(src)
        img.onload = () => res(img)
        img.onerror = rej
      })
    
    const [sprite1, sprite2] = await Promise.all([
      loadImage('/games/[game-name]/sprite1.png'),
      loadImage('/games/[game-name]/sprite2.png'),
    ])
    
    if (mounted) setAssets({ sprite1, sprite2 })
  }
  load()
  return () => { mounted = false }
}, [])

// Render nothing until assets load
if (!assets) return null
```

### DOM Games

Use Next.js `Image` component or standard `img` tags with `withBasePath()`.

## 6. Game Logic Separation

Pure game logic goes in `lib/[gameName].ts`:

```tsx
// lib/[gameName].ts

export interface GameState {
  status: 'playing' | 'victory' | 'defeat'
  score: number
  // ...
}

export function createInitialState(vocab: VocabularyItem[]): GameState {
  return { status: 'playing', score: 0, ... }
}

export function advanceTime(state: GameState, dt: number): GameState {
  // Pure function - no side effects
  return { ...state, time: state.time + dt }
}

export function handleInput(state: GameState, input: InputVector): GameState {
  // Pure function - returns new state
}
```

**Rules:**
- Logic functions are pure (input → output, no side effects)
- State is immutable (always return new objects)
- No DOM/React dependencies in logic files

## 7. Constants & Configuration

### Simple Config

Inline in the game component or logic file:

```tsx
const CONFIG = {
  PLAYER_SPEED: 200,
  ENEMY_SPEED: 100,
  SPAWN_RATE: 2000,
}
```

### Complex Config

Create `lib/[gameName]Config.ts`:

```tsx
export const GAME_CONFIG = {
  player: {
    speed: 200,
    maxHealth: 100,
  },
  enemies: {
    goblin: { speed: 80, damage: 10 },
    skeleton: { speed: 60, damage: 15 },
  },
  scoring: {
    killPoints: 100,
    comboMultiplier: 1.5,
  },
}
```

**Rules:**
- Zero magic numbers in game logic
- All tuning values in config
- Use SCREAMING_SNAKE for constants

## 8. Responsive Canvas

Konva games must resize properly:

```tsx
const containerRef = useRef<HTMLDivElement>(null)
const [dimensions, setDimensions] = useState({ width: 960, height: 540 })

useEffect(() => {
  if (!containerRef.current) return
  const observer = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    setDimensions({ width, height })
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

return (
  <div ref={containerRef} className='w-full aspect-video'>
    <Stage width={dimensions.width} height={dimensions.height}>
      {/* ... */}
    </Stage>
  </div>
)
```

## 9. Vocabulary File Format

All vocabulary files in `public/vocab/`:

```json
[
  { "term": "สวัสดี", "translation": "Hello" },
  { "term": "ขอบคุณ", "translation": "Thank you" },
  { "term": "แมว", "translation": "Cat" }
]
```

**Rules:**
- UTF-8 encoding
- Term in target language, translation in English (or vice versa for sentence games)
- Empty array fallback to `default.json`

## 10. Error Handling

### Vocabulary Load Failure

```tsx
useEffect(() => {
  loadVocabulary('[game-name]')
    .then(setVocabulary)
    .catch(err => {
      console.error('Failed to load vocabulary:', err)
      // Fallback to empty - GameStartScreen handles this
    })
}, [setVocabulary])
```

### Asset Load Failure

```tsx
useEffect(() => {
  const load = async () => {
    try {
      const assets = await loadAssets()
      setAssets(assets)
    } catch (e) {
      console.error('Asset load failed:', e)
      // Optionally set error state and show message
    }
  }
  load()
}, [])
```

## Checklist Before Merge

- [ ] Game accepts `vocabulary` + `onComplete` props
- [ ] Emits `{ xp, accuracy }` on completion
- [ ] Uses `GameStartScreen` and `GameEndScreen`
- [ ] Touch controls work (DPad or VirtualDPad)
- [ ] Keyboard controls work (arrows + WASD + space)
- [ ] All magic numbers in config/constants
- [ ] Game logic in separate pure functions
- [ ] Canvas responsive (Konva games)
- [ ] Vocabulary file exists in `public/vocab/`
- [ ] `npm run build` succeeds
- [ ] No console errors
- [ ] Clean restart (3x test)
