import { useGameStore } from './useGameStore'

const initialCastles = {
  left: 3,
  center: 3,
  right: 3,
}

const resetStoreState = () => {
  useGameStore.setState({
    vocabulary: [],
    score: 0,
    castles: { ...initialCastles },
    status: 'idle',
    correctAnswers: 0,
    totalAttempts: 0,
    lastXp: 0,
    lastAccuracy: 0,
  })
}

describe('useGameStore', () => {
  beforeEach(() => {
    resetStoreState()
  })

  it('should have correct initial state defined in store', () => {
     const { score, castles, status, vocabulary } = useGameStore.getState()
      
     expect(score).toBe(0)
     expect(castles).toEqual(initialCastles)
     expect(status).toBe('idle')
     expect(vocabulary).toEqual([])
  })

  it('stores the latest XP result', () => {
    const { setLastResult } = useGameStore.getState()

    setLastResult(7, 0.7)

    const { lastXp, lastAccuracy } = useGameStore.getState()
    expect(lastXp).toBe(7)
    expect(lastAccuracy).toBe(0.7)
  })

  it('reduces castle HP and ends the game when all castles are destroyed', () => {
    const { damageCastle } = useGameStore.getState()

    damageCastle('left')
    damageCastle('left')
    damageCastle('left')

    expect(useGameStore.getState().castles.left).toBe(0)
    expect(useGameStore.getState().status).toBe('idle')

    damageCastle('right')
    damageCastle('right')
    damageCastle('right')

    expect(useGameStore.getState().castles.right).toBe(0)
    expect(useGameStore.getState().status).toBe('idle')

    damageCastle('center')
    damageCastle('center')
    damageCastle('center')

    expect(useGameStore.getState().castles.center).toBe(0)
    expect(useGameStore.getState().status).toBe('game-over')
  })
})
