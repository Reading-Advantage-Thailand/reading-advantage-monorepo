import {
  STORM_CASTLE_TOWER_CONFIG,
  getDifficultyConfig,
  getGuardSpeedMult,
} from '../stormCastleTowerConfig'

describe('stormCastleTowerConfig', () => {
  describe('STORM_CASTLE_TOWER_CONFIG', () => {
    it('should have required game dimensions', () => {
      expect(STORM_CASTLE_TOWER_CONFIG.gameWidth).toBe(390)
      expect(STORM_CASTLE_TOWER_CONFIG.gameHeight).toBe(700)
    })

    it('should have grid configuration', () => {
      expect(STORM_CASTLE_TOWER_CONFIG.columns).toBe(4)
      expect(STORM_CASTLE_TOWER_CONFIG.cellSize).toBe(60)
    })

    it('should have player configuration', () => {
      expect(STORM_CASTLE_TOWER_CONFIG.player.lives).toBe(3)
      expect(STORM_CASTLE_TOWER_CONFIG.player.moveSpeed).toBe(150)
    })

    it('should have hazard configuration', () => {
      expect(STORM_CASTLE_TOWER_CONFIG.hazards.oilInterval).toBe(3000)
      expect(STORM_CASTLE_TOWER_CONFIG.hazards.rockInterval).toBe(4000)
    })

    it('should have XP configuration', () => {
      expect(STORM_CASTLE_TOWER_CONFIG.xp.perCorrectWord).toBe(1)
      expect(STORM_CASTLE_TOWER_CONFIG.xp.maxXP).toBe(10)
    })
  })

  describe('getDifficultyConfig', () => {
    it('should return easy config', () => {
      const config = getDifficultyConfig('easy')
      expect(config.name).toBe("Squire's Tower")
      expect(config.wordCount).toBe(4)
      expect(config.hazardSpeedMult).toBe(0.7)
    })

    it('should return medium config', () => {
      const config = getDifficultyConfig('medium')
      expect(config.name).toBe("Knight's Keep")
      expect(config.wordCount).toBe(5)
      expect(config.hazardSpeedMult).toBe(1.0)
    })

    it('should return medium for undefined difficulty', () => {
      const config = getDifficultyConfig(undefined as StormCastleTowerDifficulty)
      expect(config.name).toBe("Knight's Keep")
    })

    it('should return hard config', () => {
      const config = getDifficultyConfig('hard')
      expect(config.name).toBe("Lord's Citadel")
      expect(config.wordCount).toBe(6)
      expect(config.hazardSpeedMult).toBe(1.3)
    })
  })

  describe('getGuardSpeedMult', () => {
    it('should return lazy guard speed', () => {
      expect(getGuardSpeedMult('lazy-guard')).toBe(0.6)
    })

    it('should return alert sentry speed', () => {
      expect(getGuardSpeedMult('alert-sentry')).toBe(1.0)
    })

    it('should return elite watchman speed', () => {
      expect(getGuardSpeedMult('elite-watchman')).toBe(1.5)
    })

    it('should return default for undefined guard type', () => {
      expect(getGuardSpeedMult(undefined as GuardType)).toBe(1.0)
    })
  })
})
