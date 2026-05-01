import { selectBattleActions } from './rpgBattleWordSelection'
import { VocabularyItem } from '@/store/useGameStore'

describe('selectBattleActions', () => {
  const vocab: VocabularyItem[] = [
    { term: 'Sword', translation: 'Espada' },
    { term: 'Shield', translation: 'Escudo' },
    { term: 'Fire', translation: 'Fuego' },
    { term: 'Ice', translation: 'Hielo' },
  ]

  it('prioritizes harder words when selecting actions', () => {
    const performance = {
      Sword: { correct: 10, attempts: 10 },
      Shield: { correct: 1, attempts: 2 },
      Fire: { correct: 0, attempts: 0 },
      Ice: { correct: 4, attempts: 8 },
    }

    const actions = selectBattleActions(vocab, performance, { count: 2, rng: () => 0 })
    expect(actions.map((action) => action.term)).toEqual(['Fire', 'Shield'])
  })

  it('assigns power based on difficulty', () => {
    const performance = {
      Sword: { correct: 10, attempts: 10 },
      Shield: { correct: 1, attempts: 2 },
      Fire: { correct: 0, attempts: 0 },
      Ice: { correct: 4, attempts: 8 },
    }

    const actions = selectBattleActions(vocab, performance, { count: 4, rng: () => 0.5 })
    const byTerm = Object.fromEntries(actions.map((action) => [action.term, action]))

    expect(byTerm.Sword.power).toBe('basic')
    expect(byTerm.Fire.power).toBe('power')
    expect(byTerm.Shield.power).toBe('power')
  })
})
