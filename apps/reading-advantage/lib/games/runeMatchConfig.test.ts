import { RUNE_MATCH_CONFIG } from './runeMatchConfig'

describe('RUNE_MATCH_CONFIG', () => {
  it('exports a configuration object', () => {
    expect(RUNE_MATCH_CONFIG).toBeDefined()
    expect(typeof RUNE_MATCH_CONFIG).toBe('object')
  })

  describe('player config', () => {
    it('has player maxHp', () => {
      expect(RUNE_MATCH_CONFIG.player.maxHp).toBe(100)
    })
  })

  describe('monsters config', () => {
    it('has goblin configuration', () => {
      expect(RUNE_MATCH_CONFIG.monsters.goblin).toEqual({
        hp: 50,
        attack: 2,
        xp: 3,
      })
    })

    it('has skeleton configuration', () => {
      expect(RUNE_MATCH_CONFIG.monsters.skeleton).toEqual({
        hp: 80,
        attack: 4,
        xp: 6,
      })
    })

    it('has orc configuration', () => {
      expect(RUNE_MATCH_CONFIG.monsters.orc).toEqual({
        hp: 120,
        attack: 6,
        xp: 9,
      })
    })

    it('has dragon configuration', () => {
      expect(RUNE_MATCH_CONFIG.monsters.dragon).toEqual({
        hp: 160,
        attack: 8,
        xp: 12,
      })
    })

    it('has monsters in ascending difficulty', () => {
      const { goblin, skeleton, orc, dragon } = RUNE_MATCH_CONFIG.monsters
      expect(goblin.hp).toBeLessThan(skeleton.hp)
      expect(skeleton.hp).toBeLessThan(orc.hp)
      expect(orc.hp).toBeLessThan(dragon.hp)
    })
  })

  describe('combat config', () => {
    it('has attack interval', () => {
      expect(RUNE_MATCH_CONFIG.combat.attackIntervalMs).toBe(5000)
    })

    it('has positive match damage values', () => {
      expect(RUNE_MATCH_CONFIG.combat.match3Damage).toBeGreaterThan(0)
      expect(RUNE_MATCH_CONFIG.combat.match4Damage).toBeGreaterThan(0)
      expect(RUNE_MATCH_CONFIG.combat.match5Damage).toBeGreaterThan(0)
    })

    it('has positive special match damage values', () => {
      expect(RUNE_MATCH_CONFIG.combat.lShapeDamage).toBeGreaterThan(0)
      expect(RUNE_MATCH_CONFIG.combat.cascadeBonus).toBeGreaterThan(0)
    })

    it('has power rune multiplier', () => {
      expect(RUNE_MATCH_CONFIG.combat.powerRuneMultiplier).toBe(2)
    })

    it('has ascending damage for larger matches', () => {
      const { match3Damage, match4Damage, match5Damage } = RUNE_MATCH_CONFIG.combat
      expect(match3Damage).toBeLessThan(match4Damage)
      expect(match4Damage).toBeLessThan(match5Damage)
    })
  })

  describe('powerUps config', () => {
    it('has heal amount', () => {
      expect(RUNE_MATCH_CONFIG.powerUps.healAmount).toBe(5)
    })

    it('has shield duration', () => {
      expect(RUNE_MATCH_CONFIG.powerUps.shieldDuration).toBe(1)
    })

    it('has spawn rate between 0 and 1', () => {
      const { spawnRate } = RUNE_MATCH_CONFIG.powerUps
      expect(spawnRate).toBeGreaterThanOrEqual(0)
      expect(spawnRate).toBeLessThanOrEqual(1)
    })
  })

  describe('grid config', () => {
    it('supports horizontal and vertical matches', () => {
      expect(RUNE_MATCH_CONFIG.grid.columns).toBeGreaterThanOrEqual(2)
      expect(RUNE_MATCH_CONFIG.grid.rows).toBeGreaterThanOrEqual(2)
    })

    it('has positive dimensions', () => {
      expect(RUNE_MATCH_CONFIG.grid.columns).toBeGreaterThan(0)
      expect(RUNE_MATCH_CONFIG.grid.rows).toBeGreaterThan(0)
    })
  })
})
