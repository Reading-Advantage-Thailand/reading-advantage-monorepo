import { RUNE_FORGE_CHAMBER_CONFIG, getDifficultyConfig, getTimerDuration, type RuneForgeChamberDifficulty } from './runeForgeChamberConfig'

describe('runeForgeChamberConfig', () => {
  describe('RUNE_FORGE_CHAMBER_CONFIG', () => {
    it('should have arena dimensions', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.arenaWidth).toBe(390)
      expect(RUNE_FORGE_CHAMBER_CONFIG.arenaHeight).toBe(700)
      expect(RUNE_FORGE_CHAMBER_CONFIG.runeStoneRadius).toBe(80)
    })

    it('should have circle configuration', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.circleRadius).toBe(35)
      expect(RUNE_FORGE_CHAMBER_CONFIG.circleOrbitRadius).toBe(200)
      expect(RUNE_FORGE_CHAMBER_CONFIG.circleSpeed).toBe(0.5)
      expect(RUNE_FORGE_CHAMBER_CONFIG.minTouchTarget).toBe(44)
    })

    it('should have timer durations for all difficulties', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.timerDurations.easy).toBe(15000)
      expect(RUNE_FORGE_CHAMBER_CONFIG.timerDurations.normal).toBe(12000)
      expect(RUNE_FORGE_CHAMBER_CONFIG.timerDurations.hard).toBe(10000)
      expect(RUNE_FORGE_CHAMBER_CONFIG.timerDurations.extreme).toBe(8000)
    })

    it('should have health configuration', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.initialHealth).toBe(100)
      expect(RUNE_FORGE_CHAMBER_CONFIG.wrongWordDamage).toBe(15)
    })

    it('should have XP configuration', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.xpPerCorrectWord).toBe(1)
      expect(RUNE_FORGE_CHAMBER_CONFIG.accuracyBonus).toBe(2)
      expect(RUNE_FORGE_CHAMBER_CONFIG.speedBonusThreshold).toBe(0.25)
      expect(RUNE_FORGE_CHAMBER_CONFIG.speedBonus).toBe(1)
      expect(RUNE_FORGE_CHAMBER_CONFIG.survivalBonusThreshold).toBe(50)
      expect(RUNE_FORGE_CHAMBER_CONFIG.survivalBonus).toBe(1)
      expect(RUNE_FORGE_CHAMBER_CONFIG.maxXP).toBe(10)
    })

    it('should have difficulty presets', () => {
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.easy.name).toBe('Apprentice')
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.easy.wordCount).toBe(4)
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.normal.name).toBe('Journeyman')
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.normal.wordCount).toBe(6)
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.hard.name).toBe('Master')
      expect(RUNE_FORGE_CHAMBER_CONFIG.difficulties.hard.wordCount).toBe(8)
    })
  })

  describe('getDifficultyConfig', () => {
    it('should return easy config', () => {
      const config = getDifficultyConfig('easy')
      expect(config.name).toBe('Apprentice')
      expect(config.wordCount).toBe(4)
      expect(config.timer).toBe(15000)
      expect(config.circleSpeed).toBe(0.3)
    })

    it('should return normal config', () => {
      const config = getDifficultyConfig('normal')
      expect(config.name).toBe('Journeyman')
      expect(config.wordCount).toBe(6)
    })

    it('should return hard config', () => {
      const config = getDifficultyConfig('hard')
      expect(config.name).toBe('Master')
      expect(config.wordCount).toBe(8)
    })

    it('should return normal as default for unknown difficulty', () => {
      const config = getDifficultyConfig('unknown' as RuneForgeChamberDifficulty)
      expect(config.name).toBe('Journeyman')
    })
  })

  describe('getTimerDuration', () => {
    it('should return easy timer duration', () => {
      expect(getTimerDuration('easy')).toBe(15000)
    })

    it('should return normal timer duration', () => {
      expect(getTimerDuration('normal')).toBe(12000)
    })

    it('should return hard timer duration', () => {
      expect(getTimerDuration('hard')).toBe(10000)
    })

    it('should return normal as default', () => {
      expect(getTimerDuration('unknown' as RuneForgeChamberDifficulty)).toBe(12000)
    })
  })
})
