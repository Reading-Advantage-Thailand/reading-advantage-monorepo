import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, real, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Activity Tracking ────────────────────────────────────

export const userActivity = pgTable("user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(),
  xpEarned: integer("xp_earned").default(0).notNull(),
  metadata: text("metadata"),
  // Prisma-ported columns
  targetId: text("target_id"),
  timer: integer("timer"),
  details: jsonb("details"),
  completed: boolean("completed").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("user_activity_type_target_unique").on(table.userId, table.activityType, table.targetId),
]);

// ─── FSRS Word Records ────────────────────────────────────

export const userWordRecords = pgTable("user_word_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: uuid("article_id"),
  storyId: text("story_id"),
  chapterNumber: integer("chapter_number"),
  word: jsonb("word").notNull(),
  saveToFlashcard: boolean("save_to_flashcard").default(true).notNull(),
  difficulty: real("difficulty").default(0).notNull(),
  due: timestamp("due").defaultNow().notNull(),
  elapsedDays: integer("elapsed_days").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  scheduledDays: integer("scheduled_days").default(0).notNull(),
  stability: real("stability").default(0).notNull(),
  state: integer("state").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // from Prisma: @@index([userId, articleId]) @@index([userId, storyId, chapterNumber])
  // no additional unique here — Prisma doesn't declare one either
]);

// ─── FSRS Sentence Records ────────────────────────────────

export const userSentenceRecords = pgTable("user_sentence_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: uuid("article_id"),
  storyId: text("story_id"),
  chapterNumber: integer("chapter_number"),
  sentence: text("sentence").notNull(),
  translation: jsonb("translation").notNull(),
  sn: integer("sn").notNull(),
  timepoint: real("timepoint").notNull(),
  endTimepoint: real("end_timepoint").notNull(),
  audioUrl: text("audio_url"),
  saveToFlashcard: boolean("save_to_flashcard").default(true).notNull(),
  difficulty: real("difficulty").default(0).notNull(),
  due: timestamp("due").defaultNow().notNull(),
  elapsedDays: integer("elapsed_days").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  scheduledDays: integer("scheduled_days").default(0).notNull(),
  stability: real("stability").default(0).notNull(),
  state: integer("state").default(0).notNull(),
  updateScore: boolean("update_score").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // text type (not UUID FK) — may reference external lesson identifiers
  // in addition to internal lessons.id UUIDs. FK omitted by design.
  lessonId: text("lesson_id").notNull(),
  status: text("status").default("not_started").notNull(),
  progress: integer("progress").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("lesson_progress_user_lesson_unique").on(table.userId, table.lessonId),
]);
