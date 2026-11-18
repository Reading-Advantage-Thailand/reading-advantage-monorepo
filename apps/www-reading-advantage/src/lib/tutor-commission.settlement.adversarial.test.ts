/**
 * Phase 3 adversarial parity probes for the commission module against an independent
 * model of the settlement system (track www_tutor_calculator_20261117; spec D-1, D-3,
 * D-18, AC-3, AC-20, AC-21).
 *
 * The page says: "The calculator uses the same formula as our settlement system." These
 * cases check that claim with a model written from the settlement code, not from the
 * module. The model keeps money as BigInt satang, builds a tutor node with one child node
 * per leg, and settles the tree bottom up the way the settlement service does:
 *
 * - rate:     finance-mlm-service commissionService.ts, calculateCommissionRate
 * - gross:    commissionService.ts, calculatePayoutMinor (BigInt division, truncates)
 * - tax:      taxService.ts line 4, `(gross * 3n + 50n) / 100n` (half up)
 * - D-18:     settlementService.ts lines 536 to 548 (no own volume and a child pays 0)
 *
 * The model is written out below. No test reads a file outside the repository, no test
 * reads production source as text, and no test computes a hash.
 *
 * Every check family has a control: a wrong result that the same comparison must flag.
 * A comparison that cannot fire would let a wrong module pass.
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
  type LegResult,
  type NetworkInput,
  type NetworkResult,
} from "@/lib/tutor-commission";

/* -------------------------------------------------------------------------- */
/* The settlement model                                                       */
/* -------------------------------------------------------------------------- */

const RATE_SCALE = 1_000_000_000n;
const BASE_RATE = 0.5;

/**
 * The settlement rate for a group volume in baht.
 * @param volumeBaht The group volume in baht.
 * @returns The rate from 0 to 1.
 */
function settlementRate(volumeBaht: number): number {
  if (!Number.isFinite(volumeBaht) || volumeBaht <= 0) return 0;
  if (volumeBaht >= 20000) {
    return (
      (BASE_RATE * (1 - Math.pow(0.3, 1 + Math.log(volumeBaht / 20000) / Math.log(5)))) / 0.7
    );
  }
  return 0.4 + volumeBaht / 200000;
}

/**
 * The settlement rate in fixed-point units of 10^-9, the scale that money uses.
 * @param rate The rate from 0 to 1.
 * @returns The rate in units.
 */
function rateUnits(rate: number): bigint {
  return BigInt(Math.round(rate * Number(RATE_SCALE)));
}

/**
 * The settlement payout in satang: BigInt division that truncates.
 * @param volumeMinor The group volume in satang.
 * @param rate The rate from 0 to 1.
 * @returns The payout in satang.
 */
function settlementPayoutMinor(volumeMinor: bigint, rate: number): bigint {
  if (volumeMinor <= 0n || rate <= 0) return 0n;
  return (volumeMinor * rateUnits(rate)) / RATE_SCALE;
}

/**
 * The settlement withholding tax: 3 percent, half up, in satang.
 * @param grossPayoutMinor The payout before tax in satang.
 * @returns The tax and the net payout in satang.
 */
function settlementWithholding(grossPayoutMinor: bigint): { tax: bigint; net: bigint } {
  const tax = (grossPayoutMinor * 3n + 50n) / 100n;
  return { tax, net: grossPayoutMinor - tax };
}

/** One tutor node of the settlement tree. */
type SettlementNode = {
  personalVolumeMinor: bigint;
  children: SettlementNode[];
  groupVolumeMinor: bigint;
  grossMinor: bigint;
  payoutMinor: bigint;
};

/**
 * Builds a node with no result yet.
 * @param personalVolumeMinor The own volume in satang.
 * @param children The child nodes.
 * @returns The node.
 */
function makeNode(personalVolumeMinor: bigint, children: SettlementNode[] = []): SettlementNode {
  return { personalVolumeMinor, children, groupVolumeMinor: 0n, grossMinor: 0n, payoutMinor: 0n };
}

/**
 * Computes the group volume of a node bottom up.
 * @param node The node.
 * @returns The group volume in satang.
 */
function settleVolume(node: SettlementNode): bigint {
  let total = node.personalVolumeMinor;
  for (const child of node.children) total += settleVolume(child);
  node.groupVolumeMinor = total;
  return total;
}

/**
 * Computes the payout of a node: children first, then the node itself.
 * @param node The node.
 * @returns The payout of the node in satang.
 */
function settlePayout(node: SettlementNode): bigint {
  const rate = settlementRate(Number(node.groupVolumeMinor) / 100);
  let childPayouts = 0n;
  for (const child of node.children) childPayouts += settlePayout(child);

  node.grossMinor = settlementPayoutMinor(node.groupVolumeMinor, rate);
  let payoutForMe = node.grossMinor - childPayouts;
  if (payoutForMe < 0n) payoutForMe = 0n;
  if (node.personalVolumeMinor === 0n && node.children.length > 0) payoutForMe = 0n;
  node.payoutMinor = payoutForMe;
  return payoutForMe;
}

/** The settlement outcome for one calculator input, all money in satang. */
type Settled = {
  ownVolumeMinor: bigint;
  networkVolumeMinor: bigint;
  rateUnits: bigint;
  grossMinor: bigint;
  legVolumeMinor: bigint[];
  legPayoutMinor: bigint[];
  legPayoutsMinor: bigint;
  payoutMinor: bigint;
  taxMinor: bigint;
  netMinor: bigint;
  legCount: number;
};

/**
 * Clamps a student count the way spec 5.2 item 1 states: not finite or negative gives 0.
 * @param value The raw count.
 * @returns A whole number of 0 or more.
 */
function wholeStudents(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Settles one calculator input through the model.
 * @param priceMinor The class package price in satang.
 * @param personalStudents The own students.
 * @param studentsPerLeg The students of each leg.
 * @returns The settlement outcome.
 */
function settleInput(
  priceMinor: bigint,
  personalStudents: number,
  studentsPerLeg: readonly number[],
): Settled {
  const legNodes = studentsPerLeg.map((students) =>
    makeNode(priceMinor * BigInt(wholeStudents(students))),
  );
  const tutor = makeNode(priceMinor * BigInt(wholeStudents(personalStudents)), legNodes);
  settleVolume(tutor);
  settlePayout(tutor);

  const rate = settlementRate(Number(tutor.groupVolumeMinor) / 100);
  const withholding = tutor.payoutMinor > 0n ? settlementWithholding(tutor.payoutMinor) : null;
  return {
    ownVolumeMinor: tutor.personalVolumeMinor,
    networkVolumeMinor: tutor.groupVolumeMinor,
    rateUnits: rateUnits(rate),
    grossMinor: tutor.grossMinor,
    legVolumeMinor: legNodes.map((node) => node.personalVolumeMinor),
    legPayoutMinor: legNodes.map((node) => node.payoutMinor),
    legPayoutsMinor: legNodes.reduce((sum, node) => sum + node.payoutMinor, 0n),
    payoutMinor: tutor.payoutMinor,
    taxMinor: withholding?.tax ?? 0n,
    netMinor: withholding?.net ?? 0n,
    legCount: legNodes.length,
  };
}

/**
 * The explain variant the spec names for a settled input (spec D-6).
 * @param settled The settlement outcome.
 * @returns "zero" for no volume, "needsOwnStudents" for legs without own volume,
 * "ownOnly" for no leg payouts, else "withLegs".
 */
function settledVariant(
  settled: Settled,
): "zero" | "needsOwnStudents" | "ownOnly" | "withLegs" {
  if (settled.networkVolumeMinor === 0n) return "zero";
  if (settled.ownVolumeMinor === 0n) return "needsOwnStudents";
  if (settled.legPayoutsMinor === 0n) return "ownOnly";
  return "withLegs";
}

/* -------------------------------------------------------------------------- */
/* The comparison                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Converts a baht Number the module returned to whole satang.
 * @param baht The amount in baht.
 * @returns The amount in satang.
 */
function toMinor(baht: number): bigint {
  return BigInt(Math.round(baht * 100));
}

/**
 * Lists every field where a module result differs from the settlement outcome.
 * @param result The module result.
 * @param settled The settlement outcome.
 * @returns The names of the differing fields, empty when the two agree.
 */
function differences(result: NetworkResult, settled: Settled): string[] {
  const found: string[] = [];
  const check = (name: string, actual: bigint, expected: bigint) => {
    if (actual !== expected) found.push(`${name}: module ${actual} settlement ${expected}`);
  };
  check("ownVolume", toMinor(result.ownVolume), settled.ownVolumeMinor);
  check("networkVolume", toMinor(result.networkVolume), settled.networkVolumeMinor);
  check("rate", rateUnits(result.rate), settled.rateUnits);
  check("gross", toMinor(result.gross), settled.grossMinor);
  check("legPayouts", toMinor(result.legPayouts), settled.legPayoutsMinor);
  check("preTax", toMinor(result.preTax), settled.payoutMinor);
  check("withholdingTax", toMinor(result.withholdingTax), settled.taxMinor);
  check("net", toMinor(result.net), settled.netMinor);
  if (result.legs.length !== settled.legCount) {
    found.push(`legs: module ${result.legs.length} settlement ${settled.legCount}`);
  }
  result.legs.forEach((leg: LegResult, index) => {
    if (leg.leg !== index + 1) found.push(`leg ${index + 1}: numeral ${leg.leg}`);
    check(`leg ${index + 1} volume`, toMinor(leg.volume), settled.legVolumeMinor[index] ?? -1n);
    check(`leg ${index + 1} payout`, toMinor(leg.payout), settled.legPayoutMinor[index] ?? -1n);
  });
  const variant = explainVariant(result);
  if (variant !== settledVariant(settled)) {
    found.push(`variant: module ${variant} settlement ${settledVariant(settled)}`);
  }
  return found;
}

/**
 * Runs the module and the model on one satang-exact input and returns the differences.
 * @param priceMinor The price in satang.
 * @param personalStudents The own students.
 * @param studentsPerLeg The students of each leg.
 * @returns The names of the differing fields.
 */
function compareInput(
  priceMinor: bigint,
  personalStudents: number,
  studentsPerLeg: readonly number[],
): string[] {
  const input: NetworkInput = {
    price: Number(priceMinor) / 100,
    personalStudents,
    studentsPerLeg,
  };
  return differences(
    calculateNetwork(input),
    settleInput(priceMinor, personalStudents, studentsPerLeg),
  );
}

/**
 * A seeded generator so that a run repeats exactly.
 * @param seed The seed.
 * @returns A function that returns a number from 0 up to, not including, 1.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks a whole number from a closed range.
 * @param random The generator.
 * @param low The lowest value.
 * @param high The highest value.
 * @returns The value.
 */
function between(random: () => number, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1));
}

/**
 * Finds the first one-student price whose payout ends in an exact half satang, so that
 * 3 percent of it is an exact tie.
 * @returns The price in satang.
 */
function findTiePrice(): bigint {
  for (let priceMinor = 100000n; priceMinor < 400000n; priceMinor += 1n) {
    if (settleInput(priceMinor, 1, []).payoutMinor % 100n === 50n) return priceMinor;
  }
  throw new Error("no tie price in the search range");
}

/* -------------------------------------------------------------------------- */
/* The model against the published spec numbers                               */
/* -------------------------------------------------------------------------- */

describe("S0 the model reproduces the spec numbers, so the comparison is not circular", () => {
  it("returns the six rates of spec section 3 to four decimals", () => {
    const expected: Array<[number, string]> = [
      [1000, "40.5000"],
      [5000, "42.5000"],
      [10000, "45.0000"],
      [20000, "50.0000"],
      [30000, "55.6065"],
      [50000, "60.6315"],
    ];
    for (const [volume, text] of expected) {
      expect((settlementRate(volume) * 100).toFixed(4), `volume ${volume}`).toBe(text);
    }
  });

  it("returns the three preset outcomes of spec D-2 in satang", () => {
    const [one, two, three] = NETWORK_PRESETS.map((preset) =>
      settleInput(
        BigInt(Math.round(preset.price * 100)),
        preset.personalStudents,
        preset.studentsPerLeg,
      ),
    );
    expect(one).toMatchObject({ grossMinor: 552000n, legPayoutsMinor: 0n, payoutMinor: 552000n });
    expect(one).toMatchObject({ taxMinor: 16560n, netMinor: 535440n });
    expect(two).toMatchObject({ grossMinor: 1265569n, legPayoutsMinor: 801000n });
    expect(two).toMatchObject({ payoutMinor: 464569n, taxMinor: 13937n, netMinor: 450632n });
    expect(three).toMatchObject({ grossMinor: 2483345n, legPayoutsMinor: 1656000n });
    expect(three).toMatchObject({ payoutMinor: 827345n, taxMinor: 24820n, netMinor: 802525n });
  });

  it("returns the half-up tax of spec D-3 for a price of 1,007 baht", () => {
    expect(settleInput(100700n, 1, [])).toMatchObject({
      grossMinor: 40787n,
      taxMinor: 1224n,
      netMinor: 39563n,
    });
  });

  it("pays 0 to a tutor with legs and no own students (D-18) and keeps the gross", () => {
    const settled = settleInput(300000n, 0, [3, 3]);
    expect(settled.grossMinor).toBeGreaterThan(0n);
    expect(settled.legPayoutsMinor).toBeGreaterThan(0n);
    expect(settled).toMatchObject({ payoutMinor: 0n, taxMinor: 0n, netMinor: 0n });
  });
});

/* -------------------------------------------------------------------------- */
/* Controls: the comparison fires on a wrong result                           */
/* -------------------------------------------------------------------------- */

describe("S1 controls: the comparison flags each wrong implementation", () => {
  it("accepts the real module result for each preset", () => {
    for (const preset of NETWORK_PRESETS) {
      expect(
        compareInput(
          BigInt(Math.round(preset.price * 100)),
          preset.personalStudents,
          preset.studentsPerLeg,
        ),
      ).toEqual([]);
    }
  });

  it("flags a gross that is rounded and not truncated", () => {
    const result = calculateNetwork(NETWORK_PRESETS[1]);
    const rounded = Math.round(result.rate * result.networkVolume * 100) / 100;
    expect(rounded).toBe(12655.7);
    const found = differences({ ...result, gross: rounded }, settleInput(300000n, 2, [3, 3]));
    expect(found.some((line) => line.startsWith("gross"))).toBe(true);
  });

  it("flags a tax that is truncated and not rounded half up", () => {
    const priceMinor = findTiePrice();
    const settled = settleInput(priceMinor, 1, []);
    const result = calculateNetwork({
      price: Number(priceMinor) / 100,
      personalStudents: 1,
      studentsPerLeg: [],
    });
    expect(differences(result, settled)).toEqual([]);

    const truncatedTax = Number((settled.payoutMinor * 3n) / 100n) / 100;
    expect(truncatedTax).toBeLessThan(result.withholdingTax);
    const wrong: NetworkResult = {
      ...result,
      withholdingTax: truncatedTax,
      net: result.preTax - truncatedTax,
    };
    const found = differences(wrong, settled);
    expect(found.some((line) => line.startsWith("withholdingTax"))).toBe(true);
    expect(found.some((line) => line.startsWith("net"))).toBe(true);
  });

  it("flags a tutor with legs and no own students that is paid the remainder", () => {
    const result = calculateNetwork({ price: 3000, personalStudents: 0, studentsPerLeg: [3, 3] });
    const remainder = result.gross - result.legPayouts;
    expect(remainder).toBeGreaterThan(0);
    const wrong: NetworkResult = { ...result, preTax: remainder, net: remainder };
    const found = differences(wrong, settleInput(300000n, 0, [3, 3]));
    expect(found.some((line) => line.startsWith("preTax"))).toBe(true);
    expect(found.some((line) => line.startsWith("net"))).toBe(true);
  });

  it("flags a missing leg row and a leg row that is renumbered", () => {
    const result = calculateNetwork(NETWORK_PRESETS[2]);
    const settled = settleInput(300000n, 2, [4, 4, 4]);
    expect(differences({ ...result, legs: result.legs.slice(1) }, settled).length).toBeGreaterThan(0);
    const renumbered = result.legs.map((leg) => ({ ...leg, leg: 1 }));
    expect(differences({ ...result, legs: renumbered }, settled).length).toBeGreaterThan(0);
  });

  it("flags the explain variant of a result that pretends to have own volume", () => {
    const result = calculateNetwork({ price: 3000, personalStudents: 0, studentsPerLeg: [3] });
    const settled = settleInput(300000n, 0, [3]);
    expect(differences(result, settled)).toEqual([]);
    expect(explainVariant(result)).toBe("needsOwnStudents");
    // With an own volume on the result, the module names withLegs and settlement still names needsOwnStudents.
    const found = differences({ ...result, ownVolume: 9000 }, settled);
    expect(found.some((line) => line.startsWith("variant"))).toBe(true);
  });

  it("flags a rate that is off by one unit of 10^-9", () => {
    const result = calculateNetwork(NETWORK_PRESETS[2]);
    const settled = settleInput(300000n, 2, [4, 4, 4]);
    const found = differences({ ...result, rate: result.rate + 2e-9 }, settled);
    expect(found.some((line) => line.startsWith("rate"))).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Random and edge parity                                                     */
/* -------------------------------------------------------------------------- */

describe("S2 random parity with the settlement model", () => {
  it("matches the model on 20,000 seeded satang-exact inputs", () => {
    const random = seeded(20261117);
    const typicalPrices = [100000n, 150000n, 200000n, 250000n, 300000n, 350000n, 400000n, 500000n];
    const coverage = {
      zero: 0,
      needsOwnStudents: 0,
      ownOnly: 0,
      withLegs: 0,
      ineligible: 0,
      ties: 0,
      legs: 0,
    };
    const failures: string[] = [];

    for (let sample = 0; sample < 20000; sample += 1) {
      const priceMinor =
        random() < 0.6
          ? typicalPrices[between(random, 0, typicalPrices.length - 1)]!
          : BigInt(between(random, 1, 20_000_000));
      const own = random() < 0.15 ? 0 : between(random, 0, 60);
      const legCount = between(random, 0, 12);
      const legs = Array.from({ length: legCount }, () =>
        random() < 0.1 ? 0 : between(random, 0, 60),
      );

      const mismatch = compareInput(priceMinor, own, legs);
      if (mismatch.length > 0 && failures.length < 5) {
        failures.push(
          `price ${priceMinor} own ${own} legs ${JSON.stringify(legs)}: ${mismatch.join("; ")}`,
        );
      }

      const settled = settleInput(priceMinor, own, legs);
      coverage[settledVariant(settled)] += 1;
      if (settled.ownVolumeMinor === 0n && legs.length > 0 && settled.networkVolumeMinor > 0n) {
        coverage.ineligible += 1;
      }
      if (settled.payoutMinor > 0n && (settled.payoutMinor * 3n) % 100n === 50n) {
        coverage.ties += 1;
      }
      if (legs.length > 0) coverage.legs += 1;

      // The deduction never exceeds the gross, so the zero floor never hides a negative payout.
      if (settled.legPayoutsMinor > settled.grossMinor && failures.length < 5) {
        failures.push(`deduction above gross: price ${priceMinor} legs ${JSON.stringify(legs)}`);
      }
    }

    expect(failures, "inputs where the module and the model differ").toEqual([]);
    // The sample must reach each branch, or a pass would prove nothing.
    expect(coverage.zero).toBeGreaterThan(100);
    expect(coverage.needsOwnStudents).toBeGreaterThan(100);
    expect(coverage.ownOnly).toBeGreaterThan(100);
    expect(coverage.withLegs).toBeGreaterThan(1000);
    expect(coverage.ineligible).toBeGreaterThan(100);
    expect(coverage.ties).toBeGreaterThan(50);
    expect(coverage.legs).toBeGreaterThan(10000);
  });

  it("matches the model on volumes within 3 satang of the 20,000 baht rate boundary", () => {
    const random = seeded(48151623);
    const side = { below: 0, at: 0, above: 0 };
    for (let sample = 0; sample < 4000; sample += 1) {
      const students = between(random, 1, 16);
      const delta = between(random, -3, 3);
      const priceMinor = BigInt(Math.floor(2_000_000 / students) + delta);
      // Split the students between the tutor and up to 3 legs at random.
      const legCount = between(random, 0, 3);
      const buckets = new Array<number>(legCount + 1).fill(0);
      for (let student = 0; student < students; student += 1) {
        const slot = between(random, 0, legCount);
        buckets[slot] = (buckets[slot] ?? 0) + 1;
      }
      const [own = 0, ...legs] = buckets;
      expect(
        compareInput(priceMinor, own, legs),
        `price ${priceMinor} own ${own} legs ${JSON.stringify(legs)}`,
      ).toEqual([]);

      const volume = settleInput(priceMinor, own, legs).networkVolumeMinor;
      if (volume < 2_000_000n) side.below += 1;
      else if (volume === 2_000_000n) side.at += 1;
      else side.above += 1;
    }
    // The sample sits below, exactly on, and above the boundary.
    expect(side.below).toBeGreaterThan(100);
    expect(side.at).toBeGreaterThan(20);
    expect(side.above).toBeGreaterThan(100);
  });

  it("matches the model on a leg that sits exactly at 20,000 baht", () => {
    for (const students of [1, 2, 4, 5, 8, 10, 16, 20, 25, 40]) {
      const priceMinor = BigInt(2_000_000 / students);
      expect(compareInput(priceMinor, 1, [students]), `leg of ${students} students`).toEqual([]);
      expect(compareInput(priceMinor, students, [students, 1]), `own ${students}`).toEqual([]);
    }
  });

  it("matches the model for large volumes where a Number product would drift", () => {
    const cases: Array<[bigint, number, number[]]> = [
      [100000n, 1_000_000, []],
      [100000n, 999_000, [1000]],
      [123457n, 40_000, [30_000, 50_000, 7]],
      [999999n, 5_000, [5_000, 5_000, 5_000]],
      [300000n, 0, new Array<number>(500).fill(3)],
    ];
    for (const [priceMinor, own, legs] of cases) {
      expect(compareInput(priceMinor, own, legs), `price ${priceMinor} own ${own}`).toEqual([]);
    }
  });

  it("matches the model on hostile counts after the spec clamp", () => {
    const hostile = [NaN, Infinity, -Infinity, -1, -0, 0.4, 0.99, 1.5, 2.9, 1e3];
    for (const own of hostile) {
      for (const leg of hostile) {
        const result = calculateNetwork({
          price: 3000,
          personalStudents: own,
          studentsPerLeg: [leg, 3, leg],
        });
        expect(
          differences(result, settleInput(300000n, own, [leg, 3, leg])),
          `own ${own} leg ${leg}`,
        ).toEqual([]);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* D-18 eligibility                                                           */
/* -------------------------------------------------------------------------- */

describe("S3 D-18 eligibility truth table against settlement", () => {
  const rows: Array<{ label: string; own: number; legs: number[]; paid: boolean }> = [
    { label: "no own, no legs", own: 0, legs: [], paid: false },
    { label: "no own, one leg of 3", own: 0, legs: [3], paid: false },
    { label: "no own, two legs", own: 0, legs: [3, 3], paid: false },
    { label: "no own, one leg of 0", own: 0, legs: [0], paid: false },
    { label: "no own, legs of 0 and 5", own: 0, legs: [0, 5], paid: false },
    { label: "own 1, no legs", own: 1, legs: [], paid: true },
    { label: "own 1, one leg of 0", own: 1, legs: [0], paid: true },
    { label: "own 1, one leg of 3", own: 1, legs: [3], paid: true },
    { label: "own 2.9 (floors to 2), two legs", own: 2.9, legs: [4, 4], paid: true },
    { label: "own 0.9 (floors to 0), one leg", own: 0.9, legs: [4], paid: false },
  ];

  for (const row of rows) {
    it(`${row.label}: the payout, tax, and net match settlement`, () => {
      const result = calculateNetwork({
        price: 3000,
        personalStudents: row.own,
        studentsPerLeg: row.legs,
      });
      const settled = settleInput(300000n, row.own, row.legs);
      expect(differences(result, settled)).toEqual([]);
      if (!row.paid && settled.networkVolumeMinor > 0n) {
        // An unpaid tutor still has a volume, a rate, a gross, and leg commissions.
        expect(result.networkVolume).toBeGreaterThan(0);
        expect(result.rate).toBeGreaterThan(0);
        expect(result.gross).toBeGreaterThan(0);
        expect(result.legPayouts).toBeGreaterThan(0);
        expect(Object.is(result.preTax, 0)).toBe(true);
        expect(Object.is(result.withholdingTax, 0)).toBe(true);
        expect(Object.is(result.net, 0)).toBe(true);
        expect(explainVariant(result)).toBe("needsOwnStudents");
      }
      if (row.paid && settled.networkVolumeMinor > 0n) {
        expect(result.net).toBeGreaterThan(0);
        expect(explainVariant(result)).not.toBe("zero");
      }
    });
  }

  it("never returns negative zero or NaN in any money field for an unpaid tutor", () => {
    const result = calculateNetwork({ price: 3000, personalStudents: 0, studentsPerLeg: [3, 3] });
    const money = [
      result.ownVolume,
      result.networkVolume,
      result.rate,
      result.gross,
      result.legPayouts,
      result.preTax,
      result.withholdingTax,
      result.net,
      ...result.legs.flatMap((leg) => [leg.volume, leg.payout]),
    ];
    for (const value of money) {
      expect(Number.isFinite(value)).toBe(true);
      expect(Object.is(value, -0)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Half-up tax                                                                */
/* -------------------------------------------------------------------------- */

describe("S4 the 3 percent tax rounds half up on every payout", () => {
  it("matches settlement tax at every one-student price from 1 to 600 baht", () => {
    let halfUpDiffers = 0;
    for (let priceMinor = 100; priceMinor <= 60000; priceMinor += 1) {
      const settled = settleInput(BigInt(priceMinor), 1, []);
      const result = calculateNetwork({
        price: priceMinor / 100,
        personalStudents: 1,
        studentsPerLeg: [],
      });
      if (toMinor(result.withholdingTax) !== settled.taxMinor) {
        throw new Error(
          `price ${priceMinor} satang: module tax ${toMinor(result.withholdingTax)} settlement ${settled.taxMinor}`,
        );
      }
      if (settled.taxMinor !== (settled.payoutMinor * 3n) / 100n) halfUpDiffers += 1;
    }
    // Control: half up and truncation differ for many prices, so a match proves the rule.
    expect(halfUpDiffers).toBeGreaterThan(10000);
  });

  it("matches settlement tax for module payouts that end in an exact half satang", () => {
    // A payout of N satang is an exact tie when 3N ends in 50, that is when N ends in 50.
    const random = seeded(31415926);
    let exactTies = 0;
    for (let sample = 0; sample < 6000 && exactTies < 120; sample += 1) {
      const priceMinor = BigInt(between(random, 100, 5_000_000));
      const students = between(random, 1, 40);
      const settled = settleInput(priceMinor, students, []);
      if (settled.payoutMinor % 100n !== 50n) continue;
      exactTies += 1;
      const result = calculateNetwork({
        price: Number(priceMinor) / 100,
        personalStudents: students,
        studentsPerLeg: [],
      });
      expect(toMinor(result.withholdingTax)).toBe((settled.payoutMinor * 3n + 50n) / 100n);
      // Truncation would be one satang lower on a tie.
      expect(toMinor(result.withholdingTax)).toBeGreaterThan((settled.payoutMinor * 3n) / 100n);
    }
    expect(exactTies, "ties reached").toBeGreaterThan(20);
  });

  it("charges no tax on a payout of 0 and keeps net equal to the payout less the tax", () => {
    const zero = calculateNetwork({ price: 3000, personalStudents: 0, studentsPerLeg: [] });
    expect(zero.withholdingTax).toBe(0);
    expect(zero.net).toBe(0);
    const paid = calculateNetwork({ price: 3000, personalStudents: 4, studentsPerLeg: [] });
    expect(toMinor(paid.preTax) - toMinor(paid.withholdingTax)).toBe(toMinor(paid.net));
  });
});

/* -------------------------------------------------------------------------- */
/* The deduction helper and the rate                                          */
/* -------------------------------------------------------------------------- */

describe("S5 payoutAfterDeduction and the rate against exact references", () => {
  it("equals max(0, gross - paid) in exact satang for 6,000 random pairs", () => {
    const random = seeded(2718281);
    let floored = 0;
    for (let sample = 0; sample < 6000; sample += 1) {
      const grossMinor = between(random, 0, 50_000_000);
      const paidMinor = between(random, 0, 50_000_000);
      const result = payoutAfterDeduction(grossMinor / 100, paidMinor / 100);
      const expected = Math.max(0, grossMinor - paidMinor);
      if (paidMinor > grossMinor) floored += 1;
      expect(Math.round(result * 100), `gross ${grossMinor} paid ${paidMinor}`).toBe(expected);
      expect(Object.is(result, -0)).toBe(false);
    }
    expect(floored).toBeGreaterThan(1000);
  });

  it("never lets the rate fall as the volume rises, over 4,000 random volume pairs", () => {
    const random = seeded(1618033);
    for (let sample = 0; sample < 4000; sample += 1) {
      const low = between(random, 0, 5_000_000) / 100;
      const high = low + between(random, 0, 2_000_000) / 100;
      expect(commissionRate(high)).toBeGreaterThanOrEqual(commissionRate(low));
      expect(commissionRate(high)).toBeLessThan(0.5 / 0.7);
      expect(rateUnits(commissionRate(high))).toBe(rateUnits(settlementRate(high)));
    }
  });

  it("is continuous at 20,000 baht: the two branches meet at 50 percent", () => {
    expect(commissionRate(20000)).toBe(0.5);
    expect(Math.abs(commissionRate(19999.99) - commissionRate(20000))).toBeLessThan(1e-7);
    expect(Math.abs(commissionRate(20000.01) - commissionRate(20000))).toBeLessThan(1e-7);
  });
});

/* -------------------------------------------------------------------------- */
/* Shared state and mutation                                                  */
/* -------------------------------------------------------------------------- */

describe("S6 the module does not mutate its input or share result state", () => {
  /**
   * Freezes a value and everything below it.
   * @param value The value.
   * @returns The same value, frozen.
   */
  function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === "object") {
      Object.freeze(value);
      for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    }
    return value;
  }

  it("accepts a frozen input and a frozen preset", () => {
    const frozen = deepFreeze({ price: 3000, personalStudents: 2, studentsPerLeg: [3, 3] });
    expect(() => calculateNetwork(frozen)).not.toThrow();
    for (const preset of NETWORK_PRESETS) {
      const copy = { ...preset, studentsPerLeg: [...preset.studentsPerLeg] };
      expect(() => calculateNetwork(deepFreeze(copy))).not.toThrow();
    }
  });

  it("leaves the shared presets unchanged after many calls", () => {
    const before = JSON.stringify(NETWORK_PRESETS);
    for (let call = 0; call < 50; call += 1) {
      for (const preset of NETWORK_PRESETS) {
        const result = calculateNetwork(preset);
        (result.legs as LegResult[]).forEach((leg) => {
          leg.volume = -1;
        });
      }
    }
    expect(JSON.stringify(NETWORK_PRESETS)).toBe(before);
    expect(NETWORK_PRESETS).toHaveLength(3);
    for (const preset of NETWORK_PRESETS) expect(preset.price).toBe(CLASS_PRICE_DEFAULT);
  });

  it("returns fresh leg rows for each call", () => {
    const input = { price: 3000, personalStudents: 2, studentsPerLeg: [3, 3] };
    const first = calculateNetwork(input);
    (first.legs as LegResult[])[0]!.payout = 999999;
    const second = calculateNetwork(input);
    expect(second.legs[0]!.payout).toBe(4005);
    expect(second.legs).not.toBe(first.legs);
  });

  it("resizeLegs returns a new array and leaves its input alone", () => {
    const current = Object.freeze([5, 7]);
    const same = resizeLegs(current, 2);
    expect(same).toEqual([5, 7]);
    expect(same).not.toBe(current);
    const grown = resizeLegs(current, 4);
    expect(grown).toEqual([5, 7, 3, 3]);
    expect(current).toEqual([5, 7]);
  });
});
