/**
 * Class Quest for Primary Advantage (track primary_class_quest_20261005): the weekly quest, the
 * power-ups students earn from goals, and the battle heartbeats. A quest references one class
 * challenge definition, which the existing contribution path keeps as the committed truth.
 * Additive; nothing Tutor reads changes.
 */
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, primaryKey, unique, uniqueIndex, index, foreignKey } from "drizzle-orm/pg-core";
import { classrooms } from "./classrooms.js";
import { gameChallengeDefinitions } from "./game-challenges.js";
import { users, schools } from "./users.js";

/** One quest of a class for one week; at most one quest that is not done per class. */
export const primaryClassQuest = pgTable(
  "primary_class_quest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
    /** A template id of the fixed list in code. */
    templateId: text("template_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    /** `open`, `rally`, `play`, `result`, or `done`. */
    status: text("status").default("open").notNull(),
    statusAt: timestamp("status_at").defaultNow().notNull(),
    startsAt: timestamp("starts_at").notNull(),
    battleAt: timestamp("battle_at").notNull(),
    /** Fixed at assignment; never changes during the week. */
    bossTarget: integer("boss_target").notNull(),
    createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("primary_class_quest_open_unique").on(t.schoolId, t.classId).where(sql`${t.status} <> 'done'`),
    foreignKey({ columns: [t.challengeId], foreignColumns: [gameChallengeDefinitions.id], name: "primary_class_quest_challenge_fk" }).onDelete("cascade"),
    index("primary_class_quest_class_idx").on(t.schoolId, t.classId, t.createdAt),
  ],
);

/** One earned power-up of a student in one quest; one per goal. */
export const primaryClassQuestPowerUp = pgTable(
  "primary_class_quest_power_up",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    questId: uuid("quest_id").notNull().references(() => primaryClassQuest.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    goalKey: text("goal_key").notNull(),
    /** `shield`, `sharp-blade`, or `rally-horn`. */
    powerUp: text("power_up").notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
    usedAt: timestamp("used_at"),
  },
  (t) => [
    unique("primary_class_quest_power_up_goal_unique").on(t.schoolId, t.questId, t.userId, t.goalKey),
    index("primary_class_quest_power_up_user_idx").on(t.schoolId, t.questId, t.userId),
  ],
);

/** The latest battle heartbeat of one student in one quest: a preview, never the committed truth. */
export const primaryClassQuestHeartbeat = pgTable(
  "primary_class_quest_heartbeat",
  {
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    questId: uuid("quest_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The challenge run of the play state; null while the student is present in the rally only. */
    runId: uuid("run_id"),
    present: boolean("present").default(true).notNull(),
    answered: integer("answered").default(0).notNull(),
    correct: integer("correct").default(0).notNull(),
    hp: integer("hp").notNull(),
    damage: integer("damage").default(0).notNull(),
    /** The power-ups used so far, as an array of names. */
    powerUpsUsed: jsonb("power_ups_used").$type<string[]>().default([]).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.schoolId, t.questId, t.userId] }),
    // Named by hand: the generated name is longer than the 63 characters Postgres keeps.
    foreignKey({ columns: [t.questId], foreignColumns: [primaryClassQuest.id], name: "primary_class_quest_heartbeat_quest_fk" }).onDelete("cascade"),
  ],
);
