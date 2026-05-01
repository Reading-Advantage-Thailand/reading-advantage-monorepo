import { renderHook } from '@testing-library/react'
import { useGameCamera } from './useGameCamera'

describe('useGameCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('dimensions tracking', () => {
    it('should return initial zero dimensions', () => {
      const containerRef = { current: null } as React.RefObject<HTMLDivElement>
      const { result } = renderHook(() =>
        useGameCamera(containerRef, 390, 844)
      )
      expect(result.current.dimensions).toEqual({ width: 0, height: 0 })
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

      const { unmount } = renderHook(() =>
        useGameCamera(containerRef, 390, 844)
      )

      unmount()

      expect(disconnectMock).toHaveBeenCalled()
    })
  })

  describe('camera computation', () => {
    it('should compute scale to fit game in container', () => {
      const containerRef = {
        current: {
          getBoundingClientRect: () => ({ width: 390, height: 844 }),
        },
      } as any

      const { result } = renderHook(() =>
        useGameCamera(containerRef, 390, 844)
      )

      expect(result.current.dimensions).toEqual({ width: 390, height: 844 })
    })
  })

  describe('getIndicatorPosition', () => {
    it('should convert world coordinates to screen coordinates', () => {
      const containerRef = {
        current: {
          getBoundingClientRect: () => ({ width: 390, height: 844 }),
        },
      } as any

      const { result } = renderHook(() =>
        useGameCamera(containerRef, 390, 844)
      )

      const screenPos = result.current.getIndicatorPosition(100, 100)
      expect(screenPos).toHaveProperty('x')
      expect(screenPos).toHaveProperty('y')
    })
  })
})