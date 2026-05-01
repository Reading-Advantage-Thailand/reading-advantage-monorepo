import {
  createVillageGuardianState,
  tickVillageGuardian,
  calculateXP,
  type VillageGuardianState,
} from '../villageGuardian'
import {
  VILLAGE_GUARDIAN_CONFIG,
  getDifficultyConfig,
  getTimerDuration,
  getMonsterSpeed,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../villageGuardianConfig'

const mockVocabulary = [
  { term: 'The cat sits', translation: 'Le chat est assis' },
  { term: 'A dog runs', translation: 'Un chien court' },
  { term: 'The bird flies', translation: "L'oiseau vole" },
]

describe('villageGuardianConfig', () => {
  it('exports correct game dimensions', () => {
    expect(GAME_WIDTH).toBe(390)
    expect(GAME_HEIGHT).toBe(700)
  })

  it('returns correct difficulty config', () => {
    const easyConfig = getDifficultyConfig('easy')
    expect(easyConfig.name).toBe('Scout Party')
    expect(easyConfig.wordCount).toBe(4)

    const normalConfig = getDifficultyConfig('normal')
    expect(normalConfig.name).toBe('War Band')
    expect(normalConfig.wordCount).toBe(6)
  })
  it('returns correct timer duration', () => {
    expect(getTimerDuration('easy')).toBe(30000)
    expect(getTimerDuration('normal')).toBe(25000)
    expect(getTimerDuration('hard')).toBe(20000)
  })
  it('returns correct monster speed', () => {
    expect(getMonsterSpeed('bandits')).toBe(1.5)
    expect(getMonsterSpeed('goblins')).toBe(2.5)
    expect(getMonsterSpeed('dragons')).toBe(3.5)
  })
})

describe('createVillageGuardianState', () => {
  it('throws error when vocabulary is empty', () => {
    expect(() => createVillageGuardianState([])).toThrow('Vocabulary cannot be empty')
  })

  it('creates state with default difficulty and opponent', () => {
    const state = createVillageGuardianState(mockVocabulary)
    expect(state.status).toBe('playing')
    expect(state.difficulty).toBe('normal')
    expect(state.opponentType).toBe('bandits')
  })
  it('creates state with custom difficulty', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'hard' })
    expect(state.difficulty).toBe('hard')
  })
  it('creates state with custom opponent type', () => {
    const state = createVillageGuardianState(mockVocabulary, { opponentType: 'dragons' })
    expect(state.opponentType).toBe('dragons')
  })
  it('initializes knight at correct position', () => {
    const state = createVillageGuardianState(mockVocabulary)
    expect(state.knight.x).toBe(GAME_WIDTH / 2)
    expect(state.knight.y).toBe(100)
    expect(state.knight.lives).toBe(VILLAGE_GUARDIAN_CONFIG.initialLives)
  })
  it('spawns villagers based on word count', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'easy' })
    const diffConfig = getDifficultyConfig('easy')
    expect(state.villagers.length).toBe(Math.min(diffConfig.wordCount, state.words.length))
  })
  it('spawns one monster', () => {
    const state = createVillageGuardianState(mockVocabulary)
    expect(state.monsters.length).toBe(1)
  })
  it('initializes empty trail and collectedWords', () => {
    const state = createVillageGuardianState(mockVocabulary)
    expect(state.trail).toEqual([])
    expect(state.collectedWords).toEqual([])
  })
  it('sets correct timer based on difficulty', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'hard' })
    expect(state.timer).toBe(getTimerDuration('hard'))
    expect(state.maxTimer).toBe(getTimerDuration('hard'))
  })
})

describe('tickVillageGuardian', () => {
  it('returns same state when not playing', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const endedState = { ...state, status: 'victory' as const }
    const newState = tickVillageGuardian(endedState, 50)
    expect(newState).toBe(endedState)
  })

  it('decrements timer', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const newState = tickVillageGuardian(state, 100)
    expect(newState.timer).toBe(state.timer - 100)
  })

  it('sets defeat when timer reaches zero', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const lowTimerState = { ...state, timer: 50 }
    const newState = tickVillageGuardian(lowTimerState, 100)
    expect(newState.status).toBe('defeat')
  })
  it('increments game time', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const newState = tickVillageGuardian(state, 50)
    expect(newState.gameTime).toBe(50)
  })
  it('moves knight based on input', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const input = { dx: 1, dy: 0 }
    const newState = tickVillageGuardian(state, 100, input)
    expect(newState.knight.x).toBeGreaterThan(state.knight.x)
  })
  it('moves knight diagonally with normalized speed', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const input = { dx: 1, dy: 1 }
    const newState = tickVillageGuardian(state, 100, input)
    expect(newState.knight.x).toBeGreaterThan(state.knight.x)
    expect(newState.knight.y).toBeGreaterThan(state.knight.y)
  })
  it('keeps knight within bounds', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const cornerState = {
      ...state,
      knight: { ...state.knight, x: 10, y: 10 },
    }
    const input = { dx: -1, dy: -1 }
    const newState = tickVillageGuardian(cornerState, 100, input)
    expect(newState.knight.x).toBeGreaterThanOrEqual(VILLAGE_GUARDIAN_CONFIG.knightSize / 2)
    expect(newState.knight.y).toBeGreaterThanOrEqual(VILLAGE_GUARDIAN_CONFIG.knightSize / 2)
  })
  it('decreases invulnerability time', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const invincibleState = {
      ...state,
      knight: { ...state.knight, invulnerabilityTime: 500 },
    }
    const newState = tickVillageGuardian(invincibleState, 100)
    expect(newState.knight.invulnerabilityTime).toBe(400)
  })
})
describe('villager collision mechanics', () => {
  it('collecting correct villager increments correctAnswers only, not wrongAnswers', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const targetVillager = state.villagers.find((v) => v.orderIndex === 0)!
    const stateWithKnightOnVillager: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: targetVillager.x, y: targetVillager.y },
      // Keep monster far away so it doesn't scatter the just-collected trail in the same tick
      monsters: [{ ...state.monsters[0], x: -500, y: -500 }],
    }
    const newState = tickVillageGuardian(stateWithKnightOnVillager, 50)
    expect(newState.correctAnswers).toBe(1)
    expect(newState.wrongAnswers).toBe(0)
    expect(newState.targetIndex).toBe(1)
    const collected = newState.villagers.find((v) => v.orderIndex === 0)!
    expect(collected.collected).toBe(true)
  })

  it('collecting correct villager adds it to trail and collectedWords', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const targetVillager = state.villagers.find((v) => v.orderIndex === 0)!
    const stateWithKnightOnVillager: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: targetVillager.x, y: targetVillager.y },
    }
    const newState = tickVillageGuardian(stateWithKnightOnVillager, 50)
    expect(newState.trail).toHaveLength(1)
    expect(newState.collectedWords).toContain(targetVillager.word)
  })

  it('touching wrong-order villager increments wrongAnswers and hides villager', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const wrongVillager = state.villagers.find((v) => v.orderIndex !== 0)
    if (!wrongVillager) return
    const stateWithKnightOnWrong: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: wrongVillager.x, y: wrongVillager.y },
    }
    const newState = tickVillageGuardian(stateWithKnightOnWrong, 50)
    expect(newState.wrongAnswers).toBe(1)
    expect(newState.correctAnswers).toBe(0)
    const after = newState.villagers.find((v) => v.id === wrongVillager.id)!
    expect(after.hiding).toBe(true)
  })

  it('touching wrong villager applies time penalty', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const wrongVillager = state.villagers.find((v) => v.orderIndex !== 0)
    if (!wrongVillager) return
    const stateWithKnightOnWrong: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: wrongVillager.x, y: wrongVillager.y },
    }
    const newState = tickVillageGuardian(stateWithKnightOnWrong, 50)
    // Timer penalty increases timer (wrong word time penalty is subtracted from countdown)
    expect(newState.timer).toBeGreaterThan(state.timer - 50)
  })
})

describe('level progression (no victory state)', () => {
  it('advances to level 2 when knight reaches sanctuary with full trail', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'easy' })
    const fullTrail = state.words.map((word, i) => ({
      id: `trail-${i}`,
      x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x,
      y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y,
      word,
      orderIndex: i,
    }))
    const completedState: VillageGuardianState = {
      ...state,
      knight: {
        ...state.knight,
        x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x,
        y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y,
      },
      trail: fullTrail,
      targetIndex: state.words.length,
    }
    const newState = tickVillageGuardian(completedState, 50)
    expect(newState.status).toBe('playing')
    expect(newState.level).toBe(2)
    expect(newState.trail).toHaveLength(0)
    expect(newState.collectedWords).toHaveLength(0)
  })

  it('adds an extra monster each level (up to max)', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'easy' })
    const fullTrail = state.words.map((word, i) => ({
      id: `trail-${i}`,
      x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x,
      y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y,
      word,
      orderIndex: i,
    }))
    const completedState: VillageGuardianState = {
      ...state,
      knight: {
        ...state.knight,
        x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x,
        y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y,
      },
      trail: fullTrail,
      targetIndex: state.words.length,
    }
    const level2 = tickVillageGuardian(completedState, 50)
    expect(level2.monsters.length).toBe(2)
  })

  it('does not advance level when trail is not full', () => {
    const state = createVillageGuardianState(mockVocabulary, { difficulty: 'easy' })
    const partialTrail = [
      { id: 'trail-0', x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x, y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y, word: state.words[0], orderIndex: 0 },
    ]
    const nonCompleteState: VillageGuardianState = {
      ...state,
      knight: {
        ...state.knight,
        x: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.x,
        y: VILLAGE_GUARDIAN_CONFIG.sanctuaryPosition.y,
      },
      trail: partialTrail,
    }
    const newState = tickVillageGuardian(nonCompleteState, 50)
    expect(newState.status).toBe('playing')
    expect(newState.level).toBe(1)
  })

  it('initializes with level 1', () => {
    const state = createVillageGuardianState(mockVocabulary)
    expect(state.level).toBe(1)
  })
})

describe('monster collision', () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('knight loses a life when monster hits and trail is empty', () => {

    const state = createVillageGuardianState(mockVocabulary)
    const stateWithMonsterOnKnight: VillageGuardianState = {
      ...state,
      trail: [],
      knight: { ...state.knight, x: 195, y: 350, invulnerabilityTime: 0 },
      monsters: [{ ...state.monsters[0], x: 195, y: 350, velocityX: 0, velocityY: 0 }],
    }
    const newState = tickVillageGuardian(stateWithMonsterOnKnight, 50)
    expect(newState.knight.lives).toBe(state.knight.lives - 1)
  })

  it('monster hitting trail scatters villagers and resets trail', () => {
    const state = createVillageGuardianState(mockVocabulary)
    // Place knight and trail segment at the same location so updateTrail doesn't move segment away
    const knightX = state.knight.x
    const knightY = state.knight.y
    const trail = [
      { id: 'seg-0', x: knightX, y: knightY, word: state.words[0], orderIndex: 0 },
    ]
    const villagers = state.villagers.map((v) =>
      v.orderIndex === 0 ? { ...v, collected: true } : v
    )
    const stateWithMonsterOnTrail: VillageGuardianState = {
      ...state,
      trail,
      villagers,
      monsters: [{ ...state.monsters[0], x: knightX, y: knightY }],
    }
    const newState = tickVillageGuardian(stateWithMonsterOnTrail, 50)
    expect(newState.trail).toHaveLength(0)
    const scattered = newState.villagers.find((v) => v.orderIndex === 0)!
    expect(scattered.collected).toBe(false)
  })

  it('knight gets invulnerability after monster scatters trail', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const knightX = state.knight.x
    const knightY = state.knight.y
    const trail = [
      { id: 'seg-0', x: knightX, y: knightY, word: state.words[0], orderIndex: 0 },
    ]
    const stateWithMonsterOnTrail: VillageGuardianState = {
      ...state,
      trail,
      monsters: [{ ...state.monsters[0], x: knightX, y: knightY }],
    }
    const newState = tickVillageGuardian(stateWithMonsterOnTrail, 50)
    expect(newState.knight.invulnerabilityTime).toBeGreaterThan(0)
  })
})

describe('trail following', () => {
  it('trail segment moves toward knight position', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const trailState: VillageGuardianState = {
      ...state,
      trail: [{ id: 'seg-0', x: 100, y: 100, word: state.words[0], orderIndex: 0 }],
      knight: { ...state.knight, x: 200, y: 100, invulnerabilityTime: 5000 },
      monsters: [{ ...state.monsters[0], x: 0, y: 600 }],
    }
    const newState = tickVillageGuardian(trailState, 50)
    expect(newState.trail[0].x).toBeGreaterThan(100)
  })
})

describe('monster movement', () => {
  it('goblin monsters chase the knight', () => {
    const state = createVillageGuardianState(mockVocabulary, { opponentType: 'goblins' })
    const stateWithPositions: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: 390, y: 350 },
      monsters: [{ ...state.monsters[0], x: 0, y: 350, velocityX: 0, velocityY: 1 }],
    }
    const newState = tickVillageGuardian(stateWithPositions, 100)
    expect(newState.monsters[0].x).toBeGreaterThan(0)
  })

  it('dragon monsters chase the knight more aggressively', () => {
    const state = createVillageGuardianState(mockVocabulary, { opponentType: 'dragons' })
    const stateWithPositions: VillageGuardianState = {
      ...state,
      knight: { ...state.knight, x: 390, y: 350 },
      monsters: [{ ...state.monsters[0], x: 0, y: 350, velocityX: 0, velocityY: 1 }],
    }
    const newState = tickVillageGuardian(stateWithPositions, 100)
    expect(newState.monsters[0].x).toBeGreaterThan(0)
  })

  it('bandit monsters bounce off walls', () => {
    const state = createVillageGuardianState(mockVocabulary, { opponentType: 'bandits' })
    const stateAtWall: VillageGuardianState = {
      ...state,
      monsters: [{ ...state.monsters[0], x: 5, y: 350, velocityX: -1, velocityY: 0 }],
    }
    const newState = tickVillageGuardian(stateAtWall, 100)
    expect(newState.monsters[0].velocityX).toBeGreaterThanOrEqual(0)
  })
})

describe('hiding villager behavior', () => {
  it('hiding villager timer decrements each tick', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const villagerWithHide = state.villagers.map((v, i) =>
      i === 0 ? { ...v, hiding: true, hideTimer: 1000 } : v
    )
    const hidingState: VillageGuardianState = {
      ...state,
      villagers: villagerWithHide,
    }
    const newState = tickVillageGuardian(hidingState, 100)
    expect(newState.villagers[0].hideTimer).toBe(900)
  })

  it('hiding villager becomes visible again when timer expires', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const villagerWithHide = state.villagers.map((v, i) =>
      i === 0 ? { ...v, hiding: true, hideTimer: 50 } : v
    )
    const hidingState: VillageGuardianState = {
      ...state,
      villagers: villagerWithHide,
    }
    const newState = tickVillageGuardian(hidingState, 100)
    expect(newState.villagers[0].hiding).toBe(false)
  })
})

describe('calculateXP', () => {
  it('calculates base XP from correct answers', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const completedState = {
      ...state,
      correctAnswers: 5,
      wrongAnswers: 0,
      timer: state.maxTimer * 0.6,
    }
    const xp = calculateXP(completedState)
    expect(xp).toBeGreaterThanOrEqual(5)
  })

  it('adds accuracy bonus for 90%+ accuracy', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const highAccuracyState = {
      ...state,
      correctAnswers: 5,
      wrongAnswers: 0,
    }
    const xp = calculateXP(highAccuracyState)
    expect(xp).toBeGreaterThanOrEqual(7)
  })
  it('caps XP at maxXP', () => {
    const state = createVillageGuardianState(mockVocabulary)
    const perfectState = {
      ...state,
      correctAnswers: 10,
      wrongAnswers: 0,
      timer: state.maxTimer * 0.6,
    }
    const xp = calculateXP(perfectState)
    expect(xp).toBeLessThanOrEqual(VILLAGE_GUARDIAN_CONFIG.maxXP)
  })
})
