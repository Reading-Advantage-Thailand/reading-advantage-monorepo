import { count, desc, eq } from "drizzle-orm";
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
 * Gets the gamification summary for the authenticated student.
 * @param user - Authenticated user context (must be STUDENT)
 * @param tenant - Tenant (school) context
 * @returns Gamification summary with XP, level, streak, achievements
 */
export async function getMyGamification({ user, tenant }: { user: UserContext; tenant: Tenant }) {
  assertCan(user, "gamification:read:own", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [profile] = await tenantDb.select({ xp: gamificationProfiles.xp, level: gamificationProfiles.level, streak: gamificationProfiles.streak }).from(gamificationProfiles).where(eq(gamificationProfiles.userId, user.id)).limit(1);
  if (!profile) throw new Error("Gamification profile not found");

  const levelName = getLevelName(profile.level);
  const xpProgress = getXpProgress(profile.xp, profile.level);
  const recentAchievements = await tenantDb.select({ badgeType: achievements.badgeType, unlockedAt: achievements.unlockedAt }).from(achievements).where(eq(achievements.userId, user.id)).orderBy(desc(achievements.unlockedAt)).limit(3);
  const [{ value: totalAchievements }] = await tenantDb.select({ value: count() }).from(achievements).where(eq(achievements.userId, user.id));

  return { xp: profile.xp, level: profile.level, levelName, streak: profile.streak, xpProgress, recentAchievements, totalAchievements };
}
