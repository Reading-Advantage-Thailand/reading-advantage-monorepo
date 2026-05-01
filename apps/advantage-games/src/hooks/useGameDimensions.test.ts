import { renderHook } from '@testing-library/react'
import { useGameDimensions } from './useGameDimensions'

describe('useGameDimensions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial zero dimensions', () => {
    const containerRef = { current: null } as React.RefObject<HTMLDivElement>
    const { result } = renderHook(() => useGameDimensions(containerRef))
    expect(result.current).toEqual({ width: 0, height: 0 })
  })

  it('should cleanup ResizeObserver on unmount', () => {
    const disconnectMock = jest.fn()
    const observeMock = jest.fn()

    class ResizeObserverMock {
      observe = observeMock
      disconnect = disconnectMock
    }
    ;(global as any).ResizeObserver = ResizeObserverMock

    const containerRef = {
      current: document.createElement('div'),
    } as React.RefObject<HTMLDivElement>

    const { unmount } = renderHook(() => useGameDimensions(containerRef))

    unmount()

    expect(disconnectMock).toHaveBeenCalled()
  })
})