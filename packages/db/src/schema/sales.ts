import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// ─── Enums ────────────────────────────────────────────────

export const salesLessonTypeEnum = pgEnum("sales_lesson_type", [
  "theory",
  "roleplay",
  "quiz",
]);

export const salesReviewStatusEnum = pgEnum("sales_review_status", [
  "draft",
  "reviewed",
  "approved",
]);

export const salesProgressStatusEnum = pgEnum("sales_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

// ─── Curriculum ───────────────────────────────────────────

export const salesModules = pgTable("sales_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  phase: text("phase").notNull().default("Foundations"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesLessons = pgTable("sales_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => salesModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: salesLessonTypeEnum("type").notNull(),
  content: text("content").notNull().default(""),
  order: integer("order").notNull(),
  reviewStatus: salesReviewStatusEnum("review_status")
    .default("draft")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesRubrics = pgTable("sales_rubrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  criteriaJson: jsonb("criteria_json").notNull(),
  reviewStatus: salesReviewStatusEnum("review_status")
    .default("draft")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesRoleplayScenarios = pgTable("sales_roleplay_scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => salesLessons.id, { onDelete: "cascade" }),
  personaName: text("persona_name").notNull(),
  personaRole: text("persona_role").notNull(),
  situation: text("situation").notNull(),
  objective: text("objective").notNull(),
  prospectContextJson: jsonb("prospect_context_json").notNull().default({}),
  rubricId: uuid("rubric_id")
    .notNull()
    .references(() => salesRubrics.id, { onDelete: "restrict" }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesQuizQuestions = pgTable("sales_quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => salesLessons.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  optionsJson: jsonb("options_json").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Roleplay Attempts (the practice artifact) ────────────

export const salesRoleplayAttempts = pgTable(
  "sales_roleplay_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => salesRoleplayScenarios.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    audioStorageKey: text("audio_storage_key"),
    durationMs: integer("duration_ms").notNull().default(0),
    transcriptExcerpt: text("transcript_excerpt"),
    llmScoreJson: jsonb("llm_score_json"),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
    passed: boolean("passed"),
    llmFeedback: text("llm_feedback"),
    attemptNumber: integer("attempt_number").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("sales_roleplay_attempts_user_scenario_number_unique").on(
      table.userId,
      table.scenarioId,
      table.attemptNumber,
    ),
  ],
);

// ─── Progress ─────────────────────────────────────────────

export const salesProgress = pgTable(
  "sales_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => salesLessons.id, { onDelete: "cascade" }),
    status: salesProgressStatusEnum("status").default("not_started").notNull(),
    completedAt: timestamp("completed_at"),
    score: numeric("score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("sales_progress_user_lesson_unique").on(
      table.userId,
      table.lessonId,
    ),
  ],
);

// ─── Chat Tutor ───────────────────────────────────────────

export const salesConversations = pgTable("sales_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => salesLessons.id, {
    onDelete: "set null",
  }),
  moduleId: uuid("module_id").references(() => salesModules.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesChatMessages = pgTable("sales_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => salesConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
