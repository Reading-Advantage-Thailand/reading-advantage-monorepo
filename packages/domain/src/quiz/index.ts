import { eq, and } from "drizzle-orm";
import { scienceAttempts } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

export async function submitScienceAttempt({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string; score: number; maxScore: number; attemptNumber: number };
}) {
  assertCan(user, "quiz:submit", tenant);

  const [attempt] = await db
    .insert(scienceAttempts)
    .values({
      studentId: user.id,
      lessonId: input.lessonId,
      score: input.score,
      maxScore: input.maxScore,
      attemptNumber: input.attemptNumber,
    })
    .returning();

  return attempt;
}

export async function getStudentScienceAttempts({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { studentId: string; lessonId: string };
}) {
  if (input.studentId !== user.id) {
    assertCan(user, "quiz:read:all", tenant);
  }

  return db
    .select()
    .from(scienceAttempts)
    .where(
      and(
        eq(scienceAttempts.studentId, input.studentId),
        eq(scienceAttempts.lessonId, input.lessonId)
      )
    );
}
