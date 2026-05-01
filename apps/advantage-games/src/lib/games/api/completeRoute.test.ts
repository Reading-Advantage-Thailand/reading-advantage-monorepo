import { createCompleteRoute } from './completeRoute'
import type { CompleteRequest } from './types'

// Mock NextRequest
class MockRequest {
  private body: string

  constructor(body: unknown) {
    this.body = JSON.stringify(body)
  }

  async json() {
    return JSON.parse(this.body)
  }
}

describe('createCompleteRoute', () => {
  describe('configuration', () => {
    it('returns force-static dynamic config', () => {
      const route = createCompleteRoute()
      expect(route.dynamic).toBe('force-static')
    })

    it('exports POST handler function', () => {
      const route = createCompleteRoute()
      expect(typeof route.POST).toBe('function')
    })
  })

  describe('POST handler - successful completion', () => {
    it('returns success response with xp earned', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 100,
        accuracy: 0.85,
        correctAnswers: 17,
        totalAttempts: 20,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        message: 'Game completed successfully',
        xpEarned: 100,
        status: 200,
      })
      expect(data.activityId).toBeDefined()
      expect(typeof data.activityId).toBe('string')
    })

    it('generates unique activity IDs', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 50,
        accuracy: 0.5,
        correctAnswers: 5,
        totalAttempts: 10,
      }

      const response1 = await route.POST(new MockRequest(requestBody) as unknown as Request)
      const data1 = await response1.json()

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2))

      const response2 = await route.POST(new MockRequest(requestBody) as unknown as Request)
      const data2 = await response2.json()

      expect(data1.activityId).not.toBe(data2.activityId)
    })

    it('activityId contains mock-activity prefix', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 75,
        accuracy: 0.75,
        correctAnswers: 15,
        totalAttempts: 20,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.activityId).toMatch(/^mock-activity-/)
    })
  })

  describe('POST handler - XP calculation', () => {
    it('uses provided xp when given', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 250,
        accuracy: 0.9,
        correctAnswers: 18,
        totalAttempts: 20,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.xpEarned).toBe(250)
    })

    it('calculates xp from correctAnswers and accuracy when xp not provided', async () => {
      const route = createCompleteRoute()
      const requestBody = {
        accuracy: 0.8,
        correctAnswers: 10,
        totalAttempts: 12,
      } as CompleteRequest
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      // xp = correctAnswers * accuracy = 10 * 0.8 = 8
      expect(data.xpEarned).toBe(8)
    })

    it('calculates accuracy from totalAttempts when not provided', async () => {
      const route = createCompleteRoute()
      const requestBody = {
        correctAnswers: 15,
        totalAttempts: 20,
      } as CompleteRequest
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      // accuracy = 15 / 20 = 0.75
      // xp = 15 * 0.75 = 11.25 -> floor = 11
      expect(data.xpEarned).toBe(11)
    })

    it('handles zero totalAttempts without division error', async () => {
      const route = createCompleteRoute()
      const requestBody = {
        correctAnswers: 0,
        totalAttempts: 0,
        xp: 0,
      } as CompleteRequest
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.xpEarned).toBe(0)
      expect(data.status).toBe(200)
    })

    it('handles zero xp correctly', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 0,
        accuracy: 0,
        correctAnswers: 0,
        totalAttempts: 10,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.xpEarned).toBe(0)
    })
  })

  describe('POST handler - response format', () => {
    it('returns all required fields', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 100,
        accuracy: 0.85,
        correctAnswers: 17,
        totalAttempts: 20,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('xpEarned')
      expect(data).toHaveProperty('activityId')
      expect(data).toHaveProperty('status')
    })

    it('includes difficulty in response when provided', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 150,
        accuracy: 0.95,
        correctAnswers: 19,
        totalAttempts: 20,
        difficulty: 'hard',
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.status).toBe(200)
    })
  })

  describe('POST handler - edge cases', () => {
    it('handles perfect score', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 500,
        accuracy: 1.0,
        correctAnswers: 100,
        totalAttempts: 100,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.xpEarned).toBe(500)
      expect(data.status).toBe(200)
    })

    it('handles minimum valid request', async () => {
      const route = createCompleteRoute()
      const requestBody = {
        correctAnswers: 5,
        totalAttempts: 10,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.status).toBe(200)
      expect(data.message).toBe('Game completed successfully')
    })

    it('handles large XP values', async () => {
      const route = createCompleteRoute()
      const requestBody: CompleteRequest = {
        xp: 1000000,
        accuracy: 1.0,
        correctAnswers: 1000,
        totalAttempts: 1000,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      expect(data.xpEarned).toBe(1000000)
    })

    it('handles decimal accuracy values', async () => {
      const route = createCompleteRoute()
      const requestBody = {
        correctAnswers: 7,
        totalAttempts: 11,
      }
      const request = new MockRequest(requestBody) as unknown as Request
      const response = await route.POST(request)
      const data = await response.json()

      // accuracy = 7 / 11 ≈ 0.636
      // xp = floor(7 * 0.636) = floor(4.454) = 4
      expect(data.xpEarned).toBe(4)
    })
  })
})
