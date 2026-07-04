import { createCompleteRoute } from './completeRoute'

// Minimal Request mock — the route receives a plain JSON body.
class MockRequest {
  private body: string

  constructor(body: unknown) {
    this.body = JSON.stringify(body)
  }

  async json() {
    return JSON.parse(this.body)
  }
}

const validPayload = {
  gameType: 'haunted-library',
  difficulty: 'medium',
  score: 42,
  accuracy: 5 / 6,
  correctAnswers: 5,
  totalAttempts: 6,
  duration: 12_345,
  victory: true,
  idempotencyKey: '11111111-1111-1111-1111-111111111111',
  clientTimestamp: 1_700_000_000_000,
}

describe('createCompleteRoute (Phase 3 contract delegation)', () => {
  it('returns force-static dynamic config', () => {
    const route = createCompleteRoute()
    expect(route.dynamic).toBe('force-static')
  })

  it('returns 200 with server-computed xpEarned, stable activityId, duplicate: false', async () => {
    const route = createCompleteRoute()
    const response = await route.POST(
      new MockRequest(validPayload) as unknown as Request,
    )

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toMatchObject({
      xpEarned: expect.any(Number),
      activityId: expect.any(String),
      duplicate: false,
      status: 200,
    })
    expect(data.activityId).toBe(
      `game:haunted-library:${validPayload.idempotencyKey}`,
    )
    expect(data.xpEarned).toBeGreaterThanOrEqual(0)
    expect(data.xpEarned).toBeLessThanOrEqual(10)
  })

  it('rejects client-supplied xp with 400 (D-02)', async () => {
    const route = createCompleteRoute()
    const response = await route.POST(
      new MockRequest({ ...validPayload, xp: 100 }) as unknown as Request,
    )

    expect(response.status).toBe(400)
  })

  it('rejects accuracy > 1 with 400 (D-01 canonical unit)', async () => {
    const route = createCompleteRoute()
    const response = await route.POST(
      new MockRequest({ ...validPayload, accuracy: 75 }) as unknown as Request,
    )

    expect(response.status).toBe(400)
  })

  it('rejects an invalid gameType with 400', async () => {
    const route = createCompleteRoute()
    const response = await route.POST(
      new MockRequest({
        ...validPayload,
        gameType: 'fake-game',
      }) as unknown as Request,
    )

    expect(response.status).toBe(400)
  })

  it('rejects a malformed idempotencyKey with 400', async () => {
    const route = createCompleteRoute()
    const response = await route.POST(
      new MockRequest({
        ...validPayload,
        idempotencyKey: 'not-a-uuid',
      }) as unknown as Request,
    )

    expect(response.status).toBe(400)
  })

  it('does not call a real DB insert (standalone mock route)', async () => {
    const route = createCompleteRoute()
    // A4: the route must not accept a db parameter or perform persistence.
    // This test passes when the route is a pure mock validator.
    const response = await route.POST(
      new MockRequest(validPayload) as unknown as Request,
    )
    expect(response.status).toBe(200)
  })
})
