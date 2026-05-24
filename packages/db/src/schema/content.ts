import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, unique, real } from "drizzle-orm/pg-core";
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
  // Prisma-ported columns
  type: text("type"),
  genre: text("genre"),
  subGenre: text("sub_genre"),
  passage: text("passage"),
  translatedSummary: jsonb("translated_summary"),
  translatedPassage: jsonb("translated_passage"),
  imageDescription: text("image_description"),
  raLevel: integer("ra_level"),
  rating: real("rating"),
  audioUrl: text("audio_url"),
  audioWordUrl: text("audio_word_url"),
  sentences: jsonb("sentences"),
  words: jsonb("words"),
  authorId: text("author_id").references(() => users.id),
  isPublic: boolean("is_public").default(false).notNull(),
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
  description: text("description"),
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
  status: text("status"),
  score: integer("score"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("student_assignments_unique").on(table.assignmentId, table.studentId),
]);
