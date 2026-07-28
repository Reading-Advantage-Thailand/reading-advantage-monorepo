import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { gameCompletions } from "@reading-advantage/db/schema";
import type { z } from "zod";
import type { leaderboardEntrySchema } from "./schema.js";
import type { GameCompletionHistoryQuery } from "./contracts.js";

/**
 * Inferred TypeScript type for a leaderboard entry row. Matches the
 * `leaderboardEntrySchema` Zod schema in `./schema.ts`.
 */
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

/**
 * Read-side view of a recorded game completion.
 *
 * Phase 4 stores game completions in the new `gameCompletions` FLAT table
 * (tenant-safe — `schoolId` notNull, indexed on (schoolId, gameType,
 * difficulty)). The per-user `getGameCompletions` query now reads through
 * TenantDB WITHOUT `unscoped()`, so a school-B tenant context cannot read
 * a school-A user's game completions (Decision 4.3 §3).
 */
export interface GameCompletion {
  /** game_completions.id — UUID primary key. */
  id: string;
  /** School (tenant) scope. */
  schoolId: string;
  /** User who completed the game. */
  userId: string;
  /** Canonical game slug (e.g. "haunted-library"). */
  gameType: string;
  /** Canonical difficulty (`easy`/`medium`/`hard`/`extreme`). */
  difficulty: string;
  /** Informational score (not XP). */
  score: number;
  /** Fractional accuracy 0..1. */
  accuracy: number;
  /** Server-computed XP awarded (0 for duplicate completions). */
  xpEarned: number;
  /** Stable `game:<gameType>:<idempotencyKey>` identifier. */
  activityId: string;
  /** Insert timestamp. */
  createdAt: Date;
}

/**
 * Returns the caller's game-completion history, newest first.
 *
 * Requires the `games:read:own` permission. Phase 4 reads from
 * `gameCompletions` (FLAT) through TenantDB so the read is tenant-scoped
 * — a school-B tenant context cannot see a school-A user's completions.
 *
 * @param db - TenantDB
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Optional exact/allowlist game filters and `limit` (default 50)
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
  input?: GameCompletionHistoryQuery;
}): Promise<GameCompletion[]> {
  assertCan(user, "games:read:own", tenant);

  const limit = input?.limit ?? 50;

  const conditions = [eq(gameCompletions.userId, user.id)];
  if (input?.gameType) {
    conditions.push(eq(gameCompletions.gameType, input.gameType));
  }
  if (input?.gameTypes) {
    conditions.push(inArray(gameCompletions.gameType, [...input.gameTypes]));
  }

  const rows = await db
    .select({
      id: gameCompletions.id,
      schoolId: gameCompletions.schoolId,
      userId: gameCompletions.userId,
      gameType: gameCompletions.gameType,
      difficulty: gameCompletions.difficulty,
      score: gameCompletions.score,
      accuracy: gameCompletions.accuracy,
      xpEarned: gameCompletions.xpEarned,
      activityId: gameCompletions.activityId,
      createdAt: gameCompletions.createdAt,
    })
    .from(gameCompletions)
    .where(and(...conditions))
    .orderBy(desc(gameCompletions.createdAt))
    .limit(limit);

  return rows;
}

/**
 * Phase 4 — Tenant-scoped school leaderboard.
 *
 * Reads from `gameCompletions` (FLAT) through TenantDB WITHOUT `unscoped()`.
 * TenantDB auto-injects `eq(gameCompletions.schoolId, tenant.schoolId)` on
 * the read, so a school-A row is *impossible* to read via a school-B tenant
 * context — the WHERE clause is injected by the TenantDB proxy, not by
 * the caller. This is the load-bearing tenant-safety property (Decision 4.3).
 *
 * Aggregates per-user metrics (total XP, best score, best accuracy,
 * attempt count) over rows matching `(gameType, difficulty?)`. The query
 * does NOT include `schoolId` in its own WHERE — TenantDB does that.
 *
 * `gameRankings` is intentionally NOT read here. It is deprecated (Decision
 * 4.2 §4) and remains registered REFERENTIAL purely for the
 * tenant-coverage gate.
 *
 * @param db - TenantDB
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - `gameType` (required), optional `difficulty` filter, optional `limit` (default 50, max 100)
 * @returns Array of leaderboard entries (ordered by total XP desc)
 */
export async function getSchoolLeaderboard({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { gameType: string; difficulty?: string; limit?: number };
}): Promise<LeaderboardEntry[]> {
  assertCan(user, "games:read:own", tenant);

  const limit = Math.min(input.limit ?? 50, 100);

  const conditions = [eq(gameCompletions.gameType, input.gameType)];
  if (input.difficulty) {
    conditions.push(eq(gameCompletions.difficulty, input.difficulty));
  }

  const rows = await db
    .select({
      userId: gameCompletions.userId,
      totalXp: sql<number>`SUM(${gameCompletions.xpEarned})`,
      bestScore: sql<number>`MAX(${gameCompletions.score})`,
      bestAccuracy: sql<number>`MAX(${gameCompletions.accuracy})`,
      attempts: sql<number>`COUNT(*)`,
    })
    .from(gameCompletions)
    .where(and(...conditions))
    .groupBy(gameCompletions.userId)
    .orderBy(desc(sql`SUM(${gameCompletions.xpEarned})`))
    .limit(limit);

  // Coerce SQL aggregate types to plain numbers for the response shape.
  return rows.map((row) => ({
    userId: row.userId,
    totalXp: Number(row.totalXp ?? 0),
    bestScore: Number(row.bestScore ?? 0),
    bestAccuracy: Number(row.bestAccuracy ?? 0),
    attempts: Number(row.attempts ?? 0),
  }));
}
