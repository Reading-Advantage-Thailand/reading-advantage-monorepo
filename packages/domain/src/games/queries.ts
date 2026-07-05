import { eq, and, desc } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { xpLogs } from "@reading-advantage/db/schema";

/**
 * Read-side view of a recorded game completion.
 *
 * Phase 3 stores game completions in the existing `xpLogs` table with
 * `activityType = "GAME_COMPLETION"` and `activityId = "game:<gameType>:<idempotencyKey>"`.
 * The detail columns (score, accuracy, correctAnswers, etc.) are not persisted
 * in `xpLogs` — Phase 4 may introduce a `gameCompletions` table for full
 * audit. For now, the read-side reconstructs the `gameType` from the
 * `activityId` namespace prefix and returns only what `xpLogs` knows.
 */
export interface GameCompletion {
  /** xp_logs.id — UUID primary key. */
  id: string;
  /** User who completed the game. */
  userId: string;
  /** Canonical game slug parsed from the activityId prefix. */
  gameType: string;
  /** Server-computed XP awarded (0 for duplicate completions). */
  xpEarned: number;
  /** Stable `game:<gameType>:<idempotencyKey>` identifier. */
  activityId: string;
  /** Always `"GAME_COMPLETION"` for Phase 3 game rows. */
  activityType: string;
  /** Insert timestamp from xp_logs.createdAt. */
  createdAt: Date;
}

/**
 * Returns the caller's game-completion history, newest first.
 *
 * Requires the `games:read:own` permission. Phase 3 stores game completions in
 * `xpLogs` (REFERENTIAL — no `schoolId`); this function scopes by `userId`
 * inside the unscoped raw DB so each student only sees their own rows.
 *
 * @param db - TenantDB
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Optional `gameType` filter and `limit` (default 50)
 * @returns Array of game completions (newest first)
 */
export async function getGameCompletions({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input?: { gameType?: string; limit?: number };
}): Promise<GameCompletion[]> {
  assertCan(user, "games:read:own", tenant);

  const rawDb = db.unscoped(
    "xpLogs is REFERENTIAL, scoped via userId FK (game completions are per-user)",
  );

  const limit = input?.limit ?? 50;

  const conditions = [
    eq(xpLogs.userId, user.id),
    eq(xpLogs.activityType, "GAME_COMPLETION"),
  ];

  const rows = await rawDb
    .select()
    .from(xpLogs)
    .where(and(...conditions))
    .orderBy(desc(xpLogs.createdAt))
    .limit(limit);

  return rows.map((row) => {
    // activityId = "game:<gameType>:<idempotencyKey>"
    // gameType slugs never contain ":"; idempotencyKey is a UUID (dashes only).
    const parts = row.activityId.split(":");
    const gameType = parts.length >= 3 ? parts[1] ?? "" : "";
    return {
      id: row.id,
      userId: row.userId,
      gameType,
      xpEarned: row.xpEarned,
      activityId: row.activityId,
      activityType: row.activityType,
      createdAt: row.createdAt,
    };
  });
}