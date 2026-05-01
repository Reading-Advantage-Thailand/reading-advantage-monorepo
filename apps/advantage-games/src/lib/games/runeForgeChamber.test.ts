import {
  createRuneForgeChamberState,
  tickRuneForgeChamber,
  selectCircle,
  getCirclePosition,
  calculateXP,
  isPointInCircle,
  type RuneForgeChamberState,
} from './runeForgeChamber'
import { RUNE_FORGE_CHAMBER_CONFIG, GAME_WIDTH, GAME_HEIGHT } from './runeForgeChamberConfig'
import type { VocabularyItem } from '@/store/useGameStore'

const mockVocabulary: VocabularyItem[] = [
  { term: 'The cat sits on the mat', translation: 'แมวนั่งบนเสื่อ' },
  { term: 'I love to read books', translation: 'ฉันชอบอ่านหนังสือ' },
  { term: 'The sun is shining bright', translation: 'ดวงอาทิตย์ส่องแสงสว่าง' },
]

describe('runeForgeChamber', () => {
  describe('createRuneForgeChamberState', () => {
    it('should create initial state with vocabulary', () => {
      let seed = 0.1
      const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

      const state = createRuneForgeChamberState(mockVocabulary, { rng })

      expect(state.status).toBe('playing')
      expect(state.difficulty).toBe('normal')
      expect(state.level).toBe(1)
      expect(state.vocabulary).toEqual(mockVocabulary)
      expect(state.player.health).toBe(RUNE_FORGE_CHAMBER_CONFIG.initialHealth)
      expect(state.circles.length).toBeGreaterThan(0)
      expect(state.targetIndex).toBe(0)
      expect(state.correctAnswers).toBe(0)
      expect(state.wrongAnswers).toBe(0)
      expect(state.timer).toBeGreaterThan(0)
      expect(state.maxTimer).toBe(state.timer)
      expect(state.gameTime).toBe(0)
    })

    it('should throw error with empty vocabulary', () => {
      expect(() => createRuneForgeChamberState([])).toThrow('Vocabulary cannot be empty')
    })

    it('should use provided difficulty', () => {
      const state = createRuneForgeChamberState(mockVocabulary, { difficulty: 'hard' })
      expect(state.difficulty).toBe('hard')
    })

    it('should use provided runeType', () => {
      const state = createRuneForgeChamberState(mockVocabulary, { runeType: 'rare-crystal' })
      expect(state.runeType).toBe('rare-crystal')
    })

    it('should place rune stone at center', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      expect(state.runeStone.centerX).toBe(GAME_WIDTH / 2)
      expect(state.runeStone.centerY).toBe(GAME_HEIGHT / 2)
    })

    it('should shuffle circle angles', () => {
      let seed = 0.5
      const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

      const state = createRuneForgeChamberState(mockVocabulary, { rng })
      const angles = state.circles.map(c => c.angle)
      const baseAngles = state.circles.map((_, i) => (2 * Math.PI * i) / state.circles.length)
      
      // Angles should be different from base angles due to shuffle + offset
      expect(angles).not.toEqual(baseAngles)
    })
  })

  describe('tickRuneForgeChamber', () => {
    it('should decrement timer', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const initialTimer = state.timer

      const next = tickRuneForgeChamber(state, 100)

      expect(next.timer).toBe(initialTimer - 100)
    })

    it('should increment gameTime', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const next = tickRuneForgeChamber(state, 100)
      expect(next.gameTime).toBe(100)
    })

    it('should rotate circles', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const initialAngle = state.circles[0].angle

      const next = tickRuneForgeChamber(state, 1000)

      expect(next.circles[0].angle).not.toBe(initialAngle)
    })

    it('should set status to defeat when timer reaches zero', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.timer = 50

      const next = tickRuneForgeChamber(state, 100)

      expect(next.status).toBe('defeat')
    })

    it('should set status to defeat when health reaches zero', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.player.health = 0

      const next = tickRuneForgeChamber(state, 16)

      expect(next.status).toBe('defeat')
    })

    it('should not update if status is not playing', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.status = 'defeat'

      const next = tickRuneForgeChamber(state, 16)

      expect(next).toEqual(state)
    })

    it('should advance to next level when all words collected', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.targetIndex = state.words.length

      const next = tickRuneForgeChamber(state, 16)

      expect(next.level).toBe(2)
      expect(next.targetIndex).toBe(0)
      expect(next.collectedWords.length).toBe(0)
    })
  })

  describe('selectCircle', () => {
    it('should select correct circle and advance target', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const targetWord = state.words[state.targetIndex]
      const targetCircle = state.circles.find(c => c.word === targetWord)!

      const next = selectCircle(state, targetCircle.id)

      expect(next.targetIndex).toBe(1)
      expect(next.correctAnswers).toBe(1)
      expect(next.collectedWords).toContain(targetWord)
      expect(next.circles.find(c => c.id === targetCircle.id)!.selected).toBe(true)
    })

    it('should advance level when all words selected', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      // Select all words
      let current = state
      for (let i = 0; i < state.words.length; i++) {
        const targetWord = current.words[current.targetIndex]
        const targetCircle = current.circles.find(c => c.word === targetWord)!
        current = selectCircle(current, targetCircle.id)
      }

      expect(current.level).toBe(2)
      expect(current.targetIndex).toBe(0)
    })

    it('should reduce health for wrong selection', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const targetWord = state.words[state.targetIndex]
      const wrongCircle = state.circles.find(c => c.word !== targetWord)!
      const initialHealth = state.player.health

      const next = selectCircle(state, wrongCircle.id)

      expect(next.player.health).toBe(initialHealth - RUNE_FORGE_CHAMBER_CONFIG.wrongWordDamage)
      expect(next.wrongAnswers).toBe(1)
      expect(next.targetIndex).toBe(0)
    })

    it('should set defeat when health reaches zero from wrong selection', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.player.health = RUNE_FORGE_CHAMBER_CONFIG.wrongWordDamage

      const targetWord = state.words[state.targetIndex]
      const wrongCircle = state.circles.find(c => c.word !== targetWord)!

      const next = selectCircle(state, wrongCircle.id)

      expect(next.status).toBe('defeat')
    })

    it('should not select already selected circle', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const targetWord = state.words[state.targetIndex]
      const targetCircle = state.circles.find(c => c.word === targetWord)!
      
      const first = selectCircle(state, targetCircle.id)
      const second = selectCircle(first, targetCircle.id)

      expect(second).toEqual(first)
    })

    it('should not update if status is not playing', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.status = 'defeat'

      const next = selectCircle(state, state.circles[0].id)

      expect(next).toEqual(state)
    })

    it('should return same state for invalid circle id', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      const next = selectCircle(state, 'invalid-id')
      expect(next).toEqual(state)
    })
  })

  describe('getCirclePosition', () => {
    it('should calculate position based on angle and orbit radius', () => {
      const circle = {
        id: '1',
        word: 'test',
        orderIndex: 0,
        angle: 0,
        orbitRadius: 100,
        selected: false,
      }
      const runeStone = { centerX: 200, centerY: 200, radius: 50 }
      const baseAngle = 0

      const pos = getCirclePosition(circle, runeStone, baseAngle)

      expect(pos.x).toBeCloseTo(300)
      expect(pos.y).toBeCloseTo(200)
    })

    it('should account for base angle offset', () => {
      const circle = {
        id: '1',
        word: 'test',
        orderIndex: 0,
        angle: Math.PI / 2,
        orbitRadius: 100,
        selected: false,
      }
      const runeStone = { centerX: 200, centerY: 200, radius: 50 }
      const baseAngle = 0

      const pos = getCirclePosition(circle, runeStone, baseAngle)

      expect(pos.x).toBeCloseTo(200)
      expect(pos.y).toBeCloseTo(300)
    })
  })

  describe('calculateXP', () => {
    it('should calculate base XP from correct answers', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.correctAnswers = 5
      state.wrongAnswers = 2
      state.timer = 5000
      state.maxTimer = 10000
      state.player.health = 50

      const xp = calculateXP(state)
      expect(xp).toBeGreaterThanOrEqual(5)
    })

    it('should add accuracy bonus for perfect play', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.correctAnswers = 5
      state.wrongAnswers = 0
      state.timer = 1000
      state.maxTimer = 10000
      state.player.health = 40

      const xp = calculateXP(state)
      expect(xp).toBe(5 + RUNE_FORGE_CHAMBER_CONFIG.accuracyBonus)
    })

    it('should add speed bonus when time remaining is high', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.correctAnswers = 3
      state.wrongAnswers = 1
      state.timer = 8000
      state.maxTimer = 10000
      state.player.health = 40

      const xp = calculateXP(state)
      expect(xp).toBe(3 + RUNE_FORGE_CHAMBER_CONFIG.speedBonus)
    })

    it('should add survival bonus when health is high', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.correctAnswers = 3
      state.wrongAnswers = 1
      state.timer = 1000
      state.maxTimer = 10000
      state.player.health = 80

      const xp = calculateXP(state)
      expect(xp).toBe(3 + RUNE_FORGE_CHAMBER_CONFIG.survivalBonus)
    })

    it('should cap XP at maxXP', () => {
      const state = createRuneForgeChamberState(mockVocabulary)
      state.correctAnswers = 20
      state.wrongAnswers = 0
      state.timer = 9000
      state.maxTimer = 10000
      state.player.health = 100

      const xp = calculateXP(state)
      expect(xp).toBe(RUNE_FORGE_CHAMBER_CONFIG.maxXP)
    })
  })

  describe('isPointInCircle', () => {
    it('should return true for point inside circle', () => {
      const result = isPointInCircle({ x: 0, y: 0 }, { x: 0, y: 0 }, 10)
      expect(result).toBe(true)
    })

    it('should return false for point outside circle', () => {
      const result = isPointInCircle({ x: 15, y: 0 }, { x: 0, y: 0 }, 10)
      expect(result).toBe(false)
    })

    it('should return true for point on circle edge', () => {
      const result = isPointInCircle({ x: 10, y: 0 }, { x: 0, y: 0 }, 10)
      expect(result).toBe(true)
    })
  })
})
