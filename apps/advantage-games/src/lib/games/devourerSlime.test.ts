import {
  createSlimeState,
  tickSlime,
  moveSlime,
  INITIAL_SLIME_RADIUS,
  MAX_LIVES,
} from './devourerSlime'
import { VocabularyItem } from '@/store/useGameStore'

describe('Devourer Slime Logic', () => {
  const mockSentences: VocabularyItem[] = [
    { term: 'The cat sits', translation: 'แมวนั่งอยู่' },
    { term: 'Dogs are loyal', translation: 'สุนัขมีความซื่อสัตย์' }
  ]

  it('should initialize state correctly', () => {
    const state = createSlimeState(mockSentences, { rng: () => 0.1 })
    expect(state.phase).toBe('playing')
    expect(state.slime.radius).toBe(INITIAL_SLIME_RADIUS)
    expect(state.lives).toBe(MAX_LIVES)
    expect(state.orbs.length).toBe(3) // "The cat sits"
  })

  it('should move slime', () => {
    let state = createSlimeState(mockSentences)
    const initialPos = { ...state.slime.pos }
    state = moveSlime(state, 1, 0, 100)
    expect(state.slime.pos.x).toBeGreaterThan(initialPos.x)
    expect(state.slime.pos.y).toBe(initialPos.y)
  })

  it('should handle correct orb collection', () => {
    let state = createSlimeState(mockSentences, { rng: () => 0.1 })
    // Position orb manually
    state.orbs[0].pos = { ...state.slime.pos }
    
    const initialRadius = state.slime.radius
    state = tickSlime(state, 16.6)
    
    expect(state.targetWordIndex).toBe(1)
    expect(state.slime.radius).toBeGreaterThan(initialRadius)
    expect(state.score).toBe(100)
    expect(state.lastEvent).toBe('correct')
  })

  it('should handle incorrect orb collection', () => {
    let state = createSlimeState(mockSentences, { rng: () => 0.1 })
    // Orb 1 is "cat", but target is 0 ("The")
    state.orbs[1].pos = { ...state.slime.pos }
    
    // Make slime a bit bigger first to test shrinking
    state.slime.radius = 40
    
    state = tickSlime(state, 16.6)
    
    expect(state.targetWordIndex).toBe(0)
    expect(state.slime.radius).toBeLessThan(40)
    expect(state.lastEvent).toBe('incorrect')
  })

  it('should handle hit by enemy when smaller', () => {
    let state = createSlimeState(mockSentences)
    // Knight radius is 35, slime is 25
    state.enemies[0].pos = { ...state.slime.pos }
    
    state = tickSlime(state, 16.6)
    expect(state.lives).toBe(MAX_LIVES - 1)
    expect(state.lastEvent).toBe('hit')
  })

  it('should eat enemy when larger', () => {
    let state = createSlimeState(mockSentences, { rng: () => 0.1 })
    state.slime.radius = 50 // Larger than knight (35)
    state.enemies[0].pos = { ...state.slime.pos }
    
    const initialEnemyCount = state.enemies.length
    state = tickSlime(state, 16.6)
    
    expect(state.enemies.length).toBe(initialEnemyCount - 1)
    expect(state.score).toBe(500)
    expect(state.lastEvent).toBe('eat_enemy')
  })

  it('should handle victory', () => {
    let state = createSlimeState([{ term: 'Eat', translation: 'กิน' }])
    state.orbs[0].pos = { ...state.slime.pos }
    
    state = tickSlime(state, 16.6)
    expect(state.phase).toBe('victory')
  })

  it('should handle defeat', () => {
    let state = createSlimeState(mockSentences)
    state.lives = 1
    state.enemies[0].pos = { ...state.slime.pos }
    
    state = tickSlime(state, 16.6)
    expect(state.phase).toBe('defeat')
  })
})
