import { describe, expect, it } from "vitest";

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const CARD_ID = "22222222-2222-4222-8222-222222222222";
const REVIEW_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_ID = "44444444-4444-4444-8444-444444444444";
const STATE_ID = "55555555-5555-4555-8555-555555555555";
const PLACEMENT_ID = "66666666-6666-4666-8666-666666666666";
const CALIBRATION_ID = "77777777-7777-4777-8777-777777777777";
const COMMIT_ID = "88888888-8888-4888-8888-888888888888";
const REQUEST_DIGEST = `sha256:${"a".repeat(64)}`;
const RESULT_DIGEST = `sha256:${"b".repeat(64)}`;
const NOW = "2026-07-10T05:00:00.000Z";

type RuntimeSchema = {
  safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: unknown };
};

type PersistenceAdapter = {
  approveMasteryCalibration?: (input: unknown) => Promise<unknown>;
  commitMasteryEvidence: (input: unknown) => Promise<unknown>;
  readSnapshot: (query: unknown) => Promise<unknown>;
};

type MasteryModule = Record<string, unknown> & {
  MasteryPersistenceError: new (
    code: string,
    message: string,
    options?: { retryable: boolean },
  ) => Error & { code: string; retryable?: boolean };
  commitMasteryEvidenceInputSchema: RuntimeSchema & {
    constructor: { name: string };
  };
  createDrizzleMasteryPersistence: (options: { db: unknown }) => PersistenceAdapter;
  createInMemoryMasteryPersistence: () => PersistenceAdapter;
  masteryAuditSchema: RuntimeSchema;
  masteryCalibrationApprovalInputSchema: RuntimeSchema;
  masteryCalibrationRecordSchema: RuntimeSchema;
  masteryCardRecordSchema: RuntimeSchema;
  masteryCommitRecordSchema: RuntimeSchema;
  masteryEvidenceRecordSchema: RuntimeSchema;
  masteryPlacementRecordSchema: RuntimeSchema;
  masteryReviewRecordSchema: RuntimeSchema;
  masteryStateRecordSchema: RuntimeSchema;
};

async function loadMastery(): Promise<MasteryModule> {
  return (await import("../mastery/index.js")) as MasteryModule;
}

function makePersistenceCommand(): Record<string, unknown> {
  const provenance = {
    normativeSpecVersion: "kst-srs.v3.2",
    engineContractVersion: "srs.contract.v2",
    graphRelease: "reading.graph.v7",
    configVersion: "mastery.config.v3",
    paramsVersion: "fsrs-params.reading.secondary.v2",
    adapterVersion: "mastery.persistence.v1",
  };
  const audit = {
    actorId: "teacher:opaque-alpha",
    requestId: "request-alpha",
    sourceId: "submission-alpha",
    correlationId: "correlation-alpha",
  };

  return {
    contractVersion: "mastery.persistence.v1",
    schoolId: SCHOOL_ID,
    studentId: "firebase:student-alpha",
    idempotencyKey: "review-session:alpha:1",
    requestDigest: REQUEST_DIGEST,
    expectedRevisions: {
      card: null,
      state: null,
    },
    provenance,
    audit,
    records: {
      card: {
        id: CARD_ID,
        schoolId: SCHOOL_ID,
        studentId: "firebase:student-alpha",
        objectiveId: "vocabulary.context",
        variantKey: "recognition",
        state: "review",
        stability: 4.5,
        difficulty: 5.25,
        dueAt: "2026-07-11T05:00:00.000Z",
        lastReviewedAt: NOW,
        reps: 4,
        lapses: 1,
        revision: 0,
        paramsVersion: provenance.paramsVersion,
        createdAt: NOW,
        updatedAt: NOW,
      },
      review: {
        id: REVIEW_ID,
        schoolId: SCHOOL_ID,
        studentId: "firebase:student-alpha",
        cardId: CARD_ID,
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
          id: EVIDENCE_ID,
          schoolId: SCHOOL_ID,
          studentId: "firebase:student-alpha",
          objectiveId: "vocabulary.context",
          variantKey: "recognition",
          sourceId: audit.sourceId,
          evidenceOrdinal: 0,
          evidenceType: "practice_review",
          correctedStrength: 0.75,
          practiceCoverage: 0.8,
          confidence: 0.7,
          attemptCount: 4,
          supportMetadata: { revealSteps: 0, misconceptionTags: [] },
          provenance,
          createdAt: NOW,
        },
      ],
      state: {
        id: STATE_ID,
        schoolId: SCHOOL_ID,
        studentId: "firebase:student-alpha",
        objectiveId: "vocabulary.context",
        masteryState: "practicing",
        mastery: 0.71,
        retention: 0.8,
        evidenceConfidence: 0.7,
        graphRelease: provenance.graphRelease,
        revision: 0,
        updatedAt: NOW,
        createdAt: NOW,
      },
      placement: {
        id: PLACEMENT_ID,
        schoolId: SCHOOL_ID,
        studentId: "firebase:student-alpha",
        objectiveId: "vocabulary.context",
        estimate: 0.68,
        confidence: "medium",
        evidenceType: "two_probe",
        graphRelease: provenance.graphRelease,
        seedProvenance: provenance,
        replacedByDirectEvidence: false,
        createdAt: NOW,
      },
      calibration: {
        id: CALIBRATION_ID,
        schoolId: SCHOOL_ID,
        domain: "reading",
        ageBand: "middle",
        paramsVersion: provenance.paramsVersion,
        optimizerVersion: "optimizer-1",
        incumbentParamsVersion: "fsrs-params.reading.secondary.v1",
        weights: [0.4, 0.35, 0.25],
        volumeGatePassed: true,
        evaluationGatePassed: true,
        humanReleaseApproved: true,
        provenance,
        createdAt: NOW,
      },
    },
  };
}

function makeCommitRecord(): Record<string, unknown> {
  const command = makePersistenceCommand();
  return {
    id: COMMIT_ID,
    schoolId: SCHOOL_ID,
    studentId: command.studentId,
    idempotencyKey: command.idempotencyKey,
    contractVersion: command.contractVersion,
    requestDigest: REQUEST_DIGEST,
    resultDigest: RESULT_DIGEST,
    status: "applied",
    cardRevision: 0,
    stateRevision: 0,
    recordIds: {
      card: CARD_ID,
      review: REVIEW_ID,
      evidence: [EVIDENCE_ID],
      state: STATE_ID,
      placement: PLACEMENT_ID,
      calibration: CALIBRATION_ID,
    },
    provenance: command.provenance,
    audit: command.audit,
    createdAt: NOW,
  };
}

function makeCalibrationApproval(): Record<string, unknown> {
  return {
    contractVersion: "mastery.persistence.v1",
    schoolId: SCHOOL_ID,
    idempotencyKey: "calibration:reading:middle:2026-07",
    domain: "reading",
    ageBand: "middle",
    artifact: {
      id: CALIBRATION_ID,
      paramsVersion: "params-2026-07",
      optimizerVersion: "optimizer-1",
      incumbentParamsVersion: "params-2026-06",
      weights: [0.4, 0.35, 0.25],
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
        paramsVersion: "params-2026-07",
        algorithmVersion: "mastery-v3.2",
        optimizerVersion: "optimizer-1",
      },
    },
    approval: {
      approvedBy: "teacher:opaque-alpha",
      approvedAt: NOW,
      decision: "approved",
    },
    audit: {
      actorId: "teacher:opaque-alpha",
      requestId: "calibration-request-alpha",
      sourceId: "calibration-worker",
      correlationId: "calibration-correlation-alpha",
    },
  };
}

describe("mastery persistence remediation contract", () => {
  it("keeps known-good record controls valid before tightening identity rules", async () => {
    const mastery = await loadMastery();
    const command = makePersistenceCommand();
    const records = command.records as Record<string, unknown>;
    const evidence = records.evidence as unknown[];
    const controls: Array<[RuntimeSchema, unknown]> = [
      [mastery.masteryCardRecordSchema, records.card],
      [mastery.masteryReviewRecordSchema, records.review],
      [mastery.masteryEvidenceRecordSchema, evidence[0]],
      [mastery.masteryStateRecordSchema, records.state],
      [mastery.masteryPlacementRecordSchema, records.placement],
      [mastery.masteryCalibrationRecordSchema, records.calibration],
      [mastery.masteryCommitRecordSchema, makeCommitRecord()],
    ];

    for (const [schema, record] of controls) {
      expect(schema.safeParse(record).success).toBe(true);
    }
    expect(mastery.masteryAuditSchema.safeParse(command.audit).success).toBe(true);
  });

  it("exposes one non-union public schema and refuses a caller-asserted digest", async () => {
    const mastery = await loadMastery();
    const command = makePersistenceCommand();
    const canonicalCommand = { ...command };
    delete canonicalCommand.requestDigest;

    expect(mastery.commitMasteryEvidenceInputSchema.constructor.name).not.toBe(
      "ZodUnion",
    );
    expect(
      mastery.commitMasteryEvidenceInputSchema.safeParse(canonicalCommand).success,
    ).toBe(true);
    expect(
      mastery.commitMasteryEvidenceInputSchema.safeParse(command).success,
    ).toBe(false);
    expect(mastery.masteryPersistenceCommitInputSchema).toBeUndefined();
    expect(mastery.masteryEvidenceCommitInputSchema).toBeUndefined();
  });

  it("derives canonical payload identity so a changed payload cannot replay under a caller digest", async () => {
    const mastery = await loadMastery();
    const adapter = mastery.createInMemoryMasteryPersistence();
    const first = makePersistenceCommand();
    const identical = structuredClone(first);
    const changed = structuredClone(first);
    const changedRecords = changed.records as Record<string, unknown>;
    const changedEvidence = changedRecords.evidence as Array<Record<string, unknown>>;
    changedEvidence[0].correctedStrength = 0.34;

    await expect(adapter.commitMasteryEvidence(first)).resolves.toMatchObject({
      status: "applied",
      resultDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    await expect(adapter.commitMasteryEvidence(identical)).resolves.toMatchObject({
      status: "replayed",
    });
    await expect(adapter.commitMasteryEvidence(changed)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      retryable: false,
    });
  });

  it("enforces UUID parity for persisted school and record identifiers while preserving opaque actor and student IDs", async () => {
    const mastery = await loadMastery();
    const command = makePersistenceCommand();
    const records = command.records as Record<string, Record<string, unknown>>;
    const evidence = records.evidence as unknown as Array<Record<string, unknown>>;
    const recordFixtures: Record<string, Record<string, unknown>> = {
      ...records,
      evidence: evidence[0],
      commit: makeCommitRecord(),
    };
    const schemas: Array<[string, RuntimeSchema]> = [
      ["card", mastery.masteryCardRecordSchema],
      ["review", mastery.masteryReviewRecordSchema],
      ["evidence", mastery.masteryEvidenceRecordSchema],
      ["state", mastery.masteryStateRecordSchema],
      ["placement", mastery.masteryPlacementRecordSchema],
      ["calibration", mastery.masteryCalibrationRecordSchema],
      ["commit", mastery.masteryCommitRecordSchema],
    ];

    for (const [name, schema] of schemas) {
      expect.soft(
        schema.safeParse({ ...recordFixtures[name], id: `${name}-not-a-uuid` })
          .success,
        `${name}.id must match the PostgreSQL UUID column`,
      ).toBe(false);
      expect.soft(
        schema.safeParse({
          ...recordFixtures[name],
          schoolId: "school-not-a-uuid",
        }).success,
        `${name}.schoolId must match the PostgreSQL UUID column`,
      ).toBe(false);
    }

    expect(
      mastery.masteryCardRecordSchema.safeParse({
        ...recordFixtures.card,
        studentId: "firebase:opaque-student-id",
      }).success,
    ).toBe(true);
    expect(
      mastery.masteryAuditSchema.safeParse({
        ...(command.audit as object),
        actorId: "service-account:opaque-actor-id",
      }).success,
    ).toBe(true);
  });

  it("requires both adapters to implement the same high-level observable port", async () => {
    const mastery = await loadMastery();
    const memory = mastery.createInMemoryMasteryPersistence();
    const drizzle = mastery.createDrizzleMasteryPersistence({ db: {} });

    for (const adapter of [memory, drizzle]) {
      expect(typeof adapter.readSnapshot).toBe("function");
      expect(typeof adapter.commitMasteryEvidence).toBe("function");
      expect(typeof adapter.approveMasteryCalibration).toBe("function");
    }
  });

  it("accepts a complete calibration artifact with volume, evaluation, provenance, and approval evidence", async () => {
    const mastery = await loadMastery();
    expect(
      mastery.masteryCalibrationApprovalInputSchema.safeParse(
        makeCalibrationApproval(),
      ).success,
    ).toBe(true);
  });

  it("rejects zero-volume, regressing, gate-failing, and actor-mismatched calibration approvals", async () => {
    const mastery = await loadMastery();
    const schema = mastery.masteryCalibrationApprovalInputSchema;
    const valid = makeCalibrationApproval();

    expect(schema.safeParse(valid).success).toBe(true);

    const zeroVolume = structuredClone(valid);
    (zeroVolume.artifact as Record<string, unknown>).reviewCount = 0;

    const regressing = structuredClone(valid);
    const regressingArtifact = regressing.artifact as Record<string, unknown>;
    regressingArtifact.candidateMetrics = { logLoss: 0.41 };
    regressingArtifact.incumbentMetrics = { logLoss: 0.36 };

    const gateFailing = structuredClone(valid);
    (gateFailing.artifact as Record<string, unknown>).evaluationGatePassed = false;

    const actorMismatch = structuredClone(valid);
    (actorMismatch.approval as Record<string, unknown>).approvedBy =
      "teacher:opaque-beta";

    expect(schema.safeParse(zeroVolume).success).toBe(false);
    expect(schema.safeParse(regressing).success).toBe(false);
    expect(schema.safeParse(gateFailing).success).toBe(false);
    expect(schema.safeParse(actorMismatch).success).toBe(false);
  });

  it("publishes typed operational errors with explicit retryability", async () => {
    const mastery = await loadMastery();
    const cases = [
      ["VALIDATION_ERROR", false],
      ["TENANT_SCOPE_ERROR", false],
      ["IDEMPOTENCY_CONFLICT", false],
      ["APPEND_ONLY_CONFLICT", false],
      ["REVISION_CONFLICT", true],
      ["PERSISTENCE_UNAVAILABLE", true],
      ["PERSISTENCE_TIMEOUT", true],
      ["MISSING_MIGRATION", false],
      ["INTERNAL_ERROR", false],
    ] as const;

    for (const [code, retryable] of cases) {
      const error = new mastery.MasteryPersistenceError(
        code,
        "Mastery persistence operation failed",
        { retryable },
      );
      expect.soft(error.code).toBe(code);
      expect.soft(error.retryable, `${code} retryability`).toBe(retryable);
      expect.soft(error.message).not.toMatch(/postgres|drizzle|sql/i);
    }
  });
});
