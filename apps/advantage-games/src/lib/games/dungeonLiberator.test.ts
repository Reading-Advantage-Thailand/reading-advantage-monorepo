import {
  createDungeonLiberatorState,
  advanceDungeonLiberatorTime,
  advanceToNextLevel,
  spawnMonsterForLevel,
  calculateDungeonLiberatorXP,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_RADIUS,
  PRISONER_RADIUS,
  MONSTER_RADIUS,
  PORTAL_RADIUS,
  type SentenceItem,
} from './dungeonLiberator'

const mockVocabulary: SentenceItem[] = [
  { term: 'The cat sits on the mat', translation: 'แมวนั่งบนเสื่อ' },
  { term: 'I love to read books', translation: 'ฉันชอบอ่านหนังสือ' },
  { term: 'The sun is shining bright', translation: 'ดวงอาทิตย์ส่องแสงสว่าง' },
]

describe('dungeonLiberator', () => {
  describe('createDungeonLiberatorState', () => {
    it('should create initial state with vocabulary', () => {
      let seed = 0.1
      const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

      const state = createDungeonLiberatorState(mockVocabulary, { rng })

      expect(state.phase).toBe('playing')
      expect(state.difficulty).toBe('medium')
      expect(state.player.lives).toBe(3)
      expect(state.player.maxLives).toBe(3)
      expect(state.words.length).toBeGreaterThan(0)
      expect(state.targetIndex).toBe(0)
      expect(state.prisoners.length).toBe(state.words.length)
      expect(state.monsters.length).toBe(0)
      expect(state.trail.length).toBe(0)
      expect(state.level).toBe(1)
    })

    it('should throw error with empty vocabulary', () => {
      expect(() => createDungeonLiberatorState([])).toThrow('Vocabulary cannot be empty')
    })

    it('should use provided difficulty', () => {
      const state = createDungeonLiberatorState(mockVocabulary, { difficulty: 'hard' })
      expect(state.difficulty).toBe('hard')
    })

    it('should use seeded rng for deterministic placement', () => {
      let seed = 0.5
      const rng = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }

      const state1 = createDungeonLiberatorState(mockVocabulary, { rng })
      seed = 0.5
      const state2 = createDungeonLiberatorState(mockVocabulary, { rng })

      expect(state1.prisoners.map(p => ({ x: p.x, y: p.y }))).toEqual(
        state2.prisoners.map(p => ({ x: p.x, y: p.y }))
      )
    })

    it('should keep prisoners within world bounds', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      for (const p of state.prisoners) {
        expect(p.x).toBeGreaterThanOrEqual(PRISONER_RADIUS)
        expect(p.x).toBeLessThanOrEqual(GAME_WIDTH - PRISONER_RADIUS)
        expect(p.y).toBeGreaterThanOrEqual(PRISONER_RADIUS)
        expect(p.y).toBeLessThanOrEqual(GAME_HEIGHT - PRISONER_RADIUS)
      }
    })

    it('should place portal within world bounds', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      expect(state.portal.x).toBeGreaterThanOrEqual(PORTAL_RADIUS)
      expect(state.portal.x).toBeLessThanOrEqual(GAME_WIDTH - PORTAL_RADIUS)
      expect(state.portal.y).toBeGreaterThanOrEqual(PORTAL_RADIUS)
      expect(state.portal.y).toBeLessThanOrEqual(GAME_HEIGHT - PORTAL_RADIUS)
    })
  })

  describe('advanceDungeonLiberatorTime', () => {
    it('should move player with input', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      const startX = state.player.x
      const startY = state.player.y

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 1, dy: 0 })

      expect(next.player.x).toBeGreaterThan(startX)
      expect(next.player.y).toBe(startY)
    })

    it('should clamp player to world bounds', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.player.x = PLAYER_RADIUS + 1

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: -10, dy: 0 })

      expect(next.player.x).toBeGreaterThanOrEqual(PLAYER_RADIUS)
    })

    it('should reduce invulnerability time over time', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.player.invulnerabilityTime = 500

      const next = advanceDungeonLiberatorTime(state, 100, { dx: 0, dy: 0 })

      expect(next.player.invulnerabilityTime).toBe(400)
    })

    it('should not update if phase is not playing', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.phase = 'defeat'

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 1, dy: 0 })

      expect(next).toEqual(state)
    })

    it('should increment gameTime', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      const next = advanceDungeonLiberatorTime(state, 100, { dx: 0, dy: 0 })
      expect(next.gameTime).toBe(100)
    })

    it('should collect correct prisoner in order', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      const targetPrisoner = state.prisoners.find(p => p.orderIndex === 0)!
      state.player.x = targetPrisoner.x
      state.player.y = targetPrisoner.y

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 0, dy: 0 })

      expect(next.targetIndex).toBe(1)
      expect(next.correctWords).toBe(1)
      expect(next.trail.length).toBe(1)
      expect(next.prisoners.find(p => p.orderIndex === 0)!.collected).toBe(true)
    })

    it('should trigger fleeing for wrong prisoner order', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      const wrongPrisoner = state.prisoners.find(p => p.orderIndex === 1)!
      state.player.x = wrongPrisoner.x
      state.player.y = wrongPrisoner.y

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 0, dy: 0 })

      expect(next.targetIndex).toBe(0)
      expect(next.trail.length).toBe(0)
      expect(next.prisoners.find(p => p.orderIndex === 1)!.fleeing).toBe(true)
    })

    it('should defeat player when lives reach zero', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.player.lives = 1
      const monster = spawnMonsterForLevel(1)
      monster.x = state.player.x
      monster.y = state.player.y
      state.monsters = [monster]

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 0, dy: 0 })

      expect(next.phase).toBe('defeat')
    })

    it('should trigger victory when all words collected and portal reached', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      // Collect all prisoners
      for (let i = 0; i < state.words.length; i++) {
        const p = state.prisoners.find(pr => pr.orderIndex === i)!
        state.trail.push({
          id: `trail-${p.id}`,
          x: p.x,
          y: p.y,
          word: p.word,
          translation: p.translation,
          orderIndex: p.orderIndex,
        })
        state.targetIndex = i + 1
        state.correctWords = i + 1
      }
      // Move player to portal
      state.player.x = state.portal.x
      state.player.y = state.portal.y

      const next = advanceDungeonLiberatorTime(state, 16.67, { dx: 0, dy: 0 })

      expect(next.phase).toBe('victory')
    })
  })

  describe('advanceToNextLevel', () => {
    it('should increment level and reset state', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.level = 1

      const next = advanceToNextLevel(state, mockVocabulary)

      expect(next.level).toBe(2)
      expect(next.phase).toBe('playing')
      expect(next.trail.length).toBe(0)
      expect(next.targetIndex).toBe(0)
      expect(next.correctWords).toBe(0)
      expect(next.monsters.length).toBeGreaterThanOrEqual(state.monsters.length)
    })

    it('should preserve difficulty', () => {
      const state = createDungeonLiberatorState(mockVocabulary, { difficulty: 'hard' })
      const next = advanceToNextLevel(state, mockVocabulary)
      expect(next.difficulty).toBe('hard')
    })

    it('should return same state with empty vocabulary', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      const next = advanceToNextLevel(state, [])
      expect(next).toEqual(state)
    })
  })

  describe('spawnMonsterForLevel', () => {
    it('should spawn monster within world bounds', () => {
      const monster = spawnMonsterForLevel(1)
      expect(monster.x).toBeGreaterThanOrEqual(MONSTER_RADIUS)
      expect(monster.x).toBeLessThanOrEqual(GAME_WIDTH - MONSTER_RADIUS)
      expect(monster.y).toBeGreaterThanOrEqual(MONSTER_RADIUS)
      expect(monster.y).toBeLessThanOrEqual(GAME_HEIGHT - MONSTER_RADIUS)
    })

    it('should spawn monster with valid velocity', () => {
      const monster = spawnMonsterForLevel(1)
      const speed = Math.sqrt(monster.velocityX ** 2 + monster.velocityY ** 2)
      expect(speed).toBeCloseTo(1, 5)
    })
  })

  describe('calculateDungeonLiberatorXP', () => {
    it('should return 0 when no attempts', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 0
      state.totalAttempts = 0
      expect(calculateDungeonLiberatorXP(state)).toBe(0)
    })

    it('should calculate base XP correctly', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 3
      state.totalAttempts = 5
      state.gameTime = 130000
      state.level = 1
      state.player.lives = 1
      expect(calculateDungeonLiberatorXP(state)).toBe(3)
    })

    it('should cap base XP at 5', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 10
      state.totalAttempts = 15
      state.gameTime = 130000
      state.level = 1
      state.player.lives = 1
      expect(calculateDungeonLiberatorXP(state)).toBe(5)
    })

    it('should add perfect accuracy bonus', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 3
      state.totalAttempts = 3
      state.gameTime = 130000
      state.level = 1
      state.player.lives = 1
      expect(calculateDungeonLiberatorXP(state)).toBe(3 + 2)
    })

    it('should add survival bonus', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 3
      state.totalAttempts = 5
      state.gameTime = 130000
      state.level = 1
      state.player.lives = 2
      state.player.maxLives = 3
      expect(calculateDungeonLiberatorXP(state)).toBe(3 + 1)
    })

    it('should add speed bonus', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 3
      state.totalAttempts = 5
      state.gameTime = 60000
      state.level = 1
      state.player.lives = 1
      expect(calculateDungeonLiberatorXP(state)).toBe(3 + 1)
    })

    it('should add progression bonus', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 3
      state.totalAttempts = 5
      state.gameTime = 130000
      state.level = 3
      state.player.lives = 1
      expect(calculateDungeonLiberatorXP(state)).toBe(3 + 1)
    })

    it('should cap total XP at 10', () => {
      const state = createDungeonLiberatorState(mockVocabulary)
      state.correctWords = 5
      state.totalAttempts = 5
      state.gameTime = 60000
      state.level = 3
      state.player.lives = 3
      state.player.maxLives = 3
      expect(calculateDungeonLiberatorXP(state)).toBe(10)
    })
  })
})
