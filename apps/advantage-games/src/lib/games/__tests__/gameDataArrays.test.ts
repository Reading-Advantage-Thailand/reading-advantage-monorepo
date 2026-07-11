import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary'
import { SAMPLE_SENTENCES } from '@/lib/games/sampleSentences'
import { getArcadeContent } from '@/features/apk-arcade/content'
import type { VocabularyItem } from '@/store/useGameStore'
import fs from 'fs'
import path from 'path'

const MINIMUM_DATA_COUNT = 10

describe('Game data arrays', () => {
  describe('sampleVocabulary', () => {
    it('should have at least 10 vocabulary items', () => {
      expect(SAMPLE_VOCABULARY.length).toBeGreaterThanOrEqual(MINIMUM_DATA_COUNT)
    })

    it('should have valid vocabulary items with term and translation', () => {
      SAMPLE_VOCABULARY.forEach((item: VocabularyItem) => {
        expect(item.term).toBeTruthy()
        expect(item.translation).toBeTruthy()
        expect(typeof item.term).toBe('string')
        expect(typeof item.translation).toBe('string')
        expect(item.term.length).toBeGreaterThan(0)
        expect(item.translation.length).toBeGreaterThan(0)
      })
    })
  })

  describe('sampleSentences', () => {
    it('should have at least 10 sentences', () => {
      expect(SAMPLE_SENTENCES.length).toBeGreaterThanOrEqual(MINIMUM_DATA_COUNT)
    })

    it('should have valid sentences with term and translation', () => {
      SAMPLE_SENTENCES.forEach((item: VocabularyItem) => {
        expect(item.term).toBeTruthy()
        expect(item.translation).toBeTruthy()
        expect(typeof item.term).toBe('string')
        expect(typeof item.translation).toBe('string')
        expect(item.term.length).toBeGreaterThan(0)
        expect(item.translation.length).toBeGreaterThan(0)
      })
    })
  })

  describe('game-specific inline data', () => {
    it('runner-wave sentence cartridges use the strict shared arcade fixture', () => {
      expect(getArcadeContent('sentence')).toEqual([
        {
          term: 'The curious fox crossed the quiet bridge',
          translation: 'Narrative sentence',
        },
        {
          term: 'We practice new words every morning',
          translation: 'Habit sentence',
        },
      ])
    })

    it('gryphon-patrol should have at least 10 sentences in route file', () => {
      const routePath = path.join(
        process.cwd(),
        'src/app/api/v1/games/gryphon-patrol/sentences/route.ts'
      )
      const content = fs.readFileSync(routePath, 'utf8')
      const termMatches = content.match(/term:\s*['"]/g) || []
      expect(termMatches.length).toBeGreaterThanOrEqual(MINIMUM_DATA_COUNT)
    })
  })

  describe('haunted-library external data', () => {
    it('should have a valid default.json with sufficient sentences', () => {
      const vocabPath = path.join(process.cwd(), 'public/vocab/default.json')
      expect(fs.existsSync(vocabPath)).toBe(true)

      const fileContents = fs.readFileSync(vocabPath, 'utf8')
      const allSentences: VocabularyItem[] = JSON.parse(fileContents)

      const validSentences = allSentences.filter(s => {
        const wordCount = s.term.split(' ').length
        return wordCount >= 3 && wordCount <= 10
      })

      expect(validSentences.length).toBeGreaterThanOrEqual(MINIMUM_DATA_COUNT)
    })
  })
})
