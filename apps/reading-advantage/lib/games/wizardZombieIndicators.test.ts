import { calculateIndicators } from './wizardZombieIndicators'
import { Orb } from './wizardZombie'

describe('calculateIndicators', () => {
  const viewport = { width: 800, height: 600 }
  const camera = { x: 0, y: 0, scale: 1 } // No zoom, world matches screen

  const createOrb = (x: number, y: number): Orb => ({
    id: '1', x, y, radius: 10, word: 'A', translation: 'B', isCorrect: true
  })

  it('returns empty array if orb is visible', () => {
    const orb = createOrb(400, 300) // Center
    const indicators = calculateIndicators([orb], camera, viewport)
    expect(indicators).toHaveLength(0)
  })

  it('returns indicator for orb to the right', () => {
    const orb = createOrb(1200, 300) // Far right
    const indicators = calculateIndicators([orb], camera, viewport)
    
    expect(indicators).toHaveLength(1)
    const ind = indicators[0]
    
    // Should be at right edge (width/2 - margin) + center
    // width=800, margin=40. center=400.
    // Right edge x = 400 + (400-40) = 760
    expect(ind.x).toBeCloseTo(760)
    expect(ind.y).toBeCloseTo(300) // Center Y
    expect(ind.rotation).toBeCloseTo(0) // 0 degrees
  })

  it('returns indicator for orb to the top', () => {
    const orb = createOrb(400, -500) // Far top
    const indicators = calculateIndicators([orb], camera, viewport)
    
    expect(indicators).toHaveLength(1)
    const ind = indicators[0]
    
    // Top edge y = 300 - (300-40) = 40
    expect(ind.y).toBeCloseTo(40)
    expect(ind.x).toBeCloseTo(400) // Center X
    expect(ind.rotation).toBeCloseTo(-90) // -90 degrees
  })
})
