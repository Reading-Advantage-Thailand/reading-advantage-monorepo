import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { userActivity, lessonProgress } from "@reading-advantage/db/schema";

/**
 * Records a user activity event such as a lesson completion or game session,
 * optionally awarding XP. Requires progress:record permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Includes `activityType`, optional `xpEarned`, and optional `metadata`
 * @returns The newly created activity record
 */
export async function recordActivity({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { activityType: string; xpEarned?: number; metadata?: string };
}) {
  assertCan(user, "progress:record", tenant);

  const rawDb = db.unscoped("userActivity is REFERENTIAL, scoped via userId FK");

  const [activity] = await rawDb
    .insert(userActivity)
    .values({
      userId: user.id,
      activityType: input.activityType,
      xpEarned: input.xpEarned ?? 0,
      metadata: input.metadata,
    })
    .returning();

  return activity;
}

/**
 * Updates or inserts progress for a user's lesson. Sets completedAt when
 * status is "completed". Uses upsert to handle repeated updates.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `lessonId`, `status`, and `progress`
 * @returns The updated progress record
 */
export async function updateLessonProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string; status: string; progress: number };
}) {
  assertCan(user, "progress:record", tenant);

  const rawDb = db.unscoped("lessonProgress is REFERENTIAL, scoped via userId FK");

  const [updated] = await rawDb
    .insert(lessonProgress)
    .values({
      userId: user.id,
      lessonId: input.lessonId,
      status: input.status,
      progress: input.progress,
      completedAt: input.status === "completed" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        status: input.status,
        progress: input.progress,
        completedAt: input.status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return updated;
}
