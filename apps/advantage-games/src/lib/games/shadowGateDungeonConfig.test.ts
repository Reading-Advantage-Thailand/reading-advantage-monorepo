import { SHADOW_GATE_DUNGEON_CONFIG, getDifficultyConfig, getCreatureSpeed, type ShadowGateDungeonDifficulty, type CreatureType } from './shadowGateDungeonConfig'

describe('shadowGateDungeonConfig', () => {
  describe('SHADOW_GATE_DUNGEON_CONFIG', () => {
    it('should have arena dimensions', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.arenaWidth).toBe(390)
      expect(SHADOW_GATE_DUNGEON_CONFIG.arenaHeight).toBe(700)
      expect(SHADOW_GATE_DUNGEON_CONFIG.gateWidth).toBe(100)
      expect(SHADOW_GATE_DUNGEON_CONFIG.gateHeight).toBe(60)
    })

    it('should have player configuration', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.playerSpeed).toBe(200)
      expect(SHADOW_GATE_DUNGEON_CONFIG.playerRadius).toBe(12)
      expect(SHADOW_GATE_DUNGEON_CONFIG.initialHealth).toBe(100)
      expect(SHADOW_GATE_DUNGEON_CONFIG.invincibilityDuration).toBe(1000)
    })

    it('should have word crystal configuration', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.crystalRadius).toBe(14)
      expect(SHADOW_GATE_DUNGEON_CONFIG.crystalSpawnMargin).toBe(30)
    })

    it('should have creature speeds for all opponent types', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.creatureSpeeds['goblin-scout']).toBe(60)
      expect(SHADOW_GATE_DUNGEON_CONFIG.creatureSpeeds['orc-hunter']).toBe(80)
      expect(SHADOW_GATE_DUNGEON_CONFIG.creatureSpeeds['shadow-dragon']).toBe(105)
      expect(SHADOW_GATE_DUNGEON_CONFIG.creatureRadius).toBe(14)
    })

    it('should have damage values', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.wrongWordDamage).toBe(20)
      expect(SHADOW_GATE_DUNGEON_CONFIG.creatureCollisionDamage).toBe(25)
    })

    it('should have XP configuration', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.xpPerCorrectWord).toBe(1)
      expect(SHADOW_GATE_DUNGEON_CONFIG.accuracyBonus).toBe(1)
      expect(SHADOW_GATE_DUNGEON_CONFIG.speedBonusThreshold).toBe(30000)
      expect(SHADOW_GATE_DUNGEON_CONFIG.speedBonus).toBe(1)
      expect(SHADOW_GATE_DUNGEON_CONFIG.survivalBonusThreshold).toBe(50)
      expect(SHADOW_GATE_DUNGEON_CONFIG.survivalBonus).toBe(1)
      expect(SHADOW_GATE_DUNGEON_CONFIG.maxXP).toBe(10)
    })

    it('should have difficulty presets', () => {
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.easy.name).toBe('Dark Cell')
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.easy.wordCount).toBe(4)
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.normal.name).toBe('Forgotten Crypt')
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.normal.wordCount).toBe(5)
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.hard.name).toBe('Abyssal Chamber')
      expect(SHADOW_GATE_DUNGEON_CONFIG.difficulties.hard.wordCount).toBe(6)
    })
  })

  describe('getDifficultyConfig', () => {
    it('should return easy config', () => {
      const config = getDifficultyConfig('easy')
      expect(config.name).toBe('Dark Cell')
      expect(config.wordCount).toBe(4)
    })

    it('should return normal config', () => {
      const config = getDifficultyConfig('normal')
      expect(config.name).toBe('Forgotten Crypt')
      expect(config.wordCount).toBe(5)
    })

    it('should return hard config', () => {
      const config = getDifficultyConfig('hard')
      expect(config.name).toBe('Abyssal Chamber')
      expect(config.wordCount).toBe(6)
    })

    it('should return normal as default for unknown difficulty', () => {
      const config = getDifficultyConfig('unknown' as ShadowGateDungeonDifficulty)
      expect(config.name).toBe('Forgotten Crypt')
    })
  })

  describe('getCreatureSpeed', () => {
    it('should return goblin-scout speed', () => {
      expect(getCreatureSpeed('goblin-scout')).toBe(60)
    })

    it('should return orc-hunter speed', () => {
      expect(getCreatureSpeed('orc-hunter')).toBe(80)
    })

    it('should return shadow-dragon speed', () => {
      expect(getCreatureSpeed('shadow-dragon')).toBe(105)
    })

    it('should return orc-hunter speed as default', () => {
      expect(getCreatureSpeed('unknown' as CreatureType)).toBe(80)
    })
  })
})
