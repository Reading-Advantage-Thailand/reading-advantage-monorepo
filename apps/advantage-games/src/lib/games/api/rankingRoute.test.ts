import { createRankingRoute } from './rankingRoute'

describe('createRankingRoute (Phase 4 schema validation)', () => {
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
    it('returns a leaderboardResponseSchema-valid response', async () => {
      const domainGames = await import('@reading-advantage/domain/games')
      const schema = domainGames.leaderboardResponseSchema
      if (!schema) {
        throw new Error(
          'leaderboardResponseSchema is not exported from @reading-advantage/domain/games',
        )
      }

      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()

      expect(() => schema.parse(data)).not.toThrow()
      expect(data).toHaveProperty('schoolScoped', true)
      expect(Array.isArray(data.rankings)).toBe(true)
    })

    it('does not include the legacy "normal" difficulty key (B21-018)', async () => {
      const route = createRankingRoute()
      const response = await route.GET()
      const data = await response.json()
      const serialized = JSON.stringify(data)

      expect(serialized).not.toContain('"normal"')
    })

    it('returns consistent rankings structure', async () => {
      const route = createRankingRoute()
      const response1 = await route.GET()
      const response2 = await route.GET()
      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1).toEqual(data2)
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
  })
})
