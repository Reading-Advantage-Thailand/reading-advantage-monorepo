import {
  masteryCalibrations,
  masteryCards,
  masteryCommits,
  masteryEvidence,
  masteryPlacements,
  masteryPrincipals,
  masteryReviews,
  masteryStates,
  schools,
  users,
} from "@reading-advantage/db";
import { count, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as tenantDbModule from "../db-contract.js";
import { createTestDb, type TestDb } from "./helpers/testDb.js";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const STUDENT_A = "mastery-student-a";
const STUDENT_A_2 = "mastery-student-a-2";
const STUDENT_B = "mastery-student-b";
const ACTOR_A = "mastery-teacher-a";
const ACTOR_B = "mastery-teacher-b";
const NOW = "2026-07-10T12:00:00.000Z";

type Tenant = { schoolId: string };
type PortableError = {
  code?: string;
  retryable?: boolean;
  message?: string;
};
type CommitResult = {
  status: "applied" | "replayed";
  commitId: string;
  resultDigest: string;
  cardRevision: number;
  stateRevision: number;
  recordIds: Record<string, string | string[]>;
};
type Snapshot = {
  cards: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  states: Array<Record<string, unknown>>;
  placements: Array<Record<string, unknown>>;
  calibrations: Array<Record<string, unknown>>;
  commits: Array<Record<string, unknown>>;
};
type DrizzleAdapter = {
  readSnapshot(input: { schoolId: string }): Promise<Snapshot>;
  commitMasteryEvidence(input: unknown): Promise<CommitResult>;
  approveMasteryCalibration(input: unknown): Promise<unknown>;
};
type DrizzleFactory = (options: {
  db: unknown;
  tenant: Tenant | null;
  actorId: string;
}) => DrizzleAdapter;

function uuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
}

function makeInput({
  seed = 1,
  schoolId = SCHOOL_A,
  studentId = STUDENT_A,
  actorId = ACTOR_A,
  cardId = uuid(101),
  stateId = uuid(104),
  objectiveId = "codecamp.skill.variables",
  variantKey = "codecamp.variant.variables-1",
  cardRevision = 0,
  stateRevision = 0,
  expectedCardRevision = null,
  expectedStateRevision = null,
}: {
  seed?: number;
  schoolId?: string;
  studentId?: string;
  actorId?: string;
  cardId?: string;
  stateId?: string;
  objectiveId?: string;
  variantKey?: string;
  cardRevision?: number;
  stateRevision?: number;
  expectedCardRevision?: number | null;
  expectedStateRevision?: number | null;
} = {}): Record<string, unknown> {
  const base = seed * 100;
  const provenance = {
    normativeSpecVersion: "kst-srs.v3.2",
    engineContractVersion: "srs.contract.v2",
    graphRelease: "codecamp.graph.v1",
    configVersion: "mastery.config.v3",
    paramsVersion: `fsrs-params.codecamp.secondary.v${seed}`,
    adapterVersion: "mastery.persistence.v1",
  };
  const audit = {
    actorId,
    requestId: `request-${seed}`,
    sourceId: `submission-${seed}`,
    correlationId: uuid(base + 11),
  };

  return {
    contractVersion: "mastery.persistence.v1",
    schoolId,
    studentId,
    idempotencyKey: uuid(base + 12),
    expectedRevisions: {
      card: expectedCardRevision,
      state: expectedStateRevision,
    },
    provenance,
    audit,
    records: {
      card: {
        id: cardId,
        schoolId,
        studentId,
        objectiveId,
        variantKey,
        state: "review",
        stability: 4.25,
        difficulty: 5.5,
        dueAt: "2026-07-12T12:00:00.000Z",
        lastReviewedAt: NOW,
        reps: cardRevision + 1,
        lapses: 0,
        revision: cardRevision,
        paramsVersion: provenance.paramsVersion,
        createdAt: NOW,
        updatedAt: NOW,
      },
      review: {
        id: uuid(base + 2),
        schoolId,
        cardId,
        studentId,
        submissionId: audit.sourceId,
        rating: "good",
        beforeState: "learning",
        afterState: "review",
        evidenceReasons: ["correct", "no-hint"],
        paramsVersion: provenance.paramsVersion,
        reviewedAt: NOW,
        createdAt: NOW,
      },
      evidence: [
        {
          id: uuid(base + 3),
          schoolId,
          studentId,
          objectiveId,
          variantKey,
          sourceId: audit.sourceId,
          evidenceOrdinal: 0,
          evidenceType: "practice_review",
          correctedStrength: 0.86,
          practiceCoverage: 0.75,
          confidence: 0.7,
          attemptCount: 4,
          supportMetadata: { revealSteps: 0, misconceptionTags: [] },
          provenance,
          createdAt: NOW,
        },
      ],
      state: {
        id: stateId,
        schoolId,
        studentId,
        objectiveId,
        masteryState: "practicing",
        mastery: 0.72,
        retention: 0.86,
        evidenceConfidence: 0.7,
        graphRelease: provenance.graphRelease,
        revision: stateRevision,
        createdAt: NOW,
        updatedAt: NOW,
      },
      placement: {
        id: uuid(base + 5),
        schoolId,
        studentId,
        objectiveId,
        estimate: 0.68,
        confidence: "medium",
        evidenceType: `two_probe_${seed}`,
        graphRelease: provenance.graphRelease,
        seedProvenance: provenance,
        replacedByDirectEvidence: false,
        createdAt: NOW,
      },
    },
  };
}

function makeCalibrationApproval(): Record<string, unknown> {
  return {
    contractVersion: "mastery.persistence.v1",
    schoolId: SCHOOL_A,
    idempotencyKey: "calibration:codecamp:secondary:v2",
    domain: "codecamp",
    ageBand: "secondary",
    artifact: {
      id: uuid(7001),
      paramsVersion: "fsrs-params.codecamp.secondary.v2",
      optimizerVersion: "deterministic-grid.v1",
      incumbentParamsVersion: "fsrs-params.codecamp.secondary.v1",
      weights: Array.from({ length: 19 }, (_, index) => index + 0.5),
      reviewCount: 12_000,
      studentCount: 400,
      trainingReviewCount: 9_000,
      holdoutReviewCount: 3_000,
      candidateMetrics: { logLoss: 0.31 },
      incumbentMetrics: { logLoss: 0.36 },
      volumeGatePassed: true,
      evaluationGatePassed: true,
      provenance: {
        engineVersion: "3.2.0",
        fsrsVersion: "6.1.1",
        calibrationVersion: "calibration-2026-07",
        policyVersion: "policy-2026-07",
        paramsVersion: "fsrs-params.codecamp.secondary.v2",
        algorithmVersion: "mastery-v3.2",
        optimizerVersion: "deterministic-grid.v1",
      },
    },
    approval: { approvedBy: ACTOR_A, approvedAt: NOW, decision: "approved" },
    audit: {
      actorId: ACTOR_A,
      requestId: "calibration-request-1",
      sourceId: "calibration-worker",
      correlationId: uuid(7002),
    },
  };
}

async function loadFactory(): Promise<DrizzleFactory> {
  const module = (await import(
    "../mastery/drizzle-mastery-persistence.js"
  )) as unknown as { createDrizzleMasteryPersistence: DrizzleFactory };
  return module.createDrizzleMasteryPersistence;
}

async function seedOwners(harness: TestDb): Promise<void> {
  await harness.db.insert(schools).values([
    { id: SCHOOL_A, name: "Mastery School A" },
    { id: SCHOOL_B, name: "Mastery School B" },
  ]);
  await harness.db.insert(users).values([
    {
      id: STUDENT_A,
      username: STUDENT_A,
      displayUsername: STUDENT_A,
      name: "Mastery Student A",
      schoolId: SCHOOL_A,
    },
    {
      id: STUDENT_A_2,
      username: STUDENT_A_2,
      displayUsername: STUDENT_A_2,
      name: "Mastery Student A 2",
      schoolId: SCHOOL_A,
    },
    {
      id: STUDENT_B,
      username: STUDENT_B,
      displayUsername: STUDENT_B,
      name: "Mastery Student B",
      schoolId: SCHOOL_B,
    },
  ]);
  await harness.db.insert(masteryPrincipals).values([
    { schoolId: SCHOOL_A, studentId: STUDENT_A, sourceTenantKey: SCHOOL_A },
    { schoolId: SCHOOL_A, studentId: STUDENT_A_2, sourceTenantKey: SCHOOL_A },
    { schoolId: SCHOOL_B, studentId: STUDENT_B, sourceTenantKey: SCHOOL_B },
  ]);
}

async function recordCounts(harness: TestDb): Promise<Record<string, number>> {
  const tables = {
    cards: masteryCards,
    reviews: masteryReviews,
    evidence: masteryEvidence,
    states: masteryStates,
    placements: masteryPlacements,
    calibrations: masteryCalibrations,
    commits: masteryCommits,
  } as const;
  const entries = await Promise.all(
    Object.entries(tables).map(async ([name, table]) => {
      const [row] = await harness.db.select({ value: count() }).from(table);
      return [name, Number(row?.value ?? 0)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function settle(operation: Promise<unknown>): Promise<{
  ok: boolean;
  error?: PortableError;
  value?: unknown;
}> {
  try {
    return { ok: true, value: await operation };
  } catch (error) {
    return { ok: false, error: error as PortableError };
  }
}

describe("Phase S3 remediation: bound Drizzle adapter adversarial contract", () => {
  let harness: TestDb;
  let factory: DrizzleFactory;

  beforeAll(async () => {
    harness = await createTestDb();
    factory = await loadFactory();
  }, 120_000);

  beforeEach(async () => {
    await harness.reset();
    await seedOwners(harness);
  });

  afterAll(async () => {
    await harness?.close();
  });

  it("rejects construction without a non-null authenticated tenant", () => {
    expect(() =>
      factory({ db: harness.db, tenant: null, actorId: ACTOR_A }),
    ).toThrow();
  });

  it("creates and caches a real TenantDB for all database execution", async () => {
    const createTenantDbSpy = vi.spyOn(tenantDbModule, "createTenantDB");
    try {
      const adapter = factory({
        db: harness.db,
        tenant: { schoolId: SCHOOL_A },
        actorId: ACTOR_A,
      });

      await adapter.readSnapshot({ schoolId: SCHOOL_A });
      await adapter.commitMasteryEvidence(makeInput());

      expect(createTenantDbSpy).toHaveBeenCalledTimes(1);
      expect(createTenantDbSpy).toHaveBeenCalledWith(harness.db, {
        schoolId: SCHOOL_A,
      });
    } finally {
      createTenantDbSpy.mockRestore();
    }
  });

  it("rejects a foreign-school read even when the caller supplies that school", async () => {
    await harness.db.insert(masteryCards).values({
      id: uuid(9001),
      schoolId: SCHOOL_B,
      studentId: STUDENT_B,
      objectiveId: "foreign.objective",
      variantKey: "foreign.variant",
      stability: 1,
      difficulty: 5,
      state: "review",
      dueDate: new Date(NOW),
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 1,
      lapses: 0,
      lastReview: new Date(NOW),
      paramsVersion: "fsrs-params.codecamp.secondary.v1",
      revision: 0,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    });
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });

    await expect(adapter.readSnapshot({ schoolId: SCHOOL_B })).rejects.toMatchObject({
      code: "TENANT_SCOPE_ERROR",
      retryable: false,
    });
  });

  it.each([
    [
      "foreign school",
      () => makeInput({ seed: 2, schoolId: SCHOOL_B, studentId: STUDENT_B }),
    ],
    [
      "foreign audit actor",
      () => makeInput({ seed: 3, actorId: ACTOR_B }),
    ],
  ])("rejects %s before any database mutation", async (_label, inputFactory) => {
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    const before = await recordCounts(harness);
    const outcome = await settle(adapter.commitMasteryEvidence(inputFactory()));
    const after = await recordCounts(harness);

    expect({ outcome, countsUnchanged: after }).toMatchObject({
      outcome: {
        ok: false,
        error: { code: "TENANT_SCOPE_ERROR", retryable: false },
      },
      countsUnchanged: before,
    });
  });

  it.each([
    [
      "student owner",
      { studentId: STUDENT_A_2, objectiveId: "codecamp.skill.variables" },
    ],
    [
      "natural key",
      {
        studentId: STUDENT_A,
        objectiveId: "codecamp.skill.functions",
        variantKey: "codecamp.variant.functions-1",
      },
    ],
  ])("does not let CAS retarget an existing card/state %s", async (_label, change) => {
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    await adapter.commitMasteryEvidence(makeInput());
    const before = await adapter.readSnapshot({ schoolId: SCHOOL_A });
    const changed = makeInput({
      seed: 4,
      cardId: uuid(101),
      stateId: uuid(104),
      studentId: change.studentId,
      objectiveId: change.objectiveId,
      variantKey: change.variantKey,
      cardRevision: 1,
      stateRevision: 1,
      expectedCardRevision: 0,
      expectedStateRevision: 0,
    });
    const outcome = await settle(adapter.commitMasteryEvidence(changed));
    const after = await adapter.readSnapshot({ schoolId: SCHOOL_A });

    expect({ outcome, unchanged: after }).toMatchObject({
      outcome: { ok: false, error: { retryable: false } },
      unchanged: before,
    });
  });

  it("writes a new card before its review and evidence foreign-key dependents", async () => {
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });

    await expect(adapter.commitMasteryEvidence(makeInput())).resolves.toMatchObject({
      status: "applied",
      cardRevision: 0,
      stateRevision: 0,
    });
    await expect(recordCounts(harness)).resolves.toEqual({
      cards: 1,
      reviews: 1,
      evidence: 1,
      states: 1,
      placements: 1,
      calibrations: 0,
      commits: 1,
    });
  });

  it("rolls back all prior writes when a later state write fails", async () => {
    await harness.db.execute(sql.raw(`
      CREATE FUNCTION fail_mastery_state_write() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'injected-mid-write-failure';
      END;
      $$ LANGUAGE plpgsql;
    `));
    await harness.db.execute(sql.raw(`
      CREATE TRIGGER mastery_state_write_failure
      BEFORE INSERT OR UPDATE ON mastery_states
      FOR EACH ROW EXECUTE FUNCTION fail_mastery_state_write();
    `));
    try {
      const adapter = factory({
        db: harness.db,
        tenant: { schoolId: SCHOOL_A },
        actorId: ACTOR_A,
      });
      await expect(adapter.commitMasteryEvidence(makeInput())).rejects.toBeInstanceOf(
        Error,
      );
      await expect(recordCounts(harness)).resolves.toEqual({
        cards: 0,
        reviews: 0,
        evidence: 0,
        states: 0,
        placements: 0,
        calibrations: 0,
        commits: 0,
      });
    } finally {
      await harness.db.execute(sql.raw(`
        DROP TRIGGER IF EXISTS mastery_state_write_failure ON mastery_states;
      `));
      await harness.db.execute(sql.raw(`
        DROP FUNCTION IF EXISTS fail_mastery_state_write();
      `));
    }
  });

  it("resolves actual identical concurrent calls as one applied and one replayed receipt", async () => {
    const firstAdapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    const secondAdapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    const input = makeInput();

    const [first, second] = await Promise.all([
      firstAdapter.commitMasteryEvidence(structuredClone(input)),
      secondAdapter.commitMasteryEvidence(structuredClone(input)),
    ]);

    expect([first.status, second.status].sort()).toEqual(["applied", "replayed"]);
    expect(second).toMatchObject({
      commitId: first.commitId,
      resultDigest: first.resultDigest,
      recordIds: first.recordIds,
      cardRevision: first.cardRevision,
      stateRevision: first.stateRevision,
    });
    expect((await recordCounts(harness)).commits).toBe(1);
    expect((await recordCounts(harness)).reviews).toBe(1);
  });

  it("returns a typed retryable stale-revision conflict without partial mutation", async () => {
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    await adapter.commitMasteryEvidence(makeInput());
    const before = await adapter.readSnapshot({ schoolId: SCHOOL_A });
    const stale = makeInput({
      seed: 5,
      cardId: uuid(101),
      stateId: uuid(104),
      cardRevision: 2,
      stateRevision: 2,
      expectedCardRevision: 1,
      expectedStateRevision: 1,
    });
    const outcome = await settle(adapter.commitMasteryEvidence(stale));

    expect(outcome).toMatchObject({
      ok: false,
      error: { code: "REVISION_CONFLICT", retryable: true },
    });
    expect(await adapter.readSnapshot({ schoolId: SCHOOL_A })).toEqual(before);
  });

  it("persists and replays a complete calibration artifact independently", async () => {
    const adapter = factory({
      db: harness.db,
      tenant: { schoolId: SCHOOL_A },
      actorId: ACTOR_A,
    });
    const input = makeCalibrationApproval();

    const first = await adapter.approveMasteryCalibration(input);
    const second = await adapter.approveMasteryCalibration(structuredClone(input));
    const snapshot = await adapter.readSnapshot({ schoolId: SCHOOL_A });

    expect(second).toEqual(first);
    expect(snapshot.calibrations).toHaveLength(1);
    expect(snapshot.calibrations[0]).toMatchObject({
      id: uuid(7001),
      schoolId: SCHOOL_A,
      artifact: {
        reviewCount: 12_000,
        trainingReviewCount: 9_000,
        holdoutReviewCount: 3_000,
        volumeGatePassed: true,
        evaluationGatePassed: true,
      },
      approval: { approvedBy: ACTOR_A, decision: "approved" },
    });
    expect((await recordCounts(harness)).calibrations).toBe(1);
    expect((await recordCounts(harness)).commits).toBe(0);
  });

  it.each([
    [
      "serialization exhaustion",
      { code: "40001" },
      "PERSISTENCE_UNAVAILABLE",
      true,
    ],
    [
      "connection refusal",
      { code: "ECONNREFUSED" },
      "PERSISTENCE_UNAVAILABLE",
      true,
    ],
    [
      "database timeout",
      { code: "ETIMEDOUT" },
      "PERSISTENCE_TIMEOUT",
      true,
    ],
    ["missing migration", { code: "42P01" }, "MISSING_MIGRATION", false],
    ["unexpected driver failure", { code: "XX999" }, "INTERNAL_ERROR", false],
  ])(
    "maps %s to a portable error taxonomy",
    async (_label, providerShape, expectedCode, retryable) => {
      const providerMessage = `provider-secret-${String(providerShape.code)}`;
      const providerError = Object.assign(new Error(providerMessage), providerShape);
      const faultingDb = {
        transaction: async () => {
          throw providerError;
        },
      };
      const adapter = factory({
        db: faultingDb,
        tenant: { schoolId: SCHOOL_A },
        actorId: ACTOR_A,
      });
      const outcome = await settle(adapter.commitMasteryEvidence(makeInput()));

      expect(outcome).toMatchObject({
        ok: false,
        error: { code: expectedCode, retryable },
      });
      expect(outcome.error?.message).not.toContain(providerMessage);
    },
  );
});
