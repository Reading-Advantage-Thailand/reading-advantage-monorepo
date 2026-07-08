import { WELL, wellPosition } from './wellProjection'
import { ABYSSAL_WELL_CONFIG } from '@/lib/games/abyssalWellConfig'

describe('wellProjection', () => {
  it('uses the same lane count as the game config', () => {
    expect(WELL.lanes).toBe(ABYSSAL_WELL_CONFIG.lanes)
  })

  it('places depth 1 (rim) at z = 0', () => {
    const [, , z] = wellPosition(0, 1)
    expect(z).toBeCloseTo(0)
  })

  it('places depth 0 (far end) at z = -WELL.length', () => {
    const [, , z] = wellPosition(0, 0)
    expect(z).toBeCloseTo(-WELL.length)
  })

  it('keeps every lane on the tube wall (distance from axis = WELL.radius)', () => {
    for (let lane = 0; lane < WELL.lanes; lane++) {
      const [x, y] = wellPosition(lane, 0.5)
      expect(Math.hypot(x, y)).toBeCloseTo(WELL.radius)
    }
  })

  it('gives different lanes different angular positions', () => {
    const [x0, y0] = wellPosition(0, 0.5)
    const [x1, y1] = wellPosition(1, 0.5)
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeGreaterThan(0.01)
  })

  it('wraps lane indices past the lane count', () => {
    const a = wellPosition(0, 0.5)
    const b = wellPosition(WELL.lanes, 0.5)
    expect(b[0]).toBeCloseTo(a[0])
    expect(b[1]).toBeCloseTo(a[1])
    expect(b[2]).toBeCloseTo(a[2])
  })

  it('wraps negative lane indices', () => {
    const a = wellPosition(-1, 0.5)
    const b = wellPosition(WELL.lanes - 1, 0.5)
    expect(b[0]).toBeCloseTo(a[0])
    expect(b[1]).toBeCloseTo(a[1])
  })
})
