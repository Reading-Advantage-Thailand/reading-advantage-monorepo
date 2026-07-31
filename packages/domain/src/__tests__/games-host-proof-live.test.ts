import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import {
  gameCompletions,
  schools,
  users,
} from "@reading-advantage/db/schema";
import type { Tenant, UserContext } from "@reading-advantage/auth";

vi.unmock("../tenant-registry.js");
vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

import {
  createTestDb,
  TEST_DB_APPEND_ONLY_TABLES,
  type TestDb,
} from "./helpers/testDb.js";
import {
  HOST_PROOF_ERROR_CODES,
  HostProofCompletionError,
  getHostProofGameCompletions,
  recordHostProofGameCompletion,
} from "../games/host-proof.js";

const SCHOOL_A_ID = "11111111-1111-1111-1111-111111111111";
const SCHOOL_B_ID = "22222222-2222-2222-2222-222222222222";
const USER_A_ID = "host-proof-user-a";
const USER_B_ID = "host-proof-user-b";
const IDEMPOTENCY_KEY = "33333333-3333-3333-3333-333333333333";

function makeTenant(schoolId: string): Tenant {
  return { schoolId };
}

function makeUser(id: string, schoolId: string): UserContext {
  return {
    id,
    username: id,
    name: id,
    role: "STUDENT",
    schoolId,
    xp: 0,
    level: 1,
    cefrLevel: "A1",
  };
}

function makeCompletionInput() {
  return {
    gameType: "dragon-flight",
    difficulty: "medium",
    score: 500,
    accuracy: 5 / 6,
    correctAnswers: 5,
    totalAttempts: 6,
    duration: 12_345,
    victory: true,
    idempotencyKey: IDEMPOTENCY_KEY,
    clientTimestamp: 1_700_000_000_000,
  };
}

async function seedSchoolAndUser(
  harness: TestDb,
  schoolId: string,
  userId: string,
): Promise<void> {
  await harness.db.insert(schools).values({
    id: schoolId,
    name: `School ${schoolId}`,
  });
  await harness.db.insert(users).values({
    id: userId,
    username: userId,
    displayUsername: userId,
    name: userId,
    schoolId,
  });
}

async function seedCompletion(
  harness: TestDb,
  values: {
    schoolId: string;
    userId: string;
    gameType: string;
    activityId: string;
    createdAt: Date;
    accuracy?: number;
  },
): Promise<void> {
  await harness.db.insert(gameCompletions).values({
    schoolId: values.schoolId,
    userId: values.userId,
    gameType: values.gameType,
    difficulty: "medium",
    score: 500,
    accuracy: values.accuracy ?? 0.8,
    correctAnswers: 4,
    totalAttempts: 5,
    duration: 12_345,
    victory: true,
    xpEarned: 7,
    activityId: values.activityId,
    createdAt: values.createdAt,
  });
}

function expectInternal(error: unknown): void {
  expect(error).toBeInstanceOf(HostProofCompletionError);
  expect((error as HostProofCompletionError).code).toBe(
    HOST_PROOF_ERROR_CODES.INTERNAL,
  );
}

describe("Task 5 Gate C host-proof adapter (PGlite/live)", () => {
  let harness: TestDb;

  it("preserves the production append-only registry boundary in test reset", () => {
    expect(TEST_DB_APPEND_ONLY_TABLES).toEqual([
      "standard_pack_successor_commitments",
      "standard_pack_successor_admission_receipts",
    ]);
  });

  beforeAll(async () => {
    harness = await createTestDb();
  }, 60_000);

  afterEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it("filters to the accepted five IDs in SQL before ordering and limiting", async () => {
    await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);
    await seedCompletion(harness, {
      schoolId: SCHOOL_A_ID,
      userId: USER_A_ID,
      gameType: "dragon-flight",
      activityId: "accepted-older",
      createdAt: new Date("2026-07-28T00:00:00Z"),
    });
    await seedCompletion(harness, {
      schoolId: SCHOOL_A_ID,
      userId: USER_A_ID,
      gameType: "haunted-library",
      activityId: "non-host-newer",
      createdAt: new Date("2026-07-28T00:01:00Z"),
    });

    const history = await getHostProofGameCompletions({
      db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
      user: makeUser(USER_A_ID, SCHOOL_A_ID),
      tenant: makeTenant(SCHOOL_A_ID),
      input: { limit: 1 },
    });

    expect(history).toHaveLength(1);
    expect(history[0]?.activityId).toBe("accepted-older");
    expect(history[0]?.gameType).toBe("dragon-flight");
  });

  it("preserves TenantDB school isolation for host-proof history", async () => {
    await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);
    await seedSchoolAndUser(harness, SCHOOL_B_ID, USER_B_ID);
    await seedCompletion(harness, {
      schoolId: SCHOOL_A_ID,
      userId: USER_A_ID,
      gameType: "dragon-flight",
      activityId: "school-a-completion",
      createdAt: new Date("2026-07-28T00:00:00Z"),
    });
    await seedCompletion(harness, {
      schoolId: SCHOOL_B_ID,
      userId: USER_B_ID,
      gameType: "magic-defense",
      activityId: "school-b-completion",
      createdAt: new Date("2026-07-28T00:00:00Z"),
    });

    const schoolBHistory = await getHostProofGameCompletions({
      db: harness.tenantDb(makeTenant(SCHOOL_B_ID)),
      user: makeUser(USER_B_ID, SCHOOL_B_ID),
      tenant: makeTenant(SCHOOL_B_ID),
    });

    expect(schoolBHistory.map((row) => row.activityId)).toEqual([
      "school-b-completion",
    ]);
    expect(schoolBHistory.some((row) => row.activityId === "school-a-completion")).toBe(
      false,
    );
  });

  it("awards XP once for concurrent duplicate completions", async () => {
    await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);
    const complete = () =>
      recordHostProofGameCompletion({
        db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
        user: makeUser(USER_A_ID, SCHOOL_A_ID),
        tenant: makeTenant(SCHOOL_A_ID),
        input: makeCompletionInput(),
      });

    const results = await Promise.all([complete(), complete()]);
    expect(results.filter((result) => result.duplicate)).toHaveLength(1);
    expect(results.filter((result) => !result.duplicate)).toHaveLength(1);
    expect(results.reduce((total, result) => total + result.xpEarned, 0)).toBe(7);
    expect(new Set(results.map((result) => result.activityId))).toEqual(
      new Set([`game:dragon-flight:${IDEMPOTENCY_KEY}`]),
    );

    const completionCount = await harness.db.execute(
      sql`select count(*)::int as count from ${gameCompletions}
          where ${gameCompletions.schoolId} = ${SCHOOL_A_ID}
            and ${gameCompletions.userId} = ${USER_A_ID}`,
    );
    const xpCount = await harness.db.execute(
      sql`select count(*)::int as count, coalesce(sum(xp_earned), 0)::int as total
          from xp_logs where user_id = ${USER_A_ID}`,
    );
    expect(Number(completionCount.rows[0]?.count)).toBe(1);
    expect(Number(xpCount.rows[0]?.count)).toBe(1);
    expect(Number(xpCount.rows[0]?.total)).toBe(7);
  });

  it.each([0, -1, 1.5, 101])(
    "rejects invalid history limit %s before live querying",
    async (limit) => {
      await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);

      const error = await getHostProofGameCompletions({
        db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
        user: makeUser(USER_A_ID, SCHOOL_A_ID),
        tenant: makeTenant(SCHOOL_A_ID),
        input: { limit },
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HostProofCompletionError);
      expect((error as HostProofCompletionError).code).toBe(
        HOST_PROOF_ERROR_CODES.VALIDATION_FAILED,
      );
    },
  );

  it("maps a malformed persisted history row to HOST_PROOF_INTERNAL", async () => {
    await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);
    await seedCompletion(harness, {
      schoolId: SCHOOL_A_ID,
      userId: USER_A_ID,
      gameType: "astral-mage",
      activityId: "malformed-accuracy",
      createdAt: new Date("2026-07-28T00:00:00Z"),
      accuracy: 2,
    });

    const error = await getHostProofGameCompletions({
      db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
      user: makeUser(USER_A_ID, SCHOOL_A_ID),
      tenant: makeTenant(SCHOOL_A_ID),
    }).catch((caught: unknown) => caught);

    expectInternal(error);
  });
});
