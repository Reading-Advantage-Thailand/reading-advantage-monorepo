import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { scienceAttempts } from "@reading-advantage/db/schema";

/**
 * Records a student's science quiz attempt with score, max score, and attempt number.
 * Requires quiz:submit permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `lessonId`, `score`, `maxScore`, and `attemptNumber`
 * @returns The newly created attempt record
 */
export async function submitScienceAttempt({
  db, user, tenant, input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string; score: number; maxScore: number; attemptNumber: number };
}) {
  assertCan(user, "quiz:submit", tenant);
  const [attempt] = await db.insert(scienceAttempts)
    .values({ studentId: user.id, lessonId: input.lessonId, schoolId: tenant.schoolId!, score: input.score, maxScore: input.maxScore, attemptNumber: input.attemptNumber })
    .returning();
  return attempt;
}
