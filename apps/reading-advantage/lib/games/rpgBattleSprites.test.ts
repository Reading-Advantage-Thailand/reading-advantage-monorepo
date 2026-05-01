import { selectRandomEnemySprite, selectRandomHeroSprite, spriteCatalog } from './rpgBattleSprites'

describe('rpgBattleSprites', () => {
  it('selects the first hero and enemy when rng returns 0', () => {
    const rng = () => 0
    expect(selectRandomHeroSprite(rng)).toBe(spriteCatalog.heroes[0])
    expect(selectRandomEnemySprite(rng)).toBe(spriteCatalog.enemies[0])
  })

  it('selects the last hero and enemy when rng returns near 1', () => {
    const rng = () => 0.999
    expect(selectRandomHeroSprite(rng)).toBe(spriteCatalog.heroes[spriteCatalog.heroes.length - 1])
    expect(selectRandomEnemySprite(rng)).toBe(spriteCatalog.enemies[spriteCatalog.enemies.length - 1])
  })
})
