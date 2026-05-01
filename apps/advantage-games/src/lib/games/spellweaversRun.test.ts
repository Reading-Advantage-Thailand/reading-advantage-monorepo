import {
  createSpellweaversRunState,
  tickSpellweaversRun,
  collectOrb,
  spawnOrb,
  calculateSpellweaversRunXP,
  type WordOrb,
  type Lane,
} from './spellweaversRun'
import type { SentenceItem } from './spellweaversRun'
import { SPELLWEAVERS_RUN_CONFIG, GAME_HEIGHT } from './spellweaversRunConfig'

describe('spellweaversRun', () => {
  const vocabulary: SentenceItem[] = [
    { term: 'The cat sits', translation: 'Le chat est assis' },
    { term: 'I love you', translation: 'Je t\'aime' },
  ]

  describe('createSpellweaversRunState', () => {
    it('should initialize with playing status', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.status).toBe('playing')
    })

    it('should initialize with full mana', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.mana).toBe(100)
    })

    it('should initialize with zero score', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.score).toBe(0)
    })

    it('should initialize with zero combo', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.combo).toBe(0)
    })

    it('should initialize with empty collected words', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.collectedWords).toEqual([])
    })

    it('should initialize with target index 0', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.targetIndex).toBe(0)
    })

    it('should initialize with empty orbs array', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.orbs).toEqual([])
    })

    it('should set current sentence from vocabulary', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.currentSentence).toBeDefined()
      expect(state.currentSentence.term).toBeDefined()
      expect(state.currentSentence.translation).toBeDefined()
    })

    it('should set words array from sentence term', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.words).toBeDefined()
      expect(state.words.length).toBeGreaterThan(0)
    })

    it('should set correct answers and total attempts to zero', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.correctAnswers).toBe(0)
      expect(state.totalAttempts).toBe(0)
    })

    it('should set sentences completed to zero', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.sentencesCompleted).toBe(0)
    })

    it('should throw error if vocabulary is empty', () => {
      expect(() => createSpellweaversRunState([])).toThrow('Vocabulary cannot be empty')
    })

    it('should accept difficulty parameter', () => {
      const state = createSpellweaversRunState(vocabulary, { difficulty: 'hard' })
      expect(state.difficulty).toBe('hard')
    })

    it('should default to normal difficulty', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(state.difficulty).toBe('normal')
    })
  })

  describe('WordOrb type', () => {
    it('should have correct structure', () => {
      const orb: WordOrb = {
        id: 'orb-1',
        word: 'The',
        orderIndex: 0,
        lane: 'left',
        y: 0,
        collected: false,
      }
      expect(orb.id).toBe('orb-1')
      expect(orb.word).toBe('The')
      expect(orb.orderIndex).toBe(0)
      expect(orb.lane).toBe('left')
      expect(orb.y).toBe(0)
      expect(orb.collected).toBe(false)
    })
  })

  describe('Lane type', () => {
    it('should be left, center, or right', () => {
      const lanes: Lane[] = ['left', 'center', 'right']
      expect(lanes).toHaveLength(3)
    })
  })

  describe('tickSpellweaversRun', () => {
    it('should increment gameTime', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = tickSpellweaversRun(state, vocabulary, 100)
      expect(newState.gameTime).toBe(100)
    })

    it('should not update state when not playing', () => {
      const state = { ...createSpellweaversRunState(vocabulary), status: 'victory' as const }
      const newState = tickSpellweaversRun(state, vocabulary, 100)
      expect(newState.gameTime).toBe(0)
    })

    it('should move orbs down by scroll speed * delta', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: 'The',
        orderIndex: 0,
        lane: 'left',
        y: 100,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const deltaMs = 1000
      const newState = tickSpellweaversRun(stateWithOrb, vocabulary, deltaMs)
      const expectedY = 100 + (SPELLWEAVERS_RUN_CONFIG.scrollSpeed.normal * deltaMs / 1000)
      expect(newState.orbs[0].y).toBe(expectedY)
    })

    it('should remove orbs that passed the collection zone', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: 'The',
        orderIndex: 0,
        lane: 'left',
        y: GAME_HEIGHT + 100,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = tickSpellweaversRun(stateWithOrb, vocabulary, 100)
      expect(newState.orbs).toHaveLength(0)
    })

    it('should auto-spawn orbs when spawn timer exceeds interval', () => {
      const state = createSpellweaversRunState(vocabulary)
      const spawnInterval = SPELLWEAVERS_RUN_CONFIG.spawnInterval.normal
      const stateWithTimer = { ...state, spawnTimer: spawnInterval }
      const newState = tickSpellweaversRun(stateWithTimer, vocabulary, 100)
      expect(newState.orbs.length).toBeGreaterThan(0)
    })

    it('should reset spawn timer after spawning', () => {
      const state = createSpellweaversRunState(vocabulary)
      const spawnInterval = SPELLWEAVERS_RUN_CONFIG.spawnInterval.normal
      const stateWithTimer = { ...state, spawnTimer: spawnInterval }
      const newState = tickSpellweaversRun(stateWithTimer, vocabulary, 100)
      expect(newState.spawnTimer).toBeLessThan(spawnInterval)
    })

    it('should set defeat when mana reaches zero in tick', () => {
      const state = createSpellweaversRunState(vocabulary)
      const zeroManaState = { ...state, mana: 0 }
      const newState = tickSpellweaversRun(zeroManaState, vocabulary, 100)
      expect(newState.status).toBe('defeat')
    })

    it('should not spawn more orbs than words in sentence', () => {
      const state = createSpellweaversRunState(vocabulary)
      const allOrbsState = { ...state, orbs: state.words.map((w, i) => ({
        id: `orb-${i}`,
        word: w,
        orderIndex: i,
        lane: 'left' as Lane,
        y: 100,
        collected: false,
      }))}
      const spawnInterval = SPELLWEAVERS_RUN_CONFIG.spawnInterval.normal
      const readyToSpawn = { ...allOrbsState, spawnTimer: spawnInterval + 100 }
      const newState = tickSpellweaversRun(readyToSpawn, vocabulary, 100)
      expect(newState.orbs.length).toBe(state.words.length)
    })
  })

  describe('spawnOrb', () => {
    it('should create an orb with a word from the sentence', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0)
      expect(newState.orbs).toHaveLength(1)
      expect(state.words).toContain(newState.orbs[0].word)
    })

    it('should assign orb to specified lane', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0, 'right')
      expect(newState.orbs[0].lane).toBe('right')
    })

    it('should assign orb to random lane if not specified', () => {
      const state = createSpellweaversRunState(vocabulary, { rng: () => 0.5 })
      const newState = spawnOrb(state, 0)
      expect(['left', 'center', 'right']).toContain(newState.orbs[0].lane)
    })

    it('should assign orb to right lane when rng returns high value', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0, undefined, () => 0.9)
      expect(newState.orbs[0].lane).toBe('right')
    })

    it('should assign orb to center lane when rng returns medium value', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0, undefined, () => 0.5)
      expect(newState.orbs[0].lane).toBe('center')
    })

    it('should assign orb to left lane when rng returns low value', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0, undefined, () => 0.1)
      expect(newState.orbs[0].lane).toBe('left')
    })

    it('should set initial y position above the scroll area', () => {
      const state = createSpellweaversRunState(vocabulary)
      const newState = spawnOrb(state, 0)
      expect(newState.orbs[0].y).toBeLessThan(SPELLWEAVERS_RUN_CONFIG.scrollHeight)
    })
  })

  describe('collectOrb', () => {
    it('should collect correct word (first in sequence)', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[0],
        orderIndex: 0,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.collectedWords).toContain(state.words[0])
      expect(newState.targetIndex).toBe(1)
      expect(newState.correctAnswers).toBe(1)
      expect(newState.totalAttempts).toBe(1)
    })

    it('should penalize wrong word collection', () => {
      const state = createSpellweaversRunState(vocabulary)
      const wrongWord = state.words[1]
      const orb: WordOrb = {
        id: 'orb-1',
        word: wrongWord,
        orderIndex: 1,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.mana).toBe(SPELLWEAVERS_RUN_CONFIG.initialMana - SPELLWEAVERS_RUN_CONFIG.wrongWordPenalty)
      expect(newState.combo).toBe(0)
      expect(newState.targetIndex).toBe(0)
    })

    it('should not collect orb outside collection zone', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[0],
        orderIndex: 0,
        lane: 'left',
        y: 100,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.collectedWords).toHaveLength(0)
    })

    it('should not collect orb from wrong lane', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[0],
        orderIndex: 0,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'right')
      expect(newState.collectedWords).toHaveLength(0)
    })

    it('should increase combo on correct collection', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[0],
        orderIndex: 0,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.combo).toBe(1)
    })

    it('should increment score on correct collection', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[0],
        orderIndex: 0,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...state, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.score).toBeGreaterThan(0)
    })
  })

  describe('win/lose conditions', () => {
    it('should set defeat when mana reaches zero', () => {
      const state = createSpellweaversRunState(vocabulary)
      const orb: WordOrb = {
        id: 'orb-1',
        word: 'wrongword',
        orderIndex: 99,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const lowManaState = { ...state, mana: 10, orbs: [orb] }
      const newState = collectOrb(lowManaState, 'left')
      expect(newState.status).toBe('defeat')
    })

    it('should set victory when all words collected', () => {
      const state = createSpellweaversRunState(vocabulary)
      const lastWordIndex = state.words.length - 1
      const almostCompleteState = {
        ...state,
        targetIndex: lastWordIndex,
        collectedWords: state.words.slice(0, lastWordIndex),
      }
      const orb: WordOrb = {
        id: 'orb-1',
        word: state.words[lastWordIndex],
        orderIndex: lastWordIndex,
        lane: 'left',
        y: GAME_HEIGHT - SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight / 2,
        collected: false,
      }
      const stateWithOrb = { ...almostCompleteState, orbs: [orb] }
      const newState = collectOrb(stateWithOrb, 'left')
      expect(newState.status).toBe('victory')
    })
  })

  describe('calculateSpellweaversRunXP', () => {
    it('should return 0 when no attempts', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(calculateSpellweaversRunXP(state, 0, 0)).toBe(0)
    })

    it('should calculate base XP from correct answers', () => {
      const state = createSpellweaversRunState(vocabulary)
      expect(calculateSpellweaversRunXP(state, 3, 3)).toBeGreaterThanOrEqual(3)
    })

    it('should cap at 10 XP', () => {
      const state = createSpellweaversRunState(vocabulary)
      state.gameTime = 50000
      state.sentencesCompleted = 1
      expect(calculateSpellweaversRunXP(state, 10, 10)).toBeLessThanOrEqual(10)
    })

    it('should add perfect accuracy bonus', () => {
      const state = createSpellweaversRunState(vocabulary)
      state.gameTime = 50000
      const perfectXP = calculateSpellweaversRunXP(state, 3, 3)
      const imperfectXP = calculateSpellweaversRunXP(state, 3, 4)
      expect(perfectXP).toBeGreaterThan(imperfectXP)
    })

    it('should add survival bonus for high mana', () => {
      const state = createSpellweaversRunState(vocabulary)
      state.gameTime = 50000
      const highManaXP = calculateSpellweaversRunXP(state, 2, 2)
      const lowManaState = { ...state, mana: 10 }
      const lowManaXP = calculateSpellweaversRunXP(lowManaState, 2, 2)
      expect(highManaXP).toBeGreaterThanOrEqual(lowManaXP)
    })
  })
})
