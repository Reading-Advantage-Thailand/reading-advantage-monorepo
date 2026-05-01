import { NextResponse } from 'next/server'
import type { VocabularyItem, SentencesResponse } from './types'

export function createSentencesRoute(sentences: VocabularyItem[]) {
  return {
    dynamic: 'force-static' as const,
    GET: async () => {
      const response: SentencesResponse = {
        sentences,
        status: 200,
      }

      if (sentences.length === 0) {
        return NextResponse.json({
          ...response,
          message: 'No sentences found. Please learn some sentences first.',
          warning: 'NO_SENTENCES',
        })
      }

      if (sentences.length < 5) {
        return NextResponse.json({
          ...response,
          message: `You need at least 5 sentences to play. You currently have ${sentences.length}.`,
          warning: 'INSUFFICIENT_SENTENCES',
          requiredCount: 5,
          currentCount: sentences.length,
        })
      }

      return NextResponse.json({
        ...response,
        message: 'Sentences retrieved successfully',
      })
    },
  }
}
