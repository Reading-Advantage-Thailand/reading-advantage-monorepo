import {
  advanceDragonRiderTime,
  calculateBossPower,
  createDragonRiderState,
  getDragonRiderResults,
  selectGate,
} from './dragonRider'
import type { VocabularyItem } from '@/store/useGameStore'

const createRng = (values: number[]) => {
  let index = 0
  return () => {
    const value = values[index] ?? 0
    index += 1
    return value
  }
}

describe('dragonRider core logic', () => {
  const vocabulary: VocabularyItem[] = [
    { term: 'Apple', translation: 'Manzana' },
    { term: 'Banana', translation: 'Platano' },
  ]

  it('initializes state with a gate round and baseline counts', () => {
    const rng = createRng([0.1, 0.9, 0.2])
    const state = createDragonRiderState(vocabulary, { rng, durationMs: 30000 })

    expect(state.status).toBe('running')
    expect(state.durationMs).toBe(30000)
    expect(state.elapsedMs).toBe(0)
    expect(state.attempts).toBe(0)
    expect(state.correctAnswers).toBe(0)
    expect(state.dragonCount).toBe(1)
    expect(state.round.term).toBe('Apple')
    expect(state.round.correctTranslation).toBe('Manzana')
    expect(state.round.decoyTranslation).toBe('Platano')
    expect(state.round.correctSide).toBe('left')
  })

  it('updates attempts and dragon count on gate selection', () => {
    const rng = createRng([0.1, 0.9, 0.7])
    const state = createDragonRiderState(vocabulary, { rng })

    const next = selectGate(state, 'right', vocabulary, createRng([0.9, 0.1, 0.3]))

    expect(next.attempts).toBe(1)
    expect(next.correctAnswers).toBe(1)
    expect(next.dragonCount).toBe(2)
    expect(next.round.term).toBe('Banana')
  })

  it('prevents dragon count from dropping below one', () => {
    const rng = createRng([0.1, 0.9, 0.7])
    const state = createDragonRiderState(vocabulary, { rng })

    const next = selectGate(state, 'left', vocabulary, createRng([0.9, 0.1, 0.3]))

    expect(next.attempts).toBe(1)
    expect(next.correctAnswers).toBe(0)
    expect(next.dragonCount).toBe(1)
  })

  it('advances time and transitions to boss when duration ends', () => {
    const rng = createRng([0.1, 0.9, 0.2])
    const state = createDragonRiderState(vocabulary, { rng, durationMs: 1000 })

    const next = advanceDragonRiderTime(state, 1200)

    expect(next.status).toBe('boss')
    expect(next.elapsedMs).toBe(1000)
  })

  it('calculates boss power from attempts', () => {
    expect(calculateBossPower(0)).toBe(3)
    expect(calculateBossPower(5)).toBe(3)
    expect(calculateBossPower(6)).toBe(3)
    expect(calculateBossPower(10)).toBe(5)
  })

  it('builds results with accuracy, boss outcome, and XP', () => {
    const results = getDragonRiderResults({
      correctAnswers: 6,
      totalAttempts: 10,
      dragonCount: 4,
    })

    expect(results.accuracy).toBeCloseTo(0.6)
    expect(results.bossPower).toBe(5)
    expect(results.victory).toBe(false)
    expect(results.xp).toBe(3)
  })

  it('allows victory with 60% accuracy and moderate attempts', () => {
    // 10 attempts, 6 correct (60%), 4 wrong
    // dragonCount: 1 + 6 - 4 = 3
    // bossPower: max(3, ceil(10 * 0.5)) = max(3, 5) = 5
    // Victory: 3 >= 5 = false
    const results60 = getDragonRiderResults({
      correctAnswers: 6,
      totalAttempts: 10,
      dragonCount: 3,
    })
    expect(results60.victory).toBe(false)

    // 10 attempts, 7 correct (70%), 3 wrong
    // dragonCount: 1 + 7 - 3 = 5
    // bossPower: 5
    // Victory: 5 >= 5 = true
    const results70 = getDragonRiderResults({
      correctAnswers: 7,
      totalAttempts: 10,
      dragonCount: 5,
    })
    expect(results70.victory).toBe(true)
  })
})
