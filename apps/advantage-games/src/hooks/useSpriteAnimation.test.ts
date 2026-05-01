import { renderHook } from '@testing-library/react'
import { useSpriteAnimation } from './useSpriteAnimation'
import { SpriteSheetConfig, SpriteState } from '@/lib/spriteAnimation'

describe('useSpriteAnimation hook', () => {
  const config: SpriteSheetConfig = {
    states: {
      idle: { row: 0, frames: 3, loop: true },
      death: { row: 2, frames: 2, loop: false }
    },
    frameDuration: 100
  }

  it('resets start time when state changes', () => {
    const initialProps: { state: SpriteState; time: number } = { state: 'idle', time: 0 }
    const { result, rerender } = renderHook(
      ({ state, time }) => useSpriteAnimation(state, time, config),
      { initialProps }
    )

    expect(result.current).toEqual({ row: 0, col: 0 })

    // Advance time within same state
    rerender({ state: 'idle', time: 150 })
    expect(result.current).toEqual({ row: 0, col: 1 })

    // Change state at time 200
    rerender({ state: 'death', time: 200 })
    // At t=200, state changed, so stateStartTime should be 200. 
    // getSpriteFrame(death, 200, 200, config) should be col 0
    expect(result.current).toEqual({ row: 2, col: 0 })

    // Advance time in new state
    rerender({ state: 'death', time: 350 })
    // elapsed = 350 - 200 = 150. 150/100 = 1. col 1
    expect(result.current).toEqual({ row: 2, col: 1 })
  })
})
