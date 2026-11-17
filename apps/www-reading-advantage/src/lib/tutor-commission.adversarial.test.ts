/**
 * Adversarial probes for the pure commission module
 * (track www_tutor_calculator_20261117, spec 3, D-1 to D-4, D-3, AC-1 to AC-4).
 *
 * This file adds cases only. It changes no existing assertion and no product code.
 * Each money pin carries a negative control: the value a wrong implementation
 * (float product, rounded product, 1e6 rate scale, float tax) would return, so a
 * vacuous pin cannot pass.
 */
import { describe, expect, it } from "vitest";
import {
  CLASS_PRICE_DEFAULT,
  NETWORK_PRESETS,
  calculateNetwork,
  commissionRate,
  explainVariant,
  payoutAfterDeduction,
  resizeLegs,
} from "@/lib/tutor-commission";

const SATANG_PER_BAHT = 100;
const RATE_SCALE = 1_000_000_000;

/** Recovers integer satang from a baht Number the module returned. */
function satang(baht: number): number {
  return Math.round(baht * SATANG_PER_BAHT);
}

/** The rate formula of spec section 3, written here to check the module, not to mirror it. */
function specRate(volume: number): number {
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  if (volume < 20000) return 0.4 + volume / 200000;
  return (0.5 * (1 - Math.pow(0.3, 1 + Math.log(volume / 20000) / Math.log(5)))) / 0.7;
}

/** Spec D-3 steps 1 to 3: the rate at 1e9, the satang product, truncated. */
function specGrossSatang(volume: number): bigint {
  const gvSatang = BigInt(Math.round(volume * SATANG_PER_BAHT));
  const rateUnits = BigInt(Math.round(specRate(volume) * RATE_SCALE));
  return (rateUnits * gvSatang) / BigInt(RATE_SCALE);
}

/** Asserts the money fields are finite and non-negative. */
function expectFiniteMoney(result: ReturnType<typeof calculateNetwork>): void {
  const money = [
    result.ownVolume,
    result.networkVolume,
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
}

/**
 * Asserts the D-3 conservation identities in integer satang.
 * Only for results whose satang values fit a double exactly.
 */
function expectSatangConservation(result: ReturnType<typeof calculateNetwork>): void {
  expectFiniteMoney(result);
  const legSum = result.legs.reduce((sum, leg) => sum + satang(leg.payout), 0);
  expect(legSum, "leg rows equal the deduction").toBe(satang(result.legPayouts));
  expect(satang(result.legPayouts) + satang(result.preTax), "legs plus payout equal gross").toBe(
    satang(result.gross),
  );
  expect(satang(result.withholdingTax), "tax truncates at 3 percent").toBe(
    Math.floor((satang(result.preTax) * 3) / 100),
  );
  expect(satang(result.net), "net is payout minus tax").toBe(
    satang(result.preTax) - satang(result.withholdingTax),
  );
}

describe("A1 float leakage: the satang path, not a baht Number product", () => {
  it("preset 2 keeps 1,265,569 satang where the float product gives 1,265,570", () => {
    const result = calculateNetwork(NETWORK_PRESETS[1]);
    expect(satang(result.gross)).toBe(1265569);
    expect(satang(result.preTax)).toBe(464569);
    expect(satang(result.withholdingTax)).toBe(13937);
    expect(satang(result.net)).toBe(450632);

    // Control: a float product rounds up one satang and the pin must see it.
    const floatGross = Math.round(specRate(24000) * 24000 * SATANG_PER_BAHT);
    expect(floatGross).toBe(1265570);
    expect(satang(result.gross)).not.toBe(floatGross);
  });

  it("one billion baht keeps 71,422,027,600 satang where the float product gives 71,422,027,583", () => {
    const result = calculateNetwork({
      price: 1000,
      personalStudents: 1_000_000,
      studentsPerLeg: [],
    });
    expect(result.networkVolume).toBe(1e9);
    expect(satang(result.gross)).toBe(71422027600);

    // Control: 17 satang below the BigInt product, the M1 fingerprint of strategy 4.2.
    const floatGross = Math.round(specRate(1e9) * 1e9 * SATANG_PER_BAHT);
    expect(floatGross).toBe(71422027583);
    expect(satang(result.gross) - floatGross).toBe(17);
  });

  it("one quadrillion baht keeps the BigInt satang where the Number product drifts", () => {
    const result = calculateNetwork({
      price: 1000,
      personalStudents: 1_000_000_000_000,
      studentsPerLeg: [],
    });
    expect(result.networkVolume).toBe(1e15);
    expect(result.gross).toBe(714285712000000);
    expect(satang(result.gross)).toBe(71428571200000000);
    expect(satang(result.withholdingTax)).toBe(2142857136000000);
    expect(satang(result.net)).toBe(69285714064000000);

    // Control: the Number product is more than 100,000 satang above the satang product.
    const floatGross = Math.round(specRate(1e15) * 1e15 * SATANG_PER_BAHT);
    expect(Math.abs(floatGross - satang(result.gross))).toBeGreaterThan(100_000);

    // Above 2^53 satang the baht Number return cannot carry every satang, so the
    // exact pin above is the own-only case, where every value is a multiple of 16.
    expect(Number.isSafeInteger(satang(result.gross))).toBe(false);
  });

  it("the 3 percent tax truncates satang where a float product rounds up", () => {
    // GV 3 baht at 40.0015 percent: 120.0045 satang gross becomes 120 satang.
    const result = calculateNetwork({ price: 1, personalStudents: 3, studentsPerLeg: [] });
    expect(result.networkVolume).toBe(3);
    expect(satang(result.gross)).toBe(120);
    expect(satang(result.preTax)).toBe(120);
    expect(satang(result.withholdingTax)).toBe(3);
    expect(satang(result.net)).toBe(117);
    expect(result.withholdingTax).toBe(0.03);
    expect(result.net).toBe(1.17);

    // Control: a float tax rounds 3.6 satang up to 4, and 0.03 to 0.04 baht.
    const floatTax = Math.round(120 * 0.03);
    expect(floatTax).toBe(4);
    expect(satang(result.withholdingTax)).not.toBe(floatTax);
  });

  it("the tax truncates on every payout whose 3 percent lands above a half satang", () => {
    let discriminating = 0;
    for (let price = 1; price <= 40; price += 1) {
      for (let students = 1; students <= 6; students += 1) {
        const result = calculateNetwork({
          price,
          personalStudents: students,
          studentsPerLeg: [],
        });
        const payoutSatang = satang(result.preTax);
        expect(satang(result.withholdingTax), `price ${price} students ${students}`).toBe(
          Math.floor((payoutSatang * 3) / 100),
        );
        if (Math.round(payoutSatang * 0.03) !== Math.floor((payoutSatang * 3) / 100)) {
          discriminating += 1;
        }
      }
    }
    // A grid without a discriminating case would make this check vacuous.
    expect(discriminating).toBeGreaterThan(0);
  });

  it("payoutAfterDeduction returns exact satang from baht Numbers with cents", () => {
    expect(payoutAfterDeduction(12655.69, 4645.69)).toBe(8010);
    expect(payoutAfterDeduction(4645.69, 4645.69)).toBe(0);
    expect(payoutAfterDeduction(0.1, 0.2)).toBe(0);
    expect(payoutAfterDeduction(0.29, 0.28)).toBe(0.01);
  });
});

describe("A2 truncation order and the 1e9 rate scale", () => {
  it("gross truncates the rate-scaled product at 1,032 baht, 418.12 not 418.13", () => {
    const result = calculateNetwork({ price: 1032, personalStudents: 1, studentsPerLeg: [] });
    expect(satang(result.gross)).toBe(41812);
    expect(result.gross).toBe(418.12);
    expect(result.withholdingTax).toBe(12.54);
    expect(result.net).toBe(405.58);

    // Control: rounding the product at the same input gives 418.13.
    const roundedGross = Math.round(specRate(1032) * 1032 * SATANG_PER_BAHT);
    expect(roundedGross).toBe(41813);
    expect(satang(result.gross)).not.toBe(roundedGross);
  });

  it("the rate is scaled at 1e9, not 1e6: 16,681.93 at 30,000 baht", () => {
    const result = calculateNetwork({ price: 3000, personalStudents: 10, studentsPerLeg: [] });
    expect(result.networkVolume).toBe(30000);
    expect(satang(result.gross)).toBe(1668193);

    // Control: a rate rounded to six decimals gives 1,668,195 satang (16,681.95).
    const rateUnitsAt1e6 = BigInt(Math.round(specRate(30000) * 1_000_000));
    const grossAt1e6 = (rateUnitsAt1e6 * BigInt(3000000)) / 1_000_000n;
    expect(grossAt1e6).toBe(1668195n);
    expect(BigInt(satang(result.gross))).not.toBe(grossAt1e6);
  });

  it("D-3 reproduces the gross satang over a matrix of volumes", () => {
    const matrix = [
      { price: 1, personalStudents: 1, studentsPerLeg: [] },
      { price: 1, personalStudents: 3, studentsPerLeg: [] },
      { price: 1032, personalStudents: 1, studentsPerLeg: [] },
      { price: 3000, personalStudents: 4, studentsPerLeg: [] },
      { price: 19999.99, personalStudents: 1, studentsPerLeg: [] },
      { price: 20000, personalStudents: 1, studentsPerLeg: [] },
      { price: 20000.01, personalStudents: 1, studentsPerLeg: [] },
      { price: 3000, personalStudents: 10, studentsPerLeg: [] },
      { price: 3000, personalStudents: 2, studentsPerLeg: [3, 3] },
      { price: 3000, personalStudents: 2, studentsPerLeg: [3, 3, 3] },
      { price: 3000, personalStudents: 0, studentsPerLeg: [3, 3] },
      { price: 3000, personalStudents: 1, studentsPerLeg: [2.9] },
      { price: 1000, personalStudents: 0, studentsPerLeg: [0, 0] },
    ] as const;

    let roundingCells = 0;
    for (const input of matrix) {
      const result = calculateNetwork(input);
      expect(
        BigInt(satang(result.gross)),
        `gross at ${JSON.stringify(input)}`,
      ).toBe(specGrossSatang(result.networkVolume));
      expectSatangConservation(result);
      if (Math.round(specRate(result.networkVolume) * result.networkVolume * SATANG_PER_BAHT) !== satang(result.gross)) {
        roundingCells += 1;
      }
    }
    // A matrix with no cell where rounding differs would not test the truncation.
    expect(roundingCells).toBeGreaterThan(0);
  });
});

describe("A3 boundaries", () => {
  it("V just below 20,000 uses the linear branch and V at 20,000 is exactly 50 percent", () => {
    expect(commissionRate(19999.99)).toBe(0.4 + 19999.99 / 200000);
    expect((commissionRate(19999.99) * 100).toFixed(8)).toBe("49.99999500");
    expect(commissionRate(20000)).toBe(0.5);
    expect((commissionRate(20000) * 100).toFixed(8)).toBe("50.00000000");
    expect(commissionRate(20000.01)).toBeGreaterThan(0.5);

    const below = calculateNetwork({ price: 19999.99, personalStudents: 1, studentsPerLeg: [] });
    expect(satang(below.gross)).toBe(999999);
    expect(below.withholdingTax).toBe(299.99);
    expect(below.net).toBe(9700);

    const at = calculateNetwork({ price: 20000, personalStudents: 1, studentsPerLeg: [] });
    expect(satang(at.gross)).toBe(1000000);
    expect(at.gross).toBe(10000);
    expect(at.withholdingTax).toBe(300);
    expect(at.net).toBe(9700);
  });

  it("the ceiling at 0.5 / 0.7 holds at 1e9, 1e15 and MAX_SAFE_INTEGER", () => {
    const ceiling = 0.5 / 0.7;
    expect(commissionRate(1e9)).toBeLessThan(ceiling);
    expect(commissionRate(1e15)).toBeLessThan(ceiling);
    expect(commissionRate(Number.MAX_SAFE_INTEGER)).toBeLessThan(ceiling);
    expect(commissionRate(1e9)).toBeGreaterThan(0.71);
    expect(commissionRate(1e15)).toBeGreaterThan(commissionRate(1e9));
    expect(commissionRate(Number.MAX_SAFE_INTEGER)).toBeGreaterThan(commissionRate(1e15));
  });

  it("the payout floor holds at 0 baht and below", () => {
    expect(payoutAfterDeduction(0, 0)).toBe(0);
    expect(payoutAfterDeduction(100, 150)).toBe(0);
    expect(payoutAfterDeduction(0, 150)).toBe(0);
    expect(payoutAfterDeduction(-5, 3)).toBe(0);
    expect(payoutAfterDeduction(0.01, 0.01)).toBe(0);
    expect(payoutAfterDeduction(0.01, 0)).toBe(0.01);
  });

  it("one baht of volume pays 0.40 gross, 0.01 tax and 0.39 net", () => {
    const result = calculateNetwork({ price: 1, personalStudents: 1, studentsPerLeg: [] });
    expect(result.ownVolume).toBe(1);
    expect(result.networkVolume).toBe(1);
    expect((result.rate * 100).toFixed(6)).toBe("40.000500");
    expect(satang(result.gross)).toBe(40);
    expect(satang(result.preTax)).toBe(40);
    expect(satang(result.withholdingTax)).toBe(1);
    expect(satang(result.net)).toBe(39);
    expect(result.net).toBe(0.39);
    expect(explainVariant(result)).toBe("ownOnly");
    expectSatangConservation(result);
  });

  it("a billion baht with a leg stays conserved in satang", () => {
    const result = calculateNetwork({
      price: 1000,
      personalStudents: 999_000,
      studentsPerLeg: [1000],
    });
    expect(result.networkVolume).toBe(1e9);
    expect(satang(result.gross)).toBe(71422027600);
    expect(satang(result.legs[0].payout)).toBe(70280301);
    expect(satang(result.legPayouts)).toBe(70280301);
    expectSatangConservation(result);
  });
});

describe("A4 hostile inputs clamp and stay finite", () => {
  it("NaN, Infinity and -Infinity give zero money in every field", () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const asPrice = calculateNetwork({
        price: value,
        personalStudents: 4,
        studentsPerLeg: [3, 3],
      });
      expect(asPrice.networkVolume, `price ${value}`).toBe(0);
      expect(asPrice.gross).toBe(0);
      expect(asPrice.net).toBe(0);
      expectSatangConservation(asPrice);

      const asStudents = calculateNetwork({
        price: CLASS_PRICE_DEFAULT,
        personalStudents: value,
        studentsPerLeg: [value, value],
      });
      expect(asStudents.networkVolume, `students ${value}`).toBe(0);
      expect(asStudents.gross).toBe(0);
      expectSatangConservation(asStudents);
    }
    expect(commissionRate(-Infinity)).toBe(0);
    expect(commissionRate(1e-9)).toBeGreaterThan(0.4);
  });

  it("-0 never reaches a money field", () => {
    const result = calculateNetwork({
      price: -0,
      personalStudents: -0,
      studentsPerLeg: [-0],
    });
    expect(Object.is(result.ownVolume, -0)).toBe(false);
    expect(Object.is(result.networkVolume, -0)).toBe(false);
    expect(Object.is(result.gross, -0)).toBe(false);
    expect(Object.is(result.net, -0)).toBe(false);
    expect(Object.is(result.legs[0].volume, -0)).toBe(false);
    expect(result.networkVolume).toBe(0);
    expect(explainVariant(result)).toBe("zero");
  });

  it("fractional and negative leg counts become whole students of 0 or more", () => {
    const fractional = calculateNetwork({
      price: 3000,
      personalStudents: 1,
      studentsPerLeg: [2.9],
    });
    expect(fractional.legs).toEqual([{ leg: 1, students: 2, volume: 6000, payout: 2580 }]);
    expect(fractional.networkVolume).toBe(9000);
    expect(fractional.gross).toBe(4005);
    expect(fractional.withholdingTax).toBe(42.75);
    expect(fractional.net).toBe(1382.25);
    expectSatangConservation(fractional);

    const hostile = calculateNetwork({
      price: 3000,
      personalStudents: 1,
      studentsPerLeg: [2.5, -1, NaN],
    });
    expect(hostile.legs.map((leg) => leg.students)).toEqual([2, 0, 0]);
    expectSatangConservation(hostile);
  });

  it("a million legs stay conserved in satang", () => {
    const result = calculateNetwork({
      price: 1000,
      personalStudents: 0,
      studentsPerLeg: new Array(1_000_000).fill(3),
    });
    expect(result.legs).toHaveLength(1_000_000);
    expect(result.legs[0]).toEqual({ leg: 1, students: 3, volume: 3000, payout: 1245 });
    expect(result.legs[999_999]).toEqual({
      leg: 1_000_000,
      students: 3,
      volume: 3000,
      payout: 1245,
    });
    expect(result.networkVolume).toBe(3_000_000_000);
    expect(satang(result.gross)).toBe(214277083800);
    expect(satang(result.legPayouts)).toBe(124500000000);
    expect(satang(result.preTax)).toBe(89777083800);
    expect(satang(result.withholdingTax)).toBe(2693312514);
    expect(satang(result.net)).toBe(87083771286);
    expectSatangConservation(result);
  });

  it("price 0 with legs, students 0 with legs, and no legs with students", () => {
    const zeroPrice = calculateNetwork({
      price: 0,
      personalStudents: 4,
      studentsPerLeg: [3, 3],
    });
    expect(zeroPrice.legs).toEqual([
      { leg: 1, students: 3, volume: 0, payout: 0 },
      { leg: 2, students: 3, volume: 0, payout: 0 },
    ]);
    expect(zeroPrice.networkVolume).toBe(0);
    expect(explainVariant(zeroPrice)).toBe("zero");
    expectSatangConservation(zeroPrice);

    const zeroStudents = calculateNetwork({
      price: 3000,
      personalStudents: 0,
      studentsPerLeg: [0, 0],
    });
    expect(zeroStudents.legPayouts).toBe(0);
    expect(zeroStudents.gross).toBe(0);
    expect(explainVariant(zeroStudents)).toBe("zero");
    expectSatangConservation(zeroStudents);

    const ownOnly = calculateNetwork({
      price: 3000,
      personalStudents: 4,
      studentsPerLeg: [],
    });
    expect(ownOnly.networkVolume).toBe(12000);
    expect(ownOnly.legPayouts).toBe(0);
    expect(explainVariant(ownOnly)).toBe("ownOnly");
    expectSatangConservation(ownOnly);
  });

  it("resizeLegs clamps a hostile count and hostile entries", () => {
    expect(resizeLegs([], NaN)).toEqual([]);
    expect(resizeLegs([], Infinity)).toEqual([]);
    expect(resizeLegs([], -1)).toEqual([]);
    expect(resizeLegs([], 2.9)).toEqual([3, 3]);
    expect(resizeLegs([NaN, -2, 4], 3)).toEqual([0, 0, 4]);
    expect(resizeLegs(new Array(1000).fill(3), 1000)).toHaveLength(1000);
  });
});

describe("A6 finite input whose product overflows", () => {
  it("a finite price whose volume overflows returns finite money instead of throwing", () => {
    // 1e307 baht times one student passes the input clamp (finite and positive) but
    // the satang conversion overflows, and BigInt(Infinity) throws a RangeError.
    const hugePrice = calculateNetwork({
      price: 1e307,
      personalStudents: 1,
      studentsPerLeg: [],
    });
    expect(Number.isFinite(hugePrice.networkVolume)).toBe(true);
    expect(Number.isFinite(hugePrice.gross)).toBe(true);
    expect(hugePrice.gross).toBe(0);
    expectSatangConservation(hugePrice);

    // A finite price times a finite count overflows before the satang step.
    const hugeProduct = calculateNetwork({
      price: 1e306,
      personalStudents: 1000,
      studentsPerLeg: [],
    });
    expect(Number.isFinite(hugeProduct.networkVolume)).toBe(true);
    expectSatangConservation(hugeProduct);

    // The same overflow through one leg.
    const hugeLeg = calculateNetwork({
      price: 1e306,
      personalStudents: 0,
      studentsPerLeg: [1000],
    });
    expect(Number.isFinite(hugeLeg.networkVolume)).toBe(true);
    expectSatangConservation(hugeLeg);
  });
});

describe("A5 conservation under every attack input", () => {
  const attacks = [
    { label: "preset 2", input: NETWORK_PRESETS[1] },
    { label: "preset 3", input: NETWORK_PRESETS[2] },
    { label: "one baht", input: { price: 1, personalStudents: 1, studentsPerLeg: [] } },
    { label: "just below 20,000", input: { price: 19999.99, personalStudents: 1, studentsPerLeg: [] } },
    { label: "at 20,000", input: { price: 20000, personalStudents: 1, studentsPerLeg: [] } },
    { label: "empty legs", input: { price: 3000, personalStudents: 0, studentsPerLeg: [] } },
    { label: "legs of 0 students", input: { price: 3000, personalStudents: 4, studentsPerLeg: [0, 0] } },
    { label: "price 0 with legs", input: { price: 0, personalStudents: 4, studentsPerLeg: [3, 3] } },
    { label: "fractional legs", input: { price: 3000, personalStudents: 1, studentsPerLeg: [2.5, 2.9] } },
    { label: "NaN leg", input: { price: 3000, personalStudents: 4, studentsPerLeg: [NaN] } },
    { label: "negative leg", input: { price: 3000, personalStudents: 4, studentsPerLeg: [-3] } },
    { label: "two legs with no own students", input: { price: 3000, personalStudents: 0, studentsPerLeg: [3, 3] } },
  ] as const;

  it("leg payouts plus payout equal the gross satang for every attack", () => {
    for (const attack of attacks) {
      const result = calculateNetwork(attack.input);
      expectSatangConservation(result);
    }
  });

  it("a zero payout carries no tax and no net", () => {
    const result = calculateNetwork({
      price: 3000,
      personalStudents: 0,
      studentsPerLeg: [],
    });
    expect(result.preTax).toBe(0);
    expect(result.withholdingTax).toBe(0);
    expect(result.net).toBe(0);
    expect(explainVariant(result)).toBe("zero");
  });
});
