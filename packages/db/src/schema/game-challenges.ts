import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { gameCompletions } from "./analytics.js";
import { classrooms } from "./classrooms.js";
import { schools, users } from "./users.js";

/** Server-owned comparable class challenge definition. */
export const gameChallengeDefinitions = pgTable("game_challenge_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull(),
  creationKey: uuid("creation_key"),
  title: text("title").notNull(),
  gameId: text("game_id").notNull(),
  gameVersion: text("game_version").notNull(),
  contentMode: text("content_mode").notNull(),
  contentLocale: text("content_locale").notNull(),
  contentJson: jsonb("content_json").$type<Record<string, unknown>>().notNull(),
  seed: bigint("seed", { mode: "number" }).notNull(),
  difficulty: text("difficulty").notNull(),
  modalityJson: jsonb("modality_json").$type<Record<string, unknown>>().notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  target: integer("target").notNull(),
  teacherParticipationEnabled: boolean("teacher_participation_enabled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("game_challenge_definitions_school_id_id_unique").on(table.schoolId, table.id),
  unique("game_challenge_definitions_creator_creation_key_unique")
    .on(table.schoolId, table.createdByUserId, table.creationKey),
  foreignKey({
    name: "game_challenge_definitions_creator_fk",
    columns: [table.schoolId, table.createdByUserId],
    foreignColumns: [users.schoolId, users.id],
  }).onDelete("restrict"),
  check("game_challenge_definitions_dates_check", sql`${table.startsAt} < ${table.expiresAt}`),
  check("game_challenge_definitions_seed_check", sql`${table.seed} BETWEEN 0 AND 9007199254740991`),
  check("game_challenge_definitions_target_check", sql`${table.target} BETWEEN 1 AND 1000000`),
  check("game_challenge_definitions_content_mode_check", sql`${table.contentMode} IN ('vocabulary', 'sentence')`),
  check("game_challenge_definitions_content_locale_check", sql`${table.contentLocale} = 'th'`),
  check("game_challenge_definitions_difficulty_check", sql`${table.difficulty} IN ('easy', 'medium', 'hard', 'extreme')`),
  check("game_challenge_definitions_content_json_check", sql`jsonb_typeof(${table.contentJson}) = 'object'`),
  check("game_challenge_definitions_modality_json_check", sql`jsonb_typeof(${table.modalityJson}) = 'object'`),
  index("game_challenge_definitions_school_class_window_idx")
    .on(table.schoolId, table.classId, table.startsAt, table.expiresAt),
]);

/** Server-issued student run bound to one challenge and learner. */
export const gameChallengeRuns = pgTable("game_challenge_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id").notNull(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("game_challenge_runs_owner_unique")
    .on(table.schoolId, table.id, table.challengeId, table.userId),
  foreignKey({
    name: "game_challenge_runs_challenge_fk",
    columns: [table.schoolId, table.challengeId],
    foreignColumns: [gameChallengeDefinitions.schoolId, gameChallengeDefinitions.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "game_challenge_runs_user_fk",
    columns: [table.schoolId, table.userId],
    foreignColumns: [users.schoolId, users.id],
  }).onDelete("cascade"),
  index("game_challenge_runs_school_challenge_user_idx")
    .on(table.schoolId, table.challengeId, table.userId),
  index("game_challenge_runs_expiry_idx").on(table.expiresAt),
]);

/** One class-goal contribution backed by one saved game completion. */
export const gameChallengeContributions = pgTable("game_challenge_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id").notNull(),
  runId: uuid("run_id").notNull(),
  userId: text("user_id").notNull(),
  completionId: uuid("completion_id").notNull(),
  contributedAt: timestamp("contributed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("game_challenge_contributions_school_completion_unique")
    .on(table.schoolId, table.completionId),
  unique("game_challenge_contributions_school_challenge_user_unique")
    .on(table.schoolId, table.challengeId, table.userId),
  foreignKey({
    name: "game_challenge_contributions_run_fk",
    columns: [table.schoolId, table.runId, table.challengeId, table.userId],
    foreignColumns: [
      gameChallengeRuns.schoolId,
      gameChallengeRuns.id,
      gameChallengeRuns.challengeId,
      gameChallengeRuns.userId,
    ],
  }).onDelete("cascade"),
  foreignKey({
    name: "game_challenge_contributions_completion_fk",
    columns: [table.schoolId, table.userId, table.completionId],
    foreignColumns: [gameCompletions.schoolId, gameCompletions.userId, gameCompletions.id],
  }).onDelete("cascade"),
  index("game_challenge_contributions_school_challenge_idx")
    .on(table.schoolId, table.challengeId, table.contributedAt),
]);
