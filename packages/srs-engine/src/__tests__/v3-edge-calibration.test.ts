import { describe, expect, it } from "vitest";

import {
  computeNecessity,
  posteriorMean,
  updatePosterior,
  type CalibrationContingencyTable,
  type CalibrationObservation,
  type EdgeCalibration,
} from "../srs/edge-calibration.js";

const FIXTURE_PROVENANCE = Object.freeze({
  specVersion: "kst-srs.v3",
  configVersion: "edge-calibration.v3",
  graphRelease: "codecamp.synthetic.v1",
  paramsVersion: "beta-bernoulli.v3",
});

const NOW = Date.parse("2026-07-10T00:00:00.000Z");

function makeState(): EdgeCalibration {
  return {
    edgeId: "code.prerequisite.a-to-b",
    alpha: 1,
    beta: 1,
    status: "untested",
    lastUpdated: 0,
  };
}

function observation(
  a: boolean,
  b: boolean,
  studentId: string,
): CalibrationObservation {
  return { studentId, a, b };
}

describe("kst-srs.v3 edge-calibration necessity posterior", () => {
  it("updates only the not-proficient-in-A rows: d increments alpha and c increments beta", () => {
    expect(FIXTURE_PROVENANCE.specVersion).toBe("kst-srs.v3");

    const afterD = updatePosterior(
      makeState(),
      observation(false, false, "student-d"),
      {
        now: NOW,
      },
    );
    const afterC = updatePosterior(
      afterD,
      observation(false, true, "student-c"),
      {
        now: NOW,
      },
    );

    expect(afterD).toMatchObject({ alpha: 2, beta: 1, lastUpdated: NOW });
    expect(afterC).toMatchObject({ alpha: 2, beta: 2, lastUpdated: NOW });
  });

  it("does not let proficient-in-A cells a or b change the necessity posterior", () => {
    const afterA = updatePosterior(
      makeState(),
      observation(true, true, "student-a"),
      {
        now: NOW,
      },
    );
    const afterB = updatePosterior(
      afterA,
      observation(true, false, "student-b"),
      {
        now: NOW,
      },
    );

    expect(afterA).toMatchObject({ alpha: 1, beta: 1 });
    expect(afterB).toMatchObject({ alpha: 1, beta: 1 });
  });

  it("reproduces the normative cohort as Beta(7, 5), not the v2 inflated posterior", () => {
    let state = makeState();
    const observations = [
      ...Array.from({ length: 470 }, (_, index) =>
        observation(true, true, `a-${index}`),
      ),
      ...Array.from({ length: 20 }, (_, index) =>
        observation(true, false, `b-${index}`),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        observation(false, true, `c-${index}`),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        observation(false, false, `d-${index}`),
      ),
    ];

    for (const item of observations) {
      state = updatePosterior(state, item, { now: NOW });
    }

    expect(state).toMatchObject({ alpha: 7, beta: 5 });
    expect(posteriorMean(state.alpha, state.beta)).toBeCloseTo(7 / 12, 12);
  });

  it("defines necessity as one minus the violation rate in the not-A row", () => {
    const table: CalibrationContingencyTable = {
      proficientAProficientB: 470,
      proficientANotProficientB: 20,
      notProficientAProficientB: 4,
      notProficientANotProficientB: 6,
    };

    expect(computeNecessity(table)).toBeCloseTo(0.6, 12);
  });
});
