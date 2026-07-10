import { describe, expect, it } from "vitest";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const STUDENT = "33333333-3333-4333-8333-333333333333";
const ACTOR = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-07-10T12:00:00.000Z";

type CommitInput = ReturnType<typeof makeCommitInput>;
type CommitResult = {
  status: "applied" | "replayed" | "no_evidence";
  commitId?: string;
  digest?: string;
  recordIds?: Readonly<Record<string, string>>;
  cardRevision?: number;
  stateRevision?: number;
};

interface StoredCommit extends CommitResult {
  schoolId: string;
  idempotencyKey: string;
  digest: string;
}

interface PersistenceState {
  cards: Map<string, Record<string, unknown>>;
  reviews: Map<string, Record<string, unknown>>;
  evidence: Map<string, Record<string, unknown>>;
  states: Map<string, Record<string, unknown>>;
  commits: Map<string, StoredCommit>;
  calibrations: Map<string, Record<string, unknown>>;
}

interface TransactionPort {
  findCommit(schoolId: string, idempotencyKey: string): Promise<StoredCommit | null>;
  insertEvidence(record: Record<string, unknown>): Promise<void>;
  appendReview(record: Record<string, unknown>): Promise<void>;
  compareAndSwapCard(record: Record<string, unknown>, expectedRevision: number): Promise<number>;
  compareAndSwapState(record: Record<string, unknown>, expectedRevision: number): Promise<number>;
  insertCommit(record: StoredCommit): Promise<void>;
  insertCalibration(record: Record<string, unknown>): Promise<void>;
}

interface PersistencePort {
  transaction<T>(
    operation: (tx: TransactionPort) => Promise<T>,
    options?: { isolationLevel?: "serializable" },
  ): Promise<T>;
}

interface PublicPersistenceApi {
  commitMasteryEvidence(
    input: unknown,
    dependencies: {
      persistence: PersistencePort;
      clock: () => string;
      idFactory: (kind: "commit" | "evidence" | "review") => string;
    },
  ): Promise<CommitResult>;
  approveMasteryCalibration(
    input: unknown,
    dependencies: {
      persistence: PersistencePort;
      clock: () => string;
      idFactory: (kind: "calibration") => string;
    },
  ): Promise<{ calibrationId: string; status: "approved" }>;
  commitMasteryEvidenceInputSchema: { parse(value: unknown): CommitInput };
  masteryCalibrationApprovalInputSchema: { parse(value: unknown): unknown };
}

/** Error emitted by the transactional double for an optimistic-lock miss. */
class StaleMasteryRevisionError extends Error {
  readonly code = "STALE_MASTERY_REVISION";
  readonly retryable = true;
}

function cloneState(state: PersistenceState): PersistenceState {
  return {
    cards: new Map([...state.cards].map(([key, value]) => [key, structuredClone(value)])),
    reviews: new Map([...state.reviews].map(([key, value]) => [key, structuredClone(value)])),
    evidence: new Map([...state.evidence].map(([key, value]) => [key, structuredClone(value)])),
    states: new Map([...state.states].map(([key, value]) => [key, structuredClone(value)])),
    commits: new Map([...state.commits].map(([key, value]) => [key, structuredClone(value)])),
    calibrations: new Map(
      [...state.calibrations].map(([key, value]) => [key, structuredClone(value)]),
    ),
  };
}

/** Serializable transactional double with rollback, uniqueness, and CAS behavior. */
class TransactionalPersistenceDouble implements PersistencePort {
  state: PersistenceState = {
    cards: new Map(),
    reviews: new Map(),
    evidence: new Map(),
    states: new Map(),
    commits: new Map(),
    calibrations: new Map(),
  };
  transactionsOpened = 0;
  transactionsCommitted = 0;
  failAfterWrite: number | null = null;
  private transactionTail: Promise<void> = Promise.resolve();

  async transaction<T>(operation: (tx: TransactionPort) => Promise<T>): Promise<T> {
    let resolveTurn: () => void = () => undefined;
    const turn = new Promise<void>((resolve) => {
      resolveTurn = resolve;
    });
    const previous = this.transactionTail;
    this.transactionTail = previous.then(() => turn, () => turn);
    await previous;
    this.transactionsOpened += 1;
    const draft = cloneState(this.state);
    let writes = 0;
    const afterWrite = () => {
      writes += 1;
      if (this.failAfterWrite === writes) throw new Error("injected-mid-transaction-failure");
    };
    const tx: TransactionPort = {
      findCommit: async (schoolId, idempotencyKey) =>
        draft.commits.get(`${schoolId}:${idempotencyKey}`) ?? null,
      insertEvidence: async (record) => {
        draft.evidence.set(String(record.id), structuredClone(record));
        afterWrite();
      },
      appendReview: async (record) => {
        draft.reviews.set(String(record.id), structuredClone(record));
        afterWrite();
      },
      compareAndSwapCard: async (record, expectedRevision) => {
        const key = String(record.id);
        const current = draft.cards.get(key);
        const revision = Number(current?.revision ?? 0);
        if (revision !== expectedRevision) throw new StaleMasteryRevisionError("stale card");
        const nextRevision = revision + 1;
        draft.cards.set(key, { ...structuredClone(record), revision: nextRevision });
        afterWrite();
        return nextRevision;
      },
      compareAndSwapState: async (record, expectedRevision) => {
        const key = String(record.id);
        const current = draft.states.get(key);
        const revision = Number(current?.revision ?? 0);
        if (revision !== expectedRevision) throw new StaleMasteryRevisionError("stale state");
        const nextRevision = revision + 1;
        draft.states.set(key, { ...structuredClone(record), revision: nextRevision });
        afterWrite();
        return nextRevision;
      },
      insertCommit: async (record) => {
        const key = `${record.schoolId}:${record.idempotencyKey}`;
        if (draft.commits.has(key)) throw new Error("MASTERY_COMMIT_UNIQUE_CONFLICT");
        draft.commits.set(key, structuredClone(record));
        afterWrite();
      },
      insertCalibration: async (record) => {
        draft.calibrations.set(String(record.id), structuredClone(record));
        afterWrite();
      },
    };

    try {
      const result = await operation(tx);
      this.state = draft;
      this.transactionsCommitted += 1;
      return result;
    } finally {
      resolveTurn();
    }
  }

  mutationCount(): number {
    return (
      this.state.cards.size +
      this.state.reviews.size +
      this.state.evidence.size +
      this.state.states.size +
      this.state.commits.size +
      this.state.calibrations.size
    );
  }
}

function makeCommitInput(overrides: Record<string, unknown> = {}) {
  return {
    schoolId: SCHOOL_A,
    studentId: STUDENT,
    idempotencyKey: "55555555-5555-4555-8555-555555555555",
    audit: {
      actorId: ACTOR,
      requestId: "request-001",
      source: "practice_submission",
      occurredAt: NOW,
    },
    versions: {
      contractVersion: "srs.contract.v2",
      graphRelease: "codecamp.graph.v1",
      paramsVersion: "fsrs.codecamp.primary.v1",
    },
    expectedRevisions: { card: 0, state: 0 },
    evidence: [
      {
        id: "evidence-001",
        schoolId: SCHOOL_A,
        studentId: STUDENT,
        objectiveId: "codecamp.skill.variables",
        variantKey: "codecamp.variant.variables-1",
        sourceId: "submission-001",
        evidenceOrdinal: 0,
        evidenceType: "direct",
        validated: true,
        correctedStrength: 0.8,
        coverage: 1,
        confidence: 0.8,
        attempts: 1,
      },
    ],
    card: {
      id: "card-001",
      schoolId: SCHOOL_A,
      studentId: STUDENT,
      objectiveId: "codecamp.skill.variables",
      variantKey: "codecamp.variant.variables-1",
      revision: 0,
    },
    review: {
      id: "review-001",
      schoolId: SCHOOL_A,
      studentId: STUDENT,
      cardId: "card-001",
      submissionId: "submission-001",
      reviewedAt: NOW,
    },
    state: {
      id: "state-001",
      schoolId: SCHOOL_A,
      studentId: STUDENT,
      objectiveId: "codecamp.skill.variables",
      revision: 0,
      mastery: 0.8,
      retention: 0.8,
    },
    ...overrides,
  };
}

function makeDependencies(persistence: TransactionalPersistenceDouble) {
  const ids = { commit: "commit-001", evidence: "evidence-001", review: "review-001" };
  return {
    persistence,
    clock: () => NOW,
    idFactory: (kind: keyof typeof ids) => ids[kind],
  };
}

async function loadPublicApi(): Promise<PublicPersistenceApi> {
  const domain = (await import("../index.js")) as Partial<PublicPersistenceApi>;
  expect(domain.commitMasteryEvidence, "public commitMasteryEvidence export").toBeTypeOf(
    "function",
  );
  expect(domain.approveMasteryCalibration, "public calibration approval export").toBeTypeOf(
    "function",
  );
  expect(
    domain.commitMasteryEvidenceInputSchema,
    "public commit input schema export",
  ).toBeDefined();
  expect(
    domain.masteryCalibrationApprovalInputSchema,
    "public calibration input schema export",
  ).toBeDefined();
  return domain as PublicPersistenceApi;
}

describe("Phase S3 mastery persistence transaction orchestration", () => {
  it("strictly validates audit, versions, unknown keys, and nested school ownership", async () => {
    const api = await loadPublicApi();
    expect(() => api.commitMasteryEvidenceInputSchema.parse(makeCommitInput())).not.toThrow();
    expect(() =>
      api.commitMasteryEvidenceInputSchema.parse(makeCommitInput({ unexpected: true })),
    ).toThrow();
    expect(() =>
      api.commitMasteryEvidenceInputSchema.parse(
        makeCommitInput({ audit: { actorId: ACTOR, requestId: "", source: "" } }),
      ),
    ).toThrow();
    expect(() =>
      api.commitMasteryEvidenceInputSchema.parse(
        makeCommitInput({
          versions: { contractVersion: "v1", graphRelease: "", paramsVersion: "" },
        }),
      ),
    ).toThrow();
    const foreignEvidence = makeCommitInput().evidence.map((record) => ({
      ...record,
      schoolId: SCHOOL_B,
    }));
    expect(() =>
      api.commitMasteryEvidenceInputSchema.parse(
        makeCommitInput({ evidence: foreignEvidence }),
      ),
    ).toThrow();
  }, 30_000);

  it("commits a successful evidence bundle in exactly one serializable transaction", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const result = await api.commitMasteryEvidence(
      makeCommitInput(),
      makeDependencies(persistence),
    );
    expect(result.status).toBe("applied");
    expect(persistence.transactionsOpened).toBe(1);
    expect(persistence.transactionsCommitted).toBe(1);
    expect(persistence.state.cards.size).toBe(1);
    expect(persistence.state.reviews.size).toBe(1);
    expect(persistence.state.evidence.size).toBe(1);
    expect(persistence.state.states.size).toBe(1);
    expect(persistence.state.commits.size).toBe(1);
  });

  it("returns a stable replay for an identical idempotent retry", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const first = await api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence));
    const countsAfterFirst = persistence.mutationCount();
    const second = await api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence));
    expect(second).toMatchObject({
      status: "replayed",
      commitId: first.commitId,
      digest: first.digest,
      recordIds: first.recordIds,
      cardRevision: first.cardRevision,
      stateRevision: first.stateRevision,
    });
    expect(persistence.mutationCount()).toBe(countsAfterFirst);
  });

  it("rejects the same idempotency key with a different digest without mutation", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    await api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence));
    const count = persistence.mutationCount();
    const changedEvidence = makeCommitInput().evidence.map((record) => ({
      ...record,
      correctedStrength: 0.4,
    }));
    await expect(
      api.commitMasteryEvidence(
        makeCommitInput({ evidence: changedEvidence }),
        makeDependencies(persistence),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_DIGEST_CONFLICT" });
    expect(persistence.mutationCount()).toBe(count);
  });

  it("serializes concurrent duplicates so exactly one applies and both share a receipt", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const [first, second] = await Promise.all([
      api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence)),
      api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence)),
    ]);
    expect([first.status, second.status].sort()).toEqual(["applied", "replayed"]);
    expect(second.commitId).toBe(first.commitId);
    expect(second.digest).toBe(first.digest);
    expect(persistence.state.commits.size).toBe(1);
    expect(persistence.state.reviews.size).toBe(1);
  });

  it("surfaces stale optimistic revisions as retryable and rolls back", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    persistence.state.states.set("state-001", { id: "state-001", revision: 1 });
    await expect(
      api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence)),
    ).rejects.toMatchObject({ code: "STALE_MASTERY_REVISION", retryable: true });
    expect(persistence.state.evidence.size).toBe(0);
    expect(persistence.state.reviews.size).toBe(0);
    expect(persistence.state.commits.size).toBe(0);
  });

  it("fails cross-school nested writes before opening a transaction", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    await expect(
      api.commitMasteryEvidence(
        makeCommitInput({ card: { ...makeCommitInput().card, schoolId: SCHOOL_B } }),
        makeDependencies(persistence),
      ),
    ).rejects.toThrow();
    expect(persistence.transactionsOpened).toBe(0);
    expect(persistence.mutationCount()).toBe(0);
  });

  it("fails missing audit metadata before opening a transaction", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    await expect(
      api.commitMasteryEvidence(makeCommitInput({ audit: undefined }), makeDependencies(persistence)),
    ).rejects.toThrow();
    expect(persistence.transactionsOpened).toBe(0);
    expect(persistence.mutationCount()).toBe(0);
  });

  it("rolls back every record after an injected mid-transaction failure", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    persistence.failAfterWrite = 2;
    await expect(
      api.commitMasteryEvidence(makeCommitInput(), makeDependencies(persistence)),
    ).rejects.toThrow("injected-mid-transaction-failure");
    expect(persistence.transactionsOpened).toBe(1);
    expect(persistence.transactionsCommitted).toBe(0);
    expect(persistence.mutationCount()).toBe(0);
  });

  it.each([
    ["absent", undefined],
    ["empty", []],
  ])("returns no_evidence for %s evidence without opening a transaction", async (_label, evidence) => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const result = await api.commitMasteryEvidence(
      makeCommitInput({ evidence }),
      makeDependencies(persistence),
    );
    expect(result).toEqual({ status: "no_evidence" });
    expect(persistence.transactionsOpened).toBe(0);
    expect(persistence.mutationCount()).toBe(0);
  });

  it("rejects unvalidated evidence without opening a transaction", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const evidence = makeCommitInput().evidence.map((record) => ({
      ...record,
      validated: false,
    }));
    await expect(
      api.commitMasteryEvidence(makeCommitInput({ evidence }), makeDependencies(persistence)),
    ).rejects.toThrow();
    expect(persistence.transactionsOpened).toBe(0);
    expect(persistence.mutationCount()).toBe(0);
  });

  it("persists an approved calibration independently of learner evidence mutation", async () => {
    const api = await loadPublicApi();
    const persistence = new TransactionalPersistenceDouble();
    const result = await api.approveMasteryCalibration(
      {
        schoolId: SCHOOL_A,
        domain: "codecamp",
        ageBand: "secondary",
        paramsVersion: "fsrs.codecamp.secondary.v2",
        optimizerVersion: "optimizer.v1",
        incumbentVersion: "fsrs.codecamp.secondary.v1",
        reviewCount: 12_000,
        studentCount: 120,
        holdoutLogLoss: 0.4,
        incumbentLogLoss: 0.45,
        approvedBy: ACTOR,
        approvedAt: NOW,
        audit: { actorId: ACTOR, requestId: "request-calibration", source: "human_release" },
      },
      {
        persistence,
        clock: () => NOW,
        idFactory: () => "calibration-001",
      },
    );
    expect(result).toEqual({ calibrationId: "calibration-001", status: "approved" });
    expect(persistence.state.calibrations.size).toBe(1);
    expect(persistence.state.cards.size).toBe(0);
    expect(persistence.state.reviews.size).toBe(0);
    expect(persistence.state.evidence.size).toBe(0);
    expect(persistence.state.states.size).toBe(0);
    expect(persistence.state.commits.size).toBe(0);
  });
});
