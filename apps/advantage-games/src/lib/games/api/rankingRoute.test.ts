import { createRankingRoute } from './rankingRoute'

describe('createRankingRoute', () => {
  describe('configuration', () => {
    it('returns force-static dynamic config', () => {
      const route = createRankingRoute()
      expect(route.dynamic).toBe('force-static')
    })

    it('exports GET handler function', () => {
      const route = createRankingRoute()
      expect(typeof route.GET).toBe('function')
    })
  })

  describe('GET handler', () => {
    it('returns rankings object', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      expect(data).toHaveProperty('rankings')
    })

    it('returns all four difficulty levels', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      expect(data.rankings).toHaveProperty('easy')
      expect(data.rankings).toHaveProperty('normal')
      expect(data.rankings).toHaveProperty('hard')
      expect(data.rankings).toHaveProperty('extreme')
    })

    it('returns empty arrays for all difficulties', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      expect(data.rankings).toEqual({
        easy: [],
        normal: [],
        hard: [],
        extreme: [],
      })
    })

    it('returns consistent empty rankings structure', async () => {
      const route = createRankingRoute()
      const response1 = await route.GET()
      const response2 = await route.GET()
      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.rankings).toEqual(data2.rankings)
    })
  })

  describe('response format', () => {
    it('returns JSON response', async () => {
      const route = createRankingRoute()
      const response = await route.GET()

      expect(typeof response.json).toBe('function')
    })

    it('response is serializable', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      expect(() => JSON.stringify(data)).not.toThrow()
    })

    it('has correct response shape', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      const keys = Object.keys(data.rankings)
      expect(keys).toHaveLength(4)
      expect(keys).toContain('easy')
      expect(keys).toContain('normal')
      expect(keys).toContain('hard')
      expect(keys).toContain('extreme')
    })
  })

  describe('mock behavior', () => {
    it('returns empty rankings as mock behavior', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      // Mock route should return empty rankings since there's no real database
      expect(data.rankings.easy).toHaveLength(0)
      expect(data.rankings.normal).toHaveLength(0)
      expect(data.rankings.hard).toHaveLength(0)
      expect(data.rankings.extreme).toHaveLength(0)
    })

    it('does not include user data in mock response', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      // Ensure no user data is leaked in mock
      const allRankings = [
        ...data.rankings.easy,
        ...data.rankings.normal,
        ...data.rankings.hard,
        ...data.rankings.extreme,
      ]
      expect(allRankings).toHaveLength(0)
    })
  })

  describe('type safety', () => {
    it('returns RankingsByDifficulty structure', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      // Verify each difficulty is an array
      expect(Array.isArray(data.rankings.easy)).toBe(true)
      expect(Array.isArray(data.rankings.normal)).toBe(true)
      expect(Array.isArray(data.rankings.hard)).toBe(true)
      expect(Array.isArray(data.rankings.extreme)).toBe(true)
    })
  })
})
