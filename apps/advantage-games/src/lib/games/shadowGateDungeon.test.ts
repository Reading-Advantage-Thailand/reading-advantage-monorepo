import {
  createShadowGateDungeonState,
  tickShadowGateDungeon,
  setPlayerVelocity,
  calculateXP,
  type ShadowGateDungeonState,
} from './shadowGateDungeon'
import { SHADOW_GATE_DUNGEON_CONFIG } from './shadowGateDungeonConfig'

describe('shadowGateDungeon', () => {
  const mockVocab = [
    { term: 'The cat sits', translation: 'แมวนั่ง' },
    { term: 'I love books', translation: 'ฉันชอบหนังสือ' },
  ]

  const mockRng = () => 0.5

  describe('createShadowGateDungeonState', () => {
    it('creates initial state with correct defaults', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      expect(state.status).toBe('playing')
      expect(state.difficulty).toBe('normal')
      expect(state.creatureType).toBe('orc-hunter')
      expect(state.player.health).toBe(SHADOW_GATE_DUNGEON_CONFIG.initialHealth)
      expect(state.player.invincible).toBe(false)
      expect(state.crystals.length).toBeGreaterThan(0)
      expect(state.collectedWords).toEqual([])
      expect(state.targetIndex).toBe(0)
      expect(state.correctAnswers).toBe(0)
      expect(state.wrongAnswers).toBe(0)
      expect(state.gameTime).toBe(0)
    })

    it('throws on empty vocabulary', () => {
      expect(() => createShadowGateDungeonState([])).toThrow('Vocabulary cannot be empty')
    })

    it('applies difficulty config', () => {
      const state = createShadowGateDungeonState(mockVocab, { difficulty: 'easy', rng: mockRng })
      expect(state.difficulty).toBe('easy')
    })

    it('applies creature type config', () => {
      const state = createShadowGateDungeonState(mockVocab, { creatureType: 'shadow-dragon', rng: mockRng })
      expect(state.creatureType).toBe('shadow-dragon')
    })

    it('spawns crystals for each word', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const wordCount = state.words.length
      expect(state.crystals.length).toBe(wordCount)
      expect(state.crystals.every(c => !c.collected)).toBe(true)
    })
  })

  describe('tickShadowGateDungeon', () => {
    it('returns same state if not playing', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const endedState = { ...state, status: 'victory' as const }
      expect(tickShadowGateDungeon(endedState, 16)).toBe(endedState)
    })

    it('updates game time', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const newState = tickShadowGateDungeon(state, 16)
      expect(newState.gameTime).toBe(16)
    })

    it('moves player with velocity', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const movingState = setPlayerVelocity(state, { x: 1, y: 0 })
      const newState = tickShadowGateDungeon(movingState, 1000)
      expect(newState.player.position.x).toBeGreaterThan(state.player.position.x)
    })

    it('clamps player position to bounds', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const movingState = setPlayerVelocity(state, { x: 100, y: 100 })
      const newState = tickShadowGateDungeon(movingState, 10000)
      expect(newState.player.position.x).toBeLessThanOrEqual(390 - SHADOW_GATE_DUNGEON_CONFIG.playerRadius)
      expect(newState.player.position.y).toBeLessThanOrEqual(700 - SHADOW_GATE_DUNGEON_CONFIG.playerRadius)
    })

    it('transitions to chase when player in sight', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      // Place creature very close to player
      const closeState = {
        ...state,
        creature: {
          ...state.creature,
          position: { x: state.player.position.x + 10, y: state.player.position.y },
        },
      }
      const newState = tickShadowGateDungeon(closeState, 16)
      expect(newState.creature.mode).toBe('chase')
    })

    it('damages player on creature collision', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      // Place creature 1px away so distToPlayer > 0 (enters chase mode toward player)
      const collisionState = {
        ...state,
        creature: {
          ...state.creature,
          position: { x: state.player.position.x + 1, y: state.player.position.y },
        },
      }
      const newState = tickShadowGateDungeon(collisionState, 16)
      expect(newState.player.health).toBeLessThan(state.player.health)
      expect(newState.player.invincible).toBe(true)
    })

    it('collects correct crystal and advances target', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const targetCrystal = state.crystals[state.targetIndex]
      const collectState = {
        ...state,
        player: {
          ...state.player,
          position: { x: targetCrystal.position.x, y: targetCrystal.position.y },
        },
      }
      const newState = tickShadowGateDungeon(collectState, 16)
      expect(newState.collectedWords).toContain(targetCrystal.word)
      expect(newState.targetIndex).toBe(1)
      expect(newState.correctAnswers).toBe(1)
    })

    it('damages player on wrong crystal', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const targetWord = state.words[0]

      // Create isolated test state with one wrong crystal at player position
      const testState: ShadowGateDungeonState = {
        ...state,
        crystals: [
          {
            id: 'wrong-crystal',
            word: 'wrong-word',
            orderIndex: 1,
            position: { x: state.player.position.x, y: state.player.position.y },
            collected: false,
          },
        ],
        words: [targetWord, 'wrong-word'],
        targetIndex: 0,
      }

      const newState = tickShadowGateDungeon(testState, 16)
      expect(newState.player.health).toBeLessThan(testState.player.health)
      expect(newState.wrongAnswers).toBe(1)
    })

    it('unlocks gate when all words collected', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const allCollected = {
        ...state,
        targetIndex: state.words.length,
        collectedWords: state.words,
      }
      const newState = tickShadowGateDungeon(allCollected, 16)
      expect(newState.gate.unlocked).toBe(true)
    })

    it('triggers victory when player reaches unlocked gate', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const gateCenterX = state.gate.position.x + state.gate.width / 2
      const gateCenterY = state.gate.position.y + state.gate.height / 2
      const atGateState = {
        ...state,
        targetIndex: state.words.length,
        collectedWords: state.words,
        gate: { ...state.gate, unlocked: true },
        player: {
          ...state.player,
          position: { x: gateCenterX, y: gateCenterY },
        },
      }
      const newState = tickShadowGateDungeon(atGateState, 16)
      expect(newState.status).toBe('victory')
    })

    it('triggers defeat when health reaches zero', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const dyingState = {
        ...state,
        player: {
          ...state.player,
          health: SHADOW_GATE_DUNGEON_CONFIG.creatureCollisionDamage,
          invincible: false,
          invincibilityTimer: 0,
        },
        creature: {
          ...state.creature,
          // Slight offset so distToPlayer > 0 (creature enters chase mode)
          position: { x: state.player.position.x + 1, y: state.player.position.y },
        },
      }
      const newState = tickShadowGateDungeon(dyingState, 16)
      expect(newState.status).toBe('defeat')
    })

    it('applies invincibility timer', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const invincibleState = {
        ...state,
        player: {
          ...state.player,
          invincible: true,
          invincibilityTimer: 500,
        },
      }
      const newState = tickShadowGateDungeon(invincibleState, 100)
      expect(newState.player.invincibilityTimer).toBe(400)
    })
  })

  describe('calculateXP', () => {
    it('returns base XP for correct answers', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const completeState = {
        ...state,
        correctAnswers: 5,
        wrongAnswers: 0,
        gameTime: 10000,
        player: { ...state.player, health: 100 },
      }
      expect(calculateXP(completeState)).toBeGreaterThanOrEqual(5)
    })

    it('caps XP at maxXP', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const perfectState = {
        ...state,
        correctAnswers: 20,
        wrongAnswers: 0,
        gameTime: 1000,
        player: { ...state.player, health: 100 },
      }
      expect(calculateXP(perfectState)).toBeLessThanOrEqual(SHADOW_GATE_DUNGEON_CONFIG.maxXP)
    })

    it('gives accuracy bonus for no wrong answers', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const perfectState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 0,
        gameTime: 60000,
        player: { ...state.player, health: 100 },
      }
      const imperfectState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 1,
        gameTime: 60000,
        player: { ...state.player, health: 100 },
      }
      expect(calculateXP(perfectState)).toBeGreaterThan(calculateXP(imperfectState))
    })

    it('gives speed bonus for fast completion', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const fastState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 0,
        gameTime: 10000,
        player: { ...state.player, health: 100 },
      }
      const slowState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 0,
        gameTime: 60000,
        player: { ...state.player, health: 100 },
      }
      expect(calculateXP(fastState)).toBeGreaterThan(calculateXP(slowState))
    })

    it('gives survival bonus for high health', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const healthyState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 0,
        gameTime: 60000,
        player: { ...state.player, health: 100 },
      }
      const injuredState = {
        ...state,
        correctAnswers: 3,
        wrongAnswers: 0,
        gameTime: 60000,
        player: { ...state.player, health: 10 },
      }
      expect(calculateXP(healthyState)).toBeGreaterThan(calculateXP(injuredState))
    })
  })

  describe('setPlayerVelocity', () => {
    it('sets player velocity', () => {
      const state = createShadowGateDungeonState(mockVocab, { rng: mockRng })
      const newState = setPlayerVelocity(state, { x: 1, y: -1 })
      expect(newState.player.velocity).toEqual({ x: 1, y: -1 })
    })
  })
})
