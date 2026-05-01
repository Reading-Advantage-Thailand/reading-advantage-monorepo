import { getSpriteFrame, SpriteSheetConfig } from './spriteAnimation'

describe('getSpriteFrame', () => {
  const enemyConfig: SpriteSheetConfig = {
    states: {
      idle: { row: 0, frames: 3, loop: true },
      walk: { row: 0, frames: 3, loop: true },
      attack: { row: 1, frames: 1, loop: false, startCol: 0 },
      hit: { row: 1, frames: 1, loop: false, startCol: 1 },
      death: { row: 2, frames: 2, loop: false, startCol: 0 }
    },
    frameDuration: 100
  }

  it('returns the first frame of idle at t=0', () => {
    const frame = getSpriteFrame('idle', 0, 0, enemyConfig)
    expect(frame).toEqual({ row: 0, col: 0 })
  })

  it('loops idle frames', () => {
    expect(getSpriteFrame('idle', 150, 0, enemyConfig)).toEqual({ row: 0, col: 1 })
    expect(getSpriteFrame('idle', 250, 0, enemyConfig)).toEqual({ row: 0, col: 2 })
    expect(getSpriteFrame('idle', 350, 0, enemyConfig)).toEqual({ row: 0, col: 0 })
  })

  it('handles non-looping death animation', () => {
    expect(getSpriteFrame('death', 50, 0, enemyConfig)).toEqual({ row: 2, col: 0 })
    expect(getSpriteFrame('death', 150, 0, enemyConfig)).toEqual({ row: 2, col: 1 })
    expect(getSpriteFrame('death', 250, 0, enemyConfig)).toEqual({ row: 2, col: 1 }) // Stays on last frame
  })

  it('handles offset startCol for hit reaction', () => {
    expect(getSpriteFrame('hit', 0, 0, enemyConfig)).toEqual({ row: 1, col: 1 })
  })

  const playerConfig: SpriteSheetConfig = {
    states: {
        idle: { row: 0, frames: 3, loop: true },
        walk: { row: 1, frames: 3, loop: true },
        attack: { row: 2, frames: 3, loop: true }
    },
    frameDuration: 100
  }

  it('works with player-specific config', () => {
    expect(getSpriteFrame('walk', 150, 0, playerConfig)).toEqual({ row: 1, col: 1 })
    expect(getSpriteFrame('attack', 150, 0, playerConfig)).toEqual({ row: 2, col: 1 })
  })
})
