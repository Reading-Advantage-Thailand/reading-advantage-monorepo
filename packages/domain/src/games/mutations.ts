import { eq, and } from "drizzle-orm";
import {
  assertCan,
  type UserContext,
  type Tenant,
} from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { gameCompletions, xpLogs } from "@reading-advantage/db/schema";
import { gameCompletionInputSchema } from "./schema.js";
import { calculateGameXP } from "./xp.js";
import type {
  GameCompletionInput,
  GameCompletionResult,
} from "./contracts.js";

// The db.transaction callback receives a TenantDB at runtime (per
// db-contract.ts), but the existing signature types it as DB. Cast
// here so we can call `.unscoped()` for the REFERENTIAL xpLogs insert.
type TenantTx = TenantDB;

/**
 * Postgres error code for a unique-violation. The dual-write in
 * `recordGameCompletion` catches this as the race-safe fire-once signal
 * (Phase 4 Decision 4.5).
 */
const PG_UNIQUE_VIOLATION = "23505";

interface PgError {
  code?: string;
  cause?: { code?: string };
}

/**
 * Returns true if the supplied error is a Postgres unique-violation. We
 * match the SQLSTATE code at any level (drizzle throws the underlying PG
 * error directly; PGlite nests it under `.cause`).
 */
function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as PgError;
  if (candidate.code === PG_UNIQUE_VIOLATION) return true;
  if (candidate.cause?.code === PG_UNIQUE_VIOLATION) return true;
  return false;
}

/**
 * Records a single game completion with race-safe fire-once idempotency.
 *
 * Algorithm (Decision 4.5):
 *   1. Assert the user holds `games:complete` on the tenant.
 *   2. Re-validate the input through `gameCompletionInputSchema` so a host
 *      that calls this function with an already-typed payload still gets the
 *      D-02 `.strict()` defense against client-supplied `xp` /
 *      `dragonCount` / `bossPower`.
 *   3. Compute XP server-side via `calculateGameXP` (no client-supplied XP).
 *   4. SELECT-before-INSERT fast-path dedup against `gameCompletions`
 *      (FLAT — TenantDB scopes the read to `tenant.schoolId`). If a row
 *      exists, return `{ duplicate: true, xpEarned: 0 }` without inserting.
 *      This avoids the throw-on-constraint-violation cost in the common
 *      duplicate case.
 *   5. Otherwise dual-write in a single transaction:
 *        - `gameCompletions` (FLAT, tenant-scoped, full contract payload) —
 *          primary fire-once guard via the unique constraint on
 *          `(schoolId, userId, activityId)`.
 *        - `xpLogs` (REFERENTIAL, XP ledger) — preserves the
 *          `getStudentProgress#xpTotal` read path (Decision 4.1 §3).
 *      If the `gameCompletions` insert throws a unique-violation (concurrent
 *      caller raced past the SELECT), the catch returns
 *      `{ duplicate: true, xpEarned: 0 }` and rolls the transaction back;
 *      no `xpLogs` row is written either (atomic).
 *   6. Return `{ duplicate: false, xpEarned, activityId, status: 200 }`.
 *
 * Phase 4 closes the Phase 3 Tier 2 item (Decision 3.4): the previous
 * SELECT-before-INSERT on `xpLogs` was racy under concurrent completion
 * calls because there was no DB-level uniqueness guarantee. The unique
 * constraint on `gameCompletions(schoolId, userId, activityId)` AND the
 * auxiliary constraint on `xpLogs(userId, activityId)` together make the
 * fire-once guard race-safe.
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

  // Fast-path SELECT-before-INSERT dedup against `gameCompletions` (FLAT —
  // TenantDB auto-scopes by `tenant.schoolId`). This avoids the
  // throw-on-constraint-violation cost in the common duplicate case.
  const existing = await db
    .select({ activityId: gameCompletions.activityId })
    .from(gameCompletions)
    .where(
      and(
        eq(gameCompletions.userId, user.id),
        eq(gameCompletions.activityId, activityId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { xpEarned: 0, activityId, duplicate: true, status: 200 };
  }

  // Dual-write in a single transaction. Either both rows commit, or neither
  // does — atomic with respect to a unique-violation on either side.
  //
  // TenantDB's M-SF-2 fail-closed guard already throws on a null tenant
  // schoolId, so by the time we reach this point `tenant.schoolId` is
  // guaranteed non-null. Assert it for TypeScript; the runtime is safe.
  if (!tenant.schoolId) {
    throw new Error(
      "[TenantDB] recordGameCompletion requires a non-null tenant.schoolId",
    );
  }
  const schoolId = tenant.schoolId;
  try {
    await db.transaction(async (rawTx) => {
      // rawTx is a TenantDB at runtime (see db-contract.ts) — cast so
      // we can call `.unscoped()` for the REFERENTIAL xpLogs insert.
      const tx = rawTx as unknown as TenantTx;
      await tx.insert(gameCompletions).values({
        schoolId,
        userId: user.id,
        gameType: parsed.gameType,
        difficulty: parsed.difficulty,
        score: parsed.score,
        accuracy: parsed.accuracy,
        correctAnswers: parsed.correctAnswers,
        totalAttempts: parsed.totalAttempts,
        duration: parsed.duration,
        victory: parsed.victory,
        xpEarned,
        activityId,
        clientTimestamp: parsed.clientTimestamp,
        // Spread metadata only when present so the column's nullable
        // contract is preserved by Drizzle's insert type inference.
        ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
      });
      // xpLogs is REFERENTIAL (no schoolId) — bypass TenantDB scoping for
      // this single insert. The unique constraint on (userId, activityId)
      // catches the race even though the table is unscoped.
      const rawXpLogsTx = tx.unscoped(
        "xpLogs is REFERENTIAL; race-safe fire-once is enforced by the unique constraint on (user_id, activity_id) added in Phase 4 Decision 4.1 §2",
      );
      await rawXpLogsTx.insert(xpLogs).values({
        userId: user.id,
        xpEarned,
        activityId,
        activityType: "GAME_COMPLETION",
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Race-safe fire-once: a concurrent caller beat us to the insert.
      // Roll back (transaction aborted) and report duplicate.
      return { xpEarned: 0, activityId, duplicate: true, status: 200 };
    }
    throw err;
  }

  return { xpEarned, activityId, duplicate: false, status: 200 };
}