import { describe, expect, it } from "vitest";

import * as calibrationModule from "../srs/edge-calibration.js";
import type { CalibrationContingencyTable } from "../srs/edge-calibration.js";

const FIXTURE_PROVENANCE = Object.freeze({
  specVersion: "kst-srs.v3.1",
  configVersion: "ability-stratification.v1",
  graphRelease: "codecamp.synthetic.v1",
  paramsVersion: "beta-bernoulli.v3",
});

type AbilityBand = "low" | "mid" | "high";
type AbilityStratum = {
  band: AbilityBand;
  table: CalibrationContingencyTable;
};
type AbilityStratifiedResult = {
  status: "confirmed" | "refuted" | "untested";
  reason: "confounded_by_ability" | "insufficient_strata" | null;
  bandPosteriors: Array<{
    band: AbilityBand;
    necessityMean: number;
    evidenceCount: number;
  }>;
};
type ClassifyAbilityStratifiedCalibration = (input: {
  strata: AbilityStratum[];
  prior: { alpha: number; beta: number };
  minBandEvidence?: number;
  maxMeanDivergence?: number;
}) => AbilityStratifiedResult;

function table(c: number, d: number): CalibrationContingencyTable {
  return {
    proficientAProficientB: 0,
    proficientANotProficientB: 0,
    notProficientAProficientB: c,
    notProficientANotProficientB: d,
  };
}

function getClassifier(): ClassifyAbilityStratifiedCalibration | undefined {
  return (calibrationModule as Record<string, unknown>)
    .classifyAbilityStratifiedCalibration as
    | ClassifyAbilityStratifiedCalibration
    | undefined;
}

describe("kst-srs.v3.1 ability-stratified edge calibration", () => {
  it("keeps the pooled verdict when at least two informative band posteriors agree", () => {
    expect(FIXTURE_PROVENANCE.configVersion).toBe("ability-stratification.v1");
    const classify = getClassifier();
    expect(typeof classify).toBe("function");
    if (!classify) return;

    const result = classify({
      strata: [
        { band: "low", table: table(1, 9) },
        { band: "mid", table: table(2, 8) },
      ],
      prior: { alpha: 1, beta: 1 },
      minBandEvidence: 5,
      maxMeanDivergence: 0.2,
    });

    expect(result.status).toBe("confirmed");
    expect(result.reason).toBeNull();
    expect(result.bandPosteriors).toEqual([
      { band: "low", necessityMean: 10 / 12, evidenceCount: 10 },
      { band: "mid", necessityMean: 9 / 12, evidenceCount: 10 },
    ]);
  });

  it("returns confounded_by_ability instead of confirming a pooled association that disappears within strata", () => {
    const classify = getClassifier();
    expect(typeof classify).toBe("function");
    if (!classify) return;

    const result = classify({
      strata: [
        { band: "low", table: table(0, 9) },
        { band: "high", table: table(7, 3) },
      ],
      prior: { alpha: 1, beta: 1 },
      minBandEvidence: 5,
      maxMeanDivergence: 0.2,
    });

    expect(result.status).toBe("untested");
    expect(result.reason).toBe("confounded_by_ability");
  });

  it("requires at least two informative ability bands", () => {
    const classify = getClassifier();
    expect(typeof classify).toBe("function");
    if (!classify) return;

    const result = classify({
      strata: [
        { band: "low", table: table(1, 9) },
        { band: "mid", table: table(1, 2) },
      ],
      prior: { alpha: 1, beta: 1 },
      minBandEvidence: 5,
      maxMeanDivergence: 0.2,
    });

    expect(result).toMatchObject({
      status: "untested",
      reason: "insufficient_strata",
    });
  });
});
