import { eq, and } from "drizzle-orm";
import {
  assertCan,
  type UserContext,
  type Tenant,
} from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { xpLogs } from "@reading-advantage/db/schema";
import { gameCompletionInputSchema } from "./schema.js";
import { calculateGameXP } from "./xp.js";
import type {
  GameCompletionInput,
  GameCompletionResult,
} from "./contracts.js";

/**
 * Records a single game completion with fire-once idempotency.
 *
 * Algorithm (Decision 3.4):
 *   1. Assert the user holds `games:complete` on the tenant.
 *   2. Re-validate the input through `gameCompletionInputSchema` so a host
 *      that calls this function with an already-typed payload still gets the
 *      D-02 `.strict()` defense against client-supplied `xp` /
 *      `dragonCount` / `bossPower`.
 *   3. Compute XP server-side via `calculateGameXP` (no client-supplied XP).
 *   4. Look up `(userId, activityId)` in `xpLogs` (REFERENTIAL — uses
 *      `db.unscoped(...)`). If a row exists, return `{ duplicate: true,
 *      xpEarned: 0 }` without inserting.
 *   5. Otherwise insert `{ userId, xpEarned, activityId: "game:<gameType>:
 *      <idempotencyKey>", activityType: "GAME_COMPLETION" }` and return
 *      `{ duplicate: false, xpEarned, status: 200 }`.
 *
 * Phase 3 proves the *logic* with a mock DB. Phase 4 will add a DB-level
 * unique constraint on `(userId, activityId)` to make fire-once race-safe;
 * the SELECT-before-INSERT here is racy under concurrent completion calls.
 *
 * @param db - TenantDB
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Game completion payload (must satisfy
 *   `gameCompletionInputSchema`).
 * @returns `GameCompletionResult` with server-computed XP and stable
 *   activityId.
 */
export async function recordGameCompletion({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GameCompletionInput;
}): Promise<GameCompletionResult> {
  assertCan(user, "games:complete", tenant);

  // Re-validate so a typed input is still hardened by `.strict()`.
  const parsed = gameCompletionInputSchema.parse(input);

  const xpEarned = calculateGameXP(parsed);
  const activityId = `game:${parsed.gameType}:${parsed.idempotencyKey}`;

  const rawDb = db.unscoped(
    "xpLogs is REFERENTIAL, scoped via userId FK (game completions are per-user)",
  );

  const existing = await rawDb
    .select({ activityId: xpLogs.activityId })
    .from(xpLogs)
    .where(
      and(
        eq(xpLogs.userId, user.id),
        eq(xpLogs.activityId, activityId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { xpEarned: 0, activityId, duplicate: true, status: 200 };
  }

  await rawDb.insert(xpLogs).values({
    userId: user.id,
    xpEarned,
    activityId,
    activityType: "GAME_COMPLETION",
  });

  return { xpEarned, activityId, duplicate: false, status: 200 };
}