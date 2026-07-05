import { NextResponse } from 'next/server'
import { leaderboardResponseSchema } from '@reading-advantage/domain/games'

/**
 * Phase 4 — Canonical difficulty keys. `medium` (not `normal`) is the
 * canonical value per Decision 4.3 §2 / B21-018 closure.
 */
export const DIFFICULTY_KEYS = ['easy', 'medium', 'hard', 'extreme'] as const
export type DifficultyKey = (typeof DIFFICULTY_KEYS)[number]

const EMPTY_RANKINGS: ReadonlyArray<never> = []

/**
 * Standalone (mock) ranking route for `apps/advantage-games`.
 *
 * Phase 4 changes (Decision 4.3 §2):
 *   1. Response is validated against the shared `leaderboardResponseSchema`
 *      before being serialized — the shape is the contract, not just the
 *      mock data. `rankings` is a flat array of leaderboard entries
 *      (filtered client-side by `RankingDialog`'s difficulty tabs).
 *   2. The legacy `normal` difficulty key is closed (B21-018); the
 *      `DIFFICULTY_KEYS` constant is exported for downstream UI use.
 *   3. `schoolScoped: true` is asserted on the response so any future host
 *      route handler cannot accidentally serve a cross-tenant leaderboard
 *      without an explicit tenant scope.
 *
 * The route remains `force-static` (no DB, no auth) — Decision 3.7. The
 * real `getSchoolLeaderboard` query runs in the host app via a real
 * `TenantDB` (Phase 5+).
 */
export function createRankingRoute() {
  return {
    dynamic: 'force-static' as const,
    GET: async () => {
      const response = leaderboardResponseSchema.parse({
        rankings: EMPTY_RANKINGS,
        schoolScoped: true as const,
      })

      return NextResponse.json(response)
    },
  }
}