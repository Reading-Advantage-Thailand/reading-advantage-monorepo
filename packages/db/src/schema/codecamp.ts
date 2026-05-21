import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Enums ────────────────────────────────────────────────

export const lessonTypeEnum = pgEnum("codecamp_lesson_type", ["theory", "exercise", "quiz"]);
export const progressStatusEnum = pgEnum("codecamp_progress_status", ["not_started", "in_progress", "completed"]);
export const codecampReviewStatusEnum = pgEnum("codecamp_review_status", ["pending", "reviewed", "needs_changes", "approved"]);

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
