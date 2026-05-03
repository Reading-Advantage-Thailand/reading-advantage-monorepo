import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { classrooms } from "./classrooms";

// ─── Content ──────────────────────────────────────────────

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  level: integer("level"),
  cefrLevel: text("cefr_level"),
  topic: text("topic"),
  image: text("image"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: jsonb("content"),
  subject: text("subject"),
  gradeLevel: integer("grade_level"),
  topic: text("topic"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Assignments ──────────────────────────────────────────

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id),
  articleId: uuid("article_id").references(() => articles.id),
  lessonId: uuid("lesson_id").references(() => lessons.id),
  dueDate: timestamp("due_date"),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studentAssignments = pgTable("student_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("student_assignments_unique").on(table.assignmentId, table.studentId),
]);
