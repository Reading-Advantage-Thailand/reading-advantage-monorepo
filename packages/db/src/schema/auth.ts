import { pgTable, uuid, text, timestamp, integer, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * Login attempt rate-limit buckets.
 *
 * Backing table for the Postgres-backed auth rate limiter. Each row tracks
 * failed attempts for a single identifier (username or IP) within a rolling
 * window. The unique index supports the upsert pattern used by
 * `recordFailure`.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(), // username OR IP, depending on `kind`
    kind: text("kind").$type<"username" | "ip">().notNull(),
    failedCount: integer("failed_count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("login_attempts_identifier_kind_idx").on(table.identifier, table.kind),
    index("login_attempts_window_start_idx").on(table.windowStart),
  ],
);
