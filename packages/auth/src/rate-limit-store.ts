/**
 * Postgres-backed rate-limit store.
 *
 * Implements the `RateLimitStore` interface using `login_attempts` table
 * rows. This makes rate-limit state durable across process restarts and
 * consistent across server replicas.
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { loginAttempts } from "@reading-advantage/db/schema";
import type * as schema from "@reading-advantage/db/schema";
import type { RateLimitConfig, RateLimitStore } from "./rate-limit.js";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Parses a storage key back into identifier and kind.
 * @param key - Composite storage key.
 * @returns Identifier and kind tuple.
 */
function parseKey(key: string): { identifier: string; kind: "username" | "ip" } {
  const sep = key.indexOf(":");
  if (sep === -1) {
    // Legacy username-only key fallback.
    return { identifier: key, kind: "username" };
  }
  const kind = key.slice(0, sep) as "username" | "ip";
  const identifier = key.slice(sep + 1);
  return { identifier, kind };
}

/**
 * Creates a Postgres-backed rate-limit store.
 *
 * @param db - Drizzle database client.
 * @param config - Optional config for default window/maxAttempts used by
 *   the in-memory path; the Postgres path stores raw counts and lets
 *   callers decide limits.
 * @returns A `RateLimitStore` backed by `login_attempts`.
 */
export function createPostgresRateLimitStore(
  db: Db,
  config?: RateLimitConfig,
): RateLimitStore {
  const effectiveConfig = config ?? {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
  };

  return {
    async get(key) {
      const { identifier, kind } = parseKey(key);
      const now = Date.now();

      const rows = await db
        .select({
          failedCount: loginAttempts.failedCount,
          windowStart: loginAttempts.windowStart,
          lastAttemptAt: loginAttempts.lastAttemptAt,
        })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.kind, kind)))
        .for("update")
        .limit(1);

      const row = rows[0];
      if (!row) return undefined;

      // If the window has expired, the row is stale. Delete it and treat
      // as if no entry exists.
      if (now - row.windowStart.getTime() > effectiveConfig.windowMs) {
        await db
          .delete(loginAttempts)
          .where(and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.kind, kind)));
        return undefined;
      }

      return {
        failedCount: row.failedCount,
        windowStart: row.windowStart.getTime(),
      };
    },

    async set(key, entry) {
      const { identifier, kind } = parseKey(key);
      const windowStart = new Date(entry.windowStart);
      const lastAttemptAt = new Date();

      await db
        .insert(loginAttempts)
        .values({
          identifier,
          kind,
          failedCount: entry.failedCount,
          windowStart,
          lastAttemptAt,
        })
        .onConflictDoUpdate({
          target: [loginAttempts.identifier, loginAttempts.kind],
          set: {
            failedCount: entry.failedCount,
            windowStart,
            lastAttemptAt,
          },
        });
    },

    async delete(key) {
      const { identifier, kind } = parseKey(key);
      await db
        .delete(loginAttempts)
        .where(and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.kind, kind)));
    },
  };
}
