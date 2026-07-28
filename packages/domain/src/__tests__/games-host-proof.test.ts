import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { EXISTING_CORE_HOST_PROOF_BINDINGS } from "@reading-advantage/game-contracts";
import type { GameCompletionInput } from "../games/contracts.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";

const mocks = vi.hoisted(() => ({
  assertCan: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/auth")>();
  return {
    ...actual,
    assertCan: mocks.assertCan,
    AuthError: class AuthError extends Error {
      code = "FORBIDDEN";
    },
  };
});

vi.mock("@reading-advantage/db/schema", () => ({
  xpLogs: {
    userId: "user_id",
    xpEarned: "xp_earned",
    activityId: "activity_id",
    activityType: "activity_type",
  },
  gameCompletions: {
    [Symbol.for("drizzle:Name")]: "game_completions",
    schoolId: "school_id",
    userId: "user_id",
    gameType: "game_type",
    difficulty: "difficulty",
    score: "score",
    accuracy: "accuracy",
    correctAnswers: "correct_answers",
    totalAttempts: "total_attempts",
    duration: "duration",
    victory: "victory",
    xpEarned: "xp_earned",
    activityId: "activity_id",
    clientTimestamp: "client_timestamp",
    metadata: "metadata",
    createdAt: "created_at",
  },
}));

import {
  HOST_PROOF_ERROR_CODES,
  HostProofCompletionError,
  getHostProofGameCompletions,
  hostProofCompletionRequestSchema,
  hostProofCompletionResponseSchema,
  hostProofErrorHttpStatus,
  listHostProofCartridgeBindings,
  recordHostProofGameCompletion,
} from "../games/host-proof.js";
import { AuthError } from "@reading-advantage/auth";
import * as gamesPublicBarrel from "../games/index.js";

const mockUser = {
  id: "user-1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const mockTenant = { schoolId: "school-1" };

const idempotencyKey = "11111111-1111-1111-1111-111111111111";

function makeValidInput(
  overrides: Partial<GameCompletionInput> = {},
): GameCompletionInput {
  return {
    gameType: "dragon-flight",
    difficulty: "medium",
    score: 500,
    accuracy: 5 / 6,
    correctAnswers: 5,
    totalAttempts: 6,
    duration: 12_345,
    victory: true,
    idempotencyKey,
    clientTimestamp: 1_700_000_000_000,
    ...overrides,
  };
}

function expectHostProofError(
  error: unknown,
  code: (typeof HOST_PROOF_ERROR_CODES)[keyof typeof HOST_PROOF_ERROR_CODES],
): HostProofCompletionError {
  expect(error).toBeInstanceOf(HostProofCompletionError);
  const hostProofError = error as HostProofCompletionError;
  expect(hostProofError.code).toBe(code);
  expect(hostProofError.httpStatus).toBe(hostProofErrorHttpStatus(code));
  return hostProofError;
}

beforeEach(() => {
  mocks.assertCan.mockReset();
});

describe("listHostProofCartridgeBindings (Task 5 binding parity)", () => {
  it("exposes exactly the shared five-cartridge contract", () => {
    const bindings = listHostProofCartridgeBindings();
    expect(bindings).toEqual(EXISTING_CORE_HOST_PROOF_BINDINGS);
    expect(bindings.map((binding) => binding.id)).toEqual([
      "dragon-flight",
      "magic-defense",
      "dungeon-liberator",
      "sorcerer-ziggurat",
      "astral-mage",
    ]);
  });
});

describe("hostProofCompletionRequestSchema (Task 5)", () => {
  it.each(EXISTING_CORE_HOST_PROOF_BINDINGS.map((binding) => binding.id))(
    "accepts the accepted cartridge %s",
    (gameType) => {
      const parsed = hostProofCompletionRequestSchema.parse(
        makeValidInput({ gameType }),
      );
      expect(parsed.gameType).toBe(gameType);
    },
  );

  it("rejects a canonical but non-host-proof gameType (haunted-library)", () => {
    expect(() =>
      hostProofCompletionRequestSchema.parse(
        makeValidInput({ gameType: "haunted-library" as never }),
      ),
    ).toThrow();
  });

  it("rejects client-supplied xp (server-authoritative XP defense)", () => {
    expect(() =>
      hostProofCompletionRequestSchema.parse(
        makeValidInput({ xp: 100 } as never),
      ),
    ).toThrow();
  });

  it("rejects unknown keys (strict transport)", () => {
    expect(() =>
      hostProofCompletionRequestSchema.parse(
        makeValidInput({ schoolId: "school-2" } as never),
      ),
    ).toThrow();
  });
});

describe("host-proof history input contract (Task 5 Gate C)", () => {
  it("is exported through the public games barrel", () => {
    expect(gamesPublicBarrel).toHaveProperty("hostProofHistoryInputSchema");
  });

  it.each([0, -1, 1.5, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid history limit %s",
    async (limit) => {
      const db = createMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

      const error = await getHostProofGameCompletions({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { limit },
      }).catch((caught: unknown) => caught);

      expectHostProofError(error, HOST_PROOF_ERROR_CODES.VALIDATION_FAILED);
      expect(db.select).not.toHaveBeenCalled();
    },
  );

  it("rejects unknown history input keys before querying", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: { limit: 10, schoolId: "school-2" },
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.VALIDATION_FAILED);
    expect(db.select).not.toHaveBeenCalled();
  });

  it.each([1, 100])("accepts bounded positive integer limit %s", async (limit) => {
    const db = createMockDb({ selectResults: [] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      getHostProofGameCompletions({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { limit },
      }),
    ).resolves.toEqual([]);
    expect(db.select).toHaveBeenCalledOnce();
  });
});

describe("recordHostProofGameCompletion (Task 5)", () => {
  it("rejects an unauthenticated caller with a structured 401", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: null,
      tenant: mockTenant,
      input: makeValidInput(),
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.UNAUTHENTICATED);
    expect(hostProofErrorHttpStatus(HOST_PROOF_ERROR_CODES.UNAUTHENTICATED)).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a malformed payload with a structured 400 carrying Zod issues", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: { gameType: "dragon-flight" },
    }).catch((caught: unknown) => caught);

    const hostProofError = expectHostProofError(
      error,
      HOST_PROOF_ERROR_CODES.VALIDATION_FAILED,
    );
    expect(hostProofError.httpStatus).toBe(400);
    expect(Array.isArray(hostProofError.issues)).toBe(true);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a canonical non-host-proof cartridge with a structured 404", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: makeValidInput({ gameType: "haunted-library" as never }),
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.UNKNOWN_CARTRIDGE);
    expect(hostProofErrorHttpStatus(HOST_PROOF_ERROR_CODES.UNKNOWN_CARTRIDGE)).toBe(404);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("fails closed when the server-derived tenant has no schoolId", async () => {
    const db = createMockDb();
    const tenantless = { schoolId: null };
    const tenantDb = createTenantDB(db as unknown as DB, tenantless);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: tenantless,
      input: makeValidInput(),
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.TENANT_REQUIRED);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a user/tenant school mismatch (cross-tenant attempt)", async () => {
    const db = createMockDb();
    const foreignTenant = { schoolId: "school-2" };
    const tenantDb = createTenantDB(db as unknown as DB, foreignTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: foreignTenant,
      input: makeValidInput(),
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.FORBIDDEN);
    expect(hostProofErrorHttpStatus(HOST_PROOF_ERROR_CODES.FORBIDDEN)).toBe(403);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("maps a permission denial from the domain function to a structured 403", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("lacks permission", "FORBIDDEN");
    });
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: makeValidInput(),
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.FORBIDDEN);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("records a first completion with server-authoritative XP and a validated result", async () => {
    const db = createMockDb({ selectResults: [] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);
    const input = makeValidInput();

    const result = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input,
    });

    expect(mocks.assertCan).toHaveBeenCalled();
    // XP earned: 7 = min(10, 5 + 1 + 1 + 0) — computed server-side; the
    // client supplied no xp field (the strict schema rejects one).
    expect(result.xpEarned).toBe(7);
    expect(result.duplicate).toBe(false);
    expect(result.status).toBe(200);
    expect(result.activityId).toBe(`game:dragon-flight:${idempotencyKey}`);
    expect(result.gameType).toBe("dragon-flight");
    expect(() => hostProofCompletionResponseSchema.parse(result)).not.toThrow();
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("returns duplicate: true with xpEarned: 0 for a repeated idempotency key", async () => {
    const expectedActivityId = `game:dragon-flight:${idempotencyKey}`;
    const db = createMockDb({
      selectSequence: [[], [{ activityId: expectedActivityId }]],
    });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const first = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: makeValidInput(),
    });
    const second = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: makeValidInput(),
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.xpEarned).toBe(0);
    expect(second.activityId).toBe(expectedActivityId);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("allows an ADMIN to record against a different server-derived school scope", async () => {
    const adminUser = { ...mockUser, role: "ADMIN" as const, schoolId: "school-1" };
    const foreignTenant = { schoolId: "school-2" };
    const db = createMockDb({ selectResults: [] });
    const tenantDb = createTenantDB(db as unknown as DB, foreignTenant);

    const result = await recordHostProofGameCompletion({
      db: tenantDb,
      user: adminUser,
      tenant: foreignTenant,
      input: makeValidInput(),
    });

    expect(result.duplicate).toBe(false);
  });

  it("maps an unexpected persistence failure to stable HOST_PROOF_INTERNAL", async () => {
    const db = createMockDb();
    db.select.mockImplementationOnce(() => {
      throw new Error("persistence unavailable");
    });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await recordHostProofGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: makeValidInput(),
    }).catch((caught: unknown) => caught);

    const hostProofError = expectHostProofError(
      error,
      HOST_PROOF_ERROR_CODES.INTERNAL,
    );
    expect(hostProofError.message).not.toContain("persistence unavailable");
  });
});

describe("getHostProofGameCompletions (Task 5 history/replay proof)", () => {
  const historyRow = {
    id: "completion-1",
    schoolId: "school-1",
    userId: "user-1",
    gameType: "dragon-flight",
    difficulty: "medium",
    score: 500,
    accuracy: 5 / 6,
    xpEarned: 7,
    activityId: `game:dragon-flight:${idempotencyKey}`,
    createdAt: new Date("2026-07-28T00:00:00Z"),
  };

  it("returns validated host-proof history entries", async () => {
    const db = createMockDb({ selectResults: [historyRow] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const completions = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
    });

    expect(completions).toHaveLength(1);
    expect(completions[0].activityId).toBe(historyRow.activityId);
    expect(completions[0].xpEarned).toBe(7);
    expect(completions[0].gameType).toBe("dragon-flight");
  });

  it("fails closed if persistence returns a row outside the SQL allowlist", async () => {
    const db = createMockDb({
      selectResults: [
        historyRow,
        { ...historyRow, id: "completion-2", gameType: "haunted-library" },
      ],
    });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.INTERNAL);
  });

  it("rejects a non-host-proof gameType filter with a structured 404", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: { gameType: "haunted-library" },
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.UNKNOWN_CARTRIDGE);
  });

  it("maps a read-permission denial to a structured 403", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("lacks permission", "FORBIDDEN");
    });
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
    }).catch((caught: unknown) => caught);

    expectHostProofError(error, HOST_PROOF_ERROR_CODES.FORBIDDEN);
  });

  it("maps an unexpected query failure to stable HOST_PROOF_INTERNAL", async () => {
    const db = createMockDb();
    db.select.mockImplementationOnce(() => {
      throw new Error("query unavailable");
    });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const error = await getHostProofGameCompletions({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
    }).catch((caught: unknown) => caught);

    const hostProofError = expectHostProofError(
      error,
      HOST_PROOF_ERROR_CODES.INTERNAL,
    );
    expect(hostProofError.message).not.toContain("query unavailable");
  });
});
