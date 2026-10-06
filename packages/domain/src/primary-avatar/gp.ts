/**
 * GP (Guild Points) for Primary Advantage (track primary_avatar_shop_20261005, FR-1). GP is
 * granted beside each XP log row, in the same transaction, and spent in the shop. The balance is
 * the sum of the ledger; there is no balance column and no backfill.
 */
import { and, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { primaryGpLedger } from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";

/** GP per XP by activity type: ratings give none, everything else 1 per XP (calibration placeholder). */
export const GP_WEIGHTS: Readonly<Record<string, number>> = { ARTICLE_RATING: 0, STORIES_RATING: 0, CHAPTER_RATING: 0 };

/** The most GP a student earns from XP in one Bangkok day (calibration placeholder). */
export const GP_DAILY_CAP = 50;

/** The one-time grant when a student first opens the avatar page (calibration placeholder). */
export const WELCOME_GP = 100;

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The handle a ledger write runs on: the XP transaction, or the database. */
type Writer = Pick<DB, "select" | "insert">;

const UNSCOPED_REASON = "primary_gp_ledger rows are read and written with an explicit school_id and user_id pair";

/**
 * The start of the Bangkok day that holds `now`.
 * @param now The moment.
 * @returns The day start as a UTC instant.
 */
export function bangkokDayStart(now: Date): Date {
  return new Date(Math.floor((now.getTime() + BANGKOK_OFFSET_MS) / DAY_MS) * DAY_MS - BANGKOK_OFFSET_MS);
}

/**
 * The GP an XP award earns before the daily cap.
 * @param activityType The XP log activity type.
 * @param xpEarned The XP of the award.
 * @returns A whole, non-negative number of GP.
 */
export function gpForXp(activityType: string, xpEarned: number): number {
  return Math.max(0, Math.round(xpEarned * (GP_WEIGHTS[activityType] ?? 1)));
}

/**
 * The GP balance of a student: the sum of the ledger.
 * @param db The database or transaction.
 * @param schoolId The student's school.
 * @param userId The student.
 * @returns The balance, 0 with no rows.
 */
export async function gpBalance(db: Writer, schoolId: string, userId: string): Promise<number> {
  const raw = createTenantDB(db as DB, { schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw
    .select({ total: sql<number>`coalesce(sum(${primaryGpLedger.delta}), 0)` })
    .from(primaryGpLedger)
    .where(and(eq(primaryGpLedger.schoolId, schoolId), eq(primaryGpLedger.userId, userId)));
  return Number(rows[0]?.total ?? 0);
}

/**
 * Grants the GP of one XP award inside the XP transaction (FR-1): weighted by activity type,
 * capped per Bangkok day, and written once per `sourceKey` (the XP log's activity id).
 * @param params.tx The XP transaction (or the database).
 * @param params.schoolId The student's school; a student with no school earns no GP.
 * @param params.userId The student.
 * @param params.sourceKey The XP source: `xp:<activityId>`.
 * @param params.activityType The XP log activity type.
 * @param params.xpEarned The XP of the award.
 * @param params.now The clock.
 * @returns The GP granted (0 when weighted to nothing, capped out, or already granted).
 */
export async function grantGpForXp(params: { tx: Writer; schoolId: string | null; userId: string; sourceKey: string; activityType: string; xpEarned: number; now?: Date }): Promise<number> {
  const gp = gpForXp(params.activityType, params.xpEarned);
  if (gp <= 0 || !params.schoolId) return 0;
  const now = params.now ?? new Date();
  const raw = createTenantDB(params.tx as DB, { schoolId: params.schoolId }).unscoped(UNSCOPED_REASON);
  const today = await raw
    .select({ total: sql<number>`coalesce(sum(${primaryGpLedger.delta}), 0)` })
    .from(primaryGpLedger)
    .where(and(eq(primaryGpLedger.schoolId, params.schoolId), eq(primaryGpLedger.userId, params.userId), eq(primaryGpLedger.reason, "xp"), gte(primaryGpLedger.createdAt, bangkokDayStart(now))));
  const delta = Math.min(gp, Math.max(0, GP_DAILY_CAP - Number(today[0]?.total ?? 0)));
  if (delta <= 0) return 0;
  const rows = await raw
    .insert(primaryGpLedger)
    .values({ schoolId: params.schoolId, userId: params.userId, delta, reason: "xp", sourceKey: params.sourceKey, createdAt: now })
    .onConflictDoNothing()
    .returning({ id: primaryGpLedger.id });
  return rows.length ? delta : 0;
}
