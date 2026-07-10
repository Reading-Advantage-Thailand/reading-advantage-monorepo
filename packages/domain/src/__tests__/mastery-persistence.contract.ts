import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const STUDENT_A = "mastery-student-a";
const STUDENT_B = "mastery-student-b";
const CONTRACT_VERSION = "mastery.persistence.v1";

type PersistenceRecord = Record<string, unknown> & { id: string };

interface MasterySnapshot {
  cards: PersistenceRecord[];
  reviews: PersistenceRecord[];
  evidence: PersistenceRecord[];
  states: PersistenceRecord[];
  placements: PersistenceRecord[];
  calibrations: PersistenceRecord[];
  commits: PersistenceRecord[];
}

interface CommitInput {
  contractVersion: string;
  schoolId: string;
  studentId: string;
  idempotencyKey: string;
  expectedRevisions: { card: number | null; state: number | null };
  provenance: Record<string, string>;
  audit: Record<string, string>;
  records: {
    card: PersistenceRecord;
    review: PersistenceRecord;
    evidence: PersistenceRecord[];
    state: PersistenceRecord;
    placement: PersistenceRecord;
  };
}

interface CommitResult {
  status: "applied" | "replayed";
  commitId: string;
  resultDigest: string;
  cardRevision: number;
  stateRevision: number;
  recordIds: Record<string, string | string[]>;
}

/** Structural persistence port exercised identically by both S3 adapters. */
export interface MasteryPersistenceTestPort {
  readSnapshot(input: { schoolId: string }): Promise<MasterySnapshot>;
  commitMasteryEvidence(input: CommitInput): Promise<CommitResult>;
}

/** Lifecycle wrapper supplied by each adapter-specific contract harness. */
export interface MasteryPersistenceTestHarness {
  adapter(): MasteryPersistenceTestPort;
  boundSchoolId?: string;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/** Creates one reusable adapter harness for the shared contract suite. */
export type MasteryPersistenceHarnessFactory =
  () => Promise<MasteryPersistenceTestHarness>;

function uuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
}

/** Creates a canonical mastery persistence command for adapter and service tests. */
export function makeInput({
  seed = 1,
  schoolId = SCHOOL_A,
  studentId = STUDENT_A,
  objectiveId = "reading.main-idea",
  cardId = uuid(seed * 20 + 1),
  stateId = uuid(seed * 20 + 4),
  cardRevision = 0,
  stateRevision = 0,
  expectedCardRevision = null,
  expectedStateRevision = null,
}: {
  seed?: number;
  schoolId?: string;
  studentId?: string;
  objectiveId?: string;
  cardId?: string;
  stateId?: string;
  cardRevision?: number;
  stateRevision?: number;
  expectedCardRevision?: number | null;
  expectedStateRevision?: number | null;
} = {}): CommitInput {
  const reviewedAt = "2026-07-10T04:00:00.000Z";
  const provenance = {
    normativeSpecVersion: "kst-srs.v3.2",
    engineContractVersion: "srs.contract.v2",
    graphRelease: "reading.graph.v7",
    configVersion: "mastery.config.v3",
    paramsVersion: "fsrs-params.reading.secondary.v2",
    adapterVersion: CONTRACT_VERSION,
  };
  const audit = {
    actorId: "teacher-1",
    requestId: uuid(seed * 20 + 10),
    sourceId: `submission-${seed}`,
    correlationId: uuid(seed * 20 + 11),
  };

  return {
    contractVersion: CONTRACT_VERSION,
    schoolId,
    studentId,
    idempotencyKey: uuid(seed * 20 + 12),
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
        variantKey: "recognition",
        state: "review",
        stability: 4.25,
        difficulty: 5.5,
        dueAt: "2026-07-12T04:00:00.000Z",
        lastReviewedAt: reviewedAt,
        reps: cardRevision + 1,
        lapses: 0,
        revision: cardRevision,
        paramsVersion: provenance.paramsVersion,
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
      },
      review: {
        id: uuid(seed * 20 + 2),
        schoolId,
        cardId,
        studentId,
        submissionId: audit.sourceId,
        rating: "good",
        beforeState: "learning",
        afterState: "review",
        evidenceReasons: ["correct", "no-hint"],
        paramsVersion: provenance.paramsVersion,
        reviewedAt,
        createdAt: reviewedAt,
      },
      evidence: [
        {
          id: uuid(seed * 20 + 3),
          schoolId,
          studentId,
          objectiveId,
          variantKey: "recognition",
          sourceId: audit.sourceId,
          evidenceOrdinal: 0,
          evidenceType: "practice_review",
          correctedStrength: 0.86,
          practiceCoverage: 0.75,
          confidence: 0.7,
          attemptCount: 4,
          supportMetadata: { revealSteps: 0, misconceptionTags: [] },
          provenance,
          createdAt: reviewedAt,
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
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
      },
      placement: {
        id: uuid(seed * 20 + 5),
        schoolId,
        studentId,
        objectiveId,
        estimate: 0.68,
        confidence: "medium",
        evidenceType: `two_probe_${seed}`,
        graphRelease: provenance.graphRelease,
        seedProvenance: provenance,
        replacedByDirectEvidence: false,
        createdAt: reviewedAt,
      },
    },
  };
}

function counts(snapshot: MasterySnapshot): Record<string, number> {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, rows]) => [key, rows.length]),
  );
}

function expectSorted(snapshot: MasterySnapshot): void {
  for (const rows of Object.values(snapshot)) {
    const ids = rows.map((row) => row.id);
    expect(ids).toEqual([...ids].sort());
  }
}

async function expectTypedError(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected typed persistence error ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code });
    expect(String((error as Error).message)).not.toMatch(
      /duplicate key|sqlstate|postgres|pglite/i,
    );
  }
}

/**
 * Registers the adapter-neutral S3 persistence contract.
 * @param name Adapter label shown in Vitest output.
 * @param createHarness Factory for an isolated reusable harness.
 * @returns Nothing; the function registers a Vitest suite.
 */
export function runMasteryPersistenceContract(
  name: string,
  createHarness: MasteryPersistenceHarnessFactory,
): void {
  describe(`MasteryPersistencePort contract: ${name}`, () => {
    let harness: MasteryPersistenceTestHarness;

    beforeAll(async () => {
      harness = await createHarness();
    }, 120_000);

    beforeEach(async () => {
      await harness.reset();
    });

    afterAll(async () => {
      await harness?.close();
    });

    it("returns explicit empty collections without fabricated evidence", async () => {
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual({
        cards: [],
        reviews: [],
        evidence: [],
        states: [],
        placements: [],
        calibrations: [],
        commits: [],
      });
    });

    it("round-trips every record field and version through one atomic commit", async () => {
      const input = makeInput();
      const result = await harness.adapter().commitMasteryEvidence(input);
      expect(result).toMatchObject({
        status: "applied",
        cardRevision: 0,
        stateRevision: 0,
      });
      expect(result.resultDigest).toMatch(/^sha256:.+/);

      const snapshot = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      expect(snapshot.cards).toEqual([input.records.card]);
      expect(snapshot.reviews).toEqual([input.records.review]);
      expect(snapshot.evidence).toEqual(input.records.evidence);
      expect(snapshot.states).toEqual([input.records.state]);
      expect(snapshot.placements).toEqual([input.records.placement]);
      expect(snapshot.calibrations).toEqual([]);
      expect(snapshot.commits).toHaveLength(1);
      expect(snapshot.commits[0]).toMatchObject({
        id: result.commitId,
        schoolId: SCHOOL_A,
        contractVersion: CONTRACT_VERSION,
        requestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        resultDigest: result.resultDigest,
        provenance: input.provenance,
        audit: input.audit,
      });
    });

    it("returns defensive copies in deterministic id order", async () => {
      await harness.adapter().commitMasteryEvidence(makeInput({ seed: 2 }));
      await harness.adapter().commitMasteryEvidence(
        makeInput({ seed: 1, objectiveId: "reading.supporting-detail" }),
      );
      const first = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      expectSorted(first);
      const baseline = structuredClone(first);

      try {
        first.cards[0]!.objectiveId = "mutated-by-consumer";
        (first.evidence[0]!.provenance as Record<string, unknown>).graphRelease =
          "mutated";
      } catch {
        // Frozen results are also valid defensive values.
      }

      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        baseline,
      );
    });

    it("isolates all records by school", async () => {
      await harness.adapter().commitMasteryEvidence(makeInput());
      if (harness.boundSchoolId) {
        await expect(
          harness.adapter().commitMasteryEvidence(
            makeInput({ seed: 3, schoolId: SCHOOL_B, studentId: STUDENT_B }),
          ),
        ).rejects.toMatchObject({
          code: "TENANT_SCOPE_ERROR",
          retryable: false,
        });
        await expect(
          harness.adapter().readSnapshot({ schoolId: SCHOOL_B }),
        ).rejects.toMatchObject({
          code: "TENANT_SCOPE_ERROR",
          retryable: false,
        });
        const schoolA = await harness.adapter().readSnapshot({
          schoolId: harness.boundSchoolId,
        });
        for (const rows of Object.values(schoolA)) {
          expect(rows.every((row) => row.schoolId === harness.boundSchoolId)).toBe(
            true,
          );
        }
        return;
      }
      await harness.adapter().commitMasteryEvidence(
        makeInput({ seed: 3, schoolId: SCHOOL_B, studentId: STUDENT_B }),
      );

      const schoolA = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      const schoolB = await harness.adapter().readSnapshot({ schoolId: SCHOOL_B });
      for (const rows of Object.values(schoolA)) {
        expect(rows.every((row) => row.schoolId === SCHOOL_A)).toBe(true);
      }
      for (const rows of Object.values(schoolB)) {
        expect(rows.every((row) => row.schoolId === SCHOOL_B)).toBe(true);
      }
    });

    it("replays the same idempotency key and digest without another mutation", async () => {
      const input = makeInput();
      const applied = await harness.adapter().commitMasteryEvidence(input);
      const before = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      const replayed = await harness.adapter().commitMasteryEvidence(
        structuredClone(input),
      );

      expect(replayed).toEqual({ ...applied, status: "replayed" });
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        before,
      );
    });

    it("rejects an idempotency key reused with a different digest", async () => {
      const input = makeInput();
      await harness.adapter().commitMasteryEvidence(input);
      const before = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      await expectTypedError(
        harness.adapter().commitMasteryEvidence({
          ...structuredClone(input),
          records: {
            ...structuredClone(input.records),
            evidence: input.records.evidence.map((record) => ({
              ...record,
              correctedStrength: 0.25,
            })),
          },
        }),
        "IDEMPOTENCY_CONFLICT",
      );
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        before,
      );
    });

    it("keeps review, evidence, and commit records append-only", async () => {
      const initial = makeInput();
      await harness.adapter().commitMasteryEvidence(initial);
      const before = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      const attemptedRewrite = makeInput({
        seed: 4,
        cardId: initial.records.card.id,
        stateId: initial.records.state.id,
        cardRevision: 1,
        stateRevision: 1,
        expectedCardRevision: 0,
        expectedStateRevision: 0,
      });
      attemptedRewrite.records.review = {
        ...structuredClone(initial.records.review),
        rating: "again",
      };
      attemptedRewrite.records.evidence = [
        {
          ...structuredClone(initial.records.evidence[0]!),
          correctedStrength: 0.1,
        },
      ];

      await expectTypedError(
        harness.adapter().commitMasteryEvidence(attemptedRewrite),
        "APPEND_ONLY_CONFLICT",
      );
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        before,
      );
    });

    it("uses optimistic card and state revisions and rejects stale writers", async () => {
      const initial = makeInput();
      await harness.adapter().commitMasteryEvidence(initial);
      const next = makeInput({
        seed: 5,
        cardId: initial.records.card.id,
        stateId: initial.records.state.id,
        cardRevision: 1,
        stateRevision: 1,
        expectedCardRevision: 0,
        expectedStateRevision: 0,
      });
      await expect(
        harness.adapter().commitMasteryEvidence(next),
      ).resolves.toMatchObject({
        status: "applied",
        cardRevision: 1,
        stateRevision: 1,
      });

      const stale = makeInput({
        seed: 6,
        cardId: initial.records.card.id,
        stateId: initial.records.state.id,
        cardRevision: 1,
        stateRevision: 1,
        expectedCardRevision: 0,
        expectedStateRevision: 0,
      });
      const before = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      await expectTypedError(
        harness.adapter().commitMasteryEvidence(stale),
        "REVISION_CONFLICT",
      );
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        before,
      );
    });

    it("preserves provenance and audit metadata exactly", async () => {
      const input = makeInput();
      await harness.adapter().commitMasteryEvidence(input);
      const snapshot = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      expect(snapshot.evidence[0]).toMatchObject({ provenance: input.provenance });
      expect(snapshot.placements[0]).toMatchObject({
        seedProvenance: input.provenance,
      });
      expect(snapshot.commits[0]).toMatchObject({
        provenance: input.provenance,
        audit: input.audit,
      });
    });

    it("returns typed portable errors instead of provider errors", async () => {
      const before = await harness.adapter().readSnapshot({ schoolId: SCHOOL_A });
      await expectTypedError(
        harness.adapter().readSnapshot({ schoolId: "" }),
        "VALIDATION_ERROR",
      );
      expect(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })).toEqual(
        before,
      );
    });

    it("does not mutate any record class after a rejected operation", async () => {
      const input = makeInput();
      await harness.adapter().commitMasteryEvidence(input);
      const before = counts(
        await harness.adapter().readSnapshot({ schoolId: SCHOOL_A }),
      );
      await expectTypedError(
        harness.adapter().commitMasteryEvidence({
          ...structuredClone(input),
          records: {
            ...structuredClone(input.records),
            evidence: input.records.evidence.map((record) => ({
              ...record,
              confidence: 0.25,
            })),
          },
        }),
        "IDEMPOTENCY_CONFLICT",
      );
      expect(
        counts(await harness.adapter().readSnapshot({ schoolId: SCHOOL_A })),
      ).toEqual(before);
    });
  });
}
