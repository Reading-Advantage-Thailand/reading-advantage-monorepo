import type { VocabularyItem } from '@/store/useGameStore'
import { withBasePath } from './basePath'

// In-memory cache for vocabulary data
const vocabularyCache = new Map<string, VocabularyItem[]>()

/**
 * Validates that the data conforms to VocabularyItem[] structure
 */
function validateVocabularyData(data: unknown): data is VocabularyItem[] {
  if (!Array.isArray(data)) {
    throw new Error('Vocabulary data must be an array')
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Vocabulary item at index ${i} must be an object`)
    }
    if (typeof item.term !== 'string' || item.term.trim() === '') {
      throw new Error(`Vocabulary item at index ${i} missing valid 'term' property`)
    }
    if (typeof item.translation !== 'string' || item.translation.trim() === '') {
      throw new Error(`Vocabulary item at index ${i} missing valid 'translation' property`)
    }
  }

  return true
}

/**
 * Loads vocabulary from a JSON file for a specific game
 * Falls back to default.json if the game-specific file fails to load
 * Caches results to avoid redundant fetches
 *
 * @param gameName - The name of the game (e.g., 'enchanted-library')
 * @returns Promise<VocabularyItem[]> - The vocabulary data
 */
export async function loadVocabulary(gameName: string): Promise<VocabularyItem[]> {
  // Check cache first
  if (vocabularyCache.has(gameName)) {
    return vocabularyCache.get(gameName)!
  }

  try {
    // Try to fetch game-specific vocabulary
    const response = await fetch(withBasePath(`/vocab/${gameName}.json`))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Validate the data
    validateVocabularyData(data)

    // Cache and return
    vocabularyCache.set(gameName, data)
    return data
  } catch (error) {
    // Log warning and fall back to default
    console.warn(
      `Failed to load vocabulary for ${gameName}: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to default vocabulary.`
    )

    // Try to load default vocabulary
    try {
      const defaultResponse = await fetch(withBasePath('/vocab/default.json'))

      if (!defaultResponse.ok) {
        throw new Error(`Failed to load default vocabulary: HTTP ${defaultResponse.status}`)
      }

      const defaultData = await defaultResponse.json()
      validateVocabularyData(defaultData)

      // Cache default vocabulary under the requested game name
      vocabularyCache.set(gameName, defaultData)
      return defaultData
    } catch (defaultError) {
      throw new Error(
        `Failed to load both game vocabulary and default vocabulary: ${defaultError instanceof Error ? defaultError.message : 'Unknown error'}`
      )
    }
  }
}

/**
 * Clears the vocabulary cache (useful for testing)
 */
export function clearVocabularyCache(): void {
  vocabularyCache.clear()
}
