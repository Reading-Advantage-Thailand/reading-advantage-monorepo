import { NextResponse, type NextRequest } from 'next/server'
import type { CompleteRequest, CompleteResponse } from './types'

export function createCompleteRoute() {
  return {
    dynamic: 'force-static' as const,
    POST: async (request: NextRequest) => {
      const body: CompleteRequest = await request.json()
      const { correctAnswers, totalAttempts, xp } = body

      const accuracy = totalAttempts > 0 ? correctAnswers / totalAttempts : 0
      const xpEarned = xp ?? Math.floor(correctAnswers * accuracy)
      const activityId = `mock-activity-${Date.now()}`

      const response: CompleteResponse = {
        message: 'Game completed successfully',
        xpEarned,
        activityId,
        status: 200,
      }

      return NextResponse.json(response)
    },
  }
}
