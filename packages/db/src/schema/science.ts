import {
  pgTable, uuid, text, timestamp, integer, boolean, real, jsonb, decimal, unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Gamification (PORT-AS-IS) ────────────────────────────────────────────────

export const gamificationProfiles = pgTable("gamification_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  streak: integer("streak").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
}, (table) => [
  unique("achievements_user_badge_unique").on(table.userId, table.badgeType),
]);

// ─── Science Classes (KEEP-SEPARATE from reading classrooms) ─────────────────

export const scienceClasses = pgTable("science_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  standardsAlignment: text("standards_alignment").notNull(),
  joinCode: text("join_code").notNull().unique(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Standards (PORT-AS-IS) ───────────────────────────────────────────────────

export const scienceStandards = pgTable("science_standards", {
  id: uuid("id").primaryKey().defaultRandom(),
  framework: text("framework").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  gradeLevel: integer("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("science_standards_framework_code_unique").on(table.framework, table.code),
]);

export const scienceStandardMastery = pgTable("science_standard_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  standardId: uuid("standard_id")
    .notNull()
    .references(() => scienceStandards.id, { onDelete: "cascade" }),
  masteryLevel: decimal("mastery_level", { precision: 3, scale: 2 }).notNull(),
  evidenceCount: integer("evidence_count").default(0).notNull(),
  lastAssessedAt: timestamp("last_assessed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("science_standard_mastery_student_standard_unique").on(table.studentId, table.standardId),
]);

// ─── Science Lessons (KEEP-SEPARATE from reading lesson_records) ─────────────

export const scienceLessons = pgTable("science_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleThai: text("title_thai"),
  description: text("description"),
  descriptionThai: text("description_thai"),
  content: text("content"),
  structuredContent: jsonb("structured_content"),
  lessonType: text("lesson_type").default("LESSON").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Curriculum Units (PORT-AS-IS) ────────────────────────────────────────────

export const scienceCurriculumUnits = pgTable("science_curriculum_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  framework: text("framework").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  order: integer("order").notNull(),
  classId: uuid("class_id")
    .notNull()
    .references(() => scienceClasses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("science_curriculum_units_class_framework_order_unique").on(table.classId, table.framework, table.order),
]);

// ─── Science Quiz Questions (KEEP-SEPARATE) ───────────────────────────────────

export const scienceQuizQuestions = pgTable("science_quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => scienceLessons.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  text: text("text").notNull(),
  options: jsonb("options"),
  correctAnswer: jsonb("correct_answer").notNull(),
  points: integer("points").default(1).notNull(),
  order: integer("order").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Science Attempts (PORT-AS-IS) ────────────────────────────────────────────

export const scienceAttempts = pgTable("science_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => scienceLessons.id, { onDelete: "cascade" }),
  score: real("score").default(0).notNull(),
  maxScore: real("max_score").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("science_attempts_student_lesson_attempt_unique").on(table.studentId, table.lessonId, table.attemptNumber),
]);

// ─── Science Question Responses (PORT-AS-IS) ──────────────────────────────────

export const scienceQuestionResponses = pgTable("science_question_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => scienceAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => scienceQuizQuestions.id, { onDelete: "cascade" }),
  studentAnswer: jsonb("student_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
  order: integer("order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Science Lesson Completions (PORT-AS-IS) ──────────────────────────────────

export const scienceLessonCompletions = pgTable("science_lesson_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => scienceLessons.id, { onDelete: "cascade" }),
  status: text("status").default("NOT_STARTED").notNull(),
  completedAt: timestamp("completed_at"),
  attemptsCount: integer("attempts_count").default(0).notNull(),
  bestScore: real("best_score"),
  bestScorePercentage: real("best_score_percentage"),
  mostRecentScore: real("most_recent_score"),
  mostRecentScorePercentage: real("most_recent_score_percentage"),
  totalTimeSpentSeconds: integer("total_time_spent_seconds").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("science_lesson_completions_student_lesson_unique").on(table.studentId, table.lessonId),
]);

// ─── Science Mastery Runs (PORT-AS-IS) ────────────────────────────────────────

export const scienceMasteryRuns = pgTable("science_mastery_runs", {
  attemptId: uuid("attempt_id")
    .primaryKey()
    .references(() => scienceAttempts.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("PENDING").notNull(),
  updatedCount: integer("updated_count").default(0).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Science Assignments (KEEP-SEPARATE from reading assignments) ─────────────

export const scienceAssignments = pgTable("science_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id")
    .notNull()
    .references(() => scienceClasses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => scienceLessons.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueAt: timestamp("due_at"),
  assignedBy: text("assigned_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("science_assignments_class_lesson_unique").on(table.classId, table.lessonId),
]);
