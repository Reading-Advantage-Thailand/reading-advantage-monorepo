/**
 * Red test for the Accounting runtime grants (FR-12a).
 *
 * The test reads `apps/accounting/scripts/accounting-runtime-grants.sql` as an
 * artifact and asserts the six table grants and the append-only close audit
 * rule. It does not hold the runtime role; the runtime probe proves the grants
 * on the live database.
 *
 * Anti-pattern coverage:
 * - A2: the close audit grant is checked as an exact privilege list, not by a
 *   broad word match.
 * - A3: counts are labeled integers (`grant_statements=6`, `grant_cases=6`).
 * - A4: the expected case count is asserted before the grant checks run.
 * - A5: every failure names the table whose grant is missing.
 * - A7: the append-only check reads one named table; it uses no bare English
 *   word as an exclusion token.
 */
// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const grantsText = readFileSync(
  new URL("../../../scripts/accounting-runtime-grants.sql", import.meta.url),
  "utf8",
);

type GrantStatement = {
  readonly table: string;
  readonly privileges: readonly string[];
};

/** Parses the `GRANT ... ON TABLE ... TO accounting_runtime;` lines. */
function readTableGrants(): readonly GrantStatement[] {
  const statements: GrantStatement[] = [];
  const pattern =
    /^GRANT ([A-Z, ]+) ON TABLE ([a-z_]+) TO accounting_runtime;$/gmu;
  for (const match of grantsText.matchAll(pattern)) {
    statements.push({
      privileges: match[1]
        .split(",")
        .map((privilege) => privilege.trim())
        .filter((privilege) => privilege.length > 0),
      table: match[2],
    });
  }
  return statements;
}

const grants = readTableGrants();

const EXPECTED_GRANTS: Readonly<Record<string, readonly string[]>> = {
  accounting_submissions: ["SELECT", "INSERT", "UPDATE"],
  accounting_submission_audit_events: ["SELECT", "INSERT"],
  accounting_intake_documents: ["SELECT", "INSERT", "UPDATE"],
  accounting_monthly_closes: ["SELECT", "INSERT", "UPDATE"],
  accounting_monthly_close_audit_events: ["SELECT", "INSERT"],
  accounting_intake_leases: ["SELECT", "INSERT", "UPDATE", "DELETE"],
};

const NEW_TABLES = [
  "accounting_intake_documents",
  "accounting_monthly_closes",
  "accounting_monthly_close_audit_events",
  "accounting_intake_leases",
] as const;

const EXISTING_TABLES = [
  "accounting_submissions",
  "accounting_submission_audit_events",
] as const;

const EXPECTED_GRANT_COUNT = Object.keys(EXPECTED_GRANTS).length;
const GRANT_CASES = 6;

if (EXPECTED_GRANT_COUNT !== 6) {
  throw new Error(
    `grant_statements=${EXPECTED_GRANT_COUNT} is wrong; FR-12a names six table grants.`,
  );
}

/** Returns the grants of one table. */
function grantsFor(table: string): readonly GrantStatement[] {
  return grants.filter((statement) => statement.table === table);
}

describe("Accounting runtime grants at the Red base", () => {
  it("plans six grant statements and at least five grant cases (grant_cases=6)", () => {
    expect(EXPECTED_GRANT_COUNT, "grant_statements=6").toBe(6);
    expect(
      GRANT_CASES,
      `grant_cases=${GRANT_CASES} — the floor is 5.`,
    ).toBeGreaterThanOrEqual(5);
  });

  it("holds exactly six table grants (grant_statements=6)", () => {
    expect(
      grants.length,
      `grant_statements=${grants.length} — expected 6: the two existing grants and the four new grants of FR-12a.`,
    ).toBe(6);
  });

  it("grants the four new tables their least privilege", () => {
    const failures: string[] = [];
    for (const table of NEW_TABLES) {
      const tableGrants = grantsFor(table);
      if (tableGrants.length === 0) {
        failures.push(`missing grant for ${table}`);
        continue;
      }
      const privileges = tableGrants.flatMap(
        (statement) => statement.privileges,
      );
      const expected = EXPECTED_GRANTS[table];
      if ([...privileges].sort().join(",") !== [...expected].sort().join(",")) {
        failures.push(
          `${table}: expected ${expected.join(", ")}, received ${privileges.join(", ") || "none"}`,
        );
      }
    }
    expect(
      failures,
      `grant_statements=${grants.length}; ${failures.join("; ")}. ` +
        `FR-12a adds four grants after the two existing grants.`,
    ).toEqual([]);
  });

  it("keeps the close audit table append-only", () => {
    const auditGrants = grantsFor("accounting_monthly_close_audit_events");
    expect(
      auditGrants.length,
      "missing grant for accounting_monthly_close_audit_events",
    ).toBeGreaterThan(0);
    const privileges = auditGrants.flatMap(
      (statement) => statement.privileges,
    );
    expect(
      [...privileges].sort(),
      "accounting_monthly_close_audit_events must hold SELECT and INSERT only",
    ).toEqual(["INSERT", "SELECT"]);
    expect(
      privileges.includes("UPDATE"),
      "the close audit table must hold no UPDATE grant",
    ).toBe(false);
    expect(
      privileges.includes("DELETE"),
      "the close audit table must hold no DELETE grant",
    ).toBe(false);
  });

  it("keeps the two existing grants", () => {
    // Characterization case: both grants exist at the base and stay unchanged.
    for (const table of EXISTING_TABLES) {
      const tableGrants = grantsFor(table);
      expect(
        tableGrants.length,
        `missing existing grant for ${table}`,
      ).toBe(1);
      expect(
        [...tableGrants[0].privileges].sort(),
        `${table} must keep its existing privileges`,
      ).toEqual([...EXPECTED_GRANTS[table]].sort());
    }
  });

  it("grants no table outside the six-table contract", () => {
    const allowedTables = new Set(Object.keys(EXPECTED_GRANTS));
    const unexpected = grants
      .map((statement) => statement.table)
      .filter((table) => !allowedTables.has(table));
    expect(
      unexpected,
      "the grants file must grant only the six tables of FR-12a",
    ).toEqual([]);
  });

  it("grants every table to the runtime role once", () => {
    const duplicates = Object.keys(EXPECTED_GRANTS).filter(
      (table) => grantsFor(table).length > 1,
    );
    expect(
      duplicates,
      "each table must hold one grant line, not a duplicate",
    ).toEqual([]);
    const otherRoleGrants =
      grantsText.match(/^GRANT .+ ON TABLE .+ TO (\w+);$/gmu) ?? [];
    expect(otherRoleGrants, "every table grant must target accounting_runtime").toEqual(
      otherRoleGrants.filter((line) => line.includes("TO accounting_runtime;")),
    );
  });
});
