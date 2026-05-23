import { db, eq, and, asc, desc, gte, lte, inArray, count, sql } from "@reading-advantage/db";
import {
  learningGoals,
  goalMilestones,
  goalProgressLogs,
  users,
  userActivity,
  xpLogs,
  lessonRecords,
} from "@reading-advantage/db/schema";
import {
  CreateGoalInput,
  UpdateGoalInput,
  GoalProgress,
  GoalSummary,
  GoalRecommendation,
} from "@/types/learning-goals";
import { GoalStatus, GoalType, GoalPriority } from "@/lib/enums";

// ─── Types for assembled goal results ────────────────────────────────────────

type LearningGoalRow = typeof learningGoals.$inferSelect;
type GoalMilestoneRow = typeof goalMilestones.$inferSelect;
type GoalProgressLogRow = typeof goalProgressLogs.$inferSelect;

type GoalWithRelations = LearningGoalRow & {
  milestones: GoalMilestoneRow[];
  progressLogs?: GoalProgressLogRow[];
};

// ─── Helpers to load relations client-side ───────────────────────────────────

async function loadMilestonesForGoals(
  goalIds: string[]
): Promise<Map<string, GoalMilestoneRow[]>> {
  const map = new Map<string, GoalMilestoneRow[]>();
  if (goalIds.length === 0) return map;
  const rows = await db
    .select()
    .from(goalMilestones)
    .where(inArray(goalMilestones.goalId, goalIds))
    .orderBy(asc(goalMilestones.order));
  for (const row of rows) {
    if (!map.has(row.goalId)) map.set(row.goalId, []);
    map.get(row.goalId)!.push(row);
  }
  return map;
}

async function loadProgressLogsForGoal(
  goalId: string,
  take?: number,
  order: "asc" | "desc" = "desc"
): Promise<GoalProgressLogRow[]> {
  let q = db
    .select()
    .from(goalProgressLogs)
    .where(eq(goalProgressLogs.goalId, goalId))
    .orderBy(
      order === "desc"
        ? desc(goalProgressLogs.createdAt)
        : asc(goalProgressLogs.createdAt)
    ) as any;
  if (typeof take === "number") {
    q = q.limit(take);
  }
  return q;
}

export class GoalsService {
  /**
   * Create a new learning goal
   */
  static async createGoal(userId: string, input: CreateGoalInput) {
    return db.transaction(async (tx) => {
      const [goal] = await tx
        .insert(learningGoals)
        .values({
          userId,
          goalType: input.goalType,
          title: input.title,
          description: input.description,
          targetValue: input.targetValue,
          unit: input.unit,
          targetDate: input.targetDate,
          priority: input.priority || GoalPriority.MEDIUM,
          isRecurring: input.isRecurring || false,
          recurringPeriod: input.recurringPeriod,
          metadata: input.metadata,
        })
        .returning();

      let milestones: GoalMilestoneRow[] = [];
      if (input.milestones && input.milestones.length > 0) {
        milestones = await tx
          .insert(goalMilestones)
          .values(
            input.milestones.map((m: any) => ({
              ...m,
              goalId: goal.id,
            }))
          )
          .returning();
      }

      return { ...goal, milestones };
    });
  }

  /**
   * Get all goals for a user
   */
  static async getUserGoals(
    userId: string,
    status?: GoalStatus,
    includeProgress = false
  ): Promise<GoalWithRelations[]> {
    const goals = await db
      .select()
      .from(learningGoals)
      .where(
        and(
          eq(learningGoals.userId, userId),
          status ? eq(learningGoals.status, status) : undefined
        )
      )
      .orderBy(
        asc(learningGoals.status),
        desc(learningGoals.priority),
        asc(learningGoals.targetDate)
      );

    const goalIds = goals.map((g) => g.id);
    const milestonesMap = await loadMilestonesForGoals(goalIds);

    const progressLogsMap = new Map<string, GoalProgressLogRow[]>();
    if (includeProgress) {
      // Fetch latest 10 progress logs per goal (one query per goal — matches Prisma include)
      await Promise.all(
        goalIds.map(async (id) => {
          const logs = await loadProgressLogsForGoal(id, 10, "desc");
          progressLogsMap.set(id, logs);
        })
      );
    }

    return goals.map((g) => ({
      ...g,
      milestones: milestonesMap.get(g.id) ?? [],
      ...(includeProgress
        ? { progressLogs: progressLogsMap.get(g.id) ?? [] }
        : {}),
    }));
  }

  /**
   * Get a single goal by ID
   */
  static async getGoalById(
    goalId: string,
    userId: string
  ): Promise<GoalWithRelations | null> {
    const [goal] = await db
      .select()
      .from(learningGoals)
      .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId)))
      .limit(1);

    if (!goal) return null;

    const milestones = await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goal.id))
      .orderBy(asc(goalMilestones.order));

    const progressLogs = await loadProgressLogsForGoal(goal.id, 20, "desc");

    return { ...goal, milestones, progressLogs };
  }

  /**
   * Update a goal
   */
  static async updateGoal(
    goalId: string,
    userId: string,
    input: UpdateGoalInput
  ) {
    const result = await db
      .update(learningGoals)
      .set({ ...(input as any), updatedAt: new Date() })
      .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId)))
      .returning();

    return { count: result.length };
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string, userId: string) {
    const result = await db
      .delete(learningGoals)
      .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId)))
      .returning({ id: learningGoals.id });

    return { count: result.length };
  }

  /**
   * Update goal progress
   */
  static async updateProgress(
    goalId: string,
    userId: string,
    value: number,
    activityId?: string,
    activityType?: string,
    note?: string
  ) {
    return db.transaction(async (tx) => {
      const [goal] = await tx
        .select()
        .from(learningGoals)
        .where(
          and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId))
        )
        .limit(1);

      if (!goal) {
        throw new Error("Goal not found");
      }

      const previousValue = goal.currentValue;
      const newValue = previousValue + value;

      const shouldComplete =
        newValue >= goal.targetValue && goal.status === GoalStatus.ACTIVE;

      // Update goal progress
      const [updatedGoal] = await tx
        .update(learningGoals)
        .set({
          currentValue: newValue,
          updatedAt: new Date(),
          ...(shouldComplete && {
            status: GoalStatus.COMPLETED,
            completedAt: new Date(),
          }),
        })
        .where(eq(learningGoals.id, goalId))
        .returning();

      // Insert progress log
      await tx.insert(goalProgressLogs).values({
        goalId,
        value,
        previousValue,
        newValue,
        activityId,
        activityType,
        note,
      });

      // Load milestones
      const milestones = await tx
        .select()
        .from(goalMilestones)
        .where(eq(goalMilestones.goalId, goalId))
        .orderBy(asc(goalMilestones.order));

      // Check and update milestones
      for (const milestone of milestones) {
        if (newValue >= milestone.targetValue && !milestone.achievedAt) {
          await tx
            .update(goalMilestones)
            .set({ achievedAt: new Date() })
            .where(eq(goalMilestones.id, milestone.id));
        }
      }

      // Reload milestones to reflect achievedAt updates
      const refreshedMilestones = await tx
        .select()
        .from(goalMilestones)
        .where(eq(goalMilestones.goalId, goalId))
        .orderBy(asc(goalMilestones.order));

      return { ...updatedGoal, milestones: refreshedMilestones };
    });
  }

  /**
   * Calculate goal progress analytics
   */
  static async calculateProgress(
    goalId: string,
    userId: string
  ): Promise<GoalProgress> {
    const [goal] = await db
      .select()
      .from(learningGoals)
      .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId)))
      .limit(1);

    if (!goal) {
      throw new Error("Goal not found");
    }

    // progressLogs were fetched in the original Prisma include but never used
    // in the calculation — preserve that behavior and skip the query.

    const progressPercentage = Math.min(
      (goal.currentValue / goal.targetValue) * 100,
      100
    );
    const remainingValue = Math.max(goal.targetValue - goal.currentValue, 0);
    
    const now = new Date();
    const daysRemaining = Math.max(
      Math.ceil((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      0
    );

    const daysSinceStart = Math.max(
      Math.ceil((now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      1
    );

    const averageDailyProgress = goal.currentValue / daysSinceStart;
    
    const requiredDailyProgress = daysRemaining > 0 ? remainingValue / daysRemaining : 0;
    const isOnTrack = averageDailyProgress >= requiredDailyProgress || goal.currentValue >= goal.targetValue;

    const estimatedDaysToComplete = averageDailyProgress > 0 
      ? Math.ceil(remainingValue / averageDailyProgress)
      : daysRemaining;
    
    const estimatedCompletionDate = new Date(now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000);

    return {
      goalId: goal.id,
      progressPercentage,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      remainingValue,
      daysRemaining,
      averageDailyProgress,
      isOnTrack,
      estimatedCompletionDate,
    };
  }

  /**
   * Get user goal summary
   */
  static async getUserGoalSummary(userId: string): Promise<GoalSummary> {
    const goals = await db
      .select()
      .from(learningGoals)
      .where(eq(learningGoals.userId, userId));

    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === GoalStatus.ACTIVE).length;
    const completedGoals = goals.filter((g) => g.status === GoalStatus.COMPLETED).length;
    const pausedGoals = goals.filter((g) => g.status === GoalStatus.PAUSED).length;

    // Calculate on-track goals
    let onTrackGoals = 0;
    let behindScheduleGoals = 0;

    for (const goal of goals.filter((g) => g.status === GoalStatus.ACTIVE)) {
      const progress = await this.calculateProgress(goal.id, userId);
      if (progress.isOnTrack) {
        onTrackGoals++;
      } else {
        behindScheduleGoals++;
      }
    }

    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      pausedGoals,
      onTrackGoals,
      behindScheduleGoals,
      completionRate,
    };
  }

  /**
   * Get AI-powered goal recommendations
   */
  static async getGoalRecommendations(userId: string): Promise<GoalRecommendation[]> {
    const [user] = await db
      .select({ id: users.id, cefrLevel: users.cefrLevel })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Mirror Prisma `include: { xpLogs: { take: 30, orderBy: desc(createdAt) } }`
    const recentXpLogs = await db
      .select({ xpEarned: xpLogs.xpEarned, createdAt: xpLogs.createdAt })
      .from(xpLogs)
      .where(eq(xpLogs.userId, userId))
      .orderBy(desc(xpLogs.createdAt))
      .limit(30);

    const recentActivities = await db
      .select({ id: userActivity.id, createdAt: userActivity.createdAt })
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(30);

    const recommendations: GoalRecommendation[] = [];

    // XP-based recommendation
    const recentXP = recentXpLogs
      .slice(0, 7)
      .reduce((sum: number, log) => sum + log.xpEarned, 0);
    const avgDailyXP = recentXP / 7;

    if (avgDailyXP > 0) {
      recommendations.push({
        type: GoalType.XP_WEEKLY,
        title: "Weekly XP Challenge",
        description: `Earn ${Math.round(avgDailyXP * 7 * 1.5)} XP this week`,
        targetValue: Math.round(avgDailyXP * 7 * 1.5),
        unit: "xp",
        suggestedDuration: 7,
        reason: "Based on your recent activity",
        priority: GoalPriority.MEDIUM,
      });
    }

    // Reading streak recommendation
    const hasActiveStreak = recentActivities.length >= 3;
    if (hasActiveStreak) {
      recommendations.push({
        type: GoalType.STREAK,
        title: "30-Day Reading Streak",
        description: "Read every day for 30 days",
        targetValue: 30,
        unit: "days",
        suggestedDuration: 30,
        reason: "You're on a streak! Keep it going",
        priority: GoalPriority.HIGH,
      });
    }

    // CEFR level advancement
    const currentLevel = user.cefrLevel;
    const cefrLevels = ["A1-", "A1", "A1+", "A2-", "A2", "A2+", "B1-", "B1", "B1+", "B2-", "B2", "B2+", "C1-", "C1", "C1+", "C2-", "C2"];
    const currentIndex = cefrLevels.indexOf(currentLevel);
    
    if (currentIndex >= 0 && currentIndex < cefrLevels.length - 1) {
      const nextLevel = cefrLevels[currentIndex + 1];
      recommendations.push({
        type: GoalType.CEFR_LEVEL,
        title: `Reach ${nextLevel} Level`,
        description: `Advance to ${nextLevel} proficiency level`,
        targetValue: 1,
        unit: "level",
        suggestedDuration: 60,
        reason: "Progress to the next reading level",
        priority: GoalPriority.HIGH,
      });
    }

    // Articles reading goal
    recommendations.push({
      type: GoalType.ARTICLES_READ,
      title: "Read 20 Articles",
      description: "Complete 20 articles this month",
      targetValue: 20,
      unit: "articles",
      suggestedDuration: 30,
      reason: "Consistent reading improves comprehension",
      priority: GoalPriority.MEDIUM,
    });

    return recommendations;
  }

  /**
   * Auto-sync progress from user activities
   */
  static async syncProgressFromActivities(userId: string) {
    const activeGoals = await db
      .select()
      .from(learningGoals)
      .where(
        and(
          eq(learningGoals.userId, userId),
          eq(learningGoals.status, GoalStatus.ACTIVE)
        )
      );

    const now = new Date();

    for (const goal of activeGoals) {
      // Sync based on goal type
      switch (goal.goalType) {
        case GoalType.XP_DAILY: {
          // Calculate XP earned today (since start of day)
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const [agg] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${xpLogs.xpEarned}), 0)`.mapWith(Number),
            })
            .from(xpLogs)
            .where(
              and(
                eq(xpLogs.userId, userId),
                gte(xpLogs.createdAt, todayStart),
                lte(xpLogs.createdAt, now)
              )
            );

          const dailyXp = agg?.total ?? 0;

          await db
            .update(learningGoals)
            .set({
              currentValue: dailyXp,
              updatedAt: new Date(),
              ...(dailyXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            })
            .where(eq(learningGoals.id, goal.id));
          break;
        }

        case GoalType.XP_WEEKLY: {
          // Calculate XP earned this week (last 7 days)
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);

          const [agg] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${xpLogs.xpEarned}), 0)`.mapWith(Number),
            })
            .from(xpLogs)
            .where(
              and(
                eq(xpLogs.userId, userId),
                gte(xpLogs.createdAt, weekStart),
                lte(xpLogs.createdAt, now)
              )
            );

          const weeklyXp = agg?.total ?? 0;

          await db
            .update(learningGoals)
            .set({
              currentValue: weeklyXp,
              updatedAt: new Date(),
              ...(weeklyXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            })
            .where(eq(learningGoals.id, goal.id));
          break;
        }

        case GoalType.XP_TOTAL: {
          // Calculate XP earned since goal start date
          const [agg] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${xpLogs.xpEarned}), 0)`.mapWith(Number),
            })
            .from(xpLogs)
            .where(
              and(
                eq(xpLogs.userId, userId),
                gte(xpLogs.createdAt, goal.startDate),
                lte(xpLogs.createdAt, now)
              )
            );

          const totalXp = agg?.total ?? 0;

          await db
            .update(learningGoals)
            .set({
              currentValue: totalXp,
              updatedAt: new Date(),
              ...(totalXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            })
            .where(eq(learningGoals.id, goal.id));
          break;
        }

        case GoalType.ARTICLES_READ: {
          const [countRow] = await db
            .select({ c: count() })
            .from(lessonRecords)
            .where(
              and(
                eq(lessonRecords.userId, userId),
                gte(lessonRecords.createdAt, goal.startDate),
                lte(lessonRecords.createdAt, now)
              )
            );
          const articleCount = Number(countRow?.c ?? 0);
          await db
            .update(learningGoals)
            .set({
              currentValue: articleCount,
              updatedAt: new Date(),
              ...(articleCount >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            })
            .where(eq(learningGoals.id, goal.id));
          break;
        }

        // Add more sync logic for other goal types
      }
    }
  }
}
