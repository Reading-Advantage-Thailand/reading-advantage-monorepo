import { POST } from './route'

describe('shadow-gate-dungeon complete route', () => {
  it('returns success response', async () => {
    const request = {
      json: async () => ({
        xpEarned: 10,
        accuracy: 0.8,
        correctAnswers: 8,
        totalAttempts: 10,
      }),
    } as unknown as Request

    const response = await POST(request)
    const data = await response.json()
    expect(data.message).toBe('Game completed successfully')
    expect(data.xpEarned).toBeDefined()
    expect(data.status).toBe(200)
  })
})
