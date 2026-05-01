import {
  BASE_ENEMY_DAMAGE_MAX,
  BASE_ENEMY_DAMAGE_MIN,
  BASE_ENEMY_HEALTH,
  BASE_XP_CAP,
  getEnemyDamageRange,
  rollEnemyDamage,
  scaleBattleXp,
  scaleEnemyHealth,
} from './rpgBattleScaling'

describe('rpgBattleScaling', () => {
  it('scales enemy health from the base value', () => {
    expect(scaleEnemyHealth(0.5)).toBe(50)
    expect(scaleEnemyHealth(1)).toBe(100)
    expect(scaleEnemyHealth(1.5)).toBe(150)
    expect(scaleEnemyHealth(2)).toBe(200)
  })

  it('scales XP from the base cap', () => {
    expect(scaleBattleXp(BASE_XP_CAP, 0.5)).toBe(5)
    expect(scaleBattleXp(BASE_XP_CAP, 1)).toBe(10)
    expect(scaleBattleXp(BASE_XP_CAP, 1.5)).toBe(15)
    expect(scaleBattleXp(BASE_XP_CAP, 2)).toBe(20)
  })

  it('scales the enemy damage upper bound and preserves the base minimum', () => {
    const slimeRange = getEnemyDamageRange(0.5)
    const elementalRange = getEnemyDamageRange(2)

    expect(slimeRange.min).toBe(BASE_ENEMY_DAMAGE_MIN)
    expect(slimeRange.max).toBe(BASE_ENEMY_DAMAGE_MIN)
    expect(elementalRange.min).toBe(BASE_ENEMY_DAMAGE_MIN)
    expect(elementalRange.max).toBe(BASE_ENEMY_DAMAGE_MAX * 2)
  })

  it('rolls enemy damage within the scaled range', () => {
    const minRoll = rollEnemyDamage(2, () => 0)
    const maxRoll = rollEnemyDamage(2, () => 0.999)

    expect(minRoll).toBe(BASE_ENEMY_DAMAGE_MIN)
    expect(maxRoll).toBe(BASE_ENEMY_DAMAGE_MAX * 2)
  })

  it('exposes base scaling constants', () => {
    expect(BASE_ENEMY_HEALTH).toBe(100)
    expect(BASE_XP_CAP).toBe(10)
    expect(BASE_ENEMY_DAMAGE_MIN).toBeLessThanOrEqual(BASE_ENEMY_DAMAGE_MAX)
  })
})
