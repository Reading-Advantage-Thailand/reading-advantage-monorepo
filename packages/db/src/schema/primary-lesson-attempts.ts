/**
 * Closed lesson attempts for Primary Advantage (track primary_parity_lesson_repeat_20261011).
 * One row holds one closed attempt of one student on one article. The moved activity rows and
 * app step rows are JSON copies that keep their ids, so `xp_logs.activity_id` still finds them.
 */
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, unique, index } from "drizzle-orm/pg-core";
import { users, schools } from "./users.js";
import { articles, assignments } from "./content.js";
import { primaryClassBooks } from "./primary-books.js";

export const primaryLessonAttempts = pgTable(
  "primary_lesson_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    classBookId: uuid("class_book_id").references(() => primaryClassBooks.id, { onDelete: "set null" }),
    lessonNumber: integer("lesson_number"),
    /** 1 for the first closed attempt. The current attempt is the count of closed attempts plus 1. */
    attemptNumber: integer("attempt_number").notNull(),
    startedAt: timestamp("started_at"),
    closedAt: timestamp("closed_at").defaultNow().notNull(),
    closedByUserId: text("closed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    /** `student_restart`, `teacher_teach_again`, or `legacy_import`. */
    closeReason: text("close_reason").notNull(),
    progress: integer("progress").default(0).notNull(),
    timeSpent: integer("time_spent").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    score: integer("score"),
    xpEarned: integer("xp_earned").default(0).notNull(),
    /** The moved `user_activity` rows, with their ids. */
    activities: jsonb("activities").default([]).notNull(),
    /** The moved `primary_student_lesson_steps` rows. */
    steps: jsonb("steps").default([]).notNull(),
  },
  (t) => [
    unique("primary_lesson_attempts_student_article_attempt_unique").on(t.studentId, t.articleId, t.attemptNumber),
    index("primary_lesson_attempts_school_article_idx").on(t.schoolId, t.articleId),
  ],
);
