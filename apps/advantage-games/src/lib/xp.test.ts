import { calculateXP } from './xp'

describe('calculateXP', () => {
  it('calculates XP correctly with 100% accuracy', () => {
    // Correct = 10, Accuracy = 1.0
    // XP = 10 * 1.0 = 10
    const xp = calculateXP(100, 10, 10)
    expect(xp).toBe(10)
  })

  it('calculates XP correctly with 50% accuracy', () => {
    // Correct = 5, Accuracy = 0.5
    // XP = 5 * 0.5 = 2.5 -> 2
    const xp = calculateXP(100, 5, 10)
    expect(xp).toBe(2)
  })

  it('calculates XP correctly with 0 attempts', () => {
    const xp = calculateXP(0, 0, 0)
    expect(xp).toBe(0)
  })
  
  it('rounds down to nearest integer', () => {
    // Correct = 10, Accuracy = 0.666... (10/15)
    // XP = 10 * 0.666... = 6.66... = 6
    const xp = calculateXP(150, 10, 15)
    expect(xp).toBe(6)
  })
})