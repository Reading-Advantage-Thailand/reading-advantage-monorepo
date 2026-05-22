import {
  pgTable, uuid, text, timestamp, integer, boolean, real, jsonb, unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── XP Logs (reshaped to match Prisma XPLog) ────────────────────────────────

export const xpLogs = pgTable("xp_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  xpEarned: integer("xp_earned").notNull(),
  activityId: text("activity_id").notNull(),
  activityType: text("activity_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Game Rankings (reshaped to match Prisma GameRanking) ────────────────────

export const gameRankings = pgTable("game_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameType: text("game_type").notNull(),
  difficulty: text("difficulty").notNull(),
  totalXp: integer("total_xp").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("game_rankings_user_game_difficulty_unique").on(table.userId, table.gameType, table.difficulty),
]);

// ─── AI Insights (reshaped to match full Prisma AIInsight) ───────────────────

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("insight_type").notNull(),
  scope: text("scope").notNull(),
  priority: text("priority").default("MEDIUM").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").default(0.0).notNull(),
  data: jsonb("data"),
  userId: text("user_id"),
  classroomId: text("classroom_id"),
  licenseId: text("license_id"),
  generatedBy: text("generated_by").default("ai").notNull(),
  modelVersion: text("model_version"),
  dismissed: boolean("dismissed").default(false).notNull(),
  dismissedAt: timestamp("dismissed_at"),
  actionTaken: boolean("action_taken").default(false).notNull(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── AI Insight Cache (PORT-AS-IS) ───────────────────────────────────────────

export const aiInsightCache = pgTable("ai_insight_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cache_key").notNull().unique(),
  scope: text("scope").notNull(),
  insights: jsonb("insights").notNull(),
  metrics: jsonb("metrics"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Learning Goals (reshaped to match full Prisma LearningGoal) ─────────────

export const learningGoals = pgTable("learning_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goalType: text("goal_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").default(0).notNull(),
  unit: text("unit").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  targetDate: timestamp("target_date").notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("ACTIVE").notNull(),
  priority: text("priority").default("MEDIUM").notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringPeriod: text("recurring_period"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Goal Milestones (PORT-AS-IS) ────────────────────────────────────────────

export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => learningGoals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  order: integer("order").notNull(),
  achievedAt: timestamp("achieved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Goal Progress Logs (PORT-AS-IS) ─────────────────────────────────────────

export const goalProgressLogs = pgTable("goal_progress_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => learningGoals.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  previousValue: real("previous_value").notNull(),
  newValue: real("new_value").notNull(),
  note: text("note"),
  activityId: text("activity_id"),
  activityType: text("activity_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
