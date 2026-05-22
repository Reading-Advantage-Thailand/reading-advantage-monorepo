import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { schools } from "./users";

// ─── Licenses ─────────────────────────────────────────────

export const licenses = pgTable("licenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  usedLicenses: integer("used_licenses"),
  licenseType: text("license_type").default("BASIC").notNull(),
  maxUsers: integer("max_users").default(1).notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id),
  schoolName: text("school_name").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  featureFlags: jsonb("feature_flags").default({}).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const licenseOnUsers = pgTable("license_on_users", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  licenseId: uuid("license_id")
    .notNull()
    .references(() => licenses.id, { onDelete: "cascade" }),
  activateAt: timestamp("activate_at").defaultNow().notNull(),
});
