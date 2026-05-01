# Spec: Castle Defense Game Rewrite

## Problem Statement

The current Castle Defense game has critical performance issues:
- **FPS: ~0.1 on mobile** (target: 30+ FPS)
- Zustand store updates every frame causing cascading React re-renders
- No memoization of entity arrays
- Camera recalculates on every player position change
- Different D-Pad implementation from other games
- Asset loading is not parallelized

The game is unplayable on mobile devices.

## Solution

**Complete rewrite** of Castle Defense to use the same architecture as Wizard vs Zombie, which runs smoothly at 60 FPS on mobile. This includes:

1. Replace Zustand with React `useState` for game state
2. Use `useInterval` hook instead of `requestAnimationFrame` for game loop
3. Reuse the `VirtualDPad` component from Wizard vs Zombie
4. Use the same asset loading pattern (Promise.all)
5. Use the same camera calculation pattern (in game loop, not useMemo)
6. Match the same responsive sizing approach

---

## Reference Implementation: Wizard vs Zombie

**THE IMPLEMENTER MUST STUDY THESE FILES BEFORE STARTING:**

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/wizard-vs-zombie/WizardZombieGame.tsx` | Main game component | 529 |
| `src/lib/wizardZombie.ts` | Game state logic | 385 |
| `src/components/ui/VirtualDPad.tsx` | D-Pad component to reuse | 120 |
| `src/hooks/useDirectionalInput.ts` | Input handling hook | 72 |

---

## Game Mechanics (Preserved from Original)

### Core Gameplay
1. Player moves around the map collecting vocabulary words
2. Words appear on the map as collectible orbs
3. Player must collect the CORRECT translation to fill tower slots
4. Towers auto-attack enemies when built with correct words
5. Enemies spawn from edges and walk toward the base
6. If enemies reach the base, it loses HP
7. Game over when base HP reaches 0

### Entities

#### Player
- Moves with D-Pad or keyboard (WASD/Arrows)
- Speed: 3 pixels per frame unit (same as Wizard)
- Has inventory to store collected words
- Sprite: `player_3x3_pose_sheet.png` (reuse from Wizard)

#### Enemies (3 types)
- **Soldier (Goblin)**: Fast, low HP
- **Tank (Orc)**: Slow, high HP
- **Boss (Troll)**: Very slow, very high HP
- All enemies follow a PATH (waypoints) toward the base
- Sprites: Existing enemy sprites in `/public/games/castle-defense/`

#### Towers
- Pre-placed tower SLOTS on the map
- When player has correct word in inventory and is near slot, tower activates
- Active towers shoot projectiles at enemies in range
- Tower types and their target words defined in `castleDefenseConfig.ts`

#### Words
- Spawned on map as collectible orbs (similar to Wizard orbs)
- Each word has: `term`, `translation`, `isCorrect` (boolean)
- Visual: Colored circle with text label

#### Projectiles
- Yellow circles shot by towers
- Move toward target enemy
- Deal damage on collision

#### Base
- Located at end of enemy path
- Has HP (starts at 100)
- Game over when HP reaches 0

---

## Technical Requirements

### Architecture Pattern (MUST FOLLOW)

```
src/components/castle-defense-v2/
├── CastleDefenseGameV2.tsx    # Main component (matches WizardZombieGame.tsx pattern)
├── index.ts                    # Export

src/lib/
├── castleDefenseV2.ts         # Game state types and logic (matches wizardZombie.ts pattern)
├── castleDefenseV2Config.ts   # Enemy/tower configs (can reuse existing)
```

### State Management Pattern

**DO NOT USE ZUSTAND. Use React useState.**

```typescript
// CORRECT PATTERN (from Wizard vs Zombie)
const [gameState, setGameState] = useState<CastleDefenseState | null>(null)
const [assets, setAssets] = useState<GameAssets | null>(null)
const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 })

// WRONG PATTERN (current Castle Defense)
const { player, enemies, tick } = useCastleDefenseStore()  // DON'T DO THIS
```

### Game Loop Pattern

**DO NOT USE requestAnimationFrame directly. Use useInterval hook.**

```typescript
// CORRECT PATTERN (from Wizard vs Zombie)
useInterval(() => {
  if (gameState && gameState.status === 'playing' && assets) {
    const nextState = advanceCastleDefenseTime(gameState, 50, input, vocabulary)
    setGameState(nextState)

    // Calculate camera INSIDE the game loop
    const scale = dimensions.height / GAME_HEIGHT
    // ... camera logic
    setCamera({ x: camX, y: camY, scale })
  }
}, gameState?.status === 'playing' ? 50 : null)

// WRONG PATTERN (current Castle Defense)
const loop = (time: number) => {
  tick(dt)  // DON'T call Zustand tick in RAF
  animationFrameId = requestAnimationFrame(loop)
}
```

### D-Pad Integration

**REUSE the VirtualDPad component. DO NOT use the DPad component.**

```typescript
// CORRECT - Import from existing
import { VirtualDPad } from '@/components/ui/VirtualDPad'
import { useDirectionalInput } from '@/hooks/useDirectionalInput'

// In component:
const { input, setVirtualInput, consumeCast } = useDirectionalInput()

// In JSX:
<VirtualDPad onInput={setVirtualInput} />
```

### Asset Loading Pattern

**MUST use Promise.all for parallel loading.**

```typescript
// CORRECT PATTERN
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

    try {
      const [player, enemy1, enemy2, enemy3, tower, projectile, floor] = await Promise.all([
        loadImage('/games/castle-defense/player.png'),
        loadImage('/games/castle-defense/goblin.png'),
        loadImage('/games/castle-defense/orc.png'),
        loadImage('/games/castle-defense/troll.png'),
        loadImage('/games/castle-defense/tower.png'),
        loadImage('/games/castle-defense/projectile.png'),
        loadImage('/games/castle-defense/grass.png'),
      ])
      if (mounted) setAssets({ player, enemy1, enemy2, enemy3, tower, projectile, floor })
    } catch (e) {
      console.error('Failed to load assets', e)
    }
  }

  load()
  return () => { mounted = false }
}, [])

// WRONG PATTERN
const img1 = new Image()
img1.onload = () => {
  const img2 = new Image()  // Sequential loading - SLOW
  img2.onload = () => { ... }
}
```

### Responsive Container Pattern

**MUST use ResizeObserver for container dimensions.**

```typescript
// CORRECT PATTERN
const containerRef = useRef<HTMLDivElement>(null)
const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

useEffect(() => {
  if (!containerRef.current) return

  const observer = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    if (width > 0 && height > 0) {
      setDimensions({ width, height })
    }
  })

  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

// Container JSX:
<div
  ref={containerRef}
  className="relative h-[75vh] w-full overflow-hidden rounded-3xl bg-slate-900 touch-none md:aspect-video md:h-auto"
>
```

### Animation Frame Management

**Use separate useInterval for sprite animations.**

```typescript
const [playerFrame, setPlayerFrame] = useState(0)
const [enemyFrame, setEnemyFrame] = useState(0)

// Animation loop - SEPARATE from game loop
useInterval(() => {
  setPlayerFrame(f => (f + 1) % 3)
  setEnemyFrame(f => (f + 1) % 3)
}, 150)  // 150ms per animation frame
```

---

## Constants (MUST MATCH)

```typescript
// Game world dimensions (same as Wizard)
export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

// Player (same as Wizard)
export const PLAYER_RADIUS = 20
export const PLAYER_SPEED = 3

// Enemies
export const ENEMY_SOLDIER_RADIUS = 12
export const ENEMY_TANK_RADIUS = 18
export const ENEMY_BOSS_RADIUS = 25

// Tower
export const TOWER_RANGE = 150
export const TOWER_FIRE_RATE = 1000  // ms between shots

// Projectile
export const PROJECTILE_RADIUS = 5
export const PROJECTILE_SPEED = 8

// Word orbs (similar to Wizard orbs)
export const WORD_RADIUS = 25

// Base
export const BASE_HP = 100

// Timing
export const GAME_TICK_MS = 50  // 20 FPS game logic (same as Wizard)
export const SPAWN_RATE_MS = 2000
export const MAX_ENEMIES = 15
```

---

## Type Definitions

```typescript
type Entity = {
  id: string
  x: number
  y: number
  radius: number
}

type Player = Entity & {
  speed: number
  inventory: string[]  // collected words
}

type Enemy = Entity & {
  type: 'soldier' | 'tank' | 'boss'
  hp: number
  maxHp: number
  speed: number
  waypointIndex: number  // current waypoint on path
}

type Tower = Entity & {
  isActive: boolean
  targetWord: string
  range: number
  lastFired: number
}

type TowerSlot = Entity & {
  targetWord: string
}

type Projectile = Entity & {
  targetId: string
  speed: number
  damage: number
}

type Word = Entity & {
  term: string
  translation: string
  isCorrect: boolean
  isCollected: boolean
}

type CastleDefenseState = {
  status: 'playing' | 'gameover' | 'victory'
  player: Player
  enemies: Enemy[]
  towers: Tower[]
  towerSlots: TowerSlot[]
  projectiles: Projectile[]
  words: Word[]
  base: { x: number; y: number; hp: number; maxHp: number }
  path: { x: number; y: number }[]  // waypoints for enemies
  score: number
  wave: number
  spawnTimer: number
  gameTime: number
}

type InputState = {
  dx: number  // -1, 0, 1
  dy: number  // -1, 0, 1
  drop?: boolean  // drop word from inventory (like Wizard's cast)
}
```

---

## Acceptance Criteria

### Performance
- [ ] **CRITICAL**: Game runs at 30+ FPS on mobile in Chrome DevTools emulation
- [ ] **CRITICAL**: No frame drops when 15 enemies are on screen
- [ ] Game loop uses 50ms intervals (same as Wizard vs Zombie)
- [ ] No Zustand store - all state in React useState

### Architecture
- [ ] Uses `useState` for game state (not Zustand)
- [ ] Uses `useInterval` hook for game loop (not requestAnimationFrame)
- [ ] Uses `VirtualDPad` component (not `DPad`)
- [ ] Uses `useDirectionalInput` hook
- [ ] Uses `Promise.all` for asset loading
- [ ] Camera calculated inside game loop (not useMemo)

### Functionality
- [ ] Player moves with D-Pad and keyboard
- [ ] Words spawn on map and can be collected
- [ ] Towers activate when player has correct word and is nearby
- [ ] Active towers shoot at enemies in range
- [ ] Enemies follow path toward base
- [ ] Base takes damage when enemies reach it
- [ ] Game over when base HP is 0
- [ ] Victory when all waves cleared

### Mobile
- [ ] Touch controls work smoothly
- [ ] D-Pad positioned correctly (bottom-right)
- [ ] All UI elements visible in portrait mode
- [ ] No layout overflow or clipping

### Code Quality
- [ ] New files in `src/components/castle-defense-v2/`
- [ ] Game logic in `src/lib/castleDefenseV2.ts`
- [ ] Tests for game logic functions
- [ ] No TypeScript errors
- [ ] Follows existing code style

---

## Files to DELETE After Rewrite

Once the new implementation is working and tested:

```
src/components/castle-defense/CastleDefenseGame.tsx (replace with V2)
src/components/castle-defense/BackgroundLayer.tsx (simplified in V2)
src/components/castle-defense/CastleDefenseHUD.tsx (integrated in V2)
src/components/ui/DPad.tsx (using VirtualDPad instead)
src/store/useCastleDefenseStore.ts (not using Zustand)
```

---

## Files to REUSE (Do Not Rewrite)

```
src/lib/castleDefenseConfig.ts - Enemy/tower configurations
src/components/ui/VirtualDPad.tsx - D-Pad component
src/hooks/useDirectionalInput.ts - Input handling
src/hooks/useInterval.ts - Interval hook (if exists, otherwise copy from Wizard)
public/games/castle-defense/* - All game assets
```

---

## Map Layout

The map is an 800x600 game world with:
- Pre-placed tower slots (4-6 positions)
- A path from spawn point(s) to base
- Base at center or one end
- Open areas for player movement and word collection

The implementer should reuse or adapt the existing map configuration from `castleDefenseConfig.ts`.
