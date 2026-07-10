import { describe, expect, it } from "vitest";

const FIXTURE_PROVENANCE = Object.freeze({
  specVersion: "kst-srs.v3.1",
  configVersion: "fsrs-calibration.v1",
  graphRelease: "codecamp.synthetic.v1",
  paramsVersion: "fsrs-params.codecamp.secondary.v1",
});

type ReplayReview = {
  reviewId: string;
  studentId: string;
  domain: string;
  ageBand?: string;
  paramsVersion?: string;
  reviewedAt: string;
  predictedRetention: number;
  observedRecall: boolean;
};

type FitFsrsParameters = (input: {
  reviews: ReplayReview[];
  population: { domain: string; ageBand: string };
  optimizerVersion: string;
  incumbentParamsVersion: string;
}) => unknown;

type EvaluateFsrsReplay = (input: {
  reviews: ReplayReview[];
  incumbentMetrics: { retentionMae: number; maxCalibrationGap: number };
}) => unknown;

const REVIEWS: ReplayReview[] = [
  ["r1", "s1", 0.9, true],
  ["r2", "s2", 0.8, true],
  ["r3", "s3", 0.7, false],
  ["r4", "s1", 0.6, true],
  ["r5", "s2", 0.4, false],
  ["r6", "s3", 0.2, false],
].map(([reviewId, studentId, predictedRetention, observedRecall], index) => ({
  reviewId: String(reviewId),
  studentId: String(studentId),
  domain: "codecamp.web",
  ageBand: "secondary",
  paramsVersion: FIXTURE_PROVENANCE.paramsVersion,
  reviewedAt: new Date(Date.UTC(2026, 6, index + 1)).toISOString(),
  predictedRetention: Number(predictedRetention),
  observedRecall: Boolean(observedRecall),
}));

async function loadCalibration(): Promise<Record<string, unknown> | null> {
  try {
    return (await import("../srs/fsrs-calibration.js")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

async function loadEvaluationHarness(): Promise<Record<
  string,
  unknown
> | null> {
  try {
    return (await import("../srs/evaluation-harness.js")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

describe("kst-srs.v3.1 FSRS calibration and replay evaluation", () => {
  it("fits the same age-banded corpus deterministically on repeated runs", async () => {
    const module = await loadCalibration();
    expect(module, "missing v3.1 fsrs-calibration module").not.toBeNull();
    if (!module) return;

    const fitFsrsParameters = module.fitFsrsParameters as
      | FitFsrsParameters
      | undefined;
    expect(typeof fitFsrsParameters).toBe("function");
    if (!fitFsrsParameters) return;

    const input = {
      reviews: REVIEWS,
      population: { domain: "codecamp.web", ageBand: "secondary" },
      optimizerVersion: "deterministic-grid.v1",
      incumbentParamsVersion: FIXTURE_PROVENANCE.paramsVersion,
    };

    const first = fitFsrsParameters(input);
    const second = fitFsrsParameters(structuredClone(input));

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      population: input.population,
      optimizerVersion: input.optimizerVersion,
      reviewCount: REVIEWS.length,
      studentCount: 3,
    });
  });

  it("produces identical replay metrics and preserves paramsVersion attribution", async () => {
    const module = await loadEvaluationHarness();
    expect(module, "missing v3.1 evaluation-harness module").not.toBeNull();
    if (!module) return;

    const evaluateFsrsReplay = module.evaluateFsrsReplay as
      | EvaluateFsrsReplay
      | undefined;
    expect(typeof evaluateFsrsReplay).toBe("function");
    if (!evaluateFsrsReplay) return;

    const input = {
      reviews: REVIEWS,
      incumbentMetrics: { retentionMae: 0.25, maxCalibrationGap: 0.1 },
    };
    const first = evaluateFsrsReplay(input);
    const second = evaluateFsrsReplay(structuredClone(input));

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      reviewCount: REVIEWS.length,
      paramsVersions: [FIXTURE_PROVENANCE.paramsVersion],
    });
  });

  it.each([
    ["paramsVersion", { ...REVIEWS[0], paramsVersion: undefined }],
    ["ageBand", { ...REVIEWS[0], ageBand: undefined }],
  ])(
    "rejects replay rows missing %s instead of silently pooling populations",
    async (_, badReview) => {
      const module = await loadEvaluationHarness();
      expect(module, "missing v3.1 evaluation-harness module").not.toBeNull();
      if (!module) return;

      const evaluateFsrsReplay = module.evaluateFsrsReplay as
        | EvaluateFsrsReplay
        | undefined;
      expect(typeof evaluateFsrsReplay).toBe("function");
      if (!evaluateFsrsReplay) return;

      expect(() =>
        evaluateFsrsReplay({
          reviews: [badReview],
          incumbentMetrics: { retentionMae: 0.25, maxCalibrationGap: 0.1 },
        }),
      ).toThrow();
    },
  );
});
