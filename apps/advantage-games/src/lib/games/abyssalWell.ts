import { ABYSSAL_WELL_CONFIG, getCreatureSpeed, type AbyssalWellDifficulty, type CreatureType } from './abyssalWellConfig'

export type SentenceItem = {
  term: string
  translation: string
}

export type GamePhase = 'start' | 'playing' | 'victory' | 'defeat'

/**
 * Cycling-words rules (Story S5, track r3f_rendering_tier_20260708):
 * every word of the sentence circulates in the well; the student decides
 * the order from the translation. Wrong hits cost lives; breaches wrap
 * harmlessly (slightly faster each lap). Angles are continuous radians —
 * motion is smooth, not lane-snapped.
 */
export type Player = {
  angle: number
  rotationDir: -1 | 0 | 1
  lives: number
  lastFireTime: number
}

export type Enemy = {
  id: string
  angle: number
  depth: number // 0 = far end, 1 = rim
  word: string
  wordIndex: number
  laps: number
  type: CreatureType
}

export type Projectile = {
  id: string
  angle: number
  depth: number // 1 = rim (player), shrinks toward 0
}

export type AbyssalWellState = {
  phase: GamePhase
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  sentence: { term: string; translation: string }
  words: string[]
  targetIndex: number
  correctWords: number
  totalAttempts: number
  gameTime: number
  difficulty: AbyssalWellDifficulty
  creatureType: CreatureType
}

export type AbyssalWellConfig = {
  rng?: () => number
  difficulty?: AbyssalWellDifficulty
  creatureType?: CreatureType
}

const TWO_PI = Math.PI * 2

function wrapAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI
}

/** Shortest angular gap between two angles, in [0, π]. */
export function angularDistance(a: number, b: number): number {
  const diff = Math.abs(wrapAngle(a) - wrapAngle(b))
  return Math.min(diff, TWO_PI - diff)
}

export function createAbyssalWellState(
  sentences: SentenceItem[],
  config: AbyssalWellConfig = {}
): AbyssalWellState {
  if (sentences.length === 0) {
    throw new Error('Sentences cannot be empty')
  }

  const rng = config.rng ?? Math.random
  const difficulty = config.difficulty ?? 'medium'
  const creatureType = config.creatureType ?? 'cave-spider'

  const sentenceIndex = Math.floor(rng() * sentences.length)
  const sentence = sentences[sentenceIndex]
  const words = sentence.term.split(' ')

  return {
    phase: 'start',
    player: {
      angle: Math.PI * 1.5, // bottom of the rim
      rotationDir: 0,
      lives: ABYSSAL_WELL_CONFIG.lives,
      lastFireTime: 0,
    },
    enemies: [],
    projectiles: [],
    sentence,
    words,
    targetIndex: 0,
    correctWords: 0,
    totalAttempts: 0,
    gameTime: 0,
    difficulty,
    creatureType,
  }
}

/**
 * Starts play and spawns every word at once: random angles, depths scattered
 * in the lower half of the well. Spawn placement carries no information about
 * word order — the student derives order from the translation.
 */
export function startGame(
  state: AbyssalWellState,
  rng: () => number = Math.random
): AbyssalWellState {
  const enemies: Enemy[] = state.words.map((word, wordIndex) => ({
    id: `enemy-${wordIndex}-${word}`,
    angle: wrapAngle(rng() * TWO_PI),
    depth: rng() * 0.5,
    word,
    wordIndex,
    laps: 0,
    type: state.creatureType,
  }))

  return {
    ...state,
    phase: 'playing',
    gameTime: 0,
    enemies,
    projectiles: [],
  }
}

/** Sets the held rotation direction (-1 = counter-clockwise, 1 = clockwise, 0 = stop). */
export function setRotation(state: AbyssalWellState, dir: -1 | 0 | 1): AbyssalWellState {
  return {
    ...state,
    player: { ...state.player, rotationDir: dir },
  }
}

export function fireProjectile(state: AbyssalWellState): AbyssalWellState {
  if (state.phase !== 'playing') return state

  const now = state.gameTime
  if (now - state.player.lastFireTime < ABYSSAL_WELL_CONFIG.player.fireRate) {
    return state
  }

  const projectile: Projectile = {
    id: `proj-${now}-${state.totalAttempts}`,
    angle: state.player.angle,
    depth: 1,
  }

  return {
    ...state,
    player: {
      ...state.player,
      lastFireTime: now,
    },
    projectiles: [...state.projectiles, projectile],
    totalAttempts: state.totalAttempts + 1,
  }
}

export function advanceAbyssalWellTime(
  state: AbyssalWellState,
  dt: number
): AbyssalWellState {
  if (state.phase !== 'playing') return state

  let nextState: AbyssalWellState = {
    ...state,
    gameTime: state.gameTime + dt,
  }

  nextState = rotatePlayer(nextState, dt)
  nextState = updateProjectiles(nextState, dt)
  nextState = updateEnemies(nextState, dt)
  nextState = resolveHits(nextState)
  nextState = checkVictoryCondition(nextState)

  return nextState
}

function rotatePlayer(state: AbyssalWellState, dt: number): AbyssalWellState {
  if (state.player.rotationDir === 0) return state

  const delta = state.player.rotationDir * ABYSSAL_WELL_CONFIG.player.rotationSpeed * (dt / 1000)
  return {
    ...state,
    player: {
      ...state.player,
      angle: wrapAngle(state.player.angle + delta),
    },
  }
}

function updateProjectiles(state: AbyssalWellState, dt: number): AbyssalWellState {
  const speedFactor = dt / 1000
  const projectileSpeed = ABYSSAL_WELL_CONFIG.player.projectileSpeed / 1000

  const updatedProjectiles = state.projectiles
    .map(p => ({
      ...p,
      depth: p.depth - projectileSpeed * speedFactor * 2,
    }))
    .filter(p => p.depth > 0)

  return { ...state, projectiles: updatedProjectiles }
}

function updateEnemies(state: AbyssalWellState, dt: number): AbyssalWellState {
  const speedFactor = dt / 1000
  const creatureSpeed = getCreatureSpeed(state.creatureType)
  const baseSpeed = creatureSpeed / ABYSSAL_WELL_CONFIG.gameHeight

  const updatedEnemies = state.enemies.map(e => {
    const lapMultiplier = 1 + e.laps * ABYSSAL_WELL_CONFIG.enemy.lapSpeedup
    let depth = e.depth + baseSpeed * lapMultiplier * speedFactor
    let laps = e.laps
    if (depth >= 1) {
      // Breach: wrap back to the deep end, harmlessly, a little faster.
      depth -= 1
      laps += 1
    }
    return { ...e, depth, laps }
  })

  return { ...state, enemies: updatedEnemies }
}

function resolveHits(state: AbyssalWellState): AbyssalWellState {
  const tolerance = ABYSSAL_WELL_CONFIG.player.angularHitTolerance

  let enemies = [...state.enemies]
  let projectiles = [...state.projectiles]
  let { targetIndex, correctWords } = state
  let lives = state.player.lives

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j]
      const hits =
        angularDistance(proj.angle, enemy.angle) < tolerance &&
        Math.abs(proj.depth - enemy.depth) < 0.15

      if (!hits) continue

      if (enemy.wordIndex === targetIndex) {
        // Correct next word: collect it.
        correctWords++
        targetIndex++
        enemies = enemies.filter((_, idx) => idx !== j)
      } else {
        // Wrong word: the mistake costs a life; the word survives.
        lives--
      }
      projectiles = projectiles.filter((_, idx) => idx !== i)
      break
    }
  }

  return {
    ...state,
    enemies,
    projectiles,
    targetIndex,
    correctWords,
    player: {
      ...state.player,
      lives: Math.max(0, lives),
    },
    phase: lives <= 0 ? 'defeat' : state.phase,
  }
}

function checkVictoryCondition(state: AbyssalWellState): AbyssalWellState {
  if (state.phase !== 'playing') return state
  if (state.targetIndex >= state.words.length) {
    return { ...state, phase: 'victory' }
  }
  return state
}

export function calculateXP(params: {
  correctWords: number
  totalAttempts: number
  lives: number
  initialLives: number
  gameTime: number
}): number {
  if (params.totalAttempts === 0) return 0

  const accuracy = params.correctWords / params.totalAttempts
  const baseXP = params.correctWords

  let bonus = 0
  if (accuracy === 1) bonus += 2 // Perfect accuracy bonus
  if (params.lives / params.initialLives >= 0.5) bonus += 1 // Survival bonus
  if (params.gameTime < 30000) bonus += 1 // Speed bonus (under 30s)

  return Math.min(10, baseXP + bonus)
}
