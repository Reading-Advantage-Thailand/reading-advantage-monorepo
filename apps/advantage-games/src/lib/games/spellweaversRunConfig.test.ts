import { SPELLWEAVERS_RUN_CONFIG, getDifficultyConfig } from './spellweaversRunConfig'

describe('spellweaversRunConfig', () => {
  describe('SPELLWEAVERS_RUN_CONFIG', () => {
    it('should have lane count of 3', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.laneCount).toBe(3)
    })

    it('should have scroll speeds for all difficulties', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.scrollSpeed.easy).toBe(60)
      expect(SPELLWEAVERS_RUN_CONFIG.scrollSpeed.normal).toBe(90)
      expect(SPELLWEAVERS_RUN_CONFIG.scrollSpeed.hard).toBe(120)
    })

    it('should have spawn intervals for all difficulties', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.spawnInterval.easy).toBe(2000)
      expect(SPELLWEAVERS_RUN_CONFIG.spawnInterval.normal).toBe(1500)
      expect(SPELLWEAVERS_RUN_CONFIG.spawnInterval.hard).toBe(1000)
    })

    it('should have initial mana of 100', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.initialMana).toBe(100)
    })

    it('should have wrong word penalty of 20', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.wrongWordPenalty).toBe(20)
    })

    it('should have XP values configured', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.xpPerSentence).toBe(2)
      expect(SPELLWEAVERS_RUN_CONFIG.xpPerCorrectWord).toBe(1)
      expect(SPELLWEAVERS_RUN_CONFIG.comboMultiplier).toBe(0.1)
    })

    it('should have visual dimensions configured', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.orbRadius).toBe(30)
      expect(SPELLWEAVERS_RUN_CONFIG.orbSpacing).toBe(20)
      expect(SPELLWEAVERS_RUN_CONFIG.scrollHeight).toBe(60)
      expect(SPELLWEAVERS_RUN_CONFIG.collectionZoneHeight).toBe(80)
    })

    it('should have difficulty presets', () => {
      expect(SPELLWEAVERS_RUN_CONFIG.difficulties.easy.name).toBe('Easy')
      expect(SPELLWEAVERS_RUN_CONFIG.difficulties.normal.name).toBe('Medium')
      expect(SPELLWEAVERS_RUN_CONFIG.difficulties.hard.name).toBe('Hard')
    })
  })

  describe('getDifficultyConfig', () => {
    it('should return easy config', () => {
      const config = getDifficultyConfig('easy')
      expect(config.name).toBe('Easy')
      expect(config.scrollSpeed).toBe(60)
      expect(config.spawnInterval).toBe(2000)
      expect(config.maxWords).toBe(4)
    })

    it('should return medium config', () => {
      const config = getDifficultyConfig('normal')
      expect(config.name).toBe('Medium')
      expect(config.scrollSpeed).toBe(90)
      expect(config.spawnInterval).toBe(1500)
      expect(config.maxWords).toBe(6)
    })

    it('should return hard config', () => {
      const config = getDifficultyConfig('hard')
      expect(config.name).toBe('Hard')
      expect(config.scrollSpeed).toBe(120)
      expect(config.spawnInterval).toBe(1000)
      expect(config.maxWords).toBe(8)
    })
  })
})
