import { act, render } from '@testing-library/react'
import { useGameLoop } from './useGameLoop'

function GameLoopHarness({ running, tickMs, onTick }: { running: boolean; tickMs?: number; onTick: (dt: number) => void }) {
  useGameLoop(onTick, running, tickMs)
  return null
}

describe('useGameLoop', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('ticks on a fixed 50ms interval by default', () => {
    const onTick = jest.fn()
    render(<GameLoopHarness running={true} onTick={onTick} />)

    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(onTick).toHaveBeenCalledTimes(5)
    const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1]
    expect(lastCall[0]).toBeCloseTo(0.05, 5)
  })

  it('does not tick when not running', () => {
    const onTick = jest.fn()
    render(<GameLoopHarness running={false} onTick={onTick} />)

    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(onTick).not.toHaveBeenCalled()
  })

  it('supports a custom tick interval', () => {
    const onTick = jest.fn()
    render(<GameLoopHarness running={true} tickMs={100} onTick={onTick} />)

    act(() => {
      jest.advanceTimersByTime(350)
    })

    expect(onTick).toHaveBeenCalledTimes(3)
    const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1]
    expect(lastCall[0]).toBeCloseTo(0.1, 5)
  })
})
