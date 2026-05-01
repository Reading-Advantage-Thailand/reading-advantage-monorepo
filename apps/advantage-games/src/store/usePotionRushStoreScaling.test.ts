import { act } from '@testing-library/react'
import { usePotionRushStore } from './usePotionRushStore'

describe('Potion Rush Scaling & Scoring', () => {
  beforeEach(() => {
    act(() => {
      usePotionRushStore.getState().reset()
      usePotionRushStore.getState().startGame([{ term: 'dummy', definition: 'dummy', id: '0' }])
    })
  })

  it('should scale customer patience based on completed sentences', () => {
    // Initial Spawn: 0 completed sentences
    // Expected patience: 60
    
    // startGame already set vocabList.
    // We can call spawnCustomer() without args now, but previously it took vocabList.
    // The new store signature for spawnCustomer is () => void.
    
    act(() => {
      usePotionRushStore.getState().spawnCustomer()
    })
    
    let state = usePotionRushStore.getState()
    const customer1 = state.customers.find(c => c !== null)
    expect(customer1?.patience).toBe(60)
    expect(customer1?.maxPatience).toBe(60)

    // Complete 1 sentence
    // Mock the state update for completion
    act(() => {
        usePotionRushStore.setState({ completedSentences: 1 })
    })

    // Spawn 2nd Customer
    // Expected patience: 60 * 0.9 = 54
    act(() => {
      usePotionRushStore.getState().spawnCustomer()
    })
    
    state = usePotionRushStore.getState()
    // Find the newest customer (should have maxPatience 54)
    const customer2 = state.customers.find(c => c && c.maxPatience === 54)
    expect(customer2).toBeDefined()
    expect(customer2?.maxPatience).toBe(54)

    // Complete another sentence (total 2)
    act(() => {
        usePotionRushStore.setState({ completedSentences: 2 })
    })
    
    // Spawn 3rd Customer
    // Expected patience: 60 * 0.9 * 0.9 = 48.6
    act(() => {
      usePotionRushStore.getState().spawnCustomer()
    })
    state = usePotionRushStore.getState()
    const customer3 = state.customers.find(c => c && c.maxPatience === 48.6)
    expect(customer3).toBeDefined()
  })

  it('should calculate score based on remaining patience', () => {
    const vocabList = [{ term: 'test', definition: 'test', id: '1' }]
    
    act(() => {
        // Reset with specific vocab
        usePotionRushStore.getState().startGame(vocabList)
        usePotionRushStore.getState().spawnCustomer()
    })

    let state = usePotionRushStore.getState()
    const customer = state.customers.find(c => c !== null)!
    const cauldronIndex = state.customers.indexOf(customer)

    // Simulate time passing (10 seconds)
    // Patience starts at 60. Remaining should be 50.
    act(() => {
      usePotionRushStore.getState().tick(10, 1000)
    })

    // Prepare cauldron for serving
    usePotionRushStore.setState(prev => {
        const nextCauldrons = [...prev.cauldrons]
        nextCauldrons[cauldronIndex] = {
            ...nextCauldrons[cauldronIndex],
            state: 'COMPLETED',
            targetSentence: customer.request,
            currentWords: ['test']
        }
        return { cauldrons: nextCauldrons }
    })

    // Serve
    act(() => {
        usePotionRushStore.getState().handleServeCustomer(customer.id, cauldronIndex)
    })

    state = usePotionRushStore.getState()
    // Expected Score: 50
    expect(state.score).toBeGreaterThanOrEqual(49)
    expect(state.score).toBeLessThanOrEqual(51)
  })

  it('should track total XP earned', () => {
    const state = usePotionRushStore.getState()
    expect(state.totalXpEarned).toBeDefined()
    expect(state.totalXpEarned).toBe(0)
  })
})
