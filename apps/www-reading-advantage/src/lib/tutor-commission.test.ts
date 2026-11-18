/**
 * Red contract for the pure commission module (track www_tutor_calculator_20261117).
 * Pins spec section 3, D-1 to D-3, section 5.2, and AC-1 to AC-4.
 * The module is intentionally absent at the Red stage; this file must fail on import.
 */
import { describe, expect, it } from "vitest";
import {
  CLASS_PRICE_DEFAULT,
  LEG_STUDENTS_DEFAULT,
  NETWORK_PRESETS,
  calculateNetwork,
  commissionRate,
  explainVariant,
  payoutAfterDeduction,
  resizeLegs,
} from "@/lib/tutor-commission";

/** Converts a baht Number from the module contract to integer satang. */
function toSatang(baht: number): number {
  return Math.round(baht * 100);
}

/** Reference curve from spec section 3, used only to validate the pinned strings. */
function referenceRate(volume: number): number {
  if (volume <= 0) return 0;
  if (volume < 20000) return 0.4 + volume / 200000;
  return (0.5 * (1 - Math.pow(0.3, 1 + Math.log(volume / 20000) / Math.log(5)))) / 0.7;
}

describe("1. commissionRate", () => {
  const pinned: readonly (readonly [number, string])[] = [
    [1000, "40.5000"],
    [5000, "42.5000"],
    [10000, "45.0000"],
    [20000, "50.0000"],
    [30000, "55.6065"],
    [50000, "60.6315"],
  ];

  it("reference formula reproduces the six pinned rate strings", () => {
    for (const [volume, expected] of pinned) {
      expect((referenceRate(volume) * 100).toFixed(4)).toBe(expected);
    }
  });

  it("pins the six rates to four decimals as strings", () => {
    for (const [volume, expected] of pinned) {
      expect((commissionRate(volume) * 100).toFixed(4)).toBe(expected);
    }
  });

  it("returns 0 at zero volume and at a negative volume", () => {
    expect(commissionRate(0)).toBe(0);
    expect(commissionRate(-5)).toBe(0);
  });

  it("stays below 71.43 percent at one billion baht", () => {
    expect(commissionRate(1e9)).toBeLessThan(0.7143);
    expect(commissionRate(1e9)).toBeGreaterThan(0.71);
  });

  it("keeps the exact satang gross at one billion baht", () => {
    // rateUnits=714220276, gvSatang=100000000000; the float product is 17 satang lower.
    const result = calculateNetwork({
      price: 1000,
      personalStudents: 1000000,
      studentsPerLeg: [],
    });
    expect(result.networkVolume).toBe(1e9);
    expect(toSatang(result.gross)).toBe(71422027600);
  });
});

describe("2. preset 1, four own students and no legs", () => {
  const input = NETWORK_PRESETS[0];

  it("holds the spec input", () => {
    expect(input.price).toBe(3000);
    expect(input.personalStudents).toBe(4);
    expect(input.studentsPerLeg).toEqual([]);
  });

  it("returns the D-2 money values", () => {
    const result = calculateNetwork(input);
    expect(result.ownVolume).toBe(12000);
    expect(result.networkVolume).toBe(12000);
    expect((result.rate * 100).toFixed(4)).toBe("46.0000");
    expect(result.gross).toBe(5520);
    expect(result.legs).toEqual([]);
    expect(result.legPayouts).toBe(0);
    expect(result.preTax).toBe(5520);
    expect(result.withholdingTax).toBe(165.6);
    expect(result.net).toBe(5354.4);
  });
});

describe("3. presets 2 and 3 to the satang", () => {
  it("exposes three presets, all at the 3,000 baht price", () => {
    expect(NETWORK_PRESETS).toHaveLength(3);
    for (const preset of NETWORK_PRESETS) {
      expect(preset.price).toBe(3000);
    }
  });

  it("preset 2: two legs of 9,000 baht at 4,005 baht each", () => {
    const input = NETWORK_PRESETS[1];
    expect(input.personalStudents).toBe(2);
    expect(input.studentsPerLeg).toEqual([3, 3]);

    const result = calculateNetwork(input);
    expect(result.ownVolume).toBe(6000);
    expect(result.networkVolume).toBe(24000);
    expect((result.rate * 100).toFixed(4)).toBe("52.7321");
    expect(result.gross).toBe(12655.69);
    expect(result.legs).toEqual([
      { leg: 1, students: 3, volume: 9000, payout: 4005 },
      { leg: 2, students: 3, volume: 9000, payout: 4005 },
    ]);
    expect(result.legPayouts).toBe(8010);
    expect(result.preTax).toBe(4645.69);
    expect(result.withholdingTax).toBe(139.37);
    expect(result.net).toBe(4506.32);
  });

  it("preset 3: three legs of 12,000 baht at 5,520 baht each", () => {
    const input = NETWORK_PRESETS[2];
    expect(input.personalStudents).toBe(2);
    expect(input.studentsPerLeg).toEqual([4, 4, 4]);

    const result = calculateNetwork(input);
    expect(result.ownVolume).toBe(6000);
    expect(result.networkVolume).toBe(42000);
    expect((result.rate * 100).toFixed(4)).toBe("59.1273");
    expect(result.gross).toBe(24833.45);
    expect(result.legs).toEqual([
      { leg: 1, students: 4, volume: 12000, payout: 5520 },
      { leg: 2, students: 4, volume: 12000, payout: 5520 },
      { leg: 3, students: 4, volume: 12000, payout: 5520 },
    ]);
    expect(result.legPayouts).toBe(16560);
    expect(result.preTax).toBe(8273.45);
    expect(result.withholdingTax).toBe(248.2);
    expect(result.net).toBe(8025.25);
  });
});

describe("4. conservation in integer satang", () => {
  it("preset 2: 801,000 + 464,569 = 1,265,569", () => {
    const result = calculateNetwork(NETWORK_PRESETS[1]);
    expect(toSatang(result.legPayouts)).toBe(801000);
    expect(toSatang(result.preTax)).toBe(464569);
    expect(toSatang(result.gross)).toBe(1265569);
    expect(toSatang(result.legPayouts) + toSatang(result.preTax)).toBe(
      toSatang(result.gross),
    );
  });

  it("preset 3: 1,656,000 + 827,345 = 2,483,345", () => {
    const result = calculateNetwork(NETWORK_PRESETS[2]);
    expect(toSatang(result.legPayouts)).toBe(1656000);
    expect(toSatang(result.preTax)).toBe(827345);
    expect(toSatang(result.gross)).toBe(2483345);
    expect(toSatang(result.legPayouts) + toSatang(result.preTax)).toBe(
      toSatang(result.gross),
    );
  });

  it("a baht Number sum loses a satang, so the equality must use integers", () => {
    expect(8010 + 4645.69).not.toBe(12655.69);
    expect(toSatang(8010) + toSatang(4645.69)).toBe(toSatang(12655.69));
  });
});

describe("5. zero case", () => {
  const input = {
    price: CLASS_PRICE_DEFAULT,
    personalStudents: 0,
    studentsPerLeg: [] as readonly number[],
  };

  it("returns zero everywhere, rate 0, and the zero variant", () => {
    const result = calculateNetwork(input);
    expect(result.ownVolume).toBe(0);
    expect(result.networkVolume).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.gross).toBe(0);
    expect(result.legs).toEqual([]);
    expect(result.legPayouts).toBe(0);
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("zero");
  });
});

describe("6. payout floor and tax on a zero payout", () => {
  it("returns 0 for (0, 0) and for (100, 150)", () => {
    expect(payoutAfterDeduction(0, 0)).toBe(0);
    expect(payoutAfterDeduction(100, 150)).toBe(0);
  });

  it("keeps a positive payout as a positive control", () => {
    expect(payoutAfterDeduction(5520, 0)).toBe(5520);
  });

  it("charges no tax and shows no net on a zero payout", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [],
    });
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
  });
});

describe("7. explainVariant", () => {
  it("returns ownOnly for two legs with 0 students", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 4,
      studentsPerLeg: [0, 0],
    });
    expect(result.networkVolume).toBe(12000);
    expect(result.legPayouts).toBe(0);
    expect(explainVariant(result)).toBe("ownOnly");
  });

  it("returns withLegs for preset 2", () => {
    expect(explainVariant(calculateNetwork(NETWORK_PRESETS[1]))).toBe("withLegs");
  });
});

describe("8. resizeLegs", () => {
  it("appends the default of 3 students for a new leg", () => {
    expect(LEG_STUDENTS_DEFAULT).toBe(3);
    expect(resizeLegs([], 1)).toEqual([LEG_STUDENTS_DEFAULT]);
    expect(resizeLegs([2, 4], 3)).toEqual([2, 4, LEG_STUDENTS_DEFAULT]);
  });

  it("keeps the first entries when the count is unchanged", () => {
    expect(resizeLegs([2, 4, 6], 3)).toEqual([2, 4, 6]);
  });

  it("drops entries beyond the new count", () => {
    expect(resizeLegs([2, 4, 6, 8], 2)).toEqual([2, 4]);
    expect(resizeLegs([2, 4], 0)).toEqual([]);
  });
});

/** Asserts that every money field is finite, non-negative, and conservation-safe. */
function expectSafeMoney(result: ReturnType<typeof calculateNetwork>): void {
  const money = [
    result.ownVolume,
    result.networkVolume,
    result.rate,
    result.gross,
    result.legPayouts,
    result.preTax,
    result.withholdingTax,
    result.net,
  ];
  for (const value of money) {
    expect(Number.isFinite(value), "finite money").toBe(true);
    expect(value, "non-negative money").toBeGreaterThanOrEqual(0);
  }
  expect(toSatang(result.legPayouts) + toSatang(result.preTax)).toBe(toSatang(result.gross));
}

describe("9. non-finite and negative inputs clamp", () => {
  it("returns rate 0 for NaN and Infinity volume", () => {
    expect(commissionRate(NaN)).toBe(0);
    expect(commissionRate(Infinity)).toBe(0);
  });

  it("clamps Infinity inputs to finite, non-negative, conservation-safe money", () => {
    const infinitePrice = calculateNetwork({
      price: Infinity,
      personalStudents: 4,
      studentsPerLeg: [3, 3],
    });
    expect(infinitePrice.networkVolume).toBe(0);
    expect(infinitePrice.gross).toBe(0);
    expectSafeMoney(infinitePrice);

    const infiniteStudents = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: Infinity,
      studentsPerLeg: [Infinity, Infinity],
    });
    expect(infiniteStudents.networkVolume).toBe(0);
    expect(infiniteStudents.gross).toBe(0);
    expectSafeMoney(infiniteStudents);
  });

  it("returns all-zero money for a NaN price", () => {
    const result = calculateNetwork({
      price: NaN,
      personalStudents: 4,
      studentsPerLeg: [3, 3],
    });
    expect(result.networkVolume).toBe(0);
    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
    expectSafeMoney(result);
  });

  it("clamps a NaN leg entry to zero students", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 4,
      studentsPerLeg: [NaN],
    });
    expect(result.legs).toEqual([{ leg: 1, students: 0, volume: 0, payout: 0 }]);
    expect(result.networkVolume).toBe(12000);
    expectSafeMoney(result);
  });

  it("clamps a negative price and a negative student count to zero", () => {
    const badPrice = calculateNetwork({
      price: -5,
      personalStudents: 4,
      studentsPerLeg: [3],
    });
    expect(badPrice.gross).toBe(0);
    expect(badPrice.net).toBe(0);
    expectSafeMoney(badPrice);

    const badStudents = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: -3,
      studentsPerLeg: [-2],
    });
    expect(badStudents.networkVolume).toBe(0);
    expect(badStudents.gross).toBe(0);
    expectSafeMoney(badStudents);
  });
});

describe("10. withholding tax rounds half up (spec D-3)", () => {
  it("price 1,007 with one own student gives tax 12.24, not the truncated 12.23", () => {
    const result = calculateNetwork({
      price: 1007,
      personalStudents: 1,
      studentsPerLeg: [],
    });
    expect(result.networkVolume).toBe(1007);
    expect(result.gross).toBe(407.87);
    expect(result.preTax).toBe(407.87);
    expect(result.withholdingTax).toBe(12.24);
    expect(result.net).toBe(395.63);

    // The rejected rule truncates the tax at 12.23; the pin must see the satang.
    expect(Math.floor((toSatang(result.preTax) * 3) / 100)).toBe(1223);
    expect(toSatang(result.withholdingTax)).toBe(1224);
  });

  it("keeps the three preset taxes unchanged under half up", () => {
    expect(calculateNetwork(NETWORK_PRESETS[0]).withholdingTax).toBe(165.6);
    expect(calculateNetwork(NETWORK_PRESETS[1]).withholdingTax).toBe(139.37);
    expect(calculateNetwork(NETWORK_PRESETS[2]).withholdingTax).toBe(248.2);
  });
});

describe("11. settlement eligibility: 0 personal students with legs pay 0 (spec D-18, AC-21)", () => {
  it("pays 0 before tax, 0 tax, and 0 net for two legs of 3 students", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [3, 3],
    });

    // Settlement still computes the volume, the rate, the gross, and the leg commissions.
    expect(result.ownVolume).toBe(0);
    expect(result.networkVolume).toBe(18000);
    expect((result.rate * 100).toFixed(4)).toBe("49.0000");
    expect(result.gross).toBe(8820);
    expect(result.legPayouts).toBe(8010);

    // SettlementService.ts:536-548 pays 0 to a node with no PV and a child.
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("needsOwnStudents");
  });

  it("pays 0 for one leg of 3 students and keeps the leg commission", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [3],
    });

    expect(result.networkVolume).toBe(9000);
    expect((result.rate * 100).toFixed(4)).toBe("44.5000");
    expect(result.gross).toBe(4005);
    expect(result.legPayouts).toBe(4005);
    expect(result.legs).toEqual([{ leg: 1, students: 3, volume: 9000, payout: 4005 }]);
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("needsOwnStudents");
  });

  it("pays 0 when the only leg has 0 students, because the leg count is not 0", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [0],
    });

    expect(result.networkVolume).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.gross).toBe(0);
    expect(result.legPayouts).toBe(0);
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("zero");
  });

  it("keeps 0 personal students with no legs at volume 0 and the zero variant", () => {
    const result = calculateNetwork({
      price: CLASS_PRICE_DEFAULT,
      personalStudents: 0,
      studentsPerLeg: [],
    });

    expect(result.networkVolume).toBe(0);
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("zero");
  });

  it("keeps the preset figures for a tutor with personal students", () => {
    const result = calculateNetwork(NETWORK_PRESETS[1]);

    expect(result.preTax).toBe(4645.69);
    expect(result.withholdingTax).toBe(139.37);
    expect(result.net).toBe(4506.32);
    expect(explainVariant(result)).toBe("withLegs");
  });
});
