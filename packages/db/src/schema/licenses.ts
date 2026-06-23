import { pgTable, uuid, text, timestamp, integer, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { schools } from "./users.js";
import { subscriptionType } from "./primary.js";

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
  // Prisma-ported columns (track: primary_advantage_drizzle_migration_20260526, Phase 1)
  // NOTE: `name` and `description` mirror the Prisma License model so
  // primary-advantage can persist license display labels without a separate
  // table.
  name: text("name"),
  description: text("description"),
  subscription: subscriptionType("subscription").default("BASIC").notNull(),
  startDate: timestamp("start_date"),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default("active").notNull(),
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
}, (t) => [
  primaryKey({ columns: [t.userId, t.licenseId] }),
]);
