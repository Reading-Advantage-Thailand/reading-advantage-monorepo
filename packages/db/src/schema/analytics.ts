import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { articles } from "./content";

// ─── Story Tracking ─────────────────────────────────────

export const storyRecords = pgTable("story_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  currentChapter: integer("current_chapter").default(1).notNull(),
  totalChapters: integer("total_chapters").default(1).notNull(),
  completed: boolean("completed").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const chapterTracking = pgTable("chapter_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyRecordId: uuid("story_record_id")
    .notNull()
    .references(() => storyRecords.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── XP & Gamification ─────────────────────────────────

export const xpLogs = pgTable("xp_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  source: text("source").notNull(), // "article", "flashcard", "game", "assignment"
  sourceId: text("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameRankings = pgTable("game_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameType: text("game_type").notNull(),
  score: integer("score").notNull(),
  level: integer("level"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// ─── Analytics ──────────────────────────────────────────

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "progress", "recommendation", "summary"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningGoals = pgTable("learning_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0).notNull(),
  unit: text("unit").notNull(), // "articles", "xp", "words", "sentences"
  completed: boolean("completed").default(false).notNull(),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
