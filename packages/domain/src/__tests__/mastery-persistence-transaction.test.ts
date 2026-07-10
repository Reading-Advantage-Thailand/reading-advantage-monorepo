import { describe, expect, it } from "vitest";
import { makeInput } from "./mastery-persistence.contract.js";

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const CALIBRATION_ID = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-07-10T05:00:00.000Z";

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

describe("Phase S3 canonical mastery persistence orchestration", () => {
  it("strictly validates the single public command before adapter execution", async () => {
    const mastery = await import("../mastery/index.js");
    const input = makeInput();
    expect(mastery.commitMasteryEvidenceInputSchema.safeParse(input).success).toBe(
      true,
    );
    expect(
      mastery.commitMasteryEvidenceInputSchema.safeParse({
        ...input,
        requestDigest: `sha256:${"a".repeat(64)}`,
      }).success,
    ).toBe(false);
    expect(
      mastery.commitMasteryEvidenceInputSchema.safeParse({
        ...input,
        records: {
          ...input.records,
          card: {
            ...input.records.card,
            schoolId: "22222222-2222-4222-8222-222222222222",
          },
        },
      }).success,
    ).toBe(false);
  });

  it("directly composes the public service and high-level in-memory port", async () => {
    const mastery = await import("../mastery/index.js");
    const persistence = mastery.createInMemoryMasteryPersistence();
    const input = makeInput();
    const first = await mastery.commitMasteryEvidence(input, { persistence });
    const second = await mastery.commitMasteryEvidence(structuredClone(input), {
      persistence,
    });

    expect(first).toMatchObject({
      status: "applied",
      resultDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(second).toEqual({ ...first, status: "replayed" });
  });

  it("rejects a changed payload under the same idempotency key without mutation", async () => {
    const mastery = await import("../mastery/index.js");
    const persistence = mastery.createInMemoryMasteryPersistence();
    const input = makeInput();
    await mastery.commitMasteryEvidence(input, { persistence });
    const before = await persistence.readSnapshot({ schoolId: SCHOOL_ID });
    const changed = structuredClone(input);
    changed.records.evidence[0]!.correctedStrength = 0.2;

    await expect(
      mastery.commitMasteryEvidence(changed, { persistence }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", retryable: false });
    expect(await persistence.readSnapshot({ schoolId: SCHOOL_ID })).toEqual(before);
  });

  it("persists calibration approval independently of learner evidence", async () => {
    const mastery = await import("../mastery/index.js");
    const persistence = mastery.createInMemoryMasteryPersistence();
    const result = await mastery.approveMasteryCalibration(
      makeCalibrationApproval(),
      { persistence },
    );
    const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL_ID });

    expect(result).toEqual({ calibrationId: CALIBRATION_ID, status: "approved" });
    expect(snapshot.calibrations).toHaveLength(1);
    expect(snapshot.cards).toEqual([]);
    expect(snapshot.reviews).toEqual([]);
    expect(snapshot.evidence).toEqual([]);
    expect(snapshot.states).toEqual([]);
    expect(snapshot.commits).toEqual([]);
  });

  it("rejects regressing calibration evidence before persistence", async () => {
    const mastery = await import("../mastery/index.js");
    const persistence = mastery.createInMemoryMasteryPersistence();
    const input = makeCalibrationApproval();
    (input.artifact as Record<string, unknown>).candidateMetrics = { logLoss: 0.5 };

    await expect(
      mastery.approveMasteryCalibration(input, { persistence }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", retryable: false });
    expect(
      await persistence.readSnapshot({ schoolId: SCHOOL_ID }),
    ).toMatchObject({ calibrations: [] });
  });
});
