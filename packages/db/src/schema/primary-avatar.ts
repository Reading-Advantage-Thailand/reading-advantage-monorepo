/**
 * The student avatar for Primary Advantage (track primary_reedy_preview_20261003, FR-10).
 * One row per user: the hero class (a Forge starter set) and the color choice. The table is the
 * `avatar_profile` table of the Forge avatar plan under the program prefix; the semester-2 shop
 * adds the ledger, inventory, and loadout tables beside it. Additive; nothing Tutor reads changes.
 */
import { pgTable, uuid, text, timestamp, jsonb, integer, primaryKey, unique, index } from "drizzle-orm/pg-core";
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

// ─── Avatar shop, GP, inventory, loadout (track primary_avatar_shop_20261005) ───

/**
 * The GP (Guild Points) ledger: one row per grant or spend; the balance is the sum of `delta`.
 * `sourceKey` is unique per user (the XP log id, the purchase id, the reward id): a grant runs once.
 */
export const primaryGpLedger = pgTable(
  "primary_gp_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    /** `xp`, `purchase`, `battle`, `welcome`, or `admin`. */
    reason: text("reason").notNull(),
    sourceKey: text("source_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("primary_gp_ledger_user_source_unique").on(t.schoolId, t.userId, t.sourceKey), index("primary_gp_ledger_user_idx").on(t.schoolId, t.userId, t.createdAt)],
);

/** An owned piece of a student: a catalog id (text) in one dye (null is the piece's own colors). */
export const primaryAvatarInventory = pgTable(
  "primary_avatar_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    dye: text("dye"),
    /** `starter`, `purchase`, or `reward`. */
    source: text("source").notNull(),
    catalogVersion: text("catalog_version").notNull(),
    acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
  },
  (t) => [unique("primary_avatar_inventory_item_unique").on(t.schoolId, t.userId, t.itemId, t.dye), index("primary_avatar_inventory_item_idx").on(t.itemId, t.acquiredAt)],
);

/** The worn piece of each slot of a student; the piece is an inventory row of the same student. */
export const primaryAvatarLoadout = pgTable(
  "primary_avatar_loadout",
  {
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    inventoryId: uuid("inventory_id").notNull().references(() => primaryAvatarInventory.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.userId, t.slot] })],
);
