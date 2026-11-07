import { asc, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  storytimeAccounts,
  storytimeAuditEvents,
  storytimeLoginAttempts,
  storytimeSessions,
} from "@reading-advantage/db/storytime/schema";

import { createStorytimeRuntimeDb } from "./runtime.js";

/**
 * Any driver-bound Drizzle Postgres client, so the store runs on PGlite in
 * tests and on the `storytime` database at runtime.
 */
export type StorytimeDb = PgDatabase<PgQueryResultHKT>;

/** The account roles a Storytime account can hold. */
export const storytimeRoleSchema = z.enum(["family", "class", "teacher"]);

/** The audit action of one account creation. */
export const ACCOUNT_CREATED_ACTION = "account_created";

/** The id shape of a Storytime account. A value of another shape names no account. */
const accountIdSchema = z.string().uuid();

/** One account row as the store returns it. */
export interface StorytimeAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: z.infer<typeof storytimeRoleSchema>;
  disabled: boolean;
}

/** One session row as the store returns it. */
export interface StorytimeSession {
  tokenDigest: string;
  accountId: string;
  expiresAt: Date;
  lastUseAt: Date;
  createdAt: Date;
}

/** One audit event the store appends. */
export interface StorytimeAuditEvent {
  action: string;
  accountId?: string;
  username?: string;
  reason?: string;
  ip?: string;
  now: Date;
}

/** One rate-limit bucket as the store returns it. */
export interface StorytimeRateLimitBucket {
  failedCount: number;
  windowStart: number;
}

/**
 * The Storytime store surface. Every time-dependent function takes an explicit
 * `now`, and `createSessionWithCap` runs in one transaction.
 */
export interface StorytimeStore {
  findAccountByUsername(username: string): Promise<StorytimeAccount | null>;
  findAccountById(accountId: string): Promise<StorytimeAccount | null>;
  createAccount(input: {
    username: string;
    passwordHash: string;
    role: string;
    now: Date;
  }): Promise<StorytimeAccount>;
  setDisabled(accountId: string, disabled: boolean): Promise<void>;
  setPasswordHash(accountId: string, passwordHash: string): Promise<void>;
  createSessionWithCap(input: {
    accountId: string;
    tokenDigest: string;
    now: Date;
    expiresAt: Date;
    cap: number;
  }): Promise<{ endedDigests: string[] }>;
  findSessionByDigest(tokenDigest: string): Promise<StorytimeSession | null>;
  recordUse(tokenDigest: string, now: Date): Promise<void>;
  renewSession(tokenDigest: string, expiresAt: Date, now: Date): Promise<void>;
  deleteSessionByDigest(tokenDigest: string): Promise<void>;
  rateLimitStore: {
    get(key: string): Promise<StorytimeRateLimitBucket | undefined>;
    set(key: string, entry: StorytimeRateLimitBucket): Promise<void>;
    delete(key: string): Promise<void>;
    consume(
      key: string,
      now: number,
      windowMs: number,
    ): Promise<StorytimeRateLimitBucket>;
  };
  insertAuditEvent(event: StorytimeAuditEvent): Promise<void>;
  /**
   * Lists every account and the ids that already hold an `account_created` event.
   * @returns The accounts and the ids of the accounts that hold the event.
   */
  listAccountsForAudit(): Promise<{
    accounts: Array<{ id: string; username: string }>;
    auditedAccountIds: string[];
  }>;
}

/**
 * Maps an account row to the public account shape.
 * @param row The database row.
 * @returns The account as the store returns it.
 */
function toAccount(row: {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  disabled: boolean;
}): StorytimeAccount {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    role: storytimeRoleSchema.parse(row.role),
    disabled: row.disabled,
  };
}

/**
 * Maps a session row to the public session shape.
 * @param row The database row.
 * @returns The session as the store returns it.
 */
function toSession(row: {
  tokenDigest: string;
  accountId: string;
  expiresAt: Date;
  lastUseAt: Date;
  createdAt: Date;
}): StorytimeSession {
  return {
    tokenDigest: row.tokenDigest,
    accountId: row.accountId,
    expiresAt: row.expiresAt,
    lastUseAt: row.lastUseAt,
    createdAt: row.createdAt,
  };
}

/**
 * Creates the Storytime store that owns every Storytime SQL statement.
 *
 * The four tables live in the dedicated `storytime` database, so nothing here
 * touches the shared company tables.
 *
 * @param db A driver-bound Drizzle Postgres client.
 * @returns The store surface the app adapter and the account script use.
 */
export function createStorytimeStore(db: StorytimeDb): StorytimeStore {
  return {
    async findAccountByUsername(username) {
      const [row] = await db
        .select()
        .from(storytimeAccounts)
        .where(eq(storytimeAccounts.username, username))
        .limit(1);
      return row ? toAccount(row) : null;
    },

    async findAccountById(accountId) {
      const parsed = accountIdSchema.safeParse(accountId);
      if (!parsed.success) return null;
      const [row] = await db
        .select()
        .from(storytimeAccounts)
        .where(eq(storytimeAccounts.id, parsed.data))
        .limit(1);
      return row ? toAccount(row) : null;
    },

    async createAccount(input) {
      const role = storytimeRoleSchema.parse(input.role);
      const [row] = await db
        .insert(storytimeAccounts)
        .values({
          username: input.username,
          passwordHash: input.passwordHash,
          role,
          createdAt: input.now,
        })
        .returning();
      return toAccount(row);
    },

    async setDisabled(accountId, disabled) {
      await db
        .update(storytimeAccounts)
        .set({ disabled })
        .where(eq(storytimeAccounts.id, accountId));
    },

    async setPasswordHash(accountId, passwordHash) {
      await db
        .update(storytimeAccounts)
        .set({ passwordHash })
        .where(eq(storytimeAccounts.id, accountId));
    },

    async createSessionWithCap(input) {
      return db.transaction(async (tx) => {
        const owned = await tx
          .select({ tokenDigest: storytimeSessions.tokenDigest })
          .from(storytimeSessions)
          .where(eq(storytimeSessions.accountId, input.accountId))
          .orderBy(asc(storytimeSessions.createdAt));
        const endedDigests: string[] = [];
        while (owned.length >= input.cap) {
          const oldest = owned.shift();
          if (!oldest) break;
          endedDigests.push(oldest.tokenDigest);
        }
        if (endedDigests.length > 0) {
          await tx
            .delete(storytimeSessions)
            .where(
              inArray(storytimeSessions.tokenDigest, endedDigests),
            );
        }
        await tx.insert(storytimeSessions).values({
          tokenDigest: input.tokenDigest,
          accountId: input.accountId,
          expiresAt: input.expiresAt,
          lastUseAt: input.now,
          createdAt: input.now,
        });
        return { endedDigests };
      });
    },

    async findSessionByDigest(tokenDigest) {
      const [row] = await db
        .select()
        .from(storytimeSessions)
        .where(eq(storytimeSessions.tokenDigest, tokenDigest))
        .limit(1);
      return row ? toSession(row) : null;
    },

    async recordUse(tokenDigest, now) {
      await db
        .update(storytimeSessions)
        .set({ lastUseAt: now })
        .where(eq(storytimeSessions.tokenDigest, tokenDigest));
    },

    async renewSession(tokenDigest, expiresAt, now) {
      await db
        .update(storytimeSessions)
        .set({ expiresAt, lastUseAt: now })
        .where(eq(storytimeSessions.tokenDigest, tokenDigest));
    },

    async deleteSessionByDigest(tokenDigest) {
      await db
        .delete(storytimeSessions)
        .where(eq(storytimeSessions.tokenDigest, tokenDigest));
    },

    rateLimitStore: {
      async get(key) {
        const [row] = await db
          .select()
          .from(storytimeLoginAttempts)
          .where(eq(storytimeLoginAttempts.key, key))
          .limit(1);
        if (!row) return undefined;
        return { failedCount: row.failedCount, windowStart: row.windowStart };
      },

      async set(key, entry) {
        await db
          .insert(storytimeLoginAttempts)
          .values({ key, ...entry })
          .onConflictDoUpdate({
            target: storytimeLoginAttempts.key,
            set: { ...entry },
          });
      },

      async delete(key) {
        await db
          .delete(storytimeLoginAttempts)
          .where(eq(storytimeLoginAttempts.key, key));
      },

      async consume(key, now, windowMs) {
        const expired = sql`${
          storytimeLoginAttempts.windowStart
        } + ${windowMs} <= ${now}`;
        const [row] = await db
          .insert(storytimeLoginAttempts)
          .values({ key, failedCount: 1, windowStart: now })
          .onConflictDoUpdate({
            target: storytimeLoginAttempts.key,
            set: {
              failedCount: sql`CASE WHEN ${expired} THEN 1 ELSE ${
                storytimeLoginAttempts.failedCount
              } + 1 END`,
              windowStart: sql`CASE WHEN ${expired} THEN ${now} ELSE ${
                storytimeLoginAttempts.windowStart
              } END`,
            },
          })
          .returning({
            failedCount: storytimeLoginAttempts.failedCount,
            windowStart: storytimeLoginAttempts.windowStart,
          });
        return { failedCount: row.failedCount, windowStart: row.windowStart };
      },
    },

    async insertAuditEvent(event) {
      await db.insert(storytimeAuditEvents).values({
        action: event.action,
        accountId: event.accountId,
        username: event.username,
        reason: event.reason,
        ip: event.ip,
        createdAt: event.now,
      });
    },

    async listAccountsForAudit() {
      const accounts = await db
        .select({
          id: storytimeAccounts.id,
          username: storytimeAccounts.username,
        })
        .from(storytimeAccounts)
        .orderBy(asc(storytimeAccounts.createdAt), asc(storytimeAccounts.id));
      const audited = await db
        .select({ accountId: storytimeAuditEvents.accountId })
        .from(storytimeAuditEvents)
        .where(eq(storytimeAuditEvents.action, ACCOUNT_CREATED_ACTION));
      const auditedAccountIds = audited
        .map((row) => row.accountId)
        .filter((id): id is string => id !== null);
      return { accounts, auditedAccountIds };
    },
  };
}

/**
 * Creates the Storytime store that the app adapter and the account script use.
 *
 * The store owns every Storytime SQL statement, and the client it opens names the dedicated
 * `storytime` database. The app may not open a database client itself, so this factory is the
 * only way into the database from the app.
 *
 * @param databaseUrl The PostgreSQL URL of the Storytime database.
 * @returns The store bound to a new client.
 */
export function createStorytimeRuntimeStore(databaseUrl: string): StorytimeStore {
  return createStorytimeStore(createStorytimeRuntimeDb(databaseUrl));
}
