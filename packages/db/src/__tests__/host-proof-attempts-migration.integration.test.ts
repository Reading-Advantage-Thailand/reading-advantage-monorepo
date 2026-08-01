import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL ? describe : describe.skip;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MIGRATION_NAME = "0047_fluffy_joshua_kane.sql";

const SCHOOL_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "host-proof-student";
const TRANSCRIPT_DIGEST = "a".repeat(64);

/**
 * Replaces the database component of a PostgreSQL URL with a scratch database name.
 * @param baseUrl The PostgreSQL administrator URL.
 * @param databaseName The disposable database name.
 * @returns A connection URL addressed to the scratch database.
 */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Applies one Drizzle SQL migration after splitting its statement-boundary markers.
 * @param database The disposable PostgreSQL connection to migrate.
 * @returns A promise that resolves after every non-empty migration statement succeeds.
 */
async function applyMigration(database: ReturnType<typeof postgres>): Promise<void> {
  const migration = await readFile(
    resolve(PACKAGE_ROOT, "drizzle", MIGRATION_NAME),
    "utf8",
  );
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim().length > 0) await database.unsafe(statement);
  }
}

/**
 * Returns the initialized disposable PostgreSQL connection for a test assertion.
 * @param database The optional connection established by the suite setup.
 * @returns The available PostgreSQL connection.
 * @throws When the opt-in database setup did not complete.
 */
function requireDatabase(
  database: ReturnType<typeof postgres> | undefined,
): ReturnType<typeof postgres> {
  if (database === undefined) {
    throw new Error("Disposable PostgreSQL client was not initialized.");
  }
  return database;
}

/**
 * Inserts one host-proof attempt row using server-owned fixture values.
 * @param database The disposable PostgreSQL connection.
 * @param attemptId The distinct signed-attempt identifier to persist.
 * @param schoolId The tenant parent identifier to reference.
 * @param userId The actor parent identifier to reference.
 * @returns A promise that resolves after the insert attempt finishes.
 */
async function insertAttempt(
  database: ReturnType<typeof postgres>,
  attemptId: string,
  schoolId = SCHOOL_ID,
  userId = USER_ID,
): Promise<void> {
  await database.unsafe(
    `INSERT INTO host_proof_attempts (
      attempt_id,
      school_id,
      user_id,
      transcript_digest,
      expires_at,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      attemptId,
      schoolId,
      userId,
      TRANSCRIPT_DIGEST,
      "2026-08-02T00:10:00.000Z",
      "pending",
    ],
  );
}

let admin: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("host-proof attempts migration integration", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    databaseName = `host_proof_attempts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1 });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    database = postgres(withDatabase(PG_TEST_URL, databaseName), { max: 1 });

    await database.unsafe('CREATE TABLE "schools" ("id" uuid PRIMARY KEY)');
    await database.unsafe('CREATE TABLE "users" ("id" text PRIMARY KEY)');
    await database.unsafe('INSERT INTO "schools" ("id") VALUES ($1)', [SCHOOL_ID]);
    await database.unsafe('INSERT INTO "users" ("id") VALUES ($1)', [USER_ID]);
    await applyMigration(database);
  }, 30_000);

  afterAll(async () => {
    await database?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("creates the signed-attempt table with usable indexes and enforced parent and replay constraints", async () => {
    const client = requireDatabase(database);
    const [table] = await client.unsafe<Array<{ readonly table_name: string }>>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'host_proof_attempts'`,
    );
    expect(table?.table_name).toBe("host_proof_attempts");

    const constraints = await client.unsafe<Array<{
      readonly constraint_name: string;
      readonly constraint_type: string;
    }>>(
      `SELECT constraint_name, constraint_type
         FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'host_proof_attempts'`,
    );
    expect(constraints).toEqual(expect.arrayContaining([
      {
        constraint_name: "host_proof_attempts_attempt_unique",
        constraint_type: "UNIQUE",
      },
      {
        constraint_name: "host_proof_attempts_school_id_schools_id_fk",
        constraint_type: "FOREIGN KEY",
      },
      {
        constraint_name: "host_proof_attempts_user_id_users_id_fk",
        constraint_type: "FOREIGN KEY",
      },
    ]));

    const indexes = await client.unsafe<Array<{ readonly indexname: string }>>(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'host_proof_attempts'`,
    );
    expect(indexes.map((index) => index.indexname)).toEqual(expect.arrayContaining([
      "host_proof_attempts_attempt_unique",
      "host_proof_attempts_school_user_idx",
      "host_proof_attempts_expiry_idx",
    ]));

    const validAttemptId = "20000000-0000-4000-8000-000000000001";
    await expect(insertAttempt(client, validAttemptId)).resolves.toBeUndefined();
    await expect(insertAttempt(client, validAttemptId)).rejects.toMatchObject({
      code: "23505",
    });
    await expect(insertAttempt(
      client,
      "20000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000099",
    )).rejects.toMatchObject({ code: "23503" });
    await expect(insertAttempt(
      client,
      "20000000-0000-4000-8000-000000000003",
      SCHOOL_ID,
      "foreign-host-proof-student",
    )).rejects.toMatchObject({ code: "23503" });
  });
});
