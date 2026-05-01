import {
  createStormCastleTowerState,
  movePlayer,
  collectWindow,
  spawnHazard,
  advanceStormCastleTowerTime,
  startGame,
  getGridPosition,
  type StormCastleTowerState,
} from '../stormCastleTower'
import { STORM_CASTLE_TOWER_CONFIG } from '../stormCastleTowerConfig'
import type { VocabularyItem } from '@/store/useGameStore'

const mockVocabulary: VocabularyItem[] = [
  { term: 'The dragon flies high', translation: 'Le dragon vole haut' },
  { term: 'The knight is brave', translation: 'Le chevalier est brave' },
]

describe('stormCastleTower', () => {
  describe('createStormCastleTowerState', () => {
    it('should create initial state with vocabulary', () => {
      let seed = 0.1
      const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
      
      const state = createStormCastleTowerState(mockVocabulary, { rng })
      
      expect(state.phase).toBe('start')
      expect(state.player.lives).toBe(STORM_CASTLE_TOWER_CONFIG.player.lives)
      expect(state.words.length).toBeGreaterThan(0)
      expect(state.targetIndex).toBe(0)
      expect(state.windows.length).toBe(state.words.length)
    })

    it('should throw error with empty vocabulary', () => {
      expect(() => createStormCastleTowerState([])).toThrow('Vocabulary cannot be empty')
    })

    it('should use provided config options', () => {
      const state = createStormCastleTowerState(mockVocabulary, {
        difficulty: 'hard',
        guardType: 'elite-watchman',
      })
      
      expect(state.difficulty).toBe('hard')
      expect(state.guardType).toBe('elite-watchman')
    })

    it('should use seeded rng for deterministic window placement', () => {
      let seed = 0.5
      const rng = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
      
      const state1 = createStormCastleTowerState(mockVocabulary, { rng })
      seed = 0.5
      const state2 = createStormCastleTowerState(mockVocabulary, { rng })
      
      expect(state1.windows.map(w => w.position)).toEqual(state2.windows.map(w => w.position))
    })
  })

  describe('startGame', () => {
    it('should transition from start to playing', () => {
      const state = createStormCastleTowerState(mockVocabulary)
      const playingState = startGame(state)
      
      expect(playingState.phase).toBe('playing')
      expect(playingState.gameTime).toBe(0)
    })
  })

  describe('movePlayer', () => {
    let playingState: StormCastleTowerState

    beforeEach(() => {
      const state = createStormCastleTowerState(mockVocabulary)
      playingState = startGame(state)
      playingState = { ...playingState, gameTime: 1000 }
    })

    it('should move player up', () => {
      const newState = movePlayer(playingState, 'up')
      expect(newState.player.position.row).toBe(1)
    })

    it('should not move player below row 0', () => {
      const newState = movePlayer(playingState, 'down')
      expect(newState.player.position.row).toBe(0)
    })

    it('should move player left within bounds', () => {
      const centerState = { 
        ...playingState, 
        player: { ...playingState.player, position: { col: 2, row: 0 } }
      }
      const newState = movePlayer(centerState, 'left')
      expect(newState.player.position.col).toBe(1)
    })

    it('should not move player left past column 0', () => {
      const leftState = { 
        ...playingState, 
        player: { ...playingState.player, position: { col: 0, row: 0 } }
      }
      const newState = movePlayer(leftState, 'left')
      expect(newState.player.position.col).toBe(0)
    })

    it('should move player right within bounds', () => {
      const centerState = { 
        ...playingState, 
        player: { ...playingState.player, position: { col: 1, row: 0 } }
      }
      const newState = movePlayer(centerState, 'right')
      expect(newState.player.position.col).toBe(2)
    })

    it('should not move player right past max column', () => {
      const rightState = { 
        ...playingState, 
        player: { ...playingState.player, position: { col: STORM_CASTLE_TOWER_CONFIG.columns - 1, row: 0 } }
      }
      const newState = movePlayer(rightState, 'right')
      expect(newState.player.position.col).toBe(STORM_CASTLE_TOWER_CONFIG.columns - 1)
    })

    it('should respect move cooldown', () => {
      const state1 = movePlayer(playingState, 'up')
      const state2 = movePlayer(state1, 'up')
      expect(state2.player.position.row).toBe(1)
    })

    it('should not move when not in playing phase', () => {
      const startState = createStormCastleTowerState(mockVocabulary)
      const newState = movePlayer(startState, 'up')
      expect(newState.player.position.row).toBe(0)
    })
  })

  describe('collectWindow', () => {
    let playingState: StormCastleTowerState

    beforeEach(() => {
      // Use seeded RNG for deterministic placement
      let seed = 0.5
      const rng = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
      const state = createStormCastleTowerState(mockVocabulary, { rng })
      playingState = startGame(state)
      playingState = { ...playingState, gameTime: 1000 }
    })

    it('should collect correct word and advance target index', () => {
      const targetWindow = playingState.windows.find(w => w.wordIndex === 0)!
      const playerAdjacentState = {
        ...playingState,
        player: {
          ...playingState.player,
          position: { col: targetWindow.position.col, row: targetWindow.position.row },
        },
      }
      
      const newState = collectWindow(playerAdjacentState)
      
      expect(newState.targetIndex).toBe(1)
      expect(newState.correctWords).toBe(1)
      expect(newState.totalAttempts).toBe(1)
      expect(newState.windows.find(w => w.id === targetWindow.id)?.state).toBe('collected')
    })

    it('should close window and lose life on wrong word', () => {
      const wrongWindow = playingState.windows.find(w => w.wordIndex === 1)!
      const playerAdjacentState = {
        ...playingState,
        player: {
          ...playingState.player,
          position: { col: wrongWindow.position.col, row: wrongWindow.position.row },
        },
      }
      
      const newState = collectWindow(playerAdjacentState)
      
      expect(newState.targetIndex).toBe(0)
      expect(newState.correctWords).toBe(0)
      expect(newState.player.lives).toBe(2)
      expect(newState.windows.find(w => w.id === wrongWindow.id)?.state).toBe('closed')
    })

    it('should trigger victory when all words collected', () => {
      let state = playingState
      state = { ...state, targetIndex: 3, correctWords: 3 }
      
      const lastWindow = state.windows.find(w => w.wordIndex === 3)!
      state = {
        ...state,
        player: {
          ...state.player,
          position: { col: lastWindow.position.col, row: lastWindow.position.row },
        },
      }
      
      const newState = collectWindow(state)
      expect(newState.phase).toBe('victory')
    })

    it('should trigger defeat when lives reach zero', () => {
      let state = {
        ...playingState,
        player: { ...playingState.player, lives: 1 },
      }
      
      const wrongWindow = state.windows.find(w => w.wordIndex === 1)!
      state = {
        ...state,
        player: {
          ...state.player,
          position: { col: wrongWindow.position.col, row: wrongWindow.position.row },
        },
      }
      
      const newState = collectWindow(state)
      expect(newState.phase).toBe('defeat')
    })

    it('should do nothing when no adjacent window', () => {
      const newState = collectWindow(playingState)
      expect(newState.targetIndex).toBe(0)
      expect(newState.correctWords).toBe(0)
    })
  })

  describe('spawnHazard', () => {
    let playingState: StormCastleTowerState

    beforeEach(() => {
      const state = createStormCastleTowerState(mockVocabulary)
      playingState = startGame(state)
    })

    it('should spawn a hazard', () => {
      let seed = 0.3
      const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
      
      const newState = spawnHazard(playingState, rng)
      
      expect(newState.hazards.length).toBe(1)
      expect(newState.hazards[0].y).toBe(-50)
      expect(newState.hazards[0].column).toBeGreaterThanOrEqual(0)
      expect(newState.hazards[0].column).toBeLessThan(STORM_CASTLE_TOWER_CONFIG.columns)
    })

    it('should not spawn hazard when not playing', () => {
      const startState = createStormCastleTowerState(mockVocabulary)
      const newState = spawnHazard(startState)
      expect(newState.hazards.length).toBe(0)
    })
  })

  describe('advanceStormCastleTowerTime', () => {
    let playingState: StormCastleTowerState

    beforeEach(() => {
      const state = createStormCastleTowerState(mockVocabulary)
      playingState = startGame(state)
    })

    it('should advance game time', () => {
      const newState = advanceStormCastleTowerTime(playingState, 50)
      expect(newState.gameTime).toBe(50)
    })

    it('should update hazard positions', () => {
      let state = spawnHazard(playingState, () => 0.3)
      state = spawnHazard(state, () => 0.3)
      expect(state.hazards.length).toBeGreaterThan(0)
      
      const initialY = state.hazards[0].y
      const newState = advanceStormCastleTowerTime(state, 100)
      
      expect(newState.hazards[0].y).toBeGreaterThan(initialY)
    })

    it('should remove hazards that go off screen', () => {
      let state = spawnHazard(playingState)
      state = {
        ...state,
        hazards: [{ ...state.hazards[0], y: STORM_CASTLE_TOWER_CONFIG.gameHeight + 200 }],
      }
      
      const newState = advanceStormCastleTowerTime(state, 100)
      
      expect(newState.hazards.length).toBe(0)
    })

    it('should not advance when not playing', () => {
      const startState = createStormCastleTowerState(mockVocabulary)
      const newState = advanceStormCastleTowerTime(startState, 50)
      expect(newState.gameTime).toBe(0)
    })
  })

  describe('getGridPosition', () => {
    it('should calculate grid position correctly', () => {
      const pos = getGridPosition(2, 3, 0)
      const cellSize = STORM_CASTLE_TOWER_CONFIG.cellSize
      
      expect(pos.x).toBe(2 * cellSize + cellSize / 2)
      expect(pos.y).toBe(3 * cellSize)
    })

    it('should account for scroll offset', () => {
      const pos = getGridPosition(0, 10, 200)
      const cellSize = STORM_CASTLE_TOWER_CONFIG.cellSize
      
      expect(pos.y).toBe(10 * cellSize - 200)
    })
  })
})
