import { calculateRpgBattleXp } from './rpgBattleXp'

describe('calculateRpgBattleXp', () => {
  it('clamps XP to the 1-10 range', () => {
    expect(calculateRpgBattleXp({
      playerHealth: 0,
      playerMaxHealth: 100,
      turnsTaken: 20,
      maxTurns: 20,
      longestStreak: 0,
    })).toBe(1)

    expect(calculateRpgBattleXp({
      playerHealth: 100,
      playerMaxHealth: 100,
      turnsTaken: 1,
      maxTurns: 20,
      longestStreak: 12,
    })).toBe(10)
  })

  it('rewards higher remaining health', () => {
    const lowHealth = calculateRpgBattleXp({
      playerHealth: 30,
      playerMaxHealth: 100,
      turnsTaken: 8,
      maxTurns: 12,
      longestStreak: 2,
    })
    const highHealth = calculateRpgBattleXp({
      playerHealth: 90,
      playerMaxHealth: 100,
      turnsTaken: 8,
      maxTurns: 12,
      longestStreak: 2,
    })

    expect(highHealth).toBeGreaterThan(lowHealth)
  })

  it('rewards finishing in fewer turns', () => {
    const slow = calculateRpgBattleXp({
      playerHealth: 80,
      playerMaxHealth: 100,
      turnsTaken: 10,
      maxTurns: 12,
      longestStreak: 2,
    })
    const fast = calculateRpgBattleXp({
      playerHealth: 80,
      playerMaxHealth: 100,
      turnsTaken: 4,
      maxTurns: 12,
      longestStreak: 2,
    })

    expect(fast).toBeGreaterThan(slow)
  })

  it('rewards longer streaks', () => {
    const shortStreak = calculateRpgBattleXp({
      playerHealth: 80,
      playerMaxHealth: 100,
      turnsTaken: 6,
      maxTurns: 12,
      longestStreak: 1,
    })
    const longStreak = calculateRpgBattleXp({
      playerHealth: 80,
      playerMaxHealth: 100,
      turnsTaken: 6,
      maxTurns: 12,
      longestStreak: 8,
    })

    expect(longStreak).toBeGreaterThan(shortStreak)
  })
})
