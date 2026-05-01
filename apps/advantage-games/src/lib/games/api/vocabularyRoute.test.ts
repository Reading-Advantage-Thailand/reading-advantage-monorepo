import { createVocabularyRoute } from './vocabularyRoute'
import type { VocabularyItem } from './types'

describe('createVocabularyRoute', () => {
  const vocabulary: VocabularyItem[] = [
    { term: 'hello', translation: 'สวัสดี' },
    { term: 'thank you', translation: 'ขอบคุณ' },
    { term: 'yes', translation: 'ใช่' },
    { term: 'no', translation: 'ไม่ใช่' },
    { term: 'good', translation: 'ดี' },
  ]

  describe('configuration', () => {
    it('returns force-static dynamic config', () => {
      const route = createVocabularyRoute(vocabulary)
      expect(route.dynamic).toBe('force-static')
    })

    it('exports GET handler function', () => {
      const route = createVocabularyRoute(vocabulary)
      expect(typeof route.GET).toBe('function')
    })
  })

  describe('GET handler - empty vocabulary', () => {
    it('returns NO_VOCABULARY warning when vocabulary is empty', async () => {
      const route = createVocabularyRoute([])
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        vocabulary: [],
        status: 200,
        warning: 'NO_VOCABULARY',
        message: 'No vocabulary found. Please learn some words first.',
      })
    })
  })

  describe('GET handler - insufficient vocabulary', () => {
    it('returns INSUFFICIENT_VOCABULARY warning when vocabulary has less than 5 items', async () => {
      const smallVocab = [
        { term: 'hello', translation: 'สวัสดี' },
        { term: 'thank you', translation: 'ขอบคุณ' },
      ]
      const route = createVocabularyRoute(smallVocab)
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        vocabulary: smallVocab,
        status: 200,
        warning: 'INSUFFICIENT_VOCABULARY',
        requiredCount: 5,
        currentCount: 2,
        message: 'You need at least 5 words to play. You currently have 2.',
      })
    })

    it('returns INSUFFICIENT_VOCABULARY for exactly 4 items', async () => {
      const smallVocab = [
        { term: 'one', translation: '1' },
        { term: 'two', translation: '2' },
        { term: 'three', translation: '3' },
        { term: 'four', translation: '4' },
      ]
      const route = createVocabularyRoute(smallVocab)
      const response = await route.GET()
      const data = await response.json()

      expect(data.warning).toBe('INSUFFICIENT_VOCABULARY')
      expect(data.currentCount).toBe(4)
    })
  })

  describe('GET handler - success', () => {
    it('returns vocabulary successfully when 5 or more items', async () => {
      const route = createVocabularyRoute(vocabulary)
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        vocabulary,
        status: 200,
        message: 'Vocabulary retrieved successfully',
      })
      expect(data.warning).toBeUndefined()
    })

    it('returns exactly 5 items successfully', async () => {
      const route = createVocabularyRoute(vocabulary)
      const response = await route.GET()
      const data = await response.json()

      expect(data.vocabulary).toHaveLength(5)
      expect(data.status).toBe(200)
    })

    it('returns vocabulary with term and translation fields', async () => {
      const route = createVocabularyRoute(vocabulary)
      const response = await route.GET()
      const data = await response.json()

      data.vocabulary.forEach((item: VocabularyItem) => {
        expect(item).toHaveProperty('term')
        expect(item).toHaveProperty('translation')
        expect(typeof item.term).toBe('string')
        expect(typeof item.translation).toBe('string')
      })
    })

    it('preserves vocabulary order', async () => {
      const orderedVocab = [
        { term: 'first', translation: '1st' },
        { term: 'second', translation: '2nd' },
        { term: 'third', translation: '3rd' },
        { term: 'fourth', translation: '4th' },
        { term: 'fifth', translation: '5th' },
      ]
      const route = createVocabularyRoute(orderedVocab)
      const response = await route.GET()
      const data = await response.json()

      expect(data.vocabulary[0].term).toBe('first')
      expect(data.vocabulary[4].term).toBe('fifth')
    })
  })

  describe('edge cases', () => {
    it('handles vocabulary with special characters', async () => {
      const specialVocab = [
        { term: "don't", translation: "ไม่" },
        { term: '"quoted"', translation: '"อ้างอิง"' },
        { term: 'hello!', translation: 'สวัสดี!' },
        { term: 'test@example', translation: 'ทดสอบ' },
        { term: '<script>', translation: 'โค้ด' },
      ]
      const route = createVocabularyRoute(specialVocab)
      const response = await route.GET()
      const data = await response.json()

      expect(data.vocabulary).toEqual(specialVocab)
    })

    it('handles large vocabulary lists', async () => {
      const largeVocab = Array.from({ length: 100 }, (_, i) => ({
        term: `word${i}`,
        translation: `คำ${i}`,
      }))
      const route = createVocabularyRoute(largeVocab)
      const response = await route.GET()
      const data = await response.json()

      expect(data.vocabulary).toHaveLength(100)
      expect(data.status).toBe(200)
    })
  })
})
