import { renderHook, act } from '@testing-library/react'
import { useAccessibilitySettings } from './useAccessibilitySettings'
import {
  ACCESSIBILITY_KEY,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from '../types/accessibility'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: () => {
      store = {}
    },
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useAccessibilitySettings', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('returns default settings when localStorage is empty', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      expect(result.current.settings).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS)
    })

    it('loads settings from localStorage', () => {
      const stored = JSON.stringify({
        textSizeMultiplier: 1.5,
        touchTargetMultiplier: 1.2,
        assistMode: true,
        reduceMotion: false,
      })
      localStorageMock.getItem.mockReturnValueOnce(stored)
      const { result } = renderHook(() => useAccessibilitySettings())
      expect(result.current.settings.textSizeMultiplier).toBe(1.5)
      expect(result.current.settings.touchTargetMultiplier).toBe(1.2)
      expect(result.current.settings.assistMode).toBe(true)
      expect(result.current.settings.reduceMotion).toBe(false)
    })

    it('returns defaults for malformed JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('not-valid-json')
      const { result } = renderHook(() => useAccessibilitySettings())
      expect(result.current.settings).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS)
    })
  })

  describe('updateSettings', () => {
    it('updates text size multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ textSizeMultiplier: 1.5 })
      })
      expect(result.current.settings.textSizeMultiplier).toBe(1.5)
      expect(result.current.settings.touchTargetMultiplier).toBe(
        DEFAULT_ACCESSIBILITY_SETTINGS.touchTargetMultiplier
      )
    })

    it('updates touch target multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ touchTargetMultiplier: 1.3 })
      })
      expect(result.current.settings.touchTargetMultiplier).toBe(1.3)
    })

    it('enables assist mode', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ assistMode: true })
      })
      expect(result.current.settings.assistMode).toBe(true)
    })

    it('disables assist mode', () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ ...DEFAULT_ACCESSIBILITY_SETTINGS, assistMode: true })
      )
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ assistMode: false })
      })
      expect(result.current.settings.assistMode).toBe(false)
    })

    it('updates multiple settings at once', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({
          textSizeMultiplier: 1.8,
          assistMode: true,
          reduceMotion: true,
        })
      })
      expect(result.current.settings.textSizeMultiplier).toBe(1.8)
      expect(result.current.settings.assistMode).toBe(true)
      expect(result.current.settings.reduceMotion).toBe(true)
      expect(result.current.settings.touchTargetMultiplier).toBe(
        DEFAULT_ACCESSIBILITY_SETTINGS.touchTargetMultiplier
      )
    })
  })

  describe('persistence', () => {
    it('persists settings to localStorage on update', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ textSizeMultiplier: 2.0 })
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        ACCESSIBILITY_KEY,
        expect.any(String)
      )
    })

    it('persists partial updates correctly', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ assistMode: true })
      })
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[1][1] as string
      )
      expect(savedData.assistMode).toBe(true)
      expect(savedData.textSizeMultiplier).toBe(1.0)
    })
  })

  describe('getEffectiveTextSize', () => {
    it('returns multiplier value directly', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      expect(result.current.getEffectiveTextSize(16)).toBe(16)
    })

    it('scales text by multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ textSizeMultiplier: 1.5 })
      })
      expect(result.current.getEffectiveTextSize(16)).toBe(24)
    })

    it('scales text with large multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ textSizeMultiplier: 2.0 })
      })
      expect(result.current.getEffectiveTextSize(12)).toBe(24)
    })
  })

  describe('getEffectiveTouchTarget', () => {
    it('returns default target size without multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      expect(result.current.getEffectiveTouchTarget(44)).toBe(44)
    })

    it('scales touch targets by multiplier', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ touchTargetMultiplier: 1.25 })
      })
      expect(result.current.getEffectiveTouchTarget(44)).toBe(55)
    })
  })

  describe('resetSettings', () => {
    it('resets all settings to defaults', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({
          textSizeMultiplier: 2.0,
          touchTargetMultiplier: 1.5,
          assistMode: true,
          reduceMotion: true,
        })
      })
      act(() => {
        result.current.resetSettings()
      })
      expect(result.current.settings).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS)
    })

    it('persists reset to localStorage', () => {
      const { result } = renderHook(() => useAccessibilitySettings())
      act(() => {
        result.current.updateSettings({ textSizeMultiplier: 1.8 })
      })
      act(() => {
        result.current.resetSettings()
      })
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        ACCESSIBILITY_KEY,
        JSON.stringify(DEFAULT_ACCESSIBILITY_SETTINGS)
      )
    })
  })
})
