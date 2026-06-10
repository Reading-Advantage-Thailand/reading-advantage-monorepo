import { eq, and } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { scienceAttempts } from "@reading-advantage/db/schema";

export { startQuiz, submitAttempt, type QuizHttpResponse } from "./submit-attempt.js";

/**
 * Retrieves all science quiz attempts for a given student and lesson.
 * Students can view their own attempts without a permission check;
 * viewing others requires quiz:read:all.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `studentId` and `lessonId`
 * @returns Array of attempt records ordered by attemptNumber
 */
export async function getStudentScienceAttempts({
  db, user, tenant, input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { studentId: string; lessonId: string };
}) {
  if (input.studentId !== user.id) assertCan(user, "quiz:read:all", tenant);
  return db.select().from(scienceAttempts)
    .where(and(eq(scienceAttempts.studentId, input.studentId), eq(scienceAttempts.lessonId, input.lessonId)));
}
