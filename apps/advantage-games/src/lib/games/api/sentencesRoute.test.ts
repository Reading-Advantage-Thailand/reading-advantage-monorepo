import { createSentencesRoute } from './sentencesRoute'
import type { VocabularyItem } from './types'

describe('createSentencesRoute', () => {
  const sentences: VocabularyItem[] = [
    { term: 'The cat sits on the mat', translation: 'แมวนั่งบนเสื่อ' },
    { term: 'I love to read books', translation: 'ฉันชอบอ่านหนังสือ' },
    { term: 'The sun is shining', translation: 'ดวงอาทิตย์ส่องแสง' },
    { term: 'She walks to school', translation: 'เธอเดินไปโรงเรียน' },
    { term: 'We play games together', translation: 'พวกเราเล่นเกมด้วยกัน' },
  ]

  describe('configuration', () => {
    it('returns force-static dynamic config', () => {
      const route = createSentencesRoute(sentences)
      expect(route.dynamic).toBe('force-static')
    })

    it('exports GET handler function', () => {
      const route = createSentencesRoute(sentences)
      expect(typeof route.GET).toBe('function')
    })
  })

  describe('GET handler - empty sentences', () => {
    it('returns NO_SENTENCES warning when sentences is empty', async () => {
      const route = createSentencesRoute([])
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        sentences: [],
        status: 200,
        warning: 'NO_SENTENCES',
        message: 'No sentences found. Please learn some sentences first.',
      })
    })
  })

  describe('GET handler - insufficient sentences', () => {
    it('returns INSUFFICIENT_SENTENCES warning when sentences has less than 5 items', async () => {
      const smallSentences = [
        { term: 'Hello world', translation: 'สวัสดีโลก' },
        { term: 'Good morning', translation: 'อรุณสวัสดิ์' },
      ]
      const route = createSentencesRoute(smallSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        sentences: smallSentences,
        status: 200,
        warning: 'INSUFFICIENT_SENTENCES',
        requiredCount: 5,
        currentCount: 2,
        message: 'You need at least 5 sentences to play. You currently have 2.',
      })
    })

    it('returns INSUFFICIENT_SENTENCES for exactly 4 items', async () => {
      const smallSentences = [
        { term: 'one', translation: '1' },
        { term: 'two', translation: '2' },
        { term: 'three', translation: '3' },
        { term: 'four', translation: '4' },
      ]
      const route = createSentencesRoute(smallSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.warning).toBe('INSUFFICIENT_SENTENCES')
      expect(data.currentCount).toBe(4)
    })
  })

  describe('GET handler - success', () => {
    it('returns sentences successfully when 5 or more items', async () => {
      const route = createSentencesRoute(sentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data).toMatchObject({
        sentences,
        status: 200,
        message: 'Sentences retrieved successfully',
      })
      expect(data.warning).toBeUndefined()
    })

    it('returns exactly 5 items successfully', async () => {
      const route = createSentencesRoute(sentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences).toHaveLength(5)
      expect(data.status).toBe(200)
    })

    it('returns sentences with term and translation fields', async () => {
      const route = createSentencesRoute(sentences)
      const response = await route.GET()
      const data = await response.json()

      data.sentences.forEach((item: VocabularyItem) => {
        expect(item).toHaveProperty('term')
        expect(item).toHaveProperty('translation')
        expect(typeof item.term).toBe('string')
        expect(typeof item.translation).toBe('string')
      })
    })

    it('preserves sentence order', async () => {
      const orderedSentences = [
        { term: 'First sentence', translation: 'ประโยคแรก' },
        { term: 'Second sentence', translation: 'ประโยคที่สอง' },
        { term: 'Third sentence', translation: 'ประโยคที่สาม' },
        { term: 'Fourth sentence', translation: 'ประโยคที่สี่' },
        { term: 'Fifth sentence', translation: 'ประโยคที่ห้า' },
      ]
      const route = createSentencesRoute(orderedSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences[0].term).toBe('First sentence')
      expect(data.sentences[4].term).toBe('Fifth sentence')
    })
  })

  describe('edge cases', () => {
    it('handles sentences with special characters', async () => {
      const specialSentences = [
        { term: "Don't worry!", translation: "ไม่ต้องกังวล!" },
        { term: '"Hello," she said.', translation: '"สวัสดี" เธอกล่าว' },
        { term: 'What? Really?!', translation: 'อะไรนะ? จริงหรือ?!' },
        { term: 'Test@example.com is email', translation: 'อีเมล' },
        { term: '<html>tag</html>', translation: 'แท็ก' },
      ]
      const route = createSentencesRoute(specialSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences).toEqual(specialSentences)
    })

    it('handles long sentences', async () => {
      const longSentences = [
        {
          term: 'This is a very long sentence that contains many words and should still be handled correctly by the API route factory.',
          translation: 'นี่คือประโยคที่ยาวมากซึ่งมีหลายคำและควรยังคงได้รับการจัดการอย่างถูกต้องโดย API route factory',
        },
        { term: 'Another long one', translation: 'อีกอันที่ยาว' },
        { term: 'Third sentence', translation: 'ประโยคที่สาม' },
        { term: 'Fourth sentence', translation: 'ประโยคที่สี่' },
        { term: 'Fifth sentence', translation: 'ประโยคที่ห้า' },
      ]
      const route = createSentencesRoute(longSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences[0].term).toContain('very long sentence')
    })

    it('handles large sentence lists', async () => {
      const largeSentences = Array.from({ length: 50 }, (_, i) => ({
        term: `Sentence number ${i}`,
        translation: `ประโยคหมายเลข ${i}`,
      }))
      const route = createSentencesRoute(largeSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences).toHaveLength(50)
      expect(data.status).toBe(200)
    })

    it('handles sentences with unicode characters', async () => {
      const unicodeSentences = [
        { term: '你好世界', translation: 'Hello world in Chinese' },
        { term: 'مرحبا بالعالم', translation: 'Hello world in Arabic' },
        { term: 'Привет мир', translation: 'Hello world in Russian' },
        { term: '🎉🎊🎁', translation: 'Celebration emojis' },
        { term: '日本語のテスト', translation: 'Japanese test' },
      ]
      const route = createSentencesRoute(unicodeSentences)
      const response = await route.GET()
      const data = await response.json()

      expect(data.sentences).toEqual(unicodeSentences)
    })
  })
})
