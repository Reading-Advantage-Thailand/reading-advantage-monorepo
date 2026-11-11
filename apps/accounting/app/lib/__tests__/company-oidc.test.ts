/**
 * Red tests for the Accounting role resolution (`../company-oidc.ts`).
 *
 * Plan task 2.1 adds the roles `CEO` and `CONTRACTOR`. The resolver must pick
 * the strongest role in this exact order: OWNER, CEO, ACCOUNTANT, CONTRACTOR,
 * STAFF. A claim list that holds OWNER and CEO returns OWNER.
 *
 * Fake data only. No real person, company, or amount enters this file.
 *
 * Anti-pattern coverage:
 * - A3: the counts are labeled integers (`role_rows`, `role_order`).
 * - A4: the row floor is asserted before the loop runs.
 * - A5: every row names the claim list it proves.
 */
import { describe, expect, it } from "vitest";

import { resolveAccountingRole } from "../company-oidc";

/** Strongest-to-weakest role order of plan task 2.2. */
const ROLE_ORDER = [
  "OWNER",
  "CEO",
  "ACCOUNTANT",
  "CONTRACTOR",
  "STAFF",
] as const;

/** One positive resolution row: claims in, expected role out. */
const ROLE_ROWS: ReadonlyArray<{
  readonly label: string;
  readonly claims: readonly string[];
  readonly expected: string | null;
}> = [
  { label: "OWNER", claims: ["OWNER"], expected: "OWNER" },
  { label: "CEO", claims: ["CEO"], expected: "CEO" },
  { label: "ACCOUNTANT", claims: ["ACCOUNTANT"], expected: "ACCOUNTANT" },
  { label: "CONTRACTOR", claims: ["CONTRACTOR"], expected: "CONTRACTOR" },
  { label: "STAFF", claims: ["STAFF"], expected: "STAFF" },
  {
    label: "OWNER and CEO",
    claims: ["OWNER", "CEO"],
    expected: "OWNER",
  },
  {
    label: "CEO and ACCOUNTANT",
    claims: ["CEO", "ACCOUNTANT"],
    expected: "CEO",
  },
  {
    label: "CONTRACTOR and STAFF",
    claims: ["CONTRACTOR", "STAFF"],
    expected: "CONTRACTOR",
  },
  { label: "no accounting role", claims: ["MEMBER"], expected: null },
];

const ROLE_ROW_COUNT = ROLE_ROWS.length;
const ROLE_ORDER_COUNT = ROLE_ORDER.length;

console.log(`role_rows=${ROLE_ROW_COUNT}`);
console.log(`role_order=${ROLE_ORDER_COUNT}`);

if (ROLE_ROW_COUNT < 5) {
  throw new Error(
    `role_rows=${ROLE_ROW_COUNT} is below the floor of 5; plan task 2.1 names at least five rows.`,
  );
}
if (ROLE_ORDER_COUNT !== 5) {
  throw new Error(
    `role_order=${ROLE_ORDER_COUNT} is wrong; plan task 2.2 names five roles.`,
  );
}

describe("resolveAccountingRole", () => {
  it.each(ROLE_ROWS)(
    "resolves the $label row to the strongest role",
    ({ claims, expected }) => {
      const actual = resolveAccountingRole(claims);
      expect(
        actual,
        `resolveAccountingRole(${JSON.stringify(claims)}) returned ${JSON.stringify(actual)}; ` +
          `the expected role is ${JSON.stringify(expected)}.`,
      ).toBe(expected);
    },
  );

  it("keeps the order OWNER, CEO, ACCOUNTANT, CONTRACTOR, STAFF", () => {
    for (let stronger = 0; stronger < ROLE_ORDER.length; stronger += 1) {
      for (
        let weaker = stronger + 1;
        weaker < ROLE_ORDER.length;
        weaker += 1
      ) {
        const strongRole = ROLE_ORDER[stronger];
        const weakRole = ROLE_ORDER[weaker];
        const claims = [weakRole, strongRole];
        const actual = resolveAccountingRole(claims);
        expect(
          actual,
          `resolveAccountingRole(${JSON.stringify(claims)}) returned ${JSON.stringify(actual)}; ` +
            `${strongRole} must win over ${weakRole}.`,
        ).toBe(strongRole);
      }
    }
  });
});
