import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum, unique } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["STUDENT", "USER", "TEACHER", "ADMIN"]);

// ─── Multi-Tenant ─────────────────────────────────────────

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  district: text("district"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password"),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: roleEnum("role").default("STUDENT").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  cefrLevel: text("cefr_level").default("A1-").notNull(),
  firebaseUid: text("firebase_uid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
}, (table) => [
  unique("accounts_provider_unique").on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => [
  unique("verification_tokens_unique").on(table.identifier, table.token),
]);

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
