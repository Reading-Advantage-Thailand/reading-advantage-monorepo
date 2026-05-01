import { NextResponse } from 'next/server'
import type { VocabularyItem } from './types'
import type { VocabularyResponse } from './types'

export function createVocabularyRoute(vocabulary: VocabularyItem[]) {
  return {
    dynamic: 'force-static' as const,
    GET: async () => {
      const response: VocabularyResponse = {
        vocabulary,
        status: 200,
      }

      if (vocabulary.length === 0) {
        return NextResponse.json({
          ...response,
          message: 'No vocabulary found. Please learn some words first.',
          warning: 'NO_VOCABULARY',
        })
      }

      if (vocabulary.length < 5) {
        return NextResponse.json({
          ...response,
          message: `You need at least 5 words to play. You currently have ${vocabulary.length}.`,
          warning: 'INSUFFICIENT_VOCABULARY',
          requiredCount: 5,
          currentCount: vocabulary.length,
        })
      }

      return NextResponse.json({
        ...response,
        message: 'Vocabulary retrieved successfully',
      })
    },
  }
}
