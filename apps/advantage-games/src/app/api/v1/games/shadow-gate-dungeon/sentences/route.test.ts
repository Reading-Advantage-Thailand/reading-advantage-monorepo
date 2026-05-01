import { GET } from './route'

describe('shadow-gate-dungeon sentences route', () => {
  it('returns sentences', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.sentences).toBeDefined()
    expect(data.sentences.length).toBeGreaterThan(0)
    expect(data.status).toBe(200)
  })
})
