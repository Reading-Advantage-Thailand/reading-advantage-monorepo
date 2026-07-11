import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, unique, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

// ─── Enums ────────────────────────────────────────────────

export const lessonTypeEnum = pgEnum("codecamp_lesson_type", ["theory", "exercise", "quiz"]);
export const progressStatusEnum = pgEnum("codecamp_progress_status", ["not_started", "in_progress", "completed"]);
export const codecampReviewStatusEnum = pgEnum("codecamp_review_status", ["pending", "reviewed", "needs_changes", "approved"]);

/**
 * Status of a `review_jobs` queue row.
 *
 *   - `pending`   — waiting to be claimed by a worker
 *   - `claimed`   — currently being processed by a worker (held by `claimed_by`)
 *   - `succeeded` — terminal success state
 *   - `failed`    — transient retry state (the next attempt will re-enter `pending`)
 *   - `dead`      — terminal exhaustion state (max attempts exceeded); DLQ row
 *
 * `failed` is intentionally distinct from `dead`: `failed` means "the next
 * worker tick should retry"; `dead` means "give up, this needs an admin".
 */
export const codecampReviewJobStatusEnum = pgEnum("codecamp_review_job_status", [
  "pending",
  "claimed",
  "succeeded",
  "failed",
  "dead",
]);

// ─── Curriculum ───────────────────────────────────────────

export const codecampModules = pgTable("codecamp_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  order: integer("order").notNull(),
  phase: text("phase").notNull().default("A"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Explicit learner curriculum release assignment preserving in-progress cohorts. */
export const codecampCurriculumAssignments = pgTable("codecamp_curriculum_assignments", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  curriculumVersion: text("curriculum_version").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const codecampLessons = pgTable("codecamp_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => codecampModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull(),
  type: lessonTypeEnum("type").notNull(),
  contentJson: jsonb("content_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (_table) => [
  // Index for module-scoped lesson queries
  // (no explicit index needed on module_id FK for curriculum lookups)
]);

export const codecampExercises = pgTable("codecamp_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => codecampLessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  starterCode: text("starter_code"),
  expectedOutput: text("expected_output"),
  hintsJson: jsonb("hints_json").default([]).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const codecampQuizQuestions = pgTable("codecamp_quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => codecampLessons.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  optionsJson: jsonb("options_json").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Progress ─────────────────────────────────────────────

export const codecampUserProgress = pgTable("codecamp_user_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => codecampModules.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => codecampLessons.id, { onDelete: "cascade" }),
  status: progressStatusEnum("status").default("not_started").notNull(),
  score: integer("score").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("codecamp_user_progress_user_lesson_unique").on(table.userId, table.lessonId),
]);

// ─── Chat ─────────────────────────────────────────────────

export const codecampChatConversations = pgTable("codecamp_chat_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  moduleId: uuid("module_id").references(() => codecampModules.id, { onDelete: "set null" }),
  lessonId: uuid("lesson_id").references(() => codecampLessons.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const codecampChatMessages = pgTable("codecamp_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => codecampChatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Exercise Repos ───────────────────────────────────────

export const codecampExerciseRepos = pgTable("codecamp_exercise_repos", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => codecampModules.id, { onDelete: "cascade" }),
  repoUrl: text("repo_url").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("codecamp_exercise_repos_repo_url_unique").on(table.repoUrl),
]);

// ─── PR Reviews ───────────────────────────────────────────

export const codecampPrReviews = pgTable("codecamp_pr_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseRepoId: uuid("exercise_repo_id")
    .notNull()
    .references(() => codecampExerciseRepos.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prUrl: text("pr_url").notNull(),
  reviewStatus: codecampReviewStatusEnum("review_status").default("pending").notNull(),
  llmReviewSummary: text("llm_review_summary"),
  rubricEvaluationJson: jsonb("rubric_evaluation_json").$type<Record<string, unknown> | null>(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("codecamp_pr_reviews_pr_url_unique").on(table.prUrl),
]);

// ─── Webhook Diagnostics ─────────────────────────────────

export const codecampWebhookEvents = pgTable("codecamp_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: text("delivery_id"),
  event: text("event").notNull(),
  action: text("action"),
  repoUrl: text("repo_url"),
  prUrl: text("pr_url"),
  githubUsername: text("github_username"),
  outcome: text("outcome").notNull(),
  reason: text("reason").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Review Jobs (Postgres-backed retry queue + DLQ) ─────

/**
 * Durable queue of PR review jobs. The webhook handler enqueues a row here
 * (idempotently on the PR key) and returns 2xx immediately. A background
 * worker (`packages/webhooks/src/review-worker.ts`) claims due rows with
 * `FOR UPDATE SKIP LOCKED`, runs the LLM review, and settles the row
 * (succeeded / pending-with-backoff / dead).
 *
 * Tenancy: `review_jobs` is REFERENTIAL — codecamp is single-tenant global
 * (`globalTenant = { schoolId: null }`) and this table has no `schoolId`
 * column. Query via `tenantDb.unscoped("reason")`.
 *
 * Idempotency: the unique index on `(pr_owner, pr_repo, pr_pull_number)`
 * ensures a redelivered webhook does not double-enqueue. The
 * `delivery_id` column carries the GitHub `x-github-delivery` header value
 * for traceability (not part of the unique key — a duplicate delivery for
 * the same PR is intentionally collapsed to one job row).
 */
export const reviewJobs = pgTable(
  "review_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prOwner: text("pr_owner").notNull(),
    prRepo: text("pr_repo").notNull(),
    prPullNumber: integer("pr_pull_number").notNull(),
    /** Full webhook payload for re-running the review after worker restart. */
    payloadJson: jsonb("payload_json"),
    /** Optional GitHub `x-github-delivery` for traceability (not part of unique key). */
    deliveryId: text("delivery_id"),
    /** PrUrl from the webhook (denormalized for human inspection). */
    prUrl: text("pr_url").notNull(),
    status: codecampReviewJobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    /** Earliest time the worker may claim this row (set on retry with jittered exponential backoff). */
    nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
    /** Last error message from the worker; null until first failure. */
    lastError: text("last_error"),
    /** When the worker claimed this row. Used by `reclaimStuckJobs` to detect abandoned claims. */
    claimedAt: timestamp("claimed_at"),
    /** Stable worker id (e.g. `host:pid:startTime`) for observability. */
    claimedBy: text("claimed_by"),
    /** FK to `codecamp_pr_reviews.id`. Nullable: the review row may not exist yet at enqueue time. */
    reviewId: uuid("review_id").references(() => codecampPrReviews.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Idempotency: a redelivered webhook for the same PR head collapses to one row.
    unique("review_jobs_pr_key_unique").on(table.prOwner, table.prRepo, table.prPullNumber),
    // Claim query: `WHERE status = 'pending' AND next_attempt_at <= now() ORDER BY next_attempt_at`.
    index("review_jobs_claim_idx").on(table.status, table.nextAttemptAt),
  ],
);
