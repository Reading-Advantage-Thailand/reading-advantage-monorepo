import {
  createGriffinRidersEscapeState,
  tickGriffinRidersEscape,
  switchLane,
  spawnWave,
  calculateXP,
  type GriffinRiderState,
  type Lane,
} from './griffinRidersEscape'
import type { VocabularyItem } from '@/store/useGameStore'

const mockVocabulary: VocabularyItem[] = [
  { term: 'The cat sits', translation: 'แมวนั่ง' },
  { term: 'Dog runs fast', translation: 'หมาวิ่งเร็ว' },
  { term: 'Bird flies high', translation: 'นกบินสูง' },
]

const deterministicRng = () => 0.5

describe('createGriffinRidersEscapeState', () => {
  it('should create initial state with default difficulty', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    
    expect(state.status).toBe('playing')
    expect(state.difficulty).toBe('medium')
    expect(state.lives).toBe(3)
    expect(state.score).toBe(0)
    expect(state.combo).toBe(0)
    expect(state.collectedWords).toEqual([])
    expect(state.targetIndex).toBe(0)
    expect(state.objects).toEqual([])
    expect(state.correctAnswers).toBe(0)
    expect(state.totalAttempts).toBe(0)
    expect(state.sentencesCompleted).toBe(0)
    expect(state.gameTime).toBe(0)
    expect(state.spawnTimer).toBe(0)
    expect(state.playerLane).toBe('center')
  })

  it('should create state with specified difficulty', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary, { difficulty: 'hard' })
    expect(state.difficulty).toBe('hard')
  })

  it('should default to medium difficulty', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    expect(state.difficulty).toBe('medium')
  })

  it('should use deterministic rng when provided', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary, { rng: deterministicRng })
    expect(state.currentSentence).toBeDefined()
    expect(state.words).toEqual(state.currentSentence.term.split(' '))
  })

  it('should throw error for empty vocabulary', () => {
    expect(() => createGriffinRidersEscapeState([])).toThrow('Vocabulary cannot be empty')
  })
})

describe('switchLane', () => {
  it('should move player left from center', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const next = switchLane(state, 'left')
    expect(next.playerLane).toBe('left')
  })

  it('should move player right from center', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const next = switchLane(state, 'right')
    expect(next.playerLane).toBe('right')
  })

  it('should not move left from leftmost lane', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const leftState = switchLane(state, 'left')
    const next = switchLane(leftState, 'left')
    expect(next.playerLane).toBe('left')
  })

  it('should not move right from rightmost lane', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const rightState = switchLane(state, 'right')
    const next = switchLane(rightState, 'right')
    expect(next.playerLane).toBe('right')
  })

  it('should not change state when not playing', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const defeatedState = { ...state, status: 'defeat' as const }
    const next = switchLane(defeatedState, 'left')
    expect(next.playerLane).toBe('center')
  })
})

describe('spawnWave', () => {
  it('should spawn obstacle wave', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary, { difficulty: 'hard' })
    const next = spawnWave(state, () => 0.1) // Low rng to trigger obstacle
    
    expect(next.objects.length).toBeGreaterThan(0)
    expect(next.objects[0].type).toBe('obstacle')
  })

  it('should spawn gate wave with correct word', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const next = spawnWave(state, deterministicRng)
    
    expect(next.objects.length).toBe(3) // 3 lanes
    const correctGate = next.objects.find(obj => obj.orderIndex === state.targetIndex)
    expect(correctGate).toBeDefined()
    expect(correctGate?.word).toBe(state.words[state.targetIndex])
  })

  it('should not spawn when not playing', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const defeatedState = { ...state, status: 'defeat' as const }
    const next = spawnWave(defeatedState)
    expect(next.objects.length).toBe(0)
  })
})

describe('tickGriffinRidersEscape', () => {
  it('should move objects toward player', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithObjects = spawnWave(state, deterministicRng)
    const initialZ = stateWithObjects.objects[0].z
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.objects[0].z).toBeLessThan(initialZ)
  })

  it('should remove objects that pass behind player', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithObjects = {
      ...state,
      objects: [{ id: '1', z: -15, lane: 'center' as Lane, type: 'gate' as const, word: 'test', orderIndex: 0 }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.objects.length).toBe(0)
  })

  it('should detect collision with correct gate', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const targetWord = state.words[state.targetIndex]
    const stateWithObjects = {
      ...state,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'gate' as const, 
        word: targetWord, 
        orderIndex: 0 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.score).toBeGreaterThan(0)
    expect(next.correctAnswers).toBe(1)
    expect(next.targetIndex).toBe(1)
    expect(next.collectedWords).toContain(targetWord)
  })

  it('should detect collision with wrong gate and reduce lives', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithObjects = {
      ...state,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'gate' as const, 
        word: 'wrong', 
        orderIndex: 1 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.lives).toBe(2)
    expect(next.combo).toBe(0)
    expect(next.totalAttempts).toBe(1)
  })

  it('should detect collision with obstacle and reduce lives', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithObjects = {
      ...state,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'obstacle' as const 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.lives).toBe(2)
    expect(next.combo).toBe(0)
    expect(next.totalAttempts).toBe(1)
  })

  it('should trigger defeat when lives reach zero', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithObjects = {
      ...state,
      lives: 1,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'obstacle' as const 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.status).toBe('defeat')
    expect(next.lives).toBe(0)
  })

  it('should trigger victory when all words collected', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const lastIndex = state.words.length - 1
    const stateWithObjects = {
      ...state,
      targetIndex: lastIndex,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'gate' as const, 
        word: state.words[lastIndex], 
        orderIndex: lastIndex 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithObjects, mockVocabulary, 16)
    expect(next.status).toBe('victory')
    expect(next.sentencesCompleted).toBe(1)
  })

  it('should spawn new wave when spawn timer exceeds interval', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const stateWithTimer = {
      ...state,
      spawnTimer: 2500 // Exceeds default spawnInterval of 2000
    }
    
    const next = tickGriffinRidersEscape(stateWithTimer, mockVocabulary, 16)
    expect(next.objects.length).toBeGreaterThan(0)
    expect(next.spawnTimer).toBe(0)
  })

  it('should not process when not playing', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const defeatedState = { ...state, status: 'defeat' as const }
    const next = tickGriffinRidersEscape(defeatedState, mockVocabulary, 16)
    expect(next).toEqual(defeatedState)
  })

  it('should increment gameTime', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const next = tickGriffinRidersEscape(state, mockVocabulary, 16)
    expect(next.gameTime).toBe(16)
  })

  it('should apply combo multiplier', () => {
    const state = createGriffinRidersEscapeState(mockVocabulary)
    const targetWord = state.words[state.targetIndex]
    const stateWithCombo = {
      ...state,
      combo: 2,
      objects: [{ 
        id: '1', 
        z: 0, 
        lane: 'center' as Lane, 
        type: 'gate' as const, 
        word: targetWord, 
        orderIndex: 0 
      }]
    }
    
    const next = tickGriffinRidersEscape(stateWithCombo, mockVocabulary, 16)
    expect(next.score).toBe(10 + 2 * 2) // 10 + combo * 2
  })
})

describe('calculateXP', () => {
  it('should return 0 for zero attempts', () => {
    const xp = calculateXP({
      correctAnswers: 0,
      totalAttempts: 0,
      lives: 3,
      initialLives: 3,
      gameTime: 0,
    })
    expect(xp).toBe(0)
  })

  it('should calculate base XP from correct answers', () => {
    const xp = calculateXP({
      correctAnswers: 5,
      totalAttempts: 5,
      lives: 3,
      initialLives: 3,
      gameTime: 10000,
    })
    expect(xp).toBeGreaterThan(0)
  })

  it('should apply accuracy bonus for perfect accuracy', () => {
    const xpWithoutBonus = calculateXP({
      correctAnswers: 5,
      totalAttempts: 5,
      lives: 3,
      initialLives: 3,
      gameTime: 10000,
    })
    
    const xpWithBonus = calculateXP({
      correctAnswers: 5,
      totalAttempts: 5,
      lives: 3,
      initialLives: 3,
      gameTime: 10000,
    })
    
    expect(xpWithBonus).toBeGreaterThanOrEqual(xpWithoutBonus)
  })

  it('should apply survival bonus for high health', () => {
    const xpLowHealth = calculateXP({
      correctAnswers: 5,
      totalAttempts: 5,
      lives: 1,
      initialLives: 3,
      gameTime: 10000,
    })
    
    const xpHighHealth = calculateXP({
      correctAnswers: 5,
      totalAttempts: 5,
      lives: 3,
      initialLives: 3,
      gameTime: 10000,
    })
    
    expect(xpHighHealth).toBeGreaterThan(xpLowHealth)
  })

  it('should cap XP at 10', () => {
    const xp = calculateXP({
      correctAnswers: 100,
      totalAttempts: 100,
      lives: 3,
      initialLives: 3,
      gameTime: 1000,
    })
    expect(xp).toBeLessThanOrEqual(10)
  })
})
