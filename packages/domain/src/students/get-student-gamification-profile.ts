import { desc, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { achievements, gamificationProfiles } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 }, { level: 2, minXp: 100 }, { level: 3, minXp: 300 },
  { level: 4, minXp: 600 }, { level: 5, minXp: 1000 }, { level: 6, minXp: 1500 },
];

function getXpProgress(xp: number, level: number) {
  const current = LEVEL_THRESHOLDS.find((t) => t.level === level);
  const next = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  if (!current || !next) return { currentLevelXp: 0, nextLevelXp: 0, progressPercent: 100 };
  const currentLevelXp = xp - current.minXp;
  const xpRange = next.minXp - current.minXp;
  return { currentLevelXp, nextLevelXp: xpRange, progressPercent: Math.min(Math.round((currentLevelXp / xpRange) * 100), 100) };
}

function getLevelName(level: number): string {
  return { 1: "Beginner Explorer", 2: "Curious Learner", 3: "Science Apprentice", 4: "Knowledge Seeker", 5: "Science Champion", 6: "Master Scientist" }[level] ?? "Explorer";
}

/**
 * Gets a student's gamification profile, creating one if it doesn't exist.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the studentId
 * @returns Gamification profile with XP progress and recent badges
 */
export async function getStudentGamificationProfile({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string } }) {
  if (input.studentId !== user.id) assertCan(user, "gamification:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const profileColumns = { xp: gamificationProfiles.xp, level: gamificationProfiles.level, streak: gamificationProfiles.streak, lastActiveAt: gamificationProfiles.lastActiveAt };
  let [profile] = await tenantDb.select(profileColumns).from(gamificationProfiles).where(eq(gamificationProfiles.userId, input.studentId)).limit(1);
  if (!profile) {
    [profile] = await tenantDb.insert(gamificationProfiles).values({ userId: input.studentId, schoolId: tenant.schoolId!, xp: 0, level: 1, streak: 0 }).returning(profileColumns);
  }

  const levelName = getLevelName(profile.level);
  const xpProgress = getXpProgress(profile.xp, profile.level);
  const recentBadges = await tenantDb.select({ badgeType: achievements.badgeType, unlockedAt: achievements.unlockedAt }).from(achievements).where(eq(achievements.userId, input.studentId)).orderBy(desc(achievements.unlockedAt)).limit(3);

  return { xp: profile.xp, level: profile.level, levelName, streak: profile.streak, xpProgress, recentBadges };
}
