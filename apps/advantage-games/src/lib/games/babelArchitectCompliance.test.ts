import { gameCards } from '@/lib/gameCards'

describe('Babel Architect', () => {
  it('is registered as coming-soon', () => {
    const card = gameCards.find(g => g.id === 'babel-architect')
    expect(card).toBeDefined()
    expect(card!.title).toBe("Babel's Architect")
    expect(card!.status).toBe('coming-soon')
    expect(card!.href).toBeUndefined()
  })
})
