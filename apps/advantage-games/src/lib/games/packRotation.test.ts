import type { ContentPackMetadata } from './contentPackSchema'
import {
  createRotationManager,
  validatePackAvailability,
  mergePacksFromIds,
  type RotationManager,
} from './packRotation'

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('packRotation', () => {
  let rotationManager: RotationManager

  const createMockPack = (packId: string): ContentPackMetadata => ({
    packId,
    version: '1.0.0',
    items: [
      { term: 'hello', translation: 'world' },
      { term: 'foo', translation: 'bar' },
      { term: 'baz', translation: 'qux' },
      { term: 'quux', translation: 'corge' },
      { term: 'grault', translation: 'garply' },
    ],
  })

  beforeEach(() => {
    mockLocalStorage.clear()
    rotationManager = createRotationManager()
  })

  describe('createRotationManager', () => {
    it('returns a rotation manager instance', () => {
      expect(rotationManager).toBeDefined()
      expect(typeof rotationManager.getState).toBe('function')
      expect(typeof rotationManager.setActivePacks).toBe('function')
      expect(typeof rotationManager.rollback).toBe('function')
    })

    it('initializes with empty state', () => {
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual([])
      expect(state.stablePacks).toEqual([])
      expect(state.lastRotation).toBeNull()
      expect(state.rotationHistory).toEqual([])
    })
  })

  describe('setActivePacks', () => {
    it('sets active packs and records history', () => {
      rotationManager.setActivePacks(['pack-1', 'pack-2'], 'Initial activation')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1', 'pack-2'])
      expect(state.lastRotation).not.toBeNull()
      expect(state.rotationHistory).toHaveLength(1)
      expect(state.rotationHistory[0].action).toBe('activate')
      expect(state.rotationHistory[0].note).toBe('Initial activation')
    })

    it('replaces existing active packs', () => {
      rotationManager.setActivePacks(['pack-1'])
      rotationManager.setActivePacks(['pack-2', 'pack-3'])
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-2', 'pack-3'])
      expect(state.rotationHistory).toHaveLength(2)
    })
  })

  describe('addActivePack', () => {
    it('adds a pack to active packs', () => {
      rotationManager.addActivePack('pack-1')
      rotationManager.addActivePack('pack-2')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1', 'pack-2'])
    })

    it('does not add duplicate pack', () => {
      rotationManager.addActivePack('pack-1')
      rotationManager.addActivePack('pack-1')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1'])
    })

    it('records history for each addition', () => {
      rotationManager.addActivePack('pack-1')
      rotationManager.addActivePack('pack-2')
      const state = rotationManager.getState()
      expect(state.rotationHistory).toHaveLength(2)
    })
  })

  describe('removeActivePack', () => {
    it('removes a pack from active packs', () => {
      rotationManager.setActivePacks(['pack-1', 'pack-2'])
      rotationManager.removeActivePack('pack-1')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-2'])
    })

    it('does nothing if pack is not active', () => {
      rotationManager.addActivePack('pack-1')
      rotationManager.removeActivePack('non-existent')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1'])
    })
  })

  describe('rollback', () => {
    it('restores previous active packs', () => {
      rotationManager.setActivePacks(['pack-1'])
      rotationManager.setActivePacks(['pack-2'])
      const result = rotationManager.rollback()
      const state = rotationManager.getState()
      expect(result).toBe(true)
      expect(state.activePacks).toEqual(['pack-1'])
    })

    it('returns false when no history', () => {
      const result = rotationManager.rollback()
      expect(result).toBe(false)
    })

    it('records rollback in history', () => {
      rotationManager.setActivePacks(['pack-1'])
      rotationManager.setActivePacks(['pack-2'])
      rotationManager.rollback('Test rollback')
      const state = rotationManager.getState()
      const lastRecord = state.rotationHistory[state.rotationHistory.length - 1]
      expect(lastRecord.action).toBe('rollback')
      expect(lastRecord.note).toBe('Test rollback')
    })

    it('can rollback multiple times', () => {
      rotationManager.setActivePacks(['pack-1'])
      rotationManager.setActivePacks(['pack-2'])
      rotationManager.setActivePacks(['pack-3'])
      rotationManager.rollback()
      rotationManager.rollback()
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1'])
    })
  })

  describe('saveStablePacks', () => {
    it('saves current active packs as stable', () => {
      rotationManager.setActivePacks(['pack-1', 'pack-2'])
      rotationManager.saveStablePacks()
      const state = rotationManager.getState()
      expect(state.stablePacks).toEqual(['pack-1', 'pack-2'])
    })
  })

  describe('getActivePackIds', () => {
    it('returns copy of active pack ids', () => {
      rotationManager.setActivePacks(['pack-1'])
      const ids = rotationManager.getActivePackIds()
      ids.push('pack-2')
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1'])
    })
  })

  describe('clearHistory', () => {
    it('clears rotation history', () => {
      rotationManager.setActivePacks(['pack-1'])
      rotationManager.setActivePacks(['pack-2'])
      rotationManager.clearHistory()
      const state = rotationManager.getState()
      expect(state.rotationHistory).toEqual([])
    })

    it('does not clear active packs', () => {
      rotationManager.setActivePacks(['pack-1', 'pack-2'])
      rotationManager.clearHistory()
      const state = rotationManager.getState()
      expect(state.activePacks).toEqual(['pack-1', 'pack-2'])
    })
  })

  describe('validatePackAvailability', () => {
    const availablePacks: ContentPackMetadata[] = [
      createMockPack('pack-1'),
      createMockPack('pack-2'),
      createMockPack('pack-3'),
    ]

    it('returns valid pack ids', () => {
      const result = validatePackAvailability(['pack-1', 'pack-2'], availablePacks)
      expect(result.valid).toEqual(['pack-1', 'pack-2'])
      expect(result.invalid).toEqual([])
    })

    it('returns invalid pack ids', () => {
      const result = validatePackAvailability(['pack-1', 'non-existent'], availablePacks)
      expect(result.valid).toEqual(['pack-1'])
      expect(result.invalid).toEqual(['non-existent'])
    })

    it('handles empty input', () => {
      const result = validatePackAvailability([], availablePacks)
      expect(result.valid).toEqual([])
      expect(result.invalid).toEqual([])
    })
  })

  describe('mergePacksFromIds', () => {
    const availablePacks: ContentPackMetadata[] = [
      createMockPack('pack-1'),
      createMockPack('pack-2'),
      createMockPack('pack-3'),
    ]

    it('merges packs in order', () => {
      const result = mergePacksFromIds(['pack-1', 'pack-3'], availablePacks)
      expect(result).toHaveLength(2)
      expect(result[0].packId).toBe('pack-1')
      expect(result[1].packId).toBe('pack-3')
    })

    it('skips non-existent packs', () => {
      const result = mergePacksFromIds(['pack-1', 'non-existent', 'pack-2'], availablePacks)
      expect(result).toHaveLength(2)
    })

    it('returns empty array for no valid packs', () => {
      const result = mergePacksFromIds(['non-existent'], availablePacks)
      expect(result).toEqual([])
    })
  })

  describe('localStorage persistence', () => {
    it('persists state to localStorage', () => {
      rotationManager.setActivePacks(['pack-1'])
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      const lastCall = mockLocalStorage.setItem.mock.calls[mockLocalStorage.setItem.mock.calls.length - 1]
      const storedValue = lastCall[1]
      const parsed = JSON.parse(storedValue)
      expect(parsed.activePacks).toEqual(['pack-1'])
    })

    it('loads state from localStorage', () => {
      mockLocalStorage.setItem(
        'advantage-games-pack-rotation',
        JSON.stringify({
          activePacks: ['stored-pack'],
          stablePacks: [],
          lastRotation: null,
          rotationHistory: [],
        })
      )
      const newManager = createRotationManager()
      expect(newManager.getState().activePacks).toEqual(['stored-pack'])
    })

    it('handles corrupted localStorage gracefully', () => {
      mockLocalStorage.setItem('advantage-games-pack-rotation', 'not valid json')
      const newManager = createRotationManager()
      expect(newManager.getState().activePacks).toEqual([])
    })
  })
})