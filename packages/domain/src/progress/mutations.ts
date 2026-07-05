import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { userActivity, lessonProgress } from "@reading-advantage/db/schema";
import {
  recordActivityInputSchema,
  updateLessonProgressInputSchema,
  type RecordActivityInput,
  type UpdateLessonProgressInput,
} from "./schemas.js";

/**
 * Records a user activity event such as a lesson completion or game session,
 * optionally awarding XP. Requires progress:record permission.
 *
 * Phase 4 (Decision 4.4): the input is validated through
 * `recordActivityInputSchema` (`.strict()`, `xpEarned` bounded `0..100`) at
 * function entry so a host that calls this function with an already-typed
 * payload still gets the D-06 Tier 1 defense against unbounded XP and
 * arbitrary extra keys. Authentication is checked BEFORE validation so the
 * 401 path does not reveal validation details.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Validated activity payload (satisfies
 *   `recordActivityInputSchema`).
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
  input: RecordActivityInput;
}) {
  assertCan(user, "progress:record", tenant);

  // Phase 4 — Zod `.strict()` validation closes the D-06 Tier 1 hole
  // (B46-031 unbounded XP, empty activityType, arbitrary extra keys).
  const parsed = recordActivityInputSchema.parse(input);

  const rawDb = db.unscoped("userActivity is REFERENTIAL, scoped via userId FK");

  const [activity] = await rawDb
    .insert(userActivity)
    .values({
      userId: user.id,
      activityType: parsed.activityType,
      xpEarned: parsed.xpEarned ?? 0,
      metadata: parsed.metadata,
    })
    .returning();

  return activity;
}

/**
 * Updates or inserts progress for a user's lesson. Sets completedAt when
 * status is "completed". Uses upsert to handle repeated updates.
 *
 * Phase 4 (Decision 4.4): the input is validated through
 * `updateLessonProgressInputSchema` (`.strict()`, `lessonId` UUID, `status`
 * enum, `progress` 0..100) at function entry. The `lessonId` tenant-ownership
 * check is Tier 2 `[b] deferred:infra` (Decision 4.4) — not enforced here.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Validated lesson-progress payload (satisfies
 *   `updateLessonProgressInputSchema`).
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
  input: UpdateLessonProgressInput;
}) {
  assertCan(user, "progress:record", tenant);

  // Phase 4 — Zod `.strict()` validation closes the D-06 Tier 1 hole
  // (B46-032 non-UUID lessonId, B46-033 invalid status enum, unbounded
  // progress, arbitrary extra keys).
  const parsed = updateLessonProgressInputSchema.parse(input);

  const rawDb = db.unscoped("lessonProgress is REFERENTIAL, scoped via userId FK");

  const [updated] = await rawDb
    .insert(lessonProgress)
    .values({
      userId: user.id,
      lessonId: parsed.lessonId,
      status: parsed.status,
      progress: parsed.progress,
      completedAt: parsed.status === "completed" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        status: parsed.status,
        progress: parsed.progress,
        completedAt: parsed.status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return updated;
}