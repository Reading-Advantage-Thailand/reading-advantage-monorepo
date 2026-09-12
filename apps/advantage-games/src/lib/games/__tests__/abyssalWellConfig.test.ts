import {
  ABYSSAL_WELL_CONFIG,
  getDifficultyConfig,
  getCreatureSpeed,
  type AbyssalWellDifficulty,
  type CreatureType,
} from '../abyssalWellConfig'

describe('abyssalWellConfig', () => {
  describe('ABYSSAL_WELL_CONFIG', () => {
    it('should have correct game dimensions', () => {
      expect(ABYSSAL_WELL_CONFIG.gameWidth).toBe(390)
      expect(ABYSSAL_WELL_CONFIG.gameHeight).toBe(700)
    })

    it('should have 8 lanes', () => {
      expect(ABYSSAL_WELL_CONFIG.lanes).toBe(8)
    })

    it('should have player config', () => {
      expect(ABYSSAL_WELL_CONFIG.player.fireRate).toBeGreaterThan(0)
      expect(ABYSSAL_WELL_CONFIG.player.projectileSpeed).toBeGreaterThan(0)
    })

    it('should have enemy config', () => {
      expect(ABYSSAL_WELL_CONFIG.enemy.baseSpeed).toBeGreaterThan(0)
      expect(ABYSSAL_WELL_CONFIG.enemy.spawnInterval).toBeGreaterThan(0)
    })

    it('should have 3 lives', () => {
      expect(ABYSSAL_WELL_CONFIG.lives).toBe(3)
    })

    it('should have creature speeds defined', () => {
      expect(ABYSSAL_WELL_CONFIG.creatureSpeeds['goblin-scout']).toBeDefined()
      expect(ABYSSAL_WELL_CONFIG.creatureSpeeds['cave-spider']).toBeDefined()
      expect(ABYSSAL_WELL_CONFIG.creatureSpeeds['shadow-demon']).toBeDefined()
    })

    it('should have difficulties defined', () => {
      expect(ABYSSAL_WELL_CONFIG.difficulties.easy).toBeDefined()
      expect(ABYSSAL_WELL_CONFIG.difficulties.medium).toBeDefined()
      expect(ABYSSAL_WELL_CONFIG.difficulties.hard).toBeDefined()
    })
  })

  describe('getDifficultyConfig', () => {
    it('should return easy config for easy difficulty', () => {
      const config = getDifficultyConfig('easy')
      expect(config.name).toBe('Shallow Well')
      expect(config.wordCount).toBe(4)
    })

    it('should return medium config for medium difficulty', () => {
      const config = getDifficultyConfig('medium')
      expect(config.name).toBe('Deep Chasm')
      expect(config.wordCount).toBe(5)
    })

    it('should return hard config for hard difficulty', () => {
      const config = getDifficultyConfig('hard')
      expect(config.name).toBe('Abyss')
      expect(config.wordCount).toBe(6)
    })

    it('should fallback to medium for unknown difficulty', () => {
      const config = getDifficultyConfig('unknown' as AbyssalWellDifficulty)
      expect(config.name).toBe('Deep Chasm')
    })
  })

  describe('getCreatureSpeed', () => {
    it('should return correct speed for goblin-scout', () => {
      expect(getCreatureSpeed('goblin-scout')).toBe(50)
    })

    it('should return correct speed for cave-spider', () => {
      expect(getCreatureSpeed('cave-spider')).toBe(70)
    })

    it('should return correct speed for shadow-demon', () => {
      expect(getCreatureSpeed('shadow-demon')).toBe(90)
    })

    it('should fallback to cave-spider speed for unknown creature', () => {
      expect(getCreatureSpeed('unknown' as CreatureType)).toBe(70)
    })
  })
})
