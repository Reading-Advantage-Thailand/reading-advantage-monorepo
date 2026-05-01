import { calculateIndicators } from './dungeonLiberatorIndicators'
import type { Prisoner } from './dungeonLiberator'

function createPrisoner(overrides: Partial<Prisoner> = {}): Prisoner {
  return {
    id: 'p1',
    x: 100,
    y: 100,
    radius: 16,
    word: 'test',
    translation: 'ทดสอบ',
    orderIndex: 0,
    collected: false,
    fleeing: false,
    fleeTimer: 0,
    ...overrides,
  }
}

describe('calculateIndicators', () => {
  const camera = { x: 0, y: 0, scale: 1 }
  const viewport = { width: 400, height: 300 }

  it('should return empty array when no prisoners', () => {
    expect(calculateIndicators([], camera, viewport)).toEqual([])
  })

  it('should return empty array when all prisoners collected', () => {
    const prisoners = [createPrisoner({ collected: true })]
    expect(calculateIndicators(prisoners, camera, viewport)).toEqual([])
  })

  it('should return empty array when all prisoners fleeing', () => {
    const prisoners = [createPrisoner({ fleeing: true })]
    expect(calculateIndicators(prisoners, camera, viewport)).toEqual([])
  })

  it('should return empty array when prisoner is visible', () => {
    const prisoners = [createPrisoner({ x: 200, y: 150 })]
    expect(calculateIndicators(prisoners, camera, viewport)).toEqual([])
  })

  it('should return indicator for off-screen prisoner', () => {
    const prisoners = [createPrisoner({ x: 500, y: 150 })]
    const indicators = calculateIndicators(prisoners, camera, viewport)

    expect(indicators.length).toBe(1)
    expect(indicators[0].prisoner.id).toBe('p1')
    expect(indicators[0].x).toBeGreaterThan(0)
    expect(indicators[0].x).toBeLessThanOrEqual(viewport.width)
    expect(indicators[0].y).toBeGreaterThan(0)
    expect(indicators[0].y).toBeLessThanOrEqual(viewport.height)
  })

  it('should position indicator on viewport edge', () => {
    const prisoners = [createPrisoner({ x: 1000, y: 150 })]
    const indicators = calculateIndicators(prisoners, camera, viewport)

    expect(indicators[0].x).toBeCloseTo(viewport.width - 40, 0)
    expect(indicators[0].y).toBeCloseTo(viewport.height / 2, 0)
  })

  it('should calculate rotation toward prisoner', () => {
    const prisoners = [createPrisoner({ x: 500, y: 400 })]
    const indicators = calculateIndicators(prisoners, camera, viewport)

    expect(indicators[0].rotation).toBeGreaterThan(0)
  })

  it('should handle multiple off-screen prisoners', () => {
    const prisoners = [
      createPrisoner({ id: 'p1', x: 500, y: 150 }),
      createPrisoner({ id: 'p2', x: 100, y: 500 }),
    ]
    const indicators = calculateIndicators(prisoners, camera, viewport)

    expect(indicators.length).toBe(2)
    expect(indicators[0].prisoner.id).toBe('p1')
    expect(indicators[1].prisoner.id).toBe('p2')
  })

  it('should handle scaled camera', () => {
    const scaledCamera = { x: -100, y: -50, scale: 1.5 }
    const prisoners = [createPrisoner({ x: 400, y: 300 })]
    const indicators = calculateIndicators(prisoners, scaledCamera, viewport)

    // With scale 1.5, prisoner at 400,300 -> screen pos = 400*1.5 + (-100) = 500, 300*1.5 + (-50) = 400
    // Both exceed viewport of 400x300, so indicator should be generated
    expect(indicators.length).toBe(1)
  })
})
