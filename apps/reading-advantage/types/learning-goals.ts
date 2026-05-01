import { GoalType, GoalStatus, GoalPriority, RecurringPeriod } from "@prisma/client";

export interface LearningGoal {
  id: string;
  userId: string;
  goalType: GoalType;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  targetDate: Date;
  completedAt?: Date | null;
  status: GoalStatus;
  priority: GoalPriority;
  isRecurring: boolean;
  recurringPeriod?: RecurringPeriod | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  milestones?: GoalMilestone[];
  progressLogs?: GoalProgressLog[];
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description?: string | null;
  targetValue: number;
  order: number;
  achievedAt?: Date | null;
  createdAt: Date;
}

export interface GoalProgressLog {
  id: string;
  goalId: string;
  value: number;
  previousValue: number;
  newValue: number;
  note?: string | null;
  activityId?: string | null;
  activityType?: string | null;
  createdAt: Date;
}

export interface CreateGoalInput {
  goalType: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  targetDate: Date;
  priority?: GoalPriority;
  isRecurring?: boolean;
  recurringPeriod?: RecurringPeriod;
  metadata?: any;
  milestones?: CreateMilestoneInput[];
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  targetValue: number;
  order: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  targetValue?: number;
  targetDate?: Date;
  status?: GoalStatus;
  priority?: GoalPriority;
  metadata?: any;
}

export interface GoalProgress {
  goalId: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  remainingValue: number;
  daysRemaining: number;
  averageDailyProgress: number;
  isOnTrack: boolean;
  estimatedCompletionDate: Date;
}

export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  onTrackGoals: number;
  behindScheduleGoals: number;
  completionRate: number;
}

export interface GoalRecommendation {
  type: GoalType;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  suggestedDuration: number; // in days
  reason: string;
  priority: GoalPriority;
}
