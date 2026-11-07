/**
 * The Storytime store against a real PostgreSQL server (test strategy P2b.5, P2b.7, P2b.9
 * row 7; Review B finding F41).
 *
 * The contract suite proves the store against PGlite in process. This file proves the two races
 * that need real concurrent connections:
 *
 * 1. `createSessionWithCap` must end the oldest sessions in one transaction that holds the
 *    account row, so 20 parallel sign-ins on a `family` account (cap 5) and 40 parallel sign-ins
 *    on a `class` account (cap 30) leave at most the cap of rows.
 * 2. `rateLimitStore.consume` must be one atomic upsert, so 20 parallel increments on one key
 *    leave a count of exactly 20.
 *
 * The file runs only when `PG_TEST_URL` is set (the gate job `phase2b-browser-gate.sh`), because
 * AGENTS.md keeps real PostgreSQL out of the unit run. Without the variable it reports
 * `real_db_skipped=1` and shows a skipped case: it never claims a pass (A5).
 */
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { describe, expect, it } from "vitest";

const PG_TEST_URL = process.env.PG_TEST_URL ?? "";
const REPO = resolve(import.meta.dirname, "../../../../../..");
const MIGRATION_DIR = resolve(REPO, "packages/db/drizzle-storytime");

/** One open client and the store bound to it. */
interface Client {
  sql: ReturnType<typeof postgres>;
  store: import("../index.js").StorytimeStore;
}

/**
 * Opens one client with one connection.
 * @param databaseUrl The PostgreSQL URL.
 * @returns The client and the store bound to it.
 */
async function openClient(databaseUrl: string): Promise<Client> {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const { createStorytimeStore } = await import("../index.js");
  const store = createStorytimeStore(
    drizzle(sql) as unknown as Parameters<typeof createStorytimeStore>[0],
  );
  return { sql, store };
}

/**
 * Applies the committed migration to the server. The drizzle migrator is idempotent, so a
 * second run in the gate appends no row.
 * @param databaseUrl The PostgreSQL URL.
 */
async function applyMigration(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATION_DIR });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Closes every client.
 * @param clients The open clients.
 */
async function closeAll(clients: Client[]): Promise<void> {
  await Promise.all(clients.map((client) => client.sql.end({ timeout: 5 })));
}

/**
 * Creates one account with the given role and returns its id.
 * @param databaseUrl The PostgreSQL URL.
 * @param role The role of the account.
 * @returns The id of the account.
 */
async function makeAccount(
  databaseUrl: string,
  role: "family" | "class",
): Promise<{ id: string; username: string }> {
  const client = await openClient(databaseUrl);
  try {
    const username = `race-${role}-${randomBytes(6).toString("hex")}`;
    const account = await client.store.createAccount({
      username,
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$cmFjZQ$cmFjZQ",
      role,
      now: new Date(),
    });
    return { id: account.id, username };
  } finally {
    await closeAll([client]);
  }
}

/**
 * Counts the sessions of one account.
 * @param databaseUrl The PostgreSQL URL.
 * @param accountId The account id.
 * @returns The number of session rows.
 */
async function countSessions(databaseUrl: string, accountId: string): Promise<number> {
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const rows = (await sql`
      SELECT count(*)::int AS count FROM storytime_sessions WHERE account_id = ${accountId}
    `) as Array<{ count: number }>;
    return Number(rows[0]?.count ?? 0);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Removes the accounts of one race, so the gate database stays clean.
 * @param databaseUrl The PostgreSQL URL.
 * @param accountIds The ids to remove. The session rows follow by cascade.
 */
async function removeAccounts(databaseUrl: string, accountIds: string[]): Promise<void> {
  if (accountIds.length === 0) return;
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    for (const accountId of accountIds) {
      await sql`DELETE FROM storytime_accounts WHERE id = ${accountId}`;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Builds a 64-hex digest for one race session.
 * @param label The unique label of the session.
 * @returns The lower-case digest.
 */
function digestOf(label: string): string {
  return createHash("sha256").update(label).digest("hex");
}

if (!PG_TEST_URL) {
  process.stdout.write("real_db_skipped=1\n");
  describe("storytime store on real PostgreSQL", () => {
    it.skip("skips the concurrency races when PG_TEST_URL is not set", () => {
      // A skipped case is not a pass. The gate sets PG_TEST_URL and runs the cases below.
    });
  });
} else {
  describe("storytime store on real PostgreSQL", () => {
    it(
      "keeps the family cap of 5 and the class cap of 30 under parallel sign-ins",
      { timeout: 120_000 },
      async () => {
        await applyMigration(PG_TEST_URL);
        const family = await makeAccount(PG_TEST_URL, "family");
        const className = await makeAccount(PG_TEST_URL, "class");
        const familyClients = await Promise.all(
          Array.from({ length: 20 }, () => openClient(PG_TEST_URL)),
        );
        const classClients = await Promise.all(
          Array.from({ length: 40 }, () => openClient(PG_TEST_URL)),
        );
        const now = new Date();
        const later = new Date(now.getTime() + 31_536_000 * 1000);
        try {
          await Promise.all(
            familyClients.map((client, index) =>
              client.store.createSessionWithCap({
                accountId: family.id,
                tokenDigest: digestOf(`family-${index}`),
                now: new Date(now.getTime() + index),
                expiresAt: later,
                cap: 5,
              }),
            ),
          );
          await Promise.all(
            classClients.map((client, index) =>
              client.store.createSessionWithCap({
                accountId: className.id,
                tokenDigest: digestOf(`class-${index}`),
                now: new Date(now.getTime() + index),
                expiresAt: later,
                cap: 30,
              }),
            ),
          );

          const familySessions = await countSessions(PG_TEST_URL, family.id);
          const classSessions = await countSessions(PG_TEST_URL, className.id);
          console.log(
            `family_sessions_after_race=${familySessions} family_cap=5 ` +
              `class_sessions_after_race=${classSessions} class_cap=30`,
          );
          expect(familySessions, "the family account holds at most its cap").toBeLessThanOrEqual(5);
          expect(classSessions, "the class account holds at most its cap").toBeLessThanOrEqual(30);
        } finally {
          await closeAll(familyClients);
          await closeAll(classClients);
          await removeAccounts(PG_TEST_URL, [family.id, className.id]);
        }
      },
    );

    it(
      "keeps every increment of 20 parallel rate-limit attempts on one key",
      { timeout: 120_000 },
      async () => {
        await applyMigration(PG_TEST_URL);
        const clients = await Promise.all(
          Array.from({ length: 20 }, () => openClient(PG_TEST_URL)),
        );
        const key = `race-rate-${randomBytes(6).toString("hex")}`;
        const now = Date.now();
        try {
          await Promise.all(
            clients.map((client) =>
              client.store.rateLimitStore.consume(key, now, 15 * 60 * 1000),
            ),
          );
          const bucket = await clients[0].store.rateLimitStore.get(key);
          const count = bucket?.failedCount ?? 0;
          console.log(`rate_limit_count_after_race=${count} rate_limit_parallel=20`);
          expect(count, "the atomic upsert loses no increment").toBe(20);
          await clients[0].store.rateLimitStore.delete(key);
        } finally {
          await closeAll(clients);
        }
      },
    );
  });
}
