import { NextResponse, type NextRequest } from "next/server";
import {
  gameCompletionInputSchema,
  calculateGameXP,
} from "@reading-advantage/domain/games";

/**
 * Standalone mock `/complete` route for Advantage Games.
 *
 * Phase 3 contract delegation (Decision 3.7):
 *   - Validates the body via the shared `GameCompletionInputSchema` — this is
 *     the load-bearing defense against client-supplied `xp` / `dragonCount` /
 *     `bossPower` (D-02/B25-001).
 *   - Computes XP server-side via `calculateGameXP` (the real Phase 3 formula).
 *   - Returns a mock `{ xpEarned, activityId, duplicate: false, status: 200 }`
 *     response. The standalone games app has no DB / no auth / no tenant, so
 *     we do NOT call `recordGameCompletion` here — host apps (Reading /
 *     Primary) call `recordGameCompletion` directly with a real `TenantDB`.
 *   - The `activityId` is `game:<gameType>:<idempotencyKey>` so the
 *     standalone preview matches the namespaced id a host app would persist.
 *
 * The route is `force-static` because the standalone games app renders to
 * static assets; the contract validation runs in the host when the game is
 * imported.
 */
export function createCompleteRoute() {
  return {
    dynamic: "force-static" as const,
    POST: async (request: NextRequest) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body", status: 400 },
          { status: 400 },
        );
      }

      const parsed = gameCompletionInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid game completion payload",
            issues: parsed.error.issues,
            status: 400,
          },
          { status: 400 },
        );
      }

      const input = parsed.data;
      const xpEarned = calculateGameXP(input);
      const activityId = `game:${input.gameType}:${input.idempotencyKey}`;

      return NextResponse.json({
        xpEarned,
        activityId,
        duplicate: false,
        status: 200,
      });
    },
  };
}