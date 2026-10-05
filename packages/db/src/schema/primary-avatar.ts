/**
 * The student avatar for Primary Advantage (track primary_reedy_preview_20261003, FR-10).
 * One row per user: the hero class (a Forge starter set) and the color choice. The table is the
 * `avatar_profile` table of the Forge avatar plan under the program prefix; the semester-2 shop
 * adds the ledger, inventory, and loadout tables beside it. Additive; nothing Tutor reads changes.
 */
import { pgTable, uuid, text, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { users, schools } from "./users.js";

/** The avatar of a user: class, tints, and the pack version the choice was made against. */
export const primaryAvatarProfile = pgTable(
  "primary_avatar_profile",
  {
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The hero class: a starter set id, for example `knight`. */
    classPreset: text("class_preset").notNull(),
    /** The color choice: `{ skin, hair, eyes, cloth }`, each an option of the avatar base. */
    tints: jsonb("tints").$type<{ skin: string; hair: string; eyes: string; cloth: string }>().notNull(),
    catalogVersion: text("catalog_version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.userId] })],
);
