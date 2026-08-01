import { describe, expect, it, vi } from "vitest";

import type { TenantDB } from "../db-contract.js";
import { createDragonFlightHostProofAttemptStore } from "../games/dragon-flight-host-proof-store.js";

const replayClaimInput = Object.freeze({
  attemptId: "11111111-1111-4111-8111-111111111111",
  userId: "user-1",
  schoolId: "school-1",
  transcriptDigest: "a".repeat(64),
  expiresAt: "2026-08-01T00:10:00.000Z",
});

const storedCompletion = Object.freeze({
  xpEarned: 5,
  score: 100,
  accuracy: 1,
  correctAnswers: 1,
  totalAttempts: 1,
  duration: 700,
  victory: true,
  duplicate: false,
});

/** Read-only recovery result exposed by the durable attempt store. */
interface RecoveryLookupStore {
  /**
   * Finds an existing exact claim without creating, reclaiming, or updating it.
   * @param input Exact signed transcript claim to inspect.
   * @returns Missing, conflicting, pending, or completed replay state without mutation.
   */
  lookupRecovery(input: typeof replayClaimInput): Promise<
    | { kind: "missing" }
    | { kind: "conflict" }
    | { kind: "pending"; claimId: string }
    | {
      kind: "replay";
      result: {
        xpEarned: number;
        score: number;
        accuracy: number;
        correctAnswers: number;
        totalAttempts: number;
        duration: number;
        victory: boolean;
        duplicate: boolean;
      };
    }
  >;
}

/**
 * Obtains the non-mutating recovery lookup contract while preserving a clear
 * failure when the production store has not implemented it yet.
 * @param store Candidate durable attempt store.
 * @returns The bound recovery lookup operation.
 * @throws When the store lacks the required recovery lookup operation.
 */
function requireRecoveryLookup(store: unknown): RecoveryLookupStore["lookupRecovery"] {
  const candidate = (store as { lookupRecovery?: unknown }).lookupRecovery;
  if (typeof candidate !== "function") {
    throw new Error("Dragon Flight attempt store must provide lookupRecovery");
  }
  return candidate.bind(store) as RecoveryLookupStore["lookupRecovery"];
}

/** Controls one scripted durable-store database outcome without a real PostgreSQL connection. */
interface AttemptStoreDatabaseOperations {
  /** Records returned by lookup calls after the optional initial record. */
  readonly followupRecords?: readonly Record<string, unknown>[];
  /** Rows returned by an insert claim, including the empty conflict path. */
  readonly insertRows?: readonly { readonly id: string }[];
  /** Rows returned by update claims, completion writes, or abandoned reclaims. */
  readonly updateRows?: readonly { readonly id: string }[];
}

/**
 * Creates durable-attempt select, insert, and update seams with scripted outcomes.
 * @param record Existing durable record returned by the first lookup, if any.
 * @param operations Follow-up lookup, insert, and update outcomes for one test.
 * @returns The fake tenant database and operation spies.
 */
function createAttemptStoreDatabase(
  record?: Record<string, unknown>,
  operations: AttemptStoreDatabaseOperations = {},
): {
  readonly db: TenantDB;
  readonly select: ReturnType<typeof vi.fn>;
  readonly insert: ReturnType<typeof vi.fn>;
  readonly update: ReturnType<typeof vi.fn>;
  readonly set: ReturnType<typeof vi.fn>;
} {
  const records: Array<Record<string, unknown> | undefined> = [
    record,
    ...(operations.followupRecords ?? []),
  ];
  const limit = vi.fn(async () => {
    const next = records.shift();
    return next === undefined ? [] : [next];
  });
  const whereSelect = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: whereSelect }));
  const select = vi.fn(() => ({ from }));

  const insertRows = [...(operations.insertRows ?? [{ id: "attempt-row-1" }])];
  const insertReturning = vi.fn(async () => {
    const row = insertRows.shift();
    return row === undefined ? [] : [row];
  });
  const onConflictDoNothing = vi.fn(() => ({ returning: insertReturning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));

  const updateRows = [...(operations.updateRows ?? [{ id: "attempt-row-1" }])];
  const set = vi.fn(() => {
    const returning = vi.fn(async () => {
      const row = updateRows.shift();
      return row === undefined ? [] : [row];
    });
    const where = vi.fn(() => ({ returning }));
    return { where };
  });
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, insert, update } as unknown as TenantDB,
    select,
    insert,
    update,
    set,
  };
}

/**
 * Creates the completed durable record for an actor-bound transcript.
 * @param result Stored JSON completion candidate.
 * @returns A record shaped like the host-proof attempt lookup result.
 */
function completedAttemptRecord(result: Record<string, unknown>): Record<string, unknown> {
  return {
    userId: replayClaimInput.userId,
    schoolId: replayClaimInput.schoolId,
    transcriptDigest: replayClaimInput.transcriptDigest,
    expiresAt: new Date(replayClaimInput.expiresAt),
    status: "completed",
    result,
  };
}

describe("Dragon Flight host-proof durable attempt store", () => {
  it("persists the complete server-derived signed-attempt result", async () => {
    const { db, update, set } = createAttemptStoreDatabase();
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.complete("claim-1", storedCompletion)).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      status: "completed",
      completedAt: expect.any(Date),
      result: expect.objectContaining({ victory: true }),
    }));
  });

  it("round-trips victory from a completed durable result on an idempotent replay", async () => {
    const { db, select } = createAttemptStoreDatabase(completedAttemptRecord(storedCompletion));
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.begin(replayClaimInput)).resolves.toEqual({
      kind: "replay",
      result: { ...storedCompletion, duplicate: true },
    });
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("fails closed instead of replaying a completed result that lacks victory", async () => {
    const { db } = createAttemptStoreDatabase(completedAttemptRecord({
      xpEarned: 5,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      duplicate: false,
    }));
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.begin(replayClaimInput)).rejects.toThrow(/victory/u);
  });

  it("creates an atomic execution claim for a new actor-bound transcript", async () => {
    const { db, insert, select } = createAttemptStoreDatabase();
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.begin(replayClaimInput)).resolves.toEqual({
      kind: "execute",
      claimId: expect.any(String),
    });
    expect(select).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("reinspects and replays an immutable completed transcript after an insert conflict", async () => {
    const { db, insert, select } = createAttemptStoreDatabase(undefined, {
      insertRows: [],
      followupRecords: [completedAttemptRecord(storedCompletion)],
    });
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.begin(replayClaimInput)).resolves.toEqual({
      kind: "replay",
      result: { ...storedCompletion, duplicate: true },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("rejects transcript claims whose user, school, digest, or expiry differs", async () => {
    const variants = [
      { userId: "other-user" },
      { schoolId: "other-school" },
      { transcriptDigest: "b".repeat(64) },
      { expiresAt: new Date("2026-08-01T00:11:00.000Z") },
    ];

    for (const variant of variants) {
      const { db, insert } = createAttemptStoreDatabase({
        ...completedAttemptRecord(storedCompletion),
        ...variant,
      });
      const store = createDragonFlightHostProofAttemptStore(db);
      await expect(store.begin(replayClaimInput)).resolves.toEqual({ kind: "conflict" });
      expect(insert).not.toHaveBeenCalled();
    }
  });

  it("returns the existing claim for a matching pending transcript but conflicts on a different one", async () => {
    const pendingRecord = {
      ...completedAttemptRecord(storedCompletion),
      status: "pending",
      result: null,
      claimId: "claim-pending",
    };
    const matching = createAttemptStoreDatabase(pendingRecord);
    const matchingStore = createDragonFlightHostProofAttemptStore(matching.db);

    await expect(matchingStore.begin(replayClaimInput)).resolves.toEqual({
      kind: "recover",
      claimId: "claim-pending",
    });
    expect(matching.insert).not.toHaveBeenCalled();

    const different = createAttemptStoreDatabase({
      ...pendingRecord,
      transcriptDigest: "b".repeat(64),
    });
    const differentStore = createDragonFlightHostProofAttemptStore(different.db);
    await expect(differentStore.begin(replayClaimInput)).resolves.toEqual({ kind: "conflict" });
    expect(different.insert).not.toHaveBeenCalled();
  });

  it("looks up exact expired recovery claims without inserting, reclaiming, or updating", async () => {
    const pendingRecord = {
      ...completedAttemptRecord(storedCompletion),
      status: "pending",
      result: null,
      claimId: "claim-pending",
    };
    const pending = createAttemptStoreDatabase(pendingRecord);
    const pendingLookup = requireRecoveryLookup(
      createDragonFlightHostProofAttemptStore(pending.db),
    );
    await expect(pendingLookup(replayClaimInput)).resolves.toEqual({
      kind: "pending",
      claimId: "claim-pending",
    });
    expect(pending.insert).not.toHaveBeenCalled();
    expect(pending.update).not.toHaveBeenCalled();

    const completed = createAttemptStoreDatabase(completedAttemptRecord(storedCompletion));
    const completedLookup = requireRecoveryLookup(
      createDragonFlightHostProofAttemptStore(completed.db),
    );
    await expect(completedLookup(replayClaimInput)).resolves.toEqual({
      kind: "replay",
      result: { ...storedCompletion, duplicate: true },
    });
    expect(completed.insert).not.toHaveBeenCalled();
    expect(completed.update).not.toHaveBeenCalled();

    const missing = createAttemptStoreDatabase();
    const missingLookup = requireRecoveryLookup(
      createDragonFlightHostProofAttemptStore(missing.db),
    );
    await expect(missingLookup(replayClaimInput)).resolves.toEqual({ kind: "missing" });
    expect(missing.insert).not.toHaveBeenCalled();
    expect(missing.update).not.toHaveBeenCalled();

    const abandoned = createAttemptStoreDatabase({
      ...pendingRecord,
      status: "abandoned",
    });
    const abandonedLookup = requireRecoveryLookup(
      createDragonFlightHostProofAttemptStore(abandoned.db),
    );
    await expect(abandonedLookup(replayClaimInput)).resolves.toEqual({ kind: "conflict" });
    expect(abandoned.insert).not.toHaveBeenCalled();
    expect(abandoned.update).not.toHaveBeenCalled();

    for (const variant of [
      { userId: "foreign-user" },
      { schoolId: "foreign-school" },
      { transcriptDigest: "b".repeat(64) },
      { expiresAt: new Date("2026-08-01T00:11:00.000Z") },
    ]) {
      const divergent = createAttemptStoreDatabase({
        ...pendingRecord,
        ...variant,
      });
      const divergentLookup = requireRecoveryLookup(
        createDragonFlightHostProofAttemptStore(divergent.db),
      );
      await expect(divergentLookup(replayClaimInput)).resolves.toEqual({ kind: "conflict" });
      expect(divergent.insert).not.toHaveBeenCalled();
      expect(divergent.update).not.toHaveBeenCalled();
    }
  });

  it("reclaims an abandoned matching transcript but rejects a lost reclaim race", async () => {
    const abandonedRecord = {
      ...completedAttemptRecord(storedCompletion),
      status: "abandoned",
      result: null,
    };
    const reclaimed = createAttemptStoreDatabase(abandonedRecord);
    const reclaimedStore = createDragonFlightHostProofAttemptStore(reclaimed.db);

    await expect(reclaimedStore.begin(replayClaimInput)).resolves.toEqual({
      kind: "execute",
      claimId: expect.any(String),
    });
    expect(reclaimed.set).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      claimId: expect.any(String),
      completedAt: null,
    }));

    const lost = createAttemptStoreDatabase(abandonedRecord, { updateRows: [] });
    const lostStore = createDragonFlightHostProofAttemptStore(lost.db);
    await expect(lostStore.begin(replayClaimInput)).resolves.toEqual({ kind: "conflict" });
  });

  it("does not complete an inactive claim or persist an invalid completion shape", async () => {
    const inactive = createAttemptStoreDatabase(undefined, { updateRows: [] });
    const inactiveStore = createDragonFlightHostProofAttemptStore(inactive.db);
    await expect(inactiveStore.complete("lost-claim", storedCompletion)).rejects.toThrow(/no longer active/u);

    const invalid = createAttemptStoreDatabase();
    const invalidStore = createDragonFlightHostProofAttemptStore(invalid.db);
    await expect(invalidStore.complete("claim-1", {
      ...storedCompletion,
      victory: null,
    } as unknown as typeof storedCompletion)).rejects.toThrow();
    expect(invalid.update).not.toHaveBeenCalled();
  });

  it("accepts a lost completion race only when the stored immutable result matches", async () => {
    const matching = createAttemptStoreDatabase(completedAttemptRecord(storedCompletion), {
      updateRows: [],
    });
    const matchingStore = createDragonFlightHostProofAttemptStore(matching.db);

    await expect(matchingStore.complete("claim-race", storedCompletion)).resolves.toBeUndefined();
    expect(matching.update).toHaveBeenCalledTimes(1);
    expect(matching.select).toHaveBeenCalledTimes(1);

    const divergent = createAttemptStoreDatabase(completedAttemptRecord({
      ...storedCompletion,
      score: 999,
    }), { updateRows: [] });
    const divergentStore = createDragonFlightHostProofAttemptStore(divergent.db);

    await expect(divergentStore.complete("claim-race", storedCompletion)).rejects.toThrow(
      /no longer active/u,
    );
    expect(divergent.update).toHaveBeenCalledTimes(1);
    expect(divergent.select).toHaveBeenCalledTimes(1);
  });

  it("marks a pending execution claim abandoned without writing a result", async () => {
    const { db, set, update } = createAttemptStoreDatabase();
    const store = createDragonFlightHostProofAttemptStore(db);

    await expect(store.abandon?.("claim-1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ status: "abandoned" });
  });
});
