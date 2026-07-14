import { randomUUID } from "node:crypto";
import { activityTutorialCaptureLeases, type DB } from "@reading-advantage/db";
import { and, eq, lt, or, sql } from "drizzle-orm";

const LEASE_MS = 90_000;
const RATE_WINDOW_MS = 60_000;
const MAX_PER_LEARNER = 20;
const GLOBAL_SLOTS = 2;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

/** Fleet-wide capture lease that must be released after repository work. */
export interface TutorialCaptureLease {
  /** Releases the learner and global slot claims owned by this request. */
  release(): Promise<void>;
}

async function claim(db: DB, leaseKey: string, token: string, now: Date, maxAttempts: number): Promise<boolean> {
  const windowCutoff = new Date(now.getTime() - RATE_WINDOW_MS);
  const leaseUntil = new Date(now.getTime() + LEASE_MS);
  const nowIso = now.toISOString();
  const windowCutoffIso = windowCutoff.toISOString();
  const [row] = await db.insert(activityTutorialCaptureLeases).values({ leaseKey, windowStartedAt: now, attemptCount: 1, claimToken: token, leaseUntil, updatedAt: now }).onConflictDoUpdate({
    target: activityTutorialCaptureLeases.leaseKey,
    set: {
      windowStartedAt: sql`CASE WHEN ${activityTutorialCaptureLeases.windowStartedAt} < ${windowCutoffIso}::timestamptz THEN ${nowIso}::timestamptz ELSE ${activityTutorialCaptureLeases.windowStartedAt} END`,
      attemptCount: sql`CASE WHEN ${activityTutorialCaptureLeases.windowStartedAt} < ${windowCutoffIso}::timestamptz THEN 1 ELSE ${activityTutorialCaptureLeases.attemptCount} + 1 END`,
      claimToken: token,
      leaseUntil,
      updatedAt: now,
    },
    where: and(
      lt(activityTutorialCaptureLeases.leaseUntil, now),
      or(lt(activityTutorialCaptureLeases.windowStartedAt, windowCutoff), lt(activityTutorialCaptureLeases.attemptCount, maxAttempts)),
    ),
  }).returning({ leaseKey: activityTutorialCaptureLeases.leaseKey });
  return Boolean(row);
}

async function release(db: DB, leaseKey: string, token: string, now: Date): Promise<void> {
  await db.update(activityTutorialCaptureLeases).set({ claimToken: null, leaseUntil: now, updatedAt: now }).where(and(eq(activityTutorialCaptureLeases.leaseKey, leaseKey), eq(activityTutorialCaptureLeases.claimToken, token)));
}

/**
 * Acquires one shared fleet slot and one learner lease with a durable rate counter.
 * @param db Shared PostgreSQL connection used by every Cloud Run instance.
 * @param learnerId Authenticated learner identity.
 * @param now Clock value used for deterministic lease and rate windows.
 * @returns A release handle when both claims succeed, otherwise null.
 */
export async function acquireTutorialCaptureLease(db: DB, learnerId: string, now = new Date()): Promise<TutorialCaptureLease | null> {
  const token = randomUUID();
  let globalKey: string | undefined;
  for (let slot = 0; slot < GLOBAL_SLOTS; slot += 1) {
    const candidate = `global:${slot}`;
    if (await claim(db, candidate, token, now, POSTGRES_INTEGER_MAX)) { globalKey = candidate; break; }
  }
  if (!globalKey) return null;
  const learnerKey = `learner:${learnerId}`;
  if (!await claim(db, learnerKey, token, now, MAX_PER_LEARNER)) {
    await release(db, globalKey, token, now);
    return null;
  }
  return {
    async release() {
      const releasedAt = new Date();
      await Promise.all([release(db, learnerKey, token, releasedAt), release(db, globalKey, token, releasedAt)]);
    },
  };
}
