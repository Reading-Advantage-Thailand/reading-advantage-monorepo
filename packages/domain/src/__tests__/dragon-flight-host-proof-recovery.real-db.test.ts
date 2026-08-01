import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPrivilegedDb } from "@reading-advantage/db";
import type { Tenant, UserContext } from "@reading-advantage/auth";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.unmock("../tenant-registry.js");

import { createTenantDB } from "../db-contract.js";
import {
  createDragonFlightHostProofAttemptDependencies,
} from "../games/dragon-flight-host-proof-attempt-adapter.js";
import {
  attestDragonFlightHostProofAction,
  completeDragonFlightHostProofAttempt,
  issueDragonFlightHostProofAttempt,
  type DragonFlightHostProofAttemptDependencies,
  type DragonFlightHostProofAttemptStore,
  type HostProofAttemptActor,
} from "../games/dragon-flight-host-proof-attempt.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const DESCRIBE_REAL_POSTGRES = PG_TEST_URL ? describe : describe.skip;
const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(HERE, "../../../..");
const DB_PACKAGE_ROOT = join(WORKSPACE_ROOT, "packages", "db");

const SCHOOL_ID = "a1111111-1111-4111-8111-111111111111";
const USER_ID = "dragon-flight-recovery-user";
const ATTEMPT_ID = "b2222222-2222-4222-8222-222222222222";
const SIGNING_SECRET = "dragon-flight-real-postgres-recovery-secret-at-least-32-bytes";
const ISSUED_AT = "2026-08-02T00:00:00.000Z";
const FIRST_ACTION_AT = "2026-08-02T00:00:00.050Z";
const SECOND_ACTION_AT = "2026-08-02T00:00:00.350Z";
const FIRST_COMPLETION_AT = "2026-08-02T00:00:00.700Z";
const EXPIRED_RETRY_AT = "2026-08-02T00:10:00.001Z";

interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

interface DurableRowCounts {
  readonly completionCount: number;
  readonly xpCount: number;
  readonly totalXp: number;
}

interface AttemptState {
  readonly status: string;
  readonly result: unknown;
}

type PrivilegedConnection = ReturnType<typeof createPrivilegedDb>;
type BeginInput = Parameters<DragonFlightHostProofAttemptStore["begin"]>[0];

let adminConnection: PrivilegedConnection | undefined;
let scratchConnection: PrivilegedConnection | undefined;
let scratchDatabaseName = "";
let scratchDatabaseUrl = "";
let originalDatabaseUrl: string | undefined;
let originalDirectDatabaseUrl: string | undefined;

/**
 * Runs the shared migration entrypoint against one disposable database.
 * @param databaseUrl Disposable PostgreSQL connection URL.
 * @returns The child process status and captured output.
 */
function runMigrations(databaseUrl: string): Promise<CommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      join(WORKSPACE_ROOT, "node_modules", ".bin", "tsx"),
      ["scripts/migrate.ts"],
      {
        cwd: DB_PACKAGE_ROOT,
        env: {
          ...process.env,
          CI: "true",
          DATABASE_URL: databaseUrl,
          DIRECT_DATABASE_URL: databaseUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", rejectPromise);
    child.once("exit", (status) => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

/**
 * Replaces only the database path of an administrator URL.
 * @param baseUrl PostgreSQL URL used only to create and drop the scratch database.
 * @param databaseName Randomized scratch database name.
 * @returns A PostgreSQL URL for the named scratch database.
 */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Installs one connection URL for the runtime-only privileged DB factory.
 * @param databaseUrl PostgreSQL connection URL that the factory must use.
 * @returns Nothing after both supported environment variables are updated.
 */
function setDatabaseUrls(databaseUrl: string): void {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_DATABASE_URL = databaseUrl;
}

/**
 * Restores the process database environment after a scratch-database test.
 * @returns Nothing after the original environment values are restored.
 */
function restoreDatabaseUrls(): void {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalDirectDatabaseUrl === undefined) {
    delete process.env.DIRECT_DATABASE_URL;
  } else {
    process.env.DIRECT_DATABASE_URL = originalDirectDatabaseUrl;
  }
}

/**
 * Seeds the minimal real tenant and learner required by completion foreign keys.
 * @param connection Scratch database connection after all product migrations.
 * @returns Nothing after the school and learner are committed.
 */
async function seedSchoolAndUser(connection: PrivilegedConnection): Promise<void> {
  await connection.client.unsafe(
    `INSERT INTO schools (id, name)
     VALUES ($1, $2)`,
    [SCHOOL_ID, "Dragon Flight recovery scratch school"],
  );
  await connection.client.unsafe(
    `INSERT INTO users (id, username, display_username, name, role, school_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      USER_ID,
      USER_ID,
      USER_ID,
      "Dragon Flight recovery learner",
      "STUDENT",
      SCHOOL_ID,
    ],
  );
}

/**
 * Reads the two authoritative completion tables without relying on application cache state.
 * @param connection Scratch PostgreSQL connection.
 * @param activityId Server-derived completion idempotency identity.
 * @returns Exact game-completion and XP-ledger row counts plus awarded XP.
 */
async function readDurableRowCounts(
  connection: PrivilegedConnection,
  activityId: string,
): Promise<DurableRowCounts> {
  const [completion] = await connection.client.unsafe<Array<{ count: string | number }>>(
    `SELECT count(*)::integer AS count
       FROM game_completions
      WHERE school_id = $1
        AND user_id = $2
        AND activity_id = $3`,
    [SCHOOL_ID, USER_ID, activityId],
  );
  const [xp] = await connection.client.unsafe<Array<{
    count: string | number;
    total: string | number;
  }>>(
    `SELECT count(*)::integer AS count,
            coalesce(sum(xp_earned), 0)::integer AS total
       FROM xp_logs
      WHERE user_id = $1
        AND activity_id = $2`,
    [USER_ID, activityId],
  );
  return {
    completionCount: Number(completion?.count ?? 0),
    xpCount: Number(xp?.count ?? 0),
    totalXp: Number(xp?.total ?? 0),
  };
}

/**
 * Reads the durable proof-attempt state written by the tenant-scoped store.
 * @param connection Scratch PostgreSQL connection.
 * @returns The stored status and JSON result for the signed fixed attempt.
 * @throws When the expected proof-attempt row was not created.
 */
async function readAttemptState(connection: PrivilegedConnection): Promise<AttemptState> {
  const [attempt] = await connection.client.unsafe<AttemptState[]>(
    `SELECT status, result
       FROM host_proof_attempts
      WHERE attempt_id = $1`,
    [ATTEMPT_ID],
  );
  if (!attempt) {
    throw new Error("Expected the Dragon Flight host-proof attempt to be durable.");
  }
  return attempt;
}

/**
 * Returns the real authenticated actor and tenant used by the adapter boundary.
 * @returns Coherent actor, user context, and tenant records for the scratch learner.
 */
function createActorContext(): {
  readonly actor: HostProofAttemptActor;
  readonly user: UserContext;
  readonly tenant: Tenant;
} {
  const tenant: Tenant = { schoolId: SCHOOL_ID };
  const actor: HostProofAttemptActor = { userId: USER_ID, schoolId: SCHOOL_ID };
  const user: UserContext = {
    id: USER_ID,
    username: USER_ID,
    name: "Dragon Flight recovery learner",
    role: "STUDENT",
    schoolId: SCHOOL_ID,
    xp: 0,
    level: 1,
    cefrLevel: "A1",
  };
  return { actor, user, tenant };
}

DESCRIBE_REAL_POSTGRES("Dragon Flight host-proof recovery (real PostgreSQL)", () => {
  beforeAll(async () => {
    if (!PG_TEST_URL) return;
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalDirectDatabaseUrl = process.env.DIRECT_DATABASE_URL;
    setDatabaseUrls(PG_TEST_URL);
    adminConnection = createPrivilegedDb();
    scratchDatabaseName = `dragon_flight_recovery_${randomUUID().replaceAll("-", "")}`;
    await adminConnection.client.unsafe(`CREATE DATABASE "${scratchDatabaseName}"`);
    scratchDatabaseUrl = withDatabase(PG_TEST_URL, scratchDatabaseName);

    const migration = await runMigrations(scratchDatabaseUrl);
    if (migration.status !== 0) {
      throw new Error(
        `Scratch PostgreSQL migration failed. stdout=${migration.stdout} stderr=${migration.stderr}`,
      );
    }

    setDatabaseUrls(scratchDatabaseUrl);
    scratchConnection = createPrivilegedDb();
    await seedSchoolAndUser(scratchConnection);
  }, 180_000);

  afterAll(async () => {
    try {
      await scratchConnection?.client.end({ timeout: 5 });
    } finally {
      try {
        if (adminConnection && scratchDatabaseName) {
          await adminConnection.client.unsafe(
            `DROP DATABASE IF EXISTS "${scratchDatabaseName}" WITH (FORCE)`,
          );
        }
      } finally {
        try {
          await adminConnection?.client.end({ timeout: 5 });
        } finally {
          restoreDatabaseUrls();
        }
      }
    }
  }, 30_000);

  it("recovers an interrupted generic completion after TTL with concurrent retries and one authoritative XP row", async () => {
    if (!scratchConnection) {
      throw new Error("Disposable PostgreSQL connection was not initialized.");
    }
    const { actor, user, tenant } = createActorContext();
    let now = ISSUED_AT;
    const baseDependencies = createDragonFlightHostProofAttemptDependencies({
      db: createTenantDB(scratchConnection.db, tenant),
      user,
      tenant,
      secret: SIGNING_SECRET,
    });
    const claimInputs: BeginInput[] = [];
    const interruptedDependencies: DragonFlightHostProofAttemptDependencies = {
      ...baseDependencies,
      now: () => now,
      createAttemptId: () => ATTEMPT_ID,
      store: {
        ...baseDependencies.store,
        begin: async (input) => {
          claimInputs.push(input);
          return baseDependencies.store.begin(input);
        },
        complete: async () => {
          throw new Error(
            "simulated interruption after generic completion before host-proof finalization",
          );
        },
      },
    };

    const issued = await issueDragonFlightHostProofAttempt(
      actor,
      { gameType: "dragon-flight", difficulty: "medium" },
      interruptedDependencies,
    );
    const actions = [
      { sequence: 1, kind: "choose-gate" as const, gate: "right" as const, elapsedMs: 400 },
      { sequence: 2, kind: "launch" as const, elapsedMs: 700 },
    ];
    now = FIRST_ACTION_AT;
    const firstCheckpoint = await attestDragonFlightHostProofAction(
      actor,
      {
        attemptId: issued.attemptId,
        credential: issued.credential,
        action: actions[0],
      },
      interruptedDependencies,
    );
    now = SECOND_ACTION_AT;
    const secondCheckpoint = await attestDragonFlightHostProofAction(
      actor,
      {
        attemptId: issued.attemptId,
        credential: issued.credential,
        action: actions[1],
        previousCheckpoint: firstCheckpoint.checkpoint,
      },
      interruptedDependencies,
    );
    const request = {
      attemptId: issued.attemptId,
      credential: issued.credential,
      idempotencyKey: issued.attemptId,
      actions,
      checkpoints: [firstCheckpoint.checkpoint, secondCheckpoint.checkpoint],
    };

    now = FIRST_COMPLETION_AT;
    await expect(
      completeDragonFlightHostProofAttempt(actor, request, interruptedDependencies),
    ).rejects.toThrow(/simulated interruption/u);
    expect(await readDurableRowCounts(
      scratchConnection,
      `game:dragon-flight:${ATTEMPT_ID}`,
    )).toEqual({ completionCount: 1, xpCount: 1, totalXp: 5 });
    expect(await readAttemptState(scratchConnection)).toEqual({
      status: "pending",
      result: null,
    });

    const matchingPendingClaim = claimInputs[0];
    if (!matchingPendingClaim) {
      throw new Error("The interrupted completion did not create a durable claim input.");
    }
    await expect(baseDependencies.store.lookupRecovery(matchingPendingClaim)).resolves.toEqual({
      kind: "pending",
      claimId: expect.any(String),
    });
    await expect(baseDependencies.store.lookupRecovery({
      ...matchingPendingClaim,
      transcriptDigest: "f".repeat(64),
    })).resolves.toEqual({ kind: "conflict" });

    now = EXPIRED_RETRY_AT;
    const expiredRetryDependencies = {
      ...baseDependencies,
      now: () => now,
      createAttemptId: () => ATTEMPT_ID,
    };
    const retryResults = await Promise.all([
      completeDragonFlightHostProofAttempt(actor, request, expiredRetryDependencies),
      completeDragonFlightHostProofAttempt(actor, request, expiredRetryDependencies),
    ]);
    for (const retryResult of retryResults) {
      expect(retryResult).toMatchObject({
        xpEarned: 5,
        score: 100,
        accuracy: 1,
        correctAnswers: 1,
        totalAttempts: 1,
        duration: 700,
        victory: true,
        duplicate: true,
      });
    }
    expect(await readDurableRowCounts(
      scratchConnection,
      `game:dragon-flight:${ATTEMPT_ID}`,
    )).toEqual({ completionCount: 1, xpCount: 1, totalXp: 5 });
    expect(await readAttemptState(scratchConnection)).toEqual({
      status: "completed",
      result: expect.objectContaining({ xpEarned: 5, duplicate: false }),
    });
  }, 30_000);
});
