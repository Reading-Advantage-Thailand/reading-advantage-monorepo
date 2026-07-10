import { sql } from "drizzle-orm";
import { schools, users } from "@reading-advantage/db";
import { describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import {
  runMasteryPersistenceContract,
  type MasteryPersistenceTestHarness,
  type MasteryPersistenceTestPort,
} from "./mastery-persistence.contract.js";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const REQUIRED_TABLES = [
  "mastery_cards",
  "mastery_reviews",
  "mastery_evidence",
  "mastery_states",
  "mastery_placements",
  "mastery_calibrations",
  "mastery_commits",
] as const;

type PublicModule = Record<string, unknown>;

async function loadMasteryModule(): Promise<PublicModule> {
  return import("../mastery/index.js") as Promise<PublicModule>;
}

async function loadDbModule(): Promise<PublicModule> {
  return import("@reading-advantage/db") as Promise<PublicModule>;
}

describe("mastery persistence Drizzle public surface", () => {
  it("exports the Drizzle adapter factory through the mastery barrel", async () => {
    const mastery = await loadMasteryModule();
    expect(
      typeof mastery.createDrizzleMasteryPersistence,
      "missing public createDrizzleMasteryPersistence",
    ).toBe("function");
  });

  it("exports exactly the seven intended mastery tables through the DB barrel", async () => {
    const db = await loadDbModule();
    const symbols = [
      "masteryCards",
      "masteryReviews",
      "masteryEvidence",
      "masteryStates",
      "masteryPlacements",
      "masteryCalibrations",
      "masteryCommits",
    ];
    for (const symbol of symbols) {
      expect.soft(db[symbol], `missing public DB table ${symbol}`).toBeDefined();
    }
  });
});

async function assertPhysicalTables(harness: TestDb): Promise<void> {
  const result = await harness.db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const actual = new Set(
    (result.rows as Array<{ tablename: string }>).map((row) => row.tablename),
  );
  const missing = REQUIRED_TABLES.filter((table) => !actual.has(table));
  if (missing.length > 0) {
    throw new Error(
      `RED: missing migrated mastery persistence tables: ${missing.join(", ")}`,
    );
  }
}

async function seedOwners(harness: TestDb): Promise<void> {
  await harness.db.insert(schools).values([
    { id: SCHOOL_A, name: "Mastery School A" },
    { id: SCHOOL_B, name: "Mastery School B" },
  ]);
  await harness.db.insert(users).values([
    {
      id: "mastery-student-a",
      username: "mastery-student-a",
      displayUsername: "mastery-student-a",
      name: "Mastery Student A",
      schoolId: SCHOOL_A,
    },
    {
      id: "mastery-student-b",
      username: "mastery-student-b",
      displayUsername: "mastery-student-b",
      name: "Mastery Student B",
      schoolId: SCHOOL_B,
    },
  ]);
}

async function createDrizzleHarness(): Promise<MasteryPersistenceTestHarness> {
  const testDb = await createTestDb();
  try {
    await assertPhysicalTables(testDb);
    const mastery = await loadMasteryModule();
    const createAdapter = mastery.createDrizzleMasteryPersistence;
    if (typeof createAdapter !== "function") {
      throw new Error(
        "RED: missing public createDrizzleMasteryPersistence adapter factory",
      );
    }
    const adapter = await Promise.resolve(
      createAdapter({
        db: testDb.db,
        tenant: { schoolId: SCHOOL_A },
        actorId: "teacher-1",
      }) as MasteryPersistenceTestPort,
    );
    return {
      adapter: () => adapter,
      boundSchoolId: SCHOOL_A,
      reset: async () => {
        await testDb.reset();
        await seedOwners(testDb);
      },
      close: () => testDb.close(),
    };
  } catch (error) {
    await testDb.close();
    throw error;
  }
}

runMasteryPersistenceContract("PGlite/Drizzle", createDrizzleHarness);
