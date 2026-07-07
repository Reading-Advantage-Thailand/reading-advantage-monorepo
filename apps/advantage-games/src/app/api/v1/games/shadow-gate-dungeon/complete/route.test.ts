import { POST } from './route'

class MockRequest {
  private readonly body: string

  constructor(body: unknown) {
    this.body = JSON.stringify(body)
  }

  async json() {
    return JSON.parse(this.body)
  }
}

describe('shadow-gate-dungeon complete route', () => {
  it('returns success response', async () => {
    const response = await POST(
      new MockRequest({
        gameType: 'shadow-gate-dungeon',
        difficulty: 'medium',
        score: 800,
        accuracy: 0.8,
        correctAnswers: 8,
        totalAttempts: 10,
        duration: 45_000,
        victory: true,
        idempotencyKey: '33333333-3333-3333-3333-333333333333',
        clientTimestamp: 1_700_000_000_000,
      }) as unknown as Request,
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe(200)
    expect(data.duplicate).toBe(false)
    expect(typeof data.xpEarned).toBe('number')
    expect(data.activityId).toBe(
      'game:shadow-gate-dungeon:33333333-3333-3333-3333-333333333333',
    )
  })

  it('rejects an invalid payload', async () => {
    const response = await POST(
      new MockRequest({ accuracy: 2 }) as unknown as Request,
    )
    expect(response.status).toBe(400)
  })
})
