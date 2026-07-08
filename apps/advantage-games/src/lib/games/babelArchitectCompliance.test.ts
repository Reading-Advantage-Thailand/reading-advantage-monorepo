import { gameCards } from '@/lib/gameCards'

describe('Babel Architect', () => {
  it('is registered as playable with a route', () => {
    const card = gameCards.find(g => g.id === 'babel-architect')
    expect(card).toBeDefined()
    expect(card!.title).toBe("Babel's Architect")
    expect(card!.status).toBe('playable')
    expect(card!.href).toBe('/student/games/sentence/babel-architect')
  })
})
