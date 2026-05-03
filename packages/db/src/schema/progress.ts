import { pgTable, uuid, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userWordRecords = pgTable("user_word_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  correctCount: integer("correct_count").default(0).notNull(),
  incorrectCount: integer("incorrect_count").default(0).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSentenceRecords = pgTable("user_sentence_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sentenceId: text("sentence_id").notNull(),
  correct: integer("correct").default(0).notNull(),
  incorrect: integer("incorrect").default(0).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
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
