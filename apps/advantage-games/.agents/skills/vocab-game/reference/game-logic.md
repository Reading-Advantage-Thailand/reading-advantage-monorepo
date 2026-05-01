# Game Logic Patterns

Pure function patterns for vocabulary game logic. These patterns ensure testable, predictable game behavior.

## State Machine Pattern

For games with clear phases:

```tsx
// lib/[gameName].ts

export type GameStatus = 'idle' | 'playing' | 'paused' | 'victory' | 'defeat'

export interface GameState {
  status: GameStatus
  score: number
  correctAnswers: number
  totalAttempts: number
  // Game-specific fields...
}

export function createInitialState(vocabulary: VocabularyItem[]): GameState {
  return {
    status: 'idle',
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
  }
}

export function transitionStatus(state: GameState, event: string): GameState {
  switch (event) {
    case 'start':
      return { ...state, status: 'playing' }
    case 'pause':
      return state.status === 'playing' 
        ? { ...state, status: 'paused' }
        : state
    case 'resume':
      return state.status === 'paused'
        ? { ...state, status: 'playing' }
        : state
    case 'victory':
      return { ...state, status: 'victory' }
    case 'defeat':
      return { ...state, status: 'defeat' }
    case 'reset':
      return createInitialState([])
    default:
      return state
  }
}
```

## Time Advancement Pattern

For tick-based games:

```tsx
export function advanceTime(state: GameState, dt: number): GameState {
  if (state.status !== 'playing') return state
  
  const nextTime = state.elapsedMs + dt
  
  // Check win/lose conditions
  if (nextTime >= state.durationMs) {
    return { ...state, elapsedMs: state.durationMs, status: 'victory' }
  }
  
  return { ...state, elapsedMs: nextTime }
}

// Usage in component:
useEffect(() => {
  if (status !== 'playing') return
  const interval = setInterval(() => {
    setState(s => advanceTime(s, 50))
  }, 50)
  return () => clearInterval(interval)
}, [status])
```

## Input Processing Pattern

For movement/selection games:

```tsx
export function processInput(state: GameState, input: InputVector): GameState {
  if (state.status !== 'playing') return state
  
  const { dx, dy, cast } = input
  
  // Update player position
  let { playerX, playerY } = state
  playerX += dx * PLAYER_SPEED
  playerY += dy * PLAYER_SPEED
  
  // Clamp to bounds
  playerX = Math.max(0, Math.min(state.width, playerX))
  playerY = Math.max(0, Math.min(state.height, playerY))
  
  // Handle action
  if (cast) {
    return handleAction({ ...state, playerX, playerY })
  }
  
  return { ...state, playerX, playerY }
}
```

## Scoring Pattern

Standard vocabulary game scoring:

```tsx
export function recordAnswer(
  state: GameState,
  isCorrect: boolean
): GameState {
  const totalAttempts = state.totalAttempts + 1
  const correctAnswers = state.correctAnswers + (isCorrect ? 1 : 0)
  
  return {
    ...state,
    totalAttempts,
    correctAnswers,
    score: state.score + (isCorrect ? 10 : 0),
  }
}

export function calculateFinalXP(state: GameState): number {
  if (state.totalAttempts === 0) return 0
  const accuracy = state.correctAnswers / state.totalAttempts
  return Math.floor(state.correctAnswers * accuracy)
}
```

## Selection/Choice Pattern

For gate runners and choice games:

```tsx
export interface Choice {
  id: string
  term: string
  correctTranslation: string
  decoyTranslation: string
  correctSide: 'left' | 'right'
}

export function createChoice(
  vocabulary: VocabularyItem[],
  rng: () => number = Math.random
): Choice {
  const correctIdx = Math.floor(rng() * vocabulary.length)
  let decoyIdx = Math.floor(rng() * vocabulary.length)
  if (decoyIdx === correctIdx && vocabulary.length > 1) {
    decoyIdx = (correctIdx + 1) % vocabulary.length
  }
  
  const correct = vocabulary[correctIdx]
  const decoy = vocabulary[decoyIdx]
  
  return {
    id: nanoid(),
    term: correct.term,
    correctTranslation: correct.translation,
    decoyTranslation: decoy.translation,
    correctSide: rng() < 0.5 ? 'left' : 'right',
  }
}

export function selectChoice(
  state: GameState,
  side: 'left' | 'right',
  vocabulary: VocabularyItem[],
  rng: () => number = Math.random
): GameState {
  const isCorrect = side === state.currentChoice.correctSide
  
  return {
    ...state,
    totalAttempts: state.totalAttempts + 1,
    correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
    currentChoice: createChoice(vocabulary, rng),
    // Game-specific effects...
  }
}
```

## Entity Spawning Pattern

For games with spawned objects:

```tsx
export interface Entity {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
}

export function spawnEntity(
  state: GameState,
  type: 'enemy' | 'collectible' | 'hazard',
  rng: () => number = Math.random
): GameState {
  const entity: Entity = {
    id: nanoid(),
    x: rng() * state.width,
    y: 0,
    vx: 0,
    vy: 100 + rng() * 50,
    active: true,
  }
  
  return {
    ...state,
    entities: [...state.entities, entity],
  }
}

export function updateEntities(state: GameState, dt: number): GameState {
  const dtSeconds = dt / 1000
  const updated = state.entities.map(e => ({
    ...e,
    x: e.x + e.vx * dtSeconds,
    y: e.y + e.vy * dtSeconds,
  })).filter(e => e.y < state.height + 50) // Remove off-screen
  
  return { ...state, entities: updated }
}
```

## Collision Pattern

For games with collision detection:

```tsx
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function checkCollision(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function checkCircleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < r1 + r2
}

export function processCollisions(state: GameState): GameState {
  const { player, entities } = state
  
  let newState = state
  for (const entity of entities) {
    if (!entity.active) continue
    
    if (checkCircleCollision(
      player.x, player.y, player.radius,
      entity.x, entity.y, entity.radius
    )) {
      newState = handleCollision(newState, entity)
    }
  }
  
  return newState
}
```

## Grid/Match-3 Pattern

For puzzle games:

```tsx
export interface Cell {
  row: number
  col: number
  value: string
  selected: boolean
}

export function createGrid(
  rows: number,
  cols: number,
  values: string[],
  rng: () => number = Math.random
): Cell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      value: values[Math.floor(rng() * values.length)],
      selected: false,
    }))
  )
}

export function swapCells(grid: Cell[][], a: { row: number, col: number }, b: { row: number, col: number }): Cell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })))
  const temp = newGrid[a.row][a.col].value
  newGrid[a.row][a.col].value = newGrid[b.row][b.col].value
  newGrid[b.row][b.col].value = temp
  return newGrid
}

export function findMatches(grid: Cell[][]): { row: number, col: number }[] {
  const matches: { row: number, col: number }[] = []
  const rows = grid.length
  const cols = grid[0].length
  
  // Check horizontal matches
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 2; c++) {
      if (grid[r][c].value === grid[r][c+1].value && 
          grid[r][c].value === grid[r][c+2].value) {
        matches.push({ row: r, col: c })
        matches.push({ row: r, col: c + 1 })
        matches.push({ row: r, col: c + 2 })
      }
    }
  }
  
  // Check vertical matches
  for (let r = 0; r < rows - 2; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].value === grid[r+1][c].value && 
          grid[r][c].value === grid[r+2][c].value) {
        matches.push({ row: r, col: c })
        matches.push({ row: r + 1, col: c })
        matches.push({ row: r + 2, col: c })
      }
    }
  }
  
  return matches
}
```

## Testing Pattern

Logic files should be easily testable:

```tsx
// lib/[gameName].test.ts
import { describe, it, expect } from 'jest'
import { createInitialState, advanceTime, recordAnswer } from './[gameName]'

describe('Game Logic', () => {
  it('starts with idle status', () => {
    const state = createInitialState([])
    expect(state.status).toBe('idle')
  })
  
  it('records correct answers', () => {
    const state = createInitialState([])
    const updated = recordAnswer(state, true)
    expect(updated.correctAnswers).toBe(1)
    expect(updated.totalAttempts).toBe(1)
  })
  
  it('calculates XP correctly', () => {
    const state = { correctAnswers: 8, totalAttempts: 10 }
    const xp = calculateFinalXP(state)
    expect(xp).toBe(6) // 8 * 0.8 = 6.4 -> 6
  })
})
```
