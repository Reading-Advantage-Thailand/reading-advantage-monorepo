import {
  createAbyssalWellState,
  advanceAbyssalWellTime,
  fireProjectile,
  setRotation,
  startGame,
  calculateXP,
  angularDistance,
  type Enemy,
  type Projectile,
  type SentenceItem,
} from '../abyssalWell'
import { ABYSSAL_WELL_CONFIG } from '../abyssalWellConfig'

// Abyssal Well is a sentence game: its input contract is SentenceItem[]
// (local export, matching dungeonLiberator/spellweaversRun), not the
// vocabulary store's VocabularyItem.
const mockSentences: SentenceItem[] = [
  { term: 'The cat sits', translation: 'Le chat est assis' },
  { term: 'A dog runs', translation: 'Un chien court' },
]

const mockRng = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

const enemy = (over: Partial<Enemy> = {}): Enemy => ({
  id: 'enemy-1',
  angle: 0,
  depth: 0.4,
  word: 'The',
  wordIndex: 0,
  laps: 0,
  type: 'cave-spider',
  ...over,
})

const projectile = (over: Partial<Projectile> = {}): Projectile => ({
  id: 'proj-1',
  angle: 0,
  depth: 0.45,
  ...over,
})

function playing(rngValues: number[] = [0.5]) {
  return startGame(createAbyssalWellState(mockSentences, { rng: mockRng([0]) }), mockRng(rngValues))
}

describe('abyssalWell (cycling-words rules)', () => {
  describe('createAbyssalWellState', () => {
    it('creates initial state with a continuous-angle player and no enemies yet', () => {
      const state = createAbyssalWellState(mockSentences, { rng: mockRng([0.5]) })

      expect(state.phase).toBe('start')
      expect(typeof state.player.angle).toBe('number')
      expect(state.player.rotationDir).toBe(0)
      expect(state.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives)
      expect(state.enemies).toEqual([])
      expect(state.projectiles).toEqual([])
      expect(state.targetIndex).toBe(0)
    })

    it('selects sentence and splits words', () => {
      const state = createAbyssalWellState(mockSentences, { rng: mockRng([0]) })
      expect(state.sentence.term).toBe('The cat sits')
      expect(state.words).toEqual(['The', 'cat', 'sits'])
    })

    it('throws if sentences are empty', () => {
      expect(() => createAbyssalWellState([], { rng: mockRng([0.5]) })).toThrow('Sentences cannot be empty')
    })

    it('defaults difficulty to medium and allows override', () => {
      expect(createAbyssalWellState(mockSentences, { rng: mockRng([0.5]) }).difficulty).toBe('medium')
      expect(createAbyssalWellState(mockSentences, { rng: mockRng([0.5]), difficulty: 'easy' }).difficulty).toBe('easy')
    })
  })

  describe('startGame', () => {
    it('spawns every word of the sentence at once', () => {
      const state = playing()
      expect(state.phase).toBe('playing')
      expect(state.enemies).toHaveLength(3)
      expect(state.enemies.map(e => e.word).sort()).toEqual(['The', 'cat', 'sits'])
    })

    it('spawns words at angles in [0, 2π) and depths in the lower half of the well', () => {
      const state = playing([0.1, 0.3, 0.9, 0.2, 0.6, 0.8])
      for (const e of state.enemies) {
        expect(e.angle).toBeGreaterThanOrEqual(0)
        expect(e.angle).toBeLessThan(Math.PI * 2)
        expect(e.depth).toBeGreaterThanOrEqual(0)
        expect(e.depth).toBeLessThanOrEqual(0.5)
        expect(e.laps).toBe(0)
      }
    })

    it('resets the game clock', () => {
      const state = playing()
      expect(state.gameTime).toBe(0)
    })
  })

  describe('setRotation + advance (smooth motion)', () => {
    it('does not rotate while rotationDir is 0', () => {
      const state = playing()
      const next = advanceAbyssalWellTime(state, 100)
      expect(next.player.angle).toBeCloseTo(state.player.angle)
    })

    it('rotates continuously while held', () => {
      const state = setRotation(playing(), 1)
      const next = advanceAbyssalWellTime(state, 500)
      const expected = state.player.angle + (ABYSSAL_WELL_CONFIG.player.rotationSpeed * 0.5)
      expect(next.player.angle).toBeCloseTo(expected % (Math.PI * 2))
    })

    it('rotates the other way with -1 and stops on 0', () => {
      let state = setRotation(playing(), -1)
      const before = state.player.angle
      state = advanceAbyssalWellTime(state, 250)
      expect(state.player.angle).toBeLessThan(before)

      state = setRotation(state, 0)
      const held = state.player.angle
      state = advanceAbyssalWellTime(state, 250)
      expect(state.player.angle).toBeCloseTo(held)
    })

    it('wraps the angle into [0, 2π)', () => {
      let state = setRotation(playing(), 1)
      for (let i = 0; i < 20; i++) state = advanceAbyssalWellTime(state, 500)
      expect(state.player.angle).toBeGreaterThanOrEqual(0)
      expect(state.player.angle).toBeLessThan(Math.PI * 2)
    })
  })

  describe('angularDistance', () => {
    it('measures the short way around the circle', () => {
      expect(angularDistance(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2)
      expect(angularDistance(0, Math.PI)).toBeCloseTo(Math.PI)
      expect(angularDistance(1, 1)).toBeCloseTo(0)
    })
  })

  describe('fireProjectile', () => {
    it('fires from the player angle and counts an attempt', () => {
      const state = { ...playing(), gameTime: 1000 }
      const next = fireProjectile(state)
      expect(next.projectiles).toHaveLength(1)
      expect(next.projectiles[0].angle).toBeCloseTo(state.player.angle)
      expect(next.totalAttempts).toBe(1)
    })

    it('respects the fire cooldown', () => {
      const state = { ...playing(), gameTime: 500 }
      const first = fireProjectile(state)
      const second = fireProjectile({ ...first, gameTime: 600 })
      expect(second.projectiles).toHaveLength(1)
      expect(second.totalAttempts).toBe(1)
    })

    it('does nothing when not playing', () => {
      const state = createAbyssalWellState(mockSentences, { rng: mockRng([0.5]) })
      expect(fireProjectile(state).projectiles).toHaveLength(0)
    })
  })

  describe('advanceAbyssalWellTime (movement + cycling)', () => {
    it('returns same state if not playing', () => {
      const state = createAbyssalWellState(mockSentences, { rng: mockRng([0.5]) })
      expect(advanceAbyssalWellTime(state, 16)).toEqual(state)
    })

    it('moves projectiles deeper (depth decreases) and culls them at the far end', () => {
      const state = { ...playing(), projectiles: [projectile({ depth: 0.5 })] }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.projectiles[0].depth).toBeLessThan(0.5)

      const deep = { ...playing(), projectiles: [projectile({ depth: 0.001 })] }
      expect(advanceAbyssalWellTime(deep, 100).projectiles).toHaveLength(0)
    })

    it('moves enemies toward the rim', () => {
      const state = { ...playing(), enemies: [enemy({ depth: 0.1 })] }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.enemies[0].depth).toBeGreaterThan(0.1)
    })

    it('wraps a breaching word to the deep end without losing a life', () => {
      const state = { ...playing(), enemies: [enemy({ depth: 0.999 })] }
      const next = advanceAbyssalWellTime(state, 1000)
      expect(next.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives)
      expect(next.enemies).toHaveLength(1)
      expect(next.enemies[0].depth).toBeLessThan(0.5)
      expect(next.enemies[0].laps).toBe(1)
    })

    it('climbs faster on each lap', () => {
      const fresh = { ...playing(), enemies: [enemy({ depth: 0.2, laps: 0 })] }
      const lapped = { ...playing(), enemies: [enemy({ depth: 0.2, laps: 2 })] }
      const freshNext = advanceAbyssalWellTime(fresh, 1000)
      const lappedNext = advanceAbyssalWellTime(lapped, 1000)
      const freshDelta = freshNext.enemies[0].depth - 0.2
      const lappedDelta = lappedNext.enemies[0].depth - 0.2
      expect(lappedDelta).toBeGreaterThan(freshDelta)
    })
  })

  describe('collisions (order comes from the student)', () => {
    it('collects the correct next word and advances the sentence', () => {
      const state = {
        ...playing(),
        enemies: [enemy({ wordIndex: 0, angle: 1, depth: 0.4 })],
        projectiles: [projectile({ angle: 1, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.enemies).toHaveLength(0)
      expect(next.targetIndex).toBe(1)
      expect(next.correctWords).toBe(1)
      expect(next.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives)
    })

    it('wrong word: costs a life, word survives, projectile consumed', () => {
      const state = {
        ...playing(),
        enemies: [enemy({ id: 'e-wrong', wordIndex: 2, angle: 1, depth: 0.4 })],
        projectiles: [projectile({ angle: 1, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives - 1)
      expect(next.enemies).toHaveLength(1)
      expect(next.projectiles).toHaveLength(0)
      expect(next.targetIndex).toBe(0)
    })

    it('misses when the angular gap is too wide', () => {
      const tolerance = ABYSSAL_WELL_CONFIG.player.angularHitTolerance
      const state = {
        ...playing(),
        enemies: [enemy({ angle: 1, depth: 0.4 })],
        projectiles: [projectile({ angle: 1 + tolerance * 2, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.enemies).toHaveLength(1)
      expect(next.projectiles).toHaveLength(1)
      expect(next.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives)
    })

    it('hits across the 0/2π seam', () => {
      const state = {
        ...playing(),
        enemies: [enemy({ wordIndex: 0, angle: Math.PI * 2 - 0.05, depth: 0.4 })],
        projectiles: [projectile({ angle: 0.05, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.enemies).toHaveLength(0)
      expect(next.correctWords).toBe(1)
    })
  })

  describe('win/lose', () => {
    it('wins when the whole sentence is collected', () => {
      const state = {
        ...playing(),
        targetIndex: 2,
        enemies: [enemy({ wordIndex: 2, word: 'sits', angle: 1, depth: 0.4 })],
        projectiles: [projectile({ angle: 1, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.phase).toBe('victory')
    })

    it('loses after the last life is spent on a wrong word', () => {
      const base = playing()
      const state = {
        ...base,
        player: { ...base.player, lives: 1 },
        enemies: [enemy({ wordIndex: 2, angle: 1, depth: 0.4 })],
        projectiles: [projectile({ angle: 1, depth: 0.45 })],
      }
      const next = advanceAbyssalWellTime(state, 16)
      expect(next.player.lives).toBe(0)
      expect(next.phase).toBe('defeat')
    })
  })

  describe('calculateXP', () => {
    it('returns 0 for no attempts', () => {
      expect(calculateXP({ correctWords: 0, totalAttempts: 0, lives: 3, initialLives: 3, gameTime: 0 })).toBe(0)
    })

    it('caps at 10 and rewards accuracy, survival, speed', () => {
      const xp = calculateXP({ correctWords: 6, totalAttempts: 6, lives: 3, initialLives: 3, gameTime: 20000 })
      expect(xp).toBe(10)
    })

    it('scales down with poor accuracy', () => {
      const perfect = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 40000 })
      const sloppy = calculateXP({ correctWords: 3, totalAttempts: 9, lives: 1, initialLives: 3, gameTime: 40000 })
      expect(sloppy).toBeLessThan(perfect)
    })
  })
})
