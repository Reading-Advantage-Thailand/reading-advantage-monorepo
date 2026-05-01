import { loadVocabulary, clearVocabularyCache } from './vocabLoader'
import type { VocabularyItem } from '@/store/useGameStore'

// Mock fetch globally
global.fetch = jest.fn()

describe('loadVocabulary', () => {
  beforeEach(() => {
    // Reset mocks and clear cache before each test
    jest.clearAllMocks()
    clearVocabularyCache()
  })

  it('successfully fetches and parses JSON vocabulary', async () => {
    const mockVocab: VocabularyItem[] = [
      { term: 'hello', translation: 'สวัสดี' },
      { term: 'goodbye', translation: 'ลาก่อน' },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockVocab,
    })

    const result = await loadVocabulary('test-game')

    expect(global.fetch).toHaveBeenCalledWith('/vocab/test-game.json')
    expect(result).toEqual(mockVocab)
  })

  it('falls back to default.json on 404 error', async () => {
    const mockDefaultVocab: VocabularyItem[] = [
      { term: 'default', translation: 'ค่าเริ่มต้น' },
    ]

    // First call fails with 404
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    // Second call to default.json succeeds
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDefaultVocab,
    })

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await loadVocabulary('missing-game')

    expect(global.fetch).toHaveBeenCalledWith('/vocab/missing-game.json')
    expect(global.fetch).toHaveBeenCalledWith('/vocab/default.json')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load vocabulary for missing-game')
    )
    expect(result).toEqual(mockDefaultVocab)

    consoleWarnSpy.mockRestore()
  })

  it('falls back to default.json on network error', async () => {
    const mockDefaultVocab: VocabularyItem[] = [
      { term: 'default', translation: 'ค่าเริ่มต้น' },
    ]

    // First call throws network error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    // Second call to default.json succeeds
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDefaultVocab,
    })

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await loadVocabulary('error-game')

    expect(consoleWarnSpy).toHaveBeenCalled()
    expect(result).toEqual(mockDefaultVocab)

    consoleWarnSpy.mockRestore()
  })

  it('caches vocabulary on second call (returns cached data without fetch)', async () => {
    const mockVocab: VocabularyItem[] = [
      { term: 'cached', translation: 'แคช' },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockVocab,
    })

    // First call - should fetch
    const result1 = await loadVocabulary('cached-game')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result1).toEqual(mockVocab)

    // Second call - should use cache, not fetch again
    const result2 = await loadVocabulary('cached-game')
    expect(global.fetch).toHaveBeenCalledTimes(1) // Still only 1 call
    expect(result2).toEqual(mockVocab)
  })

  it('validates TypeScript types at runtime', async () => {
    const invalidVocab = [
      { term: 'valid', translation: 'ถูกต้อง' },
      { term: 'invalid' }, // Missing translation
      { translation: 'ไม่มีคำศัพท์' }, // Missing term
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidVocab,
    })

    await expect(loadVocabulary('invalid-game')).rejects.toThrow()
  })
})
