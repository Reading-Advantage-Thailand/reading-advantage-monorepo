/**
 * Class books and teacher lesson support for Primary Advantage
 * (track primary_teacher_books_lesson_support_20261003). Every table is new and additive; the
 * four tables Tutor Advantage reads are not changed. Catalogue tables (series, books, lessons,
 * guides) are global; class books carry `school_id`; the state and progress tables hang off a
 * class book.
 */
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, unique, index } from "drizzle-orm/pg-core";
import { users, schools } from "./users.js";
import { classrooms } from "./classrooms.js";
import { articles } from "./content.js";

/** A book series, for example "Primary Advantage Origins" (key `origins`). */
export const primaryBookSeries = pgTable("primary_book_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A printed book, for example "Primary Advantage Origins 3.2" (key `o3-2`, the QR book key). */
export const primaryBooks = pgTable("primary_books", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => primaryBookSeries.id),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  raLevel: integer("ra_level"),
  cefrLevel: text("cefr_level"),
  lessonCount: integer("lesson_count").default(14).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * One lesson of a book: its number, the QR key (`o3-2/5`), the app article it maps to, and the
 * package content the teacher screens need (glossary, question bank, print set, activities).
 */
export const primaryBookLessons = pgTable(
  "primary_book_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => primaryBooks.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    key: text("key").notNull().unique(),
    title: text("title").notNull(),
    /** The app article. Null until the legacy article is mapped (ETL) or a new article is inserted. */
    articleId: uuid("article_id").references(() => articles.id),
    /** The legacy Prisma cuid of the article from the package (`db.legacy.articleId` or `meta.replaces`). */
    legacyArticleId: text("legacy_article_id"),
    sourceFile: text("source_file").notNull(),
    /** True when the Workbooks review approved the lesson; students see only approved lessons. */
    approved: boolean("approved").default(false).notNull(),
    /** Package parts for teachers: glossary, bank, print, activities, thai summary, tags. */
    package: jsonb("package").notNull(),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  (t) => [unique("primary_book_lessons_book_number_unique").on(t.bookId, t.number)],
);

/** Teacher guide for one of the 13 workbook steps in one locale (imported from the Workbooks manual). */
export const primaryLessonGuides = pgTable(
  "primary_lesson_guides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    step: integer("step").notNull(),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    period: integer("period").notNull(),
    teacherActions: jsonb("teacher_actions").notNull(),
    teacherLanguage: jsonb("teacher_language").notNull(),
    studentActions: jsonb("student_actions").notNull(),
    watchFor: jsonb("watch_for").notNull(),
    /** The long scripted segment (Markdown) for the overlay and the rehearsal page. */
    scriptMd: text("script_md"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("primary_lesson_guides_step_locale_unique").on(t.step, t.locale)],
);

/** A book assigned to a class, with the mode, the start date, and the current lesson pointer. */
export const primaryClassBooks = pgTable(
  "primary_class_books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => primaryBooks.id),
    /** `teacher_led` (workbook-first lock) or `independent`. */
    mode: text("mode").default("teacher_led").notNull(),
    startDate: timestamp("start_date"),
    currentLesson: integer("current_lesson").default(1).notNull(),
    assignedBy: text("assigned_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("primary_class_books_classroom_book_unique").on(t.classroomId, t.bookId),
    index("primary_class_books_school_idx").on(t.schoolId),
  ],
);

/** The class state of one lesson: when the teacher marked it taught and which workbook steps are done. */
export const primaryClassBookLessons = pgTable(
  "primary_class_book_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classBookId: uuid("class_book_id")
      .notNull()
      .references(() => primaryClassBooks.id, { onDelete: "cascade" }),
    lessonNumber: integer("lesson_number").notNull(),
    taughtAt: timestamp("taught_at"),
    /** Workbook steps (1-13) the teacher marked done, as a JSON array of integers. */
    stepsDone: jsonb("steps_done").default([]).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("primary_class_book_lessons_unique").on(t.classBookId, t.lessonNumber)],
);

/** One student's progress on one app step (1-14) of one lesson of a class book. */
export const primaryStudentLessonSteps = pgTable(
  "primary_student_lesson_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classBookId: uuid("class_book_id")
      .notNull()
      .references(() => primaryClassBooks.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonNumber: integer("lesson_number").notNull(),
    appStep: integer("app_step").notNull(),
    /** `not_started`, `in_progress`, or `done`. */
    status: text("status").default("not_started").notNull(),
    startedAt: timestamp("started_at"),
    doneAt: timestamp("done_at"),
    seconds: integer("seconds").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("primary_student_lesson_steps_unique").on(t.classBookId, t.studentId, t.lessonNumber, t.appStep),
    index("primary_student_lesson_steps_student_idx").on(t.studentId),
  ],
);
