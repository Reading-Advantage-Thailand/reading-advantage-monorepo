import { act } from '@testing-library/react'
import { usePotionRushStore } from './usePotionRushStore'

describe('Potion Rush Endless Mode', () => {
  beforeEach(() => {
    act(() => {
      usePotionRushStore.getState().reset()
      usePotionRushStore.getState().startGame([{ term: 'dummy', definition: 'dummy', id: '0' }])
    })
  })

  it('should NOT end game just because time passes', () => {
    // Simulate 200 seconds passing (well over the previous 100s limit)
    // We need to do this in chunks or just set dayTime directly if exposed, 
    // but tick updates it.
    
    // To avoid reputation loss from angry customers, we need to ensure no customers spawn or they don't get angry.
    // We can clear vocabList to prevent spawns (as per my previous fix)
    act(() => {
        usePotionRushStore.setState({ vocabList: [] })
    })

    // Tick for 200 seconds
    act(() => {
        usePotionRushStore.getState().tick(200, 1000)
    })

    const state = usePotionRushStore.getState()
    expect(state.gameState).toBe('PLAYING')
    expect(state.dayTime).toBeGreaterThan(1) // usage of dayTime implies it might exceed 1 now, which is fine
  })
})
