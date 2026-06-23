/**
 * Primary-Advantage specific schema additions.
 *
 * Ported from `apps/primary-advantage/prisma/schema.prisma` during the
 * Prisma → Drizzle migration (track:
 * `primary_advantage_drizzle_migration_20260526`, Phase 1).
 *
 * Each new table here corresponds to a Prisma model that has no equivalent
 * in the shared Drizzle schema. Tables/enums in this file are additive —
 * they do NOT touch the shared schema tables (users, classrooms, articles,
 * licenses, etc.) so they cannot regress other apps in the monorepo.
 *
 * Shared-partial additive columns (e.g. `password` on `users`,
 * `isApproved`/`isDraft`/`isPublished` on `articles`, FSRS fields on
 * `flashcardCards`) are deliberately NOT ported here. They require
 * cross-app coordination and are documented in the Phase 1 audit report.
 */
import {
  pgTable, uuid, text, timestamp, integer, boolean, real, jsonb, pgEnum, unique,
} from "drizzle-orm/pg-core";
import { users, schools } from "./users.js";
import { articles } from "./content.js";
import { flashcardCards } from "./flashcards.js";

// ─── Enums ────────────────────────────────────────────────

/**
 * Maps the Prisma `ActivityType` enum (30+ values) onto a shared Drizzle
 * pgEnum. Existing `userActivity.activityType` and `xpLogs.activityType`
 * columns remain `text` to preserve backward compatibility with rows that
 * predate this enum; new code should use this enum value as the source of
 * truth and cast as needed.
 */
export const activityType = pgEnum("activity_type", [
  "ARTICLE_RATING",
  "ARTICLE_READ",
  "STORIES_RATING",
  "STORIES_READ",
  "CHAPTER_RATING",
  "CHAPTER_READ",
  "LEVEL_TEST",
  "MC_QUESTION",
  "SA_QUESTION",
  "LA_QUESTION",
  "SENTENCE_FLASHCARDS",
  "SENTENCE_MATCHING",
  "SENTENCE_ORDERING",
  "SENTENCE_WORD_ORDERING",
  "SENTENCE_CLOZE_TEST",
  "VOCABULARY_FLASHCARDS",
  "VOCABULARY_MATCHING",
]);

/**
 * Replaces the `text` column on the shared `flashcardDecks.type`. New code
 * should use this enum; the shared column is preserved as `text` for
 * backward compatibility with legacy rows.
 */
export const flashcardType = pgEnum("flashcard_type", ["VOCABULARY", "SENTENCE"]);

/**
 * FSRS scheduler state. Used by primary-advantage's flashcard review flow.
 */
export const cardState = pgEnum("card_state", ["NEW", "LEARNING", "REVIEW", "RELEARNING"]);

/**
 * School license tier. Used by `licenses.subscription` (see
 * `Shared-Partial Column Additions` in the audit report).
 */
export const subscriptionType = pgEnum("subscription_type", [
  "BASIC",
  "PREMIUM",
  "ENTERPRISE",
]);

// ─── Auth ────────────────────────────────────────────────

/**
 * Email/identifier-based verification tokens used by the auth flow
 * (e.g. magic-link or email verification). Mirrors Prisma's
 * `VerificationToken` model: composite unique on (identifier, token).
 */
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => [
  unique("verification_tokens_identifier_token_unique").on(table.identifier, table.token),
]);

// ─── RBAC ────────────────────────────────────────────────

/**
 * M:N join between `users` and `roles`. Distinct from the shared
 * `roleEnum` on `users.role` (single role per user) — this supports
 * arbitrary many-role assignment. Composite unique on (userId, roleId).
 */
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("user_roles_user_id_role_id_unique").on(table.userId, table.roleId),
]);

/**
 * Named role catalog. Distinct from the shared `roleEnum` (which is a
 * Postgres enum used on `users.role`). This table supports custom roles
 * with arbitrary names. FK from `userRoles`.
 */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Article activity tracking ─────────────────────────────

/**
 * Per-user, per-article activity tracker. Records whether the user has
 * read, rated, completed various question types, and saved sentence/word
 * flashcards. Many boolean flags — primary-advantage uses this to gate
 * the lesson-complete UI.
 */
export const articleActivityLogs = pgTable("article_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  isMultipleChoiceQuestionCompleted: boolean("is_multiple_choice_question_completed").default(false).notNull(),
  isShortAnswerQuestionCompleted: boolean("is_short_answer_question_completed").default(false).notNull(),
  isLongAnswerQuestionCompleted: boolean("is_long_answer_question_completed").default(false).notNull(),
  isRated: boolean("is_rated").default(false).notNull(),
  isSentenceAndWordsSaved: boolean("is_sentence_and_words_saved").default(false).notNull(),
  isSentenceMatchingCompleted: boolean("is_sentence_matching_completed").default(false).notNull(),
  isSentenceOrderingCompleted: boolean("is_sentence_ordering_completed").default(false).notNull(),
  isSentenceWordOrderingCompleted: boolean("is_sentence_word_ordering_completed").default(false).notNull(),
  isSentenceClozeTestCompleted: boolean("is_sentence_cloze_test_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Per-article sentence + words snapshot used as input to the flashcard
 * generator. JSON fields store the actual sentence + words data.
 */
export const sentencsAndWordsForFlashcards = pgTable("sentencs_and_words_for_flashcard", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  sentence: jsonb("sentence"),
  audioSentencesUrl: text("audio_sentences_url"),
  words: jsonb("words"),
  wordsUrl: text("words_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── FSRS scheduler history ────────────────────────────────

/**
 * Per-card review history. Each row records a single FSRS review event
 * (rating 1-4 + time spent). Mirrors the Anki FSRS algorithm.
 */
export const cardReviews = pgTable("card_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => flashcardCards.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  timeSpent: integer("time_spent"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

/**
 * Cloze-test game state for a given flashcard. Currently empty payload —
 * structure exists so future game-state snapshots can be persisted without
 * schema migration.
 */
export const clozeTestGames = pgTable("cloze_test_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  flashcardCardId: uuid("flashcard_card_id")
    .notNull()
    .references(() => flashcardCards.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── School membership ─────────────────────────────────────

/**
 * M:N join between `schools` and `users` for school administrators. Distinct
 * from `schools.ownerId` (single owner) — supports multiple admins per
 * school.
 */
export const schoolAdmins = pgTable("school_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Gamification ──────────────────────────────────────────

/**
 * Per-school leaderboard snapshot. The `details` JSON holds the actual
 * ranking payload (avoids needing a child table for each row in the
 * leaderboard).
 */
export const leaderboards = pgTable("leaderboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});