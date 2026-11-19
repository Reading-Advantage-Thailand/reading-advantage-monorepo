/**
 * Follow-up adversarial boundaries for explainVariant (track www_tutor_followups_20261118).
 *
 * This file adds only the gaps the existing suites leave open. It does not
 * repeat the [3, 3] needsOwnStudents pin or the [0, 0] zero pin that
 * tutor-commission.test.ts and tutor-commission.adversarial.test.ts already hold.
 * Each case uses a distinct input: a single student of 1, a negative price, or
 * a negative-zero price or volume.
 */
import { describe, expect, it } from "vitest";
import {
  CLASS_PRICE_DEFAULT,
  calculateNetwork,
  explainVariant,
  type NetworkResult,
} from "@/lib/tutor-commission";

describe("followups: own 0 with a leg of 0 vs a leg of 1 student", () => {
  it("a leg of 0 students stays zero while a leg of 1 student needs own students", () => {
    const emptyLeg = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [0],
    });
    expect(emptyLeg.networkVolume).toBe(0);
    expect(emptyLeg.net).toBe(0);
    expect(explainVariant(emptyLeg)).toBe("zero");

    const oneStudent = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [1],
    });
    expect(oneStudent.networkVolume).toBeGreaterThan(0);
    expect(oneStudent.net).toBe(0);
    expect(explainVariant(oneStudent)).toBe("needsOwnStudents");
  });
});

describe("followups: network 0 from a negative or negative-zero price stays zero", () => {
  it("a negative price with legs gives network 0 and the zero variant", () => {
    const result = calculateNetwork({
      price: -CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [3, 3],
    });
    expect(result.networkVolume).toBe(0);
    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
    expect(Object.is(result.networkVolume, -0)).toBe(false);
    expect(explainVariant(result)).toBe("zero");
  });

  it("a negative-zero price with a leg of students gives network 0 and the zero variant", () => {
    const result = calculateNetwork({
      price: -0,
      personalStudents: 0,
      studentsPerLeg: [3],
    });
    expect(result.networkVolume).toBe(0);
    expect(Object.is(result.networkVolume, -0)).toBe(false);
    expect(Object.is(result.gross, -0)).toBe(false);
    expect(explainVariant(result)).toBe("zero");
  });

  it("a hand-built -0 network volume with legs still reads zero, not needsOwnStudents", () => {
    const probe: NetworkResult = {
      ownVolume: 0,
      networkVolume: -0,
      rate: 0,
      gross: 0,
      legPayouts: 0,
      preTax: 0,
      withholdingTax: 0,
      net: 0,
      legs: [{ leg: 1, students: 3, volume: 9000, payout: 4005 }],
    };
    expect(probe.networkVolume === 0).toBe(true);
    expect(explainVariant(probe)).toBe("zero");

    // Control: the same shape with a real volume names needsOwnStudents.
    const control: NetworkResult = { ...probe, networkVolume: 9000, ownVolume: 0 };
    expect(explainVariant(control)).toBe("needsOwnStudents");
  });
});
