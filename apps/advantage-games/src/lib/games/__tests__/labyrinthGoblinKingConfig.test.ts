import { LABYRINTH_CONFIG, GAME_WIDTH, GAME_HEIGHT, getDifficultyConfig, getGoblinSpeed } from '../labyrinthGoblinKingConfig'

describe('labyrinthGoblinKingConfig', () => {
  it('has correct dimensions', () => {
    expect(GAME_WIDTH).toBe(390)
    expect(GAME_HEIGHT).toBe(700)
    expect(LABYRINTH_CONFIG.arenaWidth).toBe(390)
    expect(LABYRINTH_CONFIG.arenaHeight).toBe(700)
  })

  it('has correct tile and maze configuration', () => {
    expect(LABYRINTH_CONFIG.tileSize).toBe(32)
    expect(LABYRINTH_CONFIG.mazeCols).toBe(11)
    expect(LABYRINTH_CONFIG.mazeRows).toBe(15)
  })

  it('has correct player and goblin settings', () => {
    expect(LABYRINTH_CONFIG.playerSpeed).toBe(3)
    expect(LABYRINTH_CONFIG.playerSize).toBe(28)
    expect(LABYRINTH_CONFIG.goblinSize).toBe(28)
  })

  it('returns correct difficulty config', () => {
    const easy = getDifficultyConfig('easy')
    expect(easy.wordCount).toBe(4)
    expect(easy.goblinCount).toBe(2)

    const normal = getDifficultyConfig('normal')
    expect(normal.wordCount).toBe(5)
    expect(normal.goblinCount).toBe(3)

    const unknown = getDifficultyConfig('extreme' as unknown as 'normal' | 'easy' | 'hard')
    expect(unknown.wordCount).toBe(7)
  })

  it('returns correct goblin speed', () => {
    expect(getGoblinSpeed('scout')).toBe(1.5)
    expect(getGoblinSpeed('warrior')).toBe(2)
    expect(getGoblinSpeed('elite')).toBe(2.5)
  })
})
