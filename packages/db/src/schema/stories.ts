import {
  pgTable, uuid, text, timestamp, integer, boolean, real, jsonb, unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { classrooms } from "./classrooms";
import { articles } from "./content";
import { assignments } from "./content";

// ─── Stories ──────────────────────────────────────────────

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary"),
  type: text("type"),
  genre: text("genre"),
  subgenre: text("subgenre"),
  raLevel: integer("ra_level"),
  cefrLevel: text("cefr_level"),
  rating: real("rating"),
  averageRating: real("average_rating"),
  authorId: text("author_id"),
  imageDescription: text("image_description"),
  storyBible: jsonb("story_bible"),
  isPublic: boolean("is_public").default(false).notNull(),
  translatedSummary: jsonb("translated_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Chapters ─────────────────────────────────────────────

export const chapters = pgTable("chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  audioUrl: text("audio_url"),
  rating: real("rating"),
  userRatingCount: integer("user_rating_count"),
  wordCount: integer("word_count"),
  sentences: jsonb("sentences"),
  words: jsonb("words"),
  imageDescription: text("image_description"),
  audioWordUrl: text("audio_word_url"),
  authorId: text("author_id"),
  cefrLevel: text("cefr_level"),
  genre: text("genre"),
  isPublic: boolean("is_public").default(false).notNull(),
  passage: text("passage"),
  raLevel: integer("ra_level"),
  subGenre: text("sub_genre"),
  translatedPassage: jsonb("translated_passage"),
  translatedSummary: jsonb("translated_summary"),
  type: text("type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("chapters_story_chapter_unique").on(table.storyId, table.chapterNumber),
]);

// ─── Story Timepoints ─────────────────────────────────────

export const storyTimepoints = pgTable("story_timepoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  timepoints: jsonb("timepoints").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("story_timepoints_story_chapter_unique").on(table.storyId, table.chapterNumber),
]);

// ─── Story Records (reshaped — storyId FK, status enum) ──────────────────────

export const storyRecords = pgTable("story_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title"),
  level: integer("level"),
  rated: integer("rated").default(0).notNull(),
  score: integer("score").default(0).notNull(),
  status: text("status").default("READ").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("story_records_user_story_unique").on(table.userId, table.storyId),
]);

// ─── Chapter Trackings (reshaped — correct SQL name, Prisma schema) ───────────

export const chapterTrackings = pgTable("chapter_trackings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull(),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title"),
  level: integer("level"),
  rated: integer("rated").default(0).notNull(),
  scores: integer("scores").default(0).notNull(),
  status: text("status").default("READ").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("chapter_trackings_user_story_chapter_unique").on(table.userId, table.storyId, table.chapterNumber),
]);

// ─── Story Assignments (PORT-AS-IS) ───────────────────────────────────────────

export const storyAssignments = pgTable("story_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  articleId: uuid("article_id").references(() => articles.id),
  status: text("status").default("NOT_STARTED").notNull(),
  title: text("title"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lesson Records (PORT-AS-IS) ──────────────────────────────────────────────

export const lessonRecords = pgTable("lesson_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  phase1: jsonb("phase1").default({ status: 2, elapsedTime: 0 }).notNull(),
  phase2: jsonb("phase2").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase3: jsonb("phase3").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase4: jsonb("phase4").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase5: jsonb("phase5").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase6: jsonb("phase6").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase7: jsonb("phase7").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase8: jsonb("phase8").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase9: jsonb("phase9").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase10: jsonb("phase10").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase11: jsonb("phase11").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase12: jsonb("phase12").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase13: jsonb("phase13").default({ status: 0, elapsedTime: 0 }).notNull(),
  phase14: jsonb("phase14").default({ status: 0, elapsedTime: 0 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("lesson_records_user_article_unique").on(table.userId, table.articleId),
]);

// ─── Assignment Notifications (PORT-AS-IS) ────────────────────────────────────

export const assignmentNotifications = pgTable("assignment_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  isNoticed: boolean("is_noticed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("assignment_notifications_unique").on(table.assignmentId, table.studentId, table.teacherId),
]);
