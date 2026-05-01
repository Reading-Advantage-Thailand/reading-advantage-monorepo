import {
  createLabyrinthGoblinKingState,
  tickLabyrinthGoblinKing,
  startLabyrinthGoblinKing,
  calculateLabyrinthXP,
  getTileAt,
} from '../labyrinthGoblinKing'
import type { VocabularyItem } from '@/store/useGameStore'

const mockSentence: VocabularyItem = {
  term: 'The cat sits on the mat',
  translation: 'Le chat est assis sur le tapis',
}

describe('labyrinthGoblinKing', () => {
  describe('createLabyrinthGoblinKingState', () => {
    it('creates initial state with default config', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])

      expect(state.status).toBe('start')
      expect(state.difficulty).toBe('normal')
      expect(state.goblinType).toBe('scout')
      expect(state.player.lives).toBe(3)
      expect(state.words).toEqual(['The', 'cat', 'sits', 'on', 'the', 'mat'])
    })

    it('creates word orbs based on difficulty word count', () => {
      const easyState = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'easy' })
      const normalState = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'normal' })
      const hardState = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'hard' })

      expect(easyState.wordOrbs.length).toBe(4)
      expect(normalState.wordOrbs.length).toBe(5)
      expect(hardState.wordOrbs.length).toBe(6)
    })

    it('creates goblins based on difficulty goblin count', () => {
      const easyState = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'easy' })
      const hardState = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'hard' })

      expect(easyState.goblins.length).toBe(2)
      expect(hardState.goblins.length).toBe(4)
    })

    it('creates maze with walls on borders', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])

      expect(state.maze[0][0]).toBe('wall')
      expect(state.maze[0][5]).toBe('wall')
      expect(state.maze[state.maze.length - 1][5]).toBe('wall')
    })

    it('sets goblin speed based on type', () => {
      const scoutState = createLabyrinthGoblinKingState([mockSentence], { goblinType: 'scout' })
      const eliteState = createLabyrinthGoblinKingState([mockSentence], { goblinType: 'elite' })

      expect(scoutState.goblins[0].speed).toBe(1.5)
      expect(eliteState.goblins[0].speed).toBe(2.5)
    })
  })

  describe('startLabyrinthGoblinKing', () => {
    it('changes status from start to playing', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)

      expect(started.status).toBe('playing')
    })

    it('does not change status if not in start', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)
      const restarted = startLabyrinthGoblinKing(started)

      expect(restarted.status).toBe('playing')
    })
  })

  describe('tickLabyrinthGoblinKing', () => {
    it('returns unchanged state if not playing', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const ticked = tickLabyrinthGoblinKing(state, { dx: 0, dy: 0 }, 16.67)

      expect(ticked.status).toBe('start')
    })

    it('moves player based on input', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)
      const ticked = tickLabyrinthGoblinKing(started, { dx: 1, dy: 0 }, 16.67)

      expect(ticked.player.x).toBeGreaterThan(state.player.x)
    })

    it('increments gameTime', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)
      const ticked = tickLabyrinthGoblinKing(started, { dx: 0, dy: 0 }, 100)

      expect(ticked.gameTime).toBe(100)
    })

    it('collects word orbs on collision', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)

      const firstOrb = started.wordOrbs.find(o => o.orderIndex === 0)!
      const stateWithPlayerAtOrb = {
        ...started,
        player: { ...started.player, x: firstOrb.x, y: firstOrb.y },
      }

      const ticked = tickLabyrinthGoblinKing(stateWithPlayerAtOrb, { dx: 0, dy: 0 }, 16.67)

      const collectedOrb = ticked.wordOrbs.find(o => o.id === firstOrb.id)
      expect(collectedOrb?.collected).toBe(true)
      expect(ticked.correctAnswers).toBe(1)
      expect(ticked.targetIndex).toBe(1)
    })

    it('penalizes wrong word collection', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)

      const wrongOrb = started.wordOrbs.find(o => o.orderIndex === 1)!
      const stateWithPlayerAtOrb = {
        ...started,
        player: { ...started.player, x: wrongOrb.x, y: wrongOrb.y },
      }

      const ticked = tickLabyrinthGoblinKing(stateWithPlayerAtOrb, { dx: 0, dy: 0 }, 16.67)

      expect(ticked.wrongAnswers).toBe(1)
      expect(ticked.player.lives).toBe(2)
    })

    it('sets defeat when lives reach zero', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const started = startLabyrinthGoblinKing(state)
      const oneLifeState = {
        ...started,
        player: { ...started.player, lives: 1 },
      }

      const wrongOrb = oneLifeState.wordOrbs.find(o => o.orderIndex === 1)!
      const stateWithPlayerAtOrb = {
        ...oneLifeState,
        player: { ...oneLifeState.player, x: wrongOrb.x, y: wrongOrb.y },
      }

      const ticked = tickLabyrinthGoblinKing(stateWithPlayerAtOrb, { dx: 0, dy: 0 }, 16.67)

      expect(ticked.status).toBe('defeat')
    })

    it('triggers heroic aura after collecting all words', () => {
      const state = createLabyrinthGoblinKingState([mockSentence], { difficulty: 'easy' })
      const started = startLabyrinthGoblinKing(state)

      let currentState = started
      for (let i = 0; i < 4; i++) {
        const orb = currentState.wordOrbs.find(o => o.orderIndex === i)!
        currentState = {
          ...currentState,
          player: { ...currentState.player, x: orb.x, y: orb.y },
        }
        currentState = tickLabyrinthGoblinKing(currentState, { dx: 0, dy: 0 }, 16.67)
      }

      expect(currentState.player.heroicAura).toBe(true)
      expect(currentState.goblins.every(g => g.fleeing)).toBe(true)
    })
  })

  describe('calculateLabyrinthXP', () => {
    it('calculates base XP from correct answers', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const xp = calculateLabyrinthXP({
        ...state,
        correctAnswers: 5,
        wrongAnswers: 0,
        goblinsEaten: 0,
      })

      expect(xp).toBe(5)
    })

    it('adds bonus for goblins eaten', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const xp = calculateLabyrinthXP({
        ...state,
        correctAnswers: 5,
        wrongAnswers: 0,
        goblinsEaten: 3,
      })

      expect(xp).toBe(8)
    })

    it('caps at max XP', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])
      const xp = calculateLabyrinthXP({
        ...state,
        correctAnswers: 10,
        wrongAnswers: 0,
        goblinsEaten: 10,
      })

      expect(xp).toBe(10)
    })
  })

  describe('getTileAt', () => {
    it('returns wall for out of bounds', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])

      expect(getTileAt(-10, -10, state.maze)).toBe('wall')
      expect(getTileAt(1000, 1000, state.maze)).toBe('wall')
    })

    it('returns correct tile type', () => {
      const state = createLabyrinthGoblinKingState([mockSentence])

      expect(getTileAt(16, 16, state.maze)).toBe('wall')
    })
  })
})
