import {
  createAbyssalWellState,
  advanceAbyssalWellTime,
  fireProjectile,
  rotatePlayer,
  getLanePosition,
  spawnEnemy,
  startGame,
  calculateXP,
  type Enemy,
  type Projectile,
} from '../abyssalWell'
import { ABYSSAL_WELL_CONFIG } from '../abyssalWellConfig'

const mockVocabulary = [
  { term: 'The cat sits', translation: 'Le chat est assis' },
  { term: 'A dog runs', translation: 'Un chien court' },
]

const mockRng = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('abyssalWell', () => {
  describe('createAbyssalWellState', () => {
    it('should create initial game state', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      
      expect(state.phase).toBe('start')
      expect(state.player).toBeDefined()
      expect(state.player.lane).toBe(0)
      expect(state.player.lives).toBe(ABYSSAL_WELL_CONFIG.lives)
      expect(state.enemies).toEqual([])
      expect(state.projectiles).toEqual([])
    })

    it('should set sentence and words from vocabulary', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0]) })
      
      expect(state.sentence.term).toBe('The cat sits')
      expect(state.words).toEqual(['The', 'cat', 'sits'])
    })

    it('should set targetIndex to 0', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      
      expect(state.targetIndex).toBe(0)
    })

    it('should throw if vocabulary is empty', () => {
      expect(() => createAbyssalWellState([], { rng: mockRng([0.5]) })).toThrow('Vocabulary cannot be empty')
    })

    it('should default difficulty to medium', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      expect(state.difficulty).toBe('medium')
    })

    it('should allow setting difficulty to easy', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]), difficulty: 'easy' })
      expect(state.difficulty).toBe('easy')
    })
  })

  describe('getLanePosition', () => {
    it('should return position with x at center for lane 0 depth 0', () => {
      const pos = getLanePosition(0, 0)
      expect(pos.x).toBeCloseTo(ABYSSAL_WELL_CONFIG.gameWidth / 2)
    })

    it('should return different x positions for different lanes at same depth', () => {
      const pos0 = getLanePosition(0, 0.5)
      const pos1 = getLanePosition(1, 0.5)
      
      expect(pos0.x).not.toBe(pos1.x)
    })

    it('should wrap around for lane 8 (same as lane 0)', () => {
      const pos0 = getLanePosition(0, 0)
      const pos8 = getLanePosition(8, 0)
      
      expect(pos0.x).toBeCloseTo(pos8.x)
      expect(pos0.y).toBeCloseTo(pos8.y)
    })
  })

  describe('rotatePlayer', () => {
    it('should rotate player clockwise', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const newState = rotatePlayer(state, 1)
      
      expect(newState.player.lane).toBe(1)
    })

    it('should rotate player counter-clockwise', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const newState = rotatePlayer(state, -1)
      
      expect(newState.player.lane).toBe(7) // wraps around
    })

    it('should wrap around when rotating past last lane', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const rotated = rotatePlayer(state, 8)
      
      expect(rotated.player.lane).toBe(0)
    })
  })

  describe('fireProjectile', () => {
    it('should add projectile to state', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { ...state, phase: 'playing' as const, gameTime: 1000 }
      const newState = fireProjectile(playingState)
      
      expect(newState.projectiles.length).toBe(1)
    })

    it('should not fire if cooldown not elapsed', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        gameTime: 500,
        player: { ...state.player, lastFireTime: 0 }
      }
      const afterFire = fireProjectile(playingState)
      
      expect(afterFire.projectiles.length).toBe(1)
      expect(afterFire.player.lastFireTime).toBe(500)
      
      const secondFire = fireProjectile({ ...afterFire, gameTime: 600 })
      expect(secondFire.projectiles.length).toBe(1)
    })
  })

  describe('advanceAbyssalWellTime', () => {
    it('should return same state if not playing', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const newState = advanceAbyssalWellTime(state, 16)
      
      expect(newState).toEqual(state)
    })

    it('should update game time when playing', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { ...state, phase: 'playing' as const }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.gameTime).toBe(16)
    })

    it('should move projectiles toward center', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        projectiles: [{
          id: 'proj-1',
          lane: 0,
          depth: 0.5,
        }]
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.projectiles[0].depth).toBeLessThan(0.5)
    })

    it('should move enemies toward rim (increase depth)', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.1,
        word: 'The',
        wordIndex: 0,
        type: 'goblin-scout',
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy]
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.enemies[0].depth).toBeGreaterThan(0.1)
    })

    it('should detect projectile-enemy collision in same lane', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.3,
        word: 'The',
        wordIndex: 0,
        type: 'goblin-scout',
      }
      const projectile: Projectile = {
        id: 'proj-1',
        lane: 0,
        depth: 0.35,
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy],
        projectiles: [projectile]
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.enemies.length).toBe(0)
      expect(newState.projectiles.length).toBe(0)
    })

    it('should increment correctWords and targetIndex when hitting correct enemy', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.3,
        word: 'The',
        wordIndex: 0,
        type: 'goblin-scout',
      }
      const projectile: Projectile = {
        id: 'proj-1',
        lane: 0,
        depth: 0.35,
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy],
        projectiles: [projectile]
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.correctWords).toBe(1)
      expect(newState.targetIndex).toBe(1)
    })

    it('should remove enemy but not progress when hitting wrong enemy', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.3,
        word: 'cat',
        wordIndex: 1,
        type: 'goblin-scout',
      }
      const projectile: Projectile = {
        id: 'proj-1',
        lane: 0,
        depth: 0.35,
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy],
        projectiles: [projectile],
        totalAttempts: 0
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.enemies.length).toBe(0)
      expect(newState.correctWords).toBe(0)
      expect(newState.targetIndex).toBe(0)
      expect(newState.totalAttempts).toBe(1)
    })

    it('should lose life when enemy reaches rim', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.99,
        word: 'The',
        wordIndex: 0,
        type: 'goblin-scout',
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy]
      }
      const newState = advanceAbyssalWellTime(playingState, 100)
      
      expect(newState.player.lives).toBe(2)
      expect(newState.enemies.length).toBe(0)
    })

    it('should set phase to defeat when lives reach 0', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const enemy: Enemy = {
        id: 'enemy-1',
        lane: 0,
        depth: 0.99,
        word: 'The',
        wordIndex: 0,
        type: 'goblin-scout',
      }
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: [enemy],
        player: { ...state.player, lives: 1 }
      }
      const newState = advanceAbyssalWellTime(playingState, 100)
      
      expect(newState.phase).toBe('defeat')
    })

    it('should set phase to victory when all words collected', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        targetIndex: 3, // All words collected
        words: ['The', 'cat', 'sits']
      }
      const newState = advanceAbyssalWellTime(playingState, 16)
      
      expect(newState.phase).toBe('victory')
    })
  })

  describe('spawnEnemy', () => {
    it('should spawn an enemy when playing', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { ...state, phase: 'playing' as const }
      const newState = spawnEnemy(playingState, mockRng([0.3, 0.2]))
      
      expect(newState.enemies.length).toBe(1)
      expect(newState.enemies[0].word).toBeDefined()
    })

    it('should not spawn if all words already have enemies', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const playingState = { 
        ...state, 
        phase: 'playing' as const,
        enemies: state.words.map((word, i) => ({
          id: `enemy-${i}`,
          lane: i,
          depth: 0.5,
          word,
          wordIndex: i,
          type: 'cave-spider' as const,
        }))
      }
      const newState = spawnEnemy(playingState, mockRng([0.5]))
      
      expect(newState.enemies.length).toBe(playingState.enemies.length)
    })

    it('should not spawn if not playing', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const newState = spawnEnemy(state, mockRng([0.5]))
      
      expect(newState.enemies.length).toBe(0)
    })
  })

  describe('startGame', () => {
    it('should set phase to playing', () => {
      const state = createAbyssalWellState(mockVocabulary, { rng: mockRng([0.5]) })
      const newState = startGame(state)
      
      expect(newState.phase).toBe('playing')
      expect(newState.gameTime).toBe(0)
    })
  })

  describe('calculateXP', () => {
    it('should return 0 if no attempts', () => {
      const xp = calculateXP({ correctWords: 0, totalAttempts: 0, lives: 3, initialLives: 3, gameTime: 1000 })
      expect(xp).toBe(0)
    })

    it('should calculate base XP from correct words', () => {
      const xp = calculateXP({ correctWords: 5, totalAttempts: 5, lives: 3, initialLives: 3, gameTime: 1000 })
      expect(xp).toBeGreaterThanOrEqual(5)
    })

    it('should cap XP at 10', () => {
      const xp = calculateXP({ correctWords: 15, totalAttempts: 15, lives: 3, initialLives: 3, gameTime: 1000 })
      expect(xp).toBe(10)
    })

    it('should add perfect accuracy bonus', () => {
      const xpPerfect = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 1000 })
      const xpImperfect = calculateXP({ correctWords: 3, totalAttempts: 5, lives: 3, initialLives: 3, gameTime: 1000 })
      expect(xpPerfect).toBeGreaterThan(xpImperfect)
    })

    it('should add survival bonus for lives >= 50%', () => {
      const xpHighHealth = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 2, initialLives: 3, gameTime: 1000 })
      const xpLowHealth = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 1, initialLives: 3, gameTime: 1000 })
      expect(xpHighHealth).toBeGreaterThan(xpLowHealth)
    })

    it('should add speed bonus for games under 30s', () => {
      const xpFast = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 15000 })
      const xpSlow = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 45000 })
      expect(xpFast).toBeGreaterThan(xpSlow)
    })
  })
})
