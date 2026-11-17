/**
 * Pure commission math for the tutor calculator (track www_tutor_calculator_20261117).
 * Pins spec section 3, decisions D-1 to D-4, and module section 5.2.
 * Money is held as integer satang through BigInt and returned as baht Numbers for display.
 */

/** Default class package price in baht. */
export const CLASS_PRICE_DEFAULT = 3000;

/** Withholding tax applied to a positive payout. */
export const TAX_RATE = 0.03;

/** Students a newly added leg starts with (spec D-6). */
export const LEG_STUDENTS_DEFAULT = 3;

/** Number of satang in one baht. */
const SATANG_PER_BAHT = 100;

/** Fixed-point scale of the rate, 10^9 (spec D-3). */
const RATE_SCALE = 1_000_000_000n;

/** Fixed-point scale of the rate as a Number, for the round step. */
const RATE_SCALE_NUMBER = 1_000_000_000;

/** Tax as a whole percent, for the integer truncation of spec D-3. */
const TAX_PERCENT = BigInt(Math.round(TAX_RATE * 100));

/** One calculator input: the price, the own students, and the students per leg. */
export type NetworkInput = {
  /** Class package price in baht. */
  price: number;
  /** Own paying students. */
  personalStudents: number;
  /** Students in each leg; the array length is the leg count. */
  studentsPerLeg: readonly number[];
};

/** One leg's contribution: its 1-based index, students, volume, and payout. */
export type LegResult = {
  /** 1-based leg index. */
  leg: number;
  /** Students in this leg. */
  students: number;
  /** Leg group volume in baht. */
  volume: number;
  /** Leg payout in baht, rounded to the satang. */
  payout: number;
};

/** The full calculator output, in baht for display. */
export type NetworkResult = {
  /** Own group volume in baht. */
  ownVolume: number;
  /** Network group volume in baht: own volume plus every leg. */
  networkVolume: number;
  /** Commission rate from 0 to 1. */
  rate: number;
  /** Gross commission in baht, rounded to the satang. */
  gross: number;
  /** Downline deduction in baht: the sum of the leg payouts. */
  legPayouts: number;
  /** Payout before tax in baht; not displayed. */
  preTax: number;
  /** Withholding tax in baht. */
  withholdingTax: number;
  /** Net payout in baht. */
  net: number;
  /** Each leg's contribution. */
  legs: readonly LegResult[];
};

/**
 * Clamps a volume or money input to a finite value of 0 or more.
 * @param value The raw input.
 * @returns The clamped value, or 0 when the input is negative or not finite.
 */
function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Clamps a count input to a whole number of 0 or more.
 * @param value The raw input.
 * @returns The clamped whole number, or 0 when the input is negative or not finite.
 */
function clampCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Converts a baht Number to integer satang with rounding.
 * @param baht The amount in baht.
 * @returns The amount in whole satang.
 */
function toSatang(baht: number): bigint {
  return BigInt(Math.round(baht * SATANG_PER_BAHT));
}

/**
 * Computes a flat `rate * volume` product in integer satang, truncated (spec D-3).
 * @param volume The group volume in baht.
 * @param rate The rate from 0 to 1.
 * @returns The product in whole satang.
 */
function flatSatang(volume: number, rate: number): bigint {
  const gvSatang = toSatang(volume);
  const rateUnits = BigInt(Math.round(rate * RATE_SCALE_NUMBER));
  return (rateUnits * gvSatang) / RATE_SCALE;
}

/**
 * Returns the commission rate for a group volume (spec section 3).
 * A volume of 0 or less gives 0.
 * @param volume The group volume in baht.
 * @returns The rate from 0 to 1.
 */
export function commissionRate(volume: number): number {
  const groupVolume = clampNonNegative(volume);
  if (groupVolume <= 0) return 0;
  if (groupVolume < 20000) return 0.4 + groupVolume / 200000;
  const exponent = 1 + Math.log(groupVolume / 20000) / Math.log(5);
  return (0.5 * (1 - Math.pow(0.3, exponent))) / 0.7;
}

/**
 * Deducts the downline payouts from the gross and floors the result at 0 (spec D-1, D-4).
 * @param gross The gross commission in baht.
 * @param paidBelow The sum of the leg payouts in baht.
 * @returns The payout before tax in baht, never negative.
 */
export function payoutAfterDeduction(gross: number, paidBelow: number): number {
  const grossSatang = toSatang(clampNonNegative(gross));
  const paidBelowSatang = toSatang(clampNonNegative(paidBelow));
  const payoutSatang = grossSatang - paidBelowSatang;
  if (payoutSatang <= 0n) return 0;
  return Number(payoutSatang) / SATANG_PER_BAHT;
}

/**
 * Computes the whole calculator result for one input (spec D-1 to D-4).
 * @param input The price, own students, and students per leg.
 * @returns The volumes, rate, money outputs, and per-leg rows.
 */
export function calculateNetwork(input: NetworkInput): NetworkResult {
  const price = clampNonNegative(input.price);
  const personalStudents = clampCount(input.personalStudents);

  const ownVolume = price * personalStudents;

  const legRows = input.studentsPerLeg.map((rawStudents, index) => {
    const students = clampCount(rawStudents);
    const volume = price * students;
    const payoutSatang = flatSatang(volume, commissionRate(volume));
    return { leg: index + 1, students, volume, payoutSatang };
  });

  const legs: LegResult[] = legRows.map((row) => ({
    leg: row.leg,
    students: row.students,
    volume: row.volume,
    payout: Number(row.payoutSatang) / SATANG_PER_BAHT,
  }));

  const legPayoutsSatang = legRows.reduce(
    (sum, row) => sum + row.payoutSatang,
    0n,
  );
  const legVolume = legRows.reduce((sum, row) => sum + row.volume, 0);
  const networkVolume = ownVolume + legVolume;
  const rate = commissionRate(networkVolume);
  const grossSatang = flatSatang(networkVolume, rate);

  const preTaxSatang =
    grossSatang - legPayoutsSatang > 0n ? grossSatang - legPayoutsSatang : 0n;
  const taxSatang = (preTaxSatang * TAX_PERCENT) / 100n;
  const netSatang = preTaxSatang - taxSatang;

  return {
    ownVolume,
    networkVolume,
    rate,
    gross: Number(grossSatang) / SATANG_PER_BAHT,
    legPayouts: Number(legPayoutsSatang) / SATANG_PER_BAHT,
    preTax: Number(preTaxSatang) / SATANG_PER_BAHT,
    withholdingTax: Number(taxSatang) / SATANG_PER_BAHT,
    net: Number(netSatang) / SATANG_PER_BAHT,
    legs,
  };
}

/**
 * Names the state a result shows (spec 5.2 item 5).
 * @param result The calculator result.
 * @returns "zero" for no volume, "ownOnly" for no leg payouts, else "withDownline".
 */
export function explainVariant(
  result: NetworkResult,
): "zero" | "ownOnly" | "withDownline" {
  if (result.networkVolume === 0) return "zero";
  if (result.legPayouts === 0) return "ownOnly";
  return "withDownline";
}

/**
 * Resizes the per-leg student list to a whole count of 0 or more (spec 5.2 item 6).
 * @param current The current students per leg.
 * @param count The new leg count.
 * @returns The kept entries, with new legs at LEG_STUDENTS_DEFAULT.
 */
export function resizeLegs(current: readonly number[], count: number): number[] {
  const legCount = clampCount(count);
  const resized: number[] = [];
  for (let index = 0; index < legCount; index += 1) {
    resized.push(
      index < current.length
        ? clampCount(current[index])
        : LEG_STUDENTS_DEFAULT,
    );
  }
  return resized;
}

/** The three presets of spec D-2, all at the 3,000 baht price. */
export const NETWORK_PRESETS: readonly NetworkInput[] = [
  { price: CLASS_PRICE_DEFAULT, personalStudents: 4, studentsPerLeg: [] },
  {
    price: CLASS_PRICE_DEFAULT,
    personalStudents: 2,
    studentsPerLeg: [3, 3],
  },
  {
    price: CLASS_PRICE_DEFAULT,
    personalStudents: 2,
    studentsPerLeg: [3, 3, 3],
  },
];
