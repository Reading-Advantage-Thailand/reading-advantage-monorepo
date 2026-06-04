import { desc, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { achievements } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets achievements for a student.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the studentId
 * @returns Array of achievements
 */
export async function getStudentAchievements({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string } }) {
  if (input.studentId !== user.id) assertCan(user, "gamification:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const studentAchievements = await tenantDb
    .select({ badgeType: achievements.badgeType, unlockedAt: achievements.unlockedAt })
    .from(achievements).where(eq(achievements.userId, input.studentId)).orderBy(desc(achievements.unlockedAt));

  return { achievements: studentAchievements };
}
