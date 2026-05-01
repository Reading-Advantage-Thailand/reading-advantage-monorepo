import { NextResponse } from 'next/server'
import type { RankingResponse, RankingsByDifficulty } from './types'

const EMPTY_RANKINGS: RankingsByDifficulty = {
  easy: [],
  normal: [],
  hard: [],
  extreme: [],
}

export function createRankingRoute() {
  return {
    dynamic: 'force-static' as const,
    GET: async () => {
      const response: RankingResponse = {
        rankings: EMPTY_RANKINGS,
      }

      return NextResponse.json(response)
    },
  }
}
