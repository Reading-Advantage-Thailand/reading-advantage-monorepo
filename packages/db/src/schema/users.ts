import { pgTable, uuid, text, timestamp, integer, pgEnum, unique } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"]);

// ─── Multi-Tenant ─────────────────────────────────────────

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  district: text("district"),
  province: text("province"),
  country: text("country").default("Thailand").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayUsername: text("display_username").notNull().unique(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
  githubUsername: text("github_username").unique(),
  role: roleEnum("role").default("STUDENT").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  // FK to licenses.id — declared as plain text to avoid circular import (licenses.ts → users.ts)
  licenseId: text("license_id"),
  expiredDate: timestamp("expired_date"),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  cefrLevel: text("cefr_level").default("A1-").notNull(),
  gradeLevel: integer("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Accounts ─────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(), // "credential" or "google"
  password: text("password"), // bcrypt hash, only for credential provider
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("accounts_user_provider_unique").on(table.userId, table.providerId),
]);

// ─── Sessions ─────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});
