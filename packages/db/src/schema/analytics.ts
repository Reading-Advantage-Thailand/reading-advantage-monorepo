import {
  pgTable, uuid, text, timestamp, integer, boolean, real, bigint, jsonb, unique, index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { schools } from "./users.js";

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
}, (table) => [
  // Phase 4 — race-safe fire-once for game-completion activityIds.
  // The (userId, activityId) pair is the dedup key used by
  // `recordGameCompletion`. Combined with the unique constraint on
  // `gameCompletions(schoolId, userId, activityId)` it guarantees exactly
  // one completion is awarded even under concurrent callers.
  unique("xp_logs_user_activity_unique").on(table.userId, table.activityId),
]);

// ─── Game Completions (Phase 4 — FLAT, tenant-safe leaderboard record) ───────

/**
 * Tenant-safe game-completion record. FLAT (has `schoolId`); TenantDB
 * auto-injects `eq(gameCompletions.schoolId, tenant.schoolId)` on every
 * select/update/delete.
 *
 * The unique constraint on `(schoolId, userId, activityId)` makes this
 * table the primary fire-once guard for game completions (Phase 4 Decision
 * 4.1). The `activityId` value is stable across retries (=
 * `game:<gameType>:<idempotencyKey>`).
 *
 * `recordGameCompletion` dual-writes here AND to `xpLogs` so the existing
 * `getStudentProgress#xpTotal` read path (which aggregates `xpLogs.xpEarned`)
 * continues to work without modification.
 */
export const gameCompletions = pgTable("game_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameType: text("game_type").notNull(),
  difficulty: text("difficulty").notNull(),
  score: integer("score").notNull(),
  accuracy: real("accuracy").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  totalAttempts: integer("total_attempts").notNull(),
  duration: integer("duration").notNull(),
  victory: boolean("victory").notNull(),
  xpEarned: integer("xp_earned").notNull(),
  activityId: text("activity_id").notNull(),
  clientTimestamp: bigint("client_timestamp", { mode: "number" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("game_completions_school_user_activity_unique")
    .on(table.schoolId, table.userId, table.activityId),
  index("game_completions_school_game_difficulty_idx")
    .on(table.schoolId, table.gameType, table.difficulty),
]);

// ─── Host-Proof Attempt Claims (APK Dragon Flight corrective phase) ─────────

/**
 * Tenant-scoped durable claim record for a signed APK host-proof attempt.
 *
 * The signed credential establishes immutable user, tenant, title, input, and
 * expiry facts. This table binds one validated action transcript to that
 * credential across processes, returning the cached authoritative result on a
 * retry and refusing a divergent transcript. It intentionally records only
 * digests and derived results; vocabulary input and credential plaintext never
 * enter the database.
 */
export const hostProofAttempts = pgTable("host_proof_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id").notNull(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  transcriptDigest: text("transcript_digest").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull(),
  claimId: uuid("claim_id"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  unique("host_proof_attempts_attempt_unique").on(table.attemptId),
  index("host_proof_attempts_school_user_idx").on(table.schoolId, table.userId),
  index("host_proof_attempts_expiry_idx").on(table.expiresAt),
]);

// ─── Game Rankings (reshaped to match Prisma GameRanking) ────────────────────
// DEPRECATED — Phase 4 Decision 4.2 §4. New writes go to `gameCompletions`.
// Leaderboard reads come from `getSchoolLeaderboard` over `gameCompletions`.
// This table is preserved (REFERENTIAL) so the tenant-coverage gate stays
// green and a future cleanup track can drop it once all readers migrate.

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
