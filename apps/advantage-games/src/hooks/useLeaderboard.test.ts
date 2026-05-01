import { renderHook, act } from '@testing-library/react'
import { useLeaderboard } from './useLeaderboard'
import { LEADERBOARD_KEY } from '../types/leaderboard'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: () => {
      store = {}
    },
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useLeaderboard', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('recordSession', () => {
    it('creates a new session record', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('dragon-flight', 'Dragon Flight', 1500, 100, 0.85)
      })
      const record = result.current.recordSession('dragon-flight', 'Dragon Flight', 1500, 100, 0.85)
      expect(record.gameId).toBe('dragon-flight')
      expect(record.gameName).toBe('Dragon Flight')
      expect(record.score).toBe(1500)
      expect(record.xp).toBe(100)
      expect(record.accuracy).toBe(0.85)
      expect(record.id).toBeDefined()
      expect(record.timestamp).toBeDefined()
    })

    it('updates high scores for new game', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('castle-defense', 'Castle Defense', 2000, 150, 0.9)
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.highScores['castle-defense']).toEqual({
        gameId: 'castle-defense',
        gameName: 'Castle Defense',
        bestScore: 2000,
        bestXp: 150,
        lastPlayed: expect.any(Number),
      })
    })

    it('keeps highest score for repeated game', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('castle-defense', 'Castle Defense', 1000, 50, 0.8)
        result.current.recordSession('castle-defense', 'Castle Defense', 3000, 200, 0.9)
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.highScores['castle-defense'].bestScore).toBe(3000)
      expect(leaderboard.highScores['castle-defense'].bestXp).toBe(200)
    })

    it('does not lower high score if new score is lower', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('castle-defense', 'Castle Defense', 3000, 200, 0.9)
        result.current.recordSession('castle-defense', 'Castle Defense', 1000, 50, 0.8)
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.highScores['castle-defense'].bestScore).toBe(3000)
      expect(leaderboard.highScores['castle-defense'].bestXp).toBe(200)
    })

    it('accumulates totalXp across sessions', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('game1', 'Game 1', 1000, 100, 0.8)
        result.current.recordSession('game2', 'Game 2', 2000, 150, 0.85)
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.totalXp).toBe(250)
    })
  })

  describe('clearHistory', () => {
    it('clears all sessions and high scores', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('castle-defense', 'Castle Defense', 2000, 150, 0.9)
        result.current.clearHistory()
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.sessions).toEqual([])
      expect(leaderboard.highScores).toEqual({})
      expect(leaderboard.totalXp).toBe(0)
    })
  })

  describe('getLeaderboard', () => {
    it('returns current leaderboard state', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('dragon-flight', 'Dragon Flight', 1500, 100, 0.85)
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.sessions).toHaveLength(1)
      expect(leaderboard.highScores['dragon-flight']).toBeDefined()
    })
  })

  describe('MAX_SESSIONS cap', () => {
    it('caps sessions at 20', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.recordSession(`game-${i}`, `Game ${i}`, 1000 + i, 50 + i, 0.8)
        }
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.sessions).toHaveLength(20)
      expect(leaderboard.sessions[0].gameId).toBe('game-24')
    })

    it('keeps most recent sessions when capped', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.recordSession(`game-${i}`, `Game ${i}`, 1000 + i, 50 + i, 0.8)
        }
      })
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.sessions[19].gameId).toBe('game-5')
    })
  })

  describe('localStorage persistence', () => {
    it('persists data to localStorage on recordSession', () => {
      const { result } = renderHook(() => useLeaderboard())
      act(() => {
        result.current.recordSession('dragon-flight', 'Dragon Flight', 1500, 100, 0.85)
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        LEADERBOARD_KEY,
        expect.any(String)
      )
    })

    it('loads from localStorage on init', () => {
      const stored = JSON.stringify({
        sessions: [
          {
            id: 'test-1',
            gameId: 'castle-defense',
            gameName: 'Castle Defense',
            score: 1500,
            xp: 100,
            accuracy: 0.85,
            timestamp: 1700000000000,
          },
        ],
        highScores: {
          'castle-defense': {
            gameId: 'castle-defense',
            gameName: 'Castle Defense',
            bestScore: 1500,
            bestXp: 100,
            lastPlayed: 1700000000000,
          },
        },
        totalXp: 100,
      })
      localStorageMock.getItem.mockReturnValueOnce(stored)
      const { result } = renderHook(() => useLeaderboard())
      const leaderboard = result.current.getLeaderboard()
      expect(leaderboard.sessions).toHaveLength(1)
      expect(leaderboard.highScores['castle-defense'].bestScore).toBe(1500)
    })
  })
})