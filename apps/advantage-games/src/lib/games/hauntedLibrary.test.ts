import {
  createLibraryState,
  tickLibrary,
  calculateXP,
  GAME_WIDTH,
  GAME_HEIGHT,
} from './hauntedLibrary'
import { VocabularyItem } from '@/store/useGameStore'

describe('Haunted Library Logic', () => {
  const mockSentences: VocabularyItem[] = [
    { term: 'The cat sits', translation: 'แมวนั่ง' }
  ]

  it('should initialize state correctly', () => {
    const state = createLibraryState(mockSentences)
    expect(state.phase).toBe('playing')
    expect(state.words.length).toBe(3)
    expect(state.lives).toBe(3)
    expect(state.initialLives).toBe(3)
    expect(state.difficulty).toBe('medium')
    expect(state.player.x).toBeCloseTo(GAME_WIDTH / 2 - 24)
    expect(state.doors.length).toBeGreaterThanOrEqual(3)
    expect(state.floors.length).toBe(4)
  })


  it('should have all sentence words in doors', () => {
    const state = createLibraryState(mockSentences)
    const doorWords = state.doors.map(d => d.word).filter(w => w !== '?')
    expect(doorWords).toContain('The')
    expect(doorWords).toContain('cat')
    expect(doorWords).toContain('sits')
  })

  it('should generate floors with correct spacing', () => {
    const state = createLibraryState(mockSentences)
    expect(state.floors[0].y).toBe(GAME_HEIGHT - 100)
    expect(state.floors[1].y).toBe(GAME_HEIGHT - 100 - 160)
  })

  it('should apply gravity when in the air', () => {
    let state = createLibraryState(mockSentences)
    // Initial state is on floor 0
    // Force player above floor
    state.player.y = 500
    state.player.velocity.y = 0
    state = tickLibrary(state, 100, { dx: 0, dy: 0 })
    expect(state.player.velocity.y).toBeGreaterThan(0)
    expect(state.player.y).toBeGreaterThan(500)
  })

  it('should move player left and right', () => {
    let state = createLibraryState(mockSentences)
    const initialX = state.player.x
    state = tickLibrary(state, 100, { dx: 1, dy: 0 })
    expect(state.player.x).toBeGreaterThan(initialX)
    state = tickLibrary(state, 100, { dx: -1, dy: 0 })
    expect(state.player.x).toBeCloseTo(initialX)
  })

  it('should bounce on trampolines at the edges', () => {
    let state = createLibraryState(mockSentences)
    // Move to edge
    state.player.x = 0
    state.player.y = state.floors[0].y - state.player.height
    state.player.velocity.y = 0
    state = tickLibrary(state, 16.6, { dx: 0, dy: 0 })
    expect(state.player.velocity.y).toBeLessThan(0)
    expect(state.player.state).toBe('jumping')
  })

  it('should handle correct door opening', () => {
    let state = createLibraryState(mockSentences)
    state.ghosts = [] // Clear ghosts for testing
    const targetDoor = state.doors.find(d => d.wordIndex === 0)
    if (!targetDoor) throw new Error('Target door not found')
    
    // Teleport player to door
    state.player.x = targetDoor.x
    state.player.y = targetDoor.y + 10 // Same floor

    state = tickLibrary(state, 16.6, { dx: 0, dy: -1 })
    
    expect(state.doors.find(d => d.id === targetDoor.id)?.isOpen).toBe(true)
    expect(state.nextWordIndex).toBe(1)
    expect(state.score).toBe(100)
    expect(state.lastEvent).toBe('correct')
  })

  it('should handle incorrect door opening', () => {
    let state = createLibraryState(mockSentences)
    state.ghosts = [] // Clear ghosts for testing
    const wrongDoor = state.doors.find(d => d.wordIndex === 1)
    if (!wrongDoor) throw new Error('Wrong door not found')
    
    state.player.x = wrongDoor.x
    state.player.y = wrongDoor.y + 10

    state = tickLibrary(state, 16.6, { dx: 0, dy: -1 })
    
    expect(state.lives).toBe(2)
    expect(state.lastEvent).toBe('incorrect')
  })

  it('should take damage from ghost collision', () => {
    // Use deterministic RNG: always returns 0.5 for consistent ghost placement
    // floor = Math.floor(0.5 * 3) = 1 (floor 1), so ghost spawns on floor 1
    let state = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    state.bats = [] // Clear bats
    // Directly set ghost on player's floor to ensure collision
    const ghost = state.ghosts[0]
    ghost.x = 100
    ghost.y = state.floors[0].y - ghost.height // On floor 0
    // Teleport player to ghost position
    state.player.x = ghost.x
    state.player.y = ghost.y
    state.player.velocity.y = 0

    state = tickLibrary(state, 16.6, { dx: 0, dy: 0 })
    expect(state.lives).toBe(2)
    expect(state.lastEvent).toBe('damage')
  })

  it('should spawn bat on incorrect door and take damage', () => {
    let state = createLibraryState(mockSentences)
    state.ghosts = [] // Clear ghosts
    const wrongDoor = state.doors.find(d => d.wordIndex === 1)
    if (!wrongDoor) throw new Error('Wrong door not found')
    
    state.player.x = wrongDoor.x
    state.player.y = wrongDoor.y + 10

    state = tickLibrary(state, 16.6, { dx: 0, dy: -1 })
    expect(state.bats.length).toBe(1)
    
    // Move bat to player
    state.bats[0].x = state.player.x
    state.bats[0].y = state.player.y
    
    state = tickLibrary(state, 16.6, { dx: 0, dy: 0 })
    expect(state.lives).toBe(1) // 1 from door, 1 from bat
    expect(state.bats.length).toBe(0) // Bat removed on hit
  })

  it('should stun ghost near door when opened', () => {
    let state = createLibraryState(mockSentences)
    const door = state.doors[0]
    const ghost = state.ghosts[0]
    // Teleport ghost to door
    ghost.x = door.x
    ghost.y = door.y
    // Teleport player to door
    state.player.x = door.x
    state.player.y = door.y + 10

    state = tickLibrary(state, 16.6, { dx: 0, dy: -1 })
    expect(state.ghosts[0].state).toBe('stunned')
    expect(state.ghosts[0].stunTimer).toBeGreaterThan(0)
    
    // Ghost shouldn't move or damage player while stunned
    const initialX = state.ghosts[0].x
    state.player.x = state.ghosts[0].x
    state.player.y = state.ghosts[0].y
    state.lives = 3
    state = tickLibrary(state, 100, { dx: 0, dy: 0 })
    expect(state.ghosts[0].x).toBe(initialX)
    expect(state.lives).toBe(3)
  })

  it('should handle victory', () => {
    // Use deterministic RNG to avoid random ghost/bat placement affecting test
    let state = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    state.ghosts = [] // Clear all ghosts
    state.bats = [] // Clear all bats
    // Find the 3 word doors and position them on floor 0, spaced far apart
    const wordDoors = state.doors.filter(d => d.wordIndex !== null)
    const floorY = state.floors[0].y
    const doorSpacing = 120
    wordDoors.forEach((door, i) => {
      door.floor = 0
      door.y = floorY - 80 // Door at floor level
      door.x = 50 + i * doorSpacing // Space doors 120px apart
    })
    // Iterate through words and tick to open correct door each time
    for (let i = 0; i < state.words.length; i++) {
      const door = wordDoors[i]
      // Position player to interact with this door
      state.player.x = door.x + 15
      state.player.y = floorY - state.player.height - 10 // Slightly above floor
      state.player.velocity.y = 0
      state = tickLibrary(state, 16.6, { dx: 0, dy: -1 })
    }
    expect(state.phase).toBe('victory')
    expect(state.lastEvent).toBe('victory')
  })

  it('should handle defeat', () => {
    // Use deterministic RNG
    let state = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    state.lives = 1
    // Place ghost on player's floor to ensure collision
    const ghost = state.ghosts[0]
    ghost.x = 100
    ghost.y = state.floors[0].y - ghost.height
    state.player.x = ghost.x
    state.player.y = ghost.y
    state.player.velocity.y = 0

    state = tickLibrary(state, 16.6, { dx: 0, dy: 0 })
    expect(state.phase).toBe('defeat')
    expect(state.lastEvent).toBe('defeat')
  })

  it('should set easy difficulty initial lives to 5', () => {
    const state = createLibraryState(mockSentences, { difficulty: 'easy' })
    expect(state.lives).toBe(5)
    expect(state.initialLives).toBe(5)
    expect(state.difficulty).toBe('easy')
  })

  describe('calculateXP', () => {
    it('should return 0 when no attempts', () => {
      const state = createLibraryState(mockSentences)
      state.totalAttempts = 0
      expect(calculateXP(state)).toBe(0)
    })

    it('should calculate base XP from correct answers', () => {
      const state = createLibraryState(mockSentences)
      state.correctAnswers = 3
      state.totalAttempts = 5
      state.lives = 1
      state.initialLives = 3
      state.time = 70000
      expect(calculateXP(state)).toBe(3)
    })

    it('should add perfect accuracy bonus', () => {
      const state = createLibraryState(mockSentences)
      state.correctAnswers = 3
      state.totalAttempts = 3
      state.lives = 1
      state.initialLives = 3
      state.time = 70000
      expect(calculateXP(state)).toBe(5) // 3 + 2 perfect accuracy only
    })

    it('should add survival bonus for >=50% lives', () => {
      const state = createLibraryState(mockSentences)
      state.correctAnswers = 2
      state.totalAttempts = 3
      state.lives = 2
      state.initialLives = 3
      state.time = 70000
      expect(calculateXP(state)).toBe(3) // 2 + 1 survival (no speed)
    })

    it('should add speed bonus for under 60s', () => {
      const state = createLibraryState(mockSentences)
      state.correctAnswers = 2
      state.totalAttempts = 3
      state.lives = 1
      state.initialLives = 3
      state.time = 50000
      expect(calculateXP(state)).toBe(3) // 2 + 1 speed (no survival)
    })

    it('should cap XP at 10', () => {
      const state = createLibraryState(mockSentences)
      state.correctAnswers = 10
      state.totalAttempts = 10
      state.lives = 3
      state.initialLives = 3
      state.time = 50000
      expect(calculateXP(state)).toBe(10)
    })
  })
})





