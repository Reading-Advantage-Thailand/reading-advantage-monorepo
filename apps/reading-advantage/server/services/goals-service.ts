import { prisma as db } from "@/lib/prisma";
import {
  CreateGoalInput,
  UpdateGoalInput,
  GoalProgress,
  GoalSummary,
  GoalRecommendation,
} from "@/types/learning-goals";
import { GoalStatus, GoalType, GoalPriority } from "@prisma/client";

export class GoalsService {
  /**
   * Create a new learning goal
   */
  static async createGoal(userId: string, input: CreateGoalInput) {
    const goal = await db.learningGoal.create({
      data: {
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
        milestones: input.milestones
          ? {
              create: input.milestones,
            }
          : undefined,
      },
      include: {
        milestones: true,
      },
    });

    return goal;
  }

  /**
   * Get all goals for a user
   */
  static async getUserGoals(
    userId: string,
    status?: GoalStatus,
    includeProgress = false
  ) {
    const goals = await db.learningGoal.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        milestones: {
          orderBy: {
            order: "asc",
          },
        },
        progressLogs: includeProgress
          ? {
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            }
          : false,
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { targetDate: "asc" },
      ],
    });

    return goals;
  }

  /**
   * Get a single goal by ID
   */
  static async getGoalById(goalId: string, userId: string) {
    const goal = await db.learningGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      include: {
        milestones: {
          orderBy: {
            order: "asc",
          },
        },
        progressLogs: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
      },
    });

    return goal;
  }

  /**
   * Update a goal
   */
  static async updateGoal(
    goalId: string,
    userId: string,
    input: UpdateGoalInput
  ) {
    const goal = await db.learningGoal.updateMany({
      where: {
        id: goalId,
        userId,
      },
      data: input,
    });

    return goal;
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string, userId: string) {
    const goal = await db.learningGoal.deleteMany({
      where: {
        id: goalId,
        userId,
      },
    });

    return goal;
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
    const goal = await db.learningGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

    const previousValue = goal.currentValue;
    const newValue = previousValue + value;

    // Update goal progress
    const updatedGoal = await db.learningGoal.update({
      where: {
        id: goalId,
      },
      data: {
        currentValue: newValue,
        // Auto-complete if target reached
        ...(newValue >= goal.targetValue &&
          goal.status === GoalStatus.ACTIVE && {
            status: GoalStatus.COMPLETED,
            completedAt: new Date(),
          }),
        progressLogs: {
          create: {
            value,
            previousValue,
            newValue,
            activityId,
            activityType: activityType as any,
            note,
          },
        },
      },
      include: {
        milestones: true,
      },
    });

    // Check and update milestones
    if (updatedGoal.milestones && updatedGoal.milestones.length > 0) {
      for (const milestone of updatedGoal.milestones) {
        if (newValue >= milestone.targetValue && !milestone.achievedAt) {
          await db.goalMilestone.update({
            where: {
              id: milestone.id,
            },
            data: {
              achievedAt: new Date(),
            },
          });
        }
      }
    }

    return updatedGoal;
  }

  /**
   * Calculate goal progress analytics
   */
  static async calculateProgress(goalId: string, userId: string): Promise<GoalProgress> {
    const goal = await db.learningGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
      include: {
        progressLogs: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

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
    const goals = await db.learningGoal.findMany({
      where: {
        userId,
      },
    });

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
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        xpLogs: {
          take: 30,
          orderBy: {
            createdAt: "desc",
          },
        },
        userActivities: {
          take: 30,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const recommendations: GoalRecommendation[] = [];

    // XP-based recommendation
    const recentXP = user.xpLogs.slice(0, 7).reduce((sum: number, log: any) => sum + log.xpEarned, 0);
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
    const hasActiveStreak = user.userActivities.length >= 3;
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
    const activeGoals = await db.learningGoal.findMany({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
      },
    });

    const now = new Date();

    for (const goal of activeGoals) {
      // Sync based on goal type
      switch (goal.goalType) {
        case GoalType.XP_DAILY: {
          // Calculate XP earned today (since start of day)
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const xpLogs = await db.xPLog.findMany({
            where: {
              userId,
              createdAt: {
                gte: todayStart,
                lte: now,
              },
            },
            select: {
              xpEarned: true,
            },
          });

          const dailyXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

          await db.learningGoal.update({
            where: { id: goal.id },
            data: { 
              currentValue: dailyXp,
              // Auto-complete if target reached
              ...(dailyXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            },
          });
          break;
        }

        case GoalType.XP_WEEKLY: {
          // Calculate XP earned this week (last 7 days)
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);

          const xpLogs = await db.xPLog.findMany({
            where: {
              userId,
              createdAt: {
                gte: weekStart,
                lte: now,
              },
            },
            select: {
              xpEarned: true,
            },
          });

          const weeklyXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

          await db.learningGoal.update({
            where: { id: goal.id },
            data: { 
              currentValue: weeklyXp,
              // Auto-complete if target reached
              ...(weeklyXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            },
          });
          break;
        }

        case GoalType.XP_TOTAL: {
          // Calculate XP earned since goal start date
          const xpLogs = await db.xPLog.findMany({
            where: {
              userId,
              createdAt: {
                gte: goal.startDate,
                lte: now,
              },
            },
            select: {
              xpEarned: true,
            },
          });

          const totalXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

          await db.learningGoal.update({
            where: { id: goal.id },
            data: { 
              currentValue: totalXp,
              // Auto-complete if target reached
              ...(totalXp >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            },
          });
          break;
        }

        case GoalType.ARTICLES_READ: {
          const articleCount = await db.lessonRecord.count({
            where: {
              userId,
              createdAt: {
                gte: goal.startDate,
                lte: now,
              },
            },
          });
          await db.learningGoal.update({
            where: { id: goal.id },
            data: { 
              currentValue: articleCount,
              // Auto-complete if target reached
              ...(articleCount >= goal.targetValue && {
                status: GoalStatus.COMPLETED,
                completedAt: new Date(),
              }),
            },
          });
          break;
        }

        // Add more sync logic for other goal types
      }
    }
  }
}
