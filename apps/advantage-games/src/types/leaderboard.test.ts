import {
  createEmptyLeaderboard,
  deserializeLeaderboard,
  serializeLeaderboard,
  generateSessionId,
  type LeaderboardState,
  type SessionRecord,
} from './leaderboard'

describe('leaderboard types', () => {
  describe('createEmptyLeaderboard', () => {
    it('creates empty state with zero totalXp', () => {
      const state = createEmptyLeaderboard()
      expect(state.sessions).toEqual([])
      expect(state.highScores).toEqual({})
      expect(state.totalXp).toBe(0)
    })

    it('returns correct LeaderboardState shape', () => {
      const state = createEmptyLeaderboard()
      expect(state).toHaveProperty('sessions')
      expect(state).toHaveProperty('highScores')
      expect(state).toHaveProperty('totalXp')
    })
  })

  describe('serializeLeaderboard', () => {
    it('serializes empty state to JSON', () => {
      const state = createEmptyLeaderboard()
      const json = serializeLeaderboard(state)
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('round-trips empty state through serialize/deserialize', () => {
      const original = createEmptyLeaderboard()
      const json = serializeLeaderboard(original)
      const restored = deserializeLeaderboard(json)
      expect(restored).toEqual(original)
    })

    it('round-trips populated state through serialize/deserialize', () => {
      const original: LeaderboardState = {
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
      }
      const json = serializeLeaderboard(original)
      const restored = deserializeLeaderboard(json)
      expect(restored).toEqual(original)
    })
  })

  describe('deserializeLeaderboard', () => {
    it('returns empty state for invalid JSON', () => {
      const state = deserializeLeaderboard('not valid json')
      expect(state.sessions).toEqual([])
      expect(state.highScores).toEqual({})
      expect(state.totalXp).toBe(0)
    })

    it('returns empty state for JSON missing required fields', () => {
      const state = deserializeLeaderboard('{"sessions": []}')
      expect(state.sessions).toEqual([])
      expect(state.highScores).toEqual({})
      expect(state.totalXp).toBe(0)
    })

    it('returns empty state for null', () => {
      const state = deserializeLeaderboard('null')
      expect(state.sessions).toEqual([])
      expect(state.highScores).toEqual({})
      expect(state.totalXp).toBe(0)
    })

    it('returns empty state for empty string', () => {
      const state = deserializeLeaderboard('')
      expect(state.sessions).toEqual([])
      expect(state.highScores).toEqual({})
      expect(state.totalXp).toBe(0)
    })

    it('parses valid JSON with all required fields', () => {
      const json = JSON.stringify({
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
      const state = deserializeLeaderboard(json)
      expect(state.sessions).toHaveLength(1)
      expect(state.highScores['castle-defense'].bestScore).toBe(1500)
      expect(state.totalXp).toBe(100)
    })
  })

  describe('generateSessionId', () => {
    it('generates unique IDs', () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()
      expect(id1).not.toBe(id2)
    })

    it('includes timestamp', () => {
      const before = Date.now()
      const id = generateSessionId()
      const after = Date.now()
      const parts = id.split('-')
      const timestampPart = parseInt(parts[0], 10)
      expect(timestampPart).toBeGreaterThanOrEqual(before)
      expect(timestampPart).toBeLessThanOrEqual(after)
    })

    it('has format timestamp-randomstring', () => {
      const id = generateSessionId()
      const parts = id.split('-')
      expect(parts.length).toBeGreaterThanOrEqual(2)
      expect(parts[0]).toMatch(/^\d+$/)
    })
  })

  describe('SessionRecord interface', () => {
    it('accepts valid session record shape', () => {
      const record: SessionRecord = {
        id: 'test-id',
        gameId: 'dragon-flight',
        gameName: 'Dragon Flight',
        score: 2000,
        xp: 150,
        accuracy: 0.92,
        timestamp: Date.now(),
      }
      expect(record.gameId).toBe('dragon-flight')
      expect(record.xp).toBe(150)
    })
  })
})