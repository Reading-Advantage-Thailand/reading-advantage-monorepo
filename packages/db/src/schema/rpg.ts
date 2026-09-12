import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { gameCompletions } from "./analytics.js";
import { users } from "./users.js";

/** Tenant-owned cosmetic unlocks and quest receipts. */
export const studentCosmeticUnlocks = pgTable("student_cosmetic_unlocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull(),
  userId: text("user_id").notNull(),
  questId: text("quest_id").notNull(),
  cosmeticId: text("cosmetic_id").notNull(),
  sourceCompletionId: uuid("source_completion_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
}, (table) => [
  unique("student_cosmetic_unlocks_school_user_quest_unique")
    .on(table.schoolId, table.userId, table.questId),
  unique("student_cosmetic_unlocks_school_user_cosmetic_unique")
    .on(table.schoolId, table.userId, table.cosmeticId),
  index("student_cosmetic_unlocks_school_user_idx")
    .on(table.schoolId, table.userId),
  foreignKey({
    name: "student_cosmetic_unlocks_owner_fk",
    columns: [table.schoolId, table.userId],
    foreignColumns: [users.schoolId, users.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "student_cosmetic_unlocks_completion_fk",
    columns: [table.schoolId, table.userId, table.sourceCompletionId],
    foreignColumns: [gameCompletions.schoolId, gameCompletions.userId, gameCompletions.id],
  }).onDelete("cascade"),
]);

/** Tenant-owned RPG profile with one optional equipped emblem. */
export const studentRpgProfiles = pgTable("student_rpg_profiles", {
  schoolId: uuid("school_id").notNull(),
  userId: text("user_id").notNull(),
  equippedEmblemId: text("equipped_emblem_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.schoolId, table.userId] }),
  foreignKey({
    name: "student_rpg_profiles_owner_fk",
    columns: [table.schoolId, table.userId],
    foreignColumns: [users.schoolId, users.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "student_rpg_profiles_equipped_unlock_fk",
    columns: [table.schoolId, table.userId, table.equippedEmblemId],
    foreignColumns: [
      studentCosmeticUnlocks.schoolId,
      studentCosmeticUnlocks.userId,
      studentCosmeticUnlocks.cosmeticId,
    ],
  }).onDelete("restrict"),
]);
