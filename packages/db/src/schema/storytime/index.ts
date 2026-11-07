import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Storytime family accounts for the dedicated `storytime` database.
 *
 * The rows are not company accounts: the table has no `schoolId`, no tenant
 * scopes it, and it is EXEMPT in the tenant registry. The username is stored
 * lower case and unique, the password is an Argon2id hash, and the role is one
 * of `family`, `class`, or `teacher`.
 */
export const storytimeAccounts = pgTable(
  "storytime_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("storytime_accounts_username_key").on(table.username),
    check("storytime_accounts_username_lower", sql`lower(username) = username`),
    check(
      "storytime_accounts_role_check",
      sql`role IN ('family', 'class', 'teacher')`,
    ),
  ],
);

/**
 * Storytime sign-in sessions, stored as the lower-case SHA-256 digest only.
 *
 * The `account_id` key cascades with its account, and the index on account and
 * creation time serves the per-account session cap.
 */
export const storytimeSessions = pgTable(
  "storytime_sessions",
  {
    tokenDigest: text("token_digest").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => storytimeAccounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUseAt: timestamp("last_use_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("storytime_sessions_token_digest_key").on(table.tokenDigest),
    check(
      "storytime_sessions_token_digest_check",
      sql`token_digest ~ '^[0-9a-f]{64}$'`,
    ),
    index("storytime_sessions_account_created_idx").on(
      table.accountId,
      table.createdAt,
    ),
  ],
);

/**
 * Login rate-limit buckets, keyed by `ip:<address>` or `account:<username>`.
 *
 * One row holds a failure count and the start of its window, so one atomic
 * upsert consumes a request.
 */
export const storytimeLoginAttempts = pgTable("storytime_login_attempts", {
  key: text("key").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});

/**
 * Append-only Storytime audit events.
 *
 * A database trigger rejects every update and delete, so the rows can only
 * grow. Optional columns record who acted and why.
 */
export const storytimeAuditEvents = pgTable("storytime_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  accountId: uuid("account_id"),
  username: text("username"),
  reason: text("reason"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
