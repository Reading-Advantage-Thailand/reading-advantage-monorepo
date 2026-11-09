// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.unmock("../tenant-registry.js");

import { classifyTable } from "../tenant-registry.js";
import * as accountingSchema from "@reading-advantage/db/accounting/schema";
import {
  accountingSubmissions,
  accountingSubmissionAuditEvents,
} from "@reading-advantage/db/accounting/schema";

describe("Tenant registry classifies the Accounting tables", () => {
  it("imports Accounting tables from the dedicated schema entrypoint", () => {
    const registrySource = readFileSync(
      new URL("../tenant-registry.ts", import.meta.url),
      "utf8",
    );
    expect(registrySource).toContain(
      'from "@reading-advantage/db/accounting/schema"',
    );
  });

  it("classifies accountingSubmissions as EXEMPT", () => {
    expect(classifyTable(accountingSubmissions)).toBe("EXEMPT");
  });

  it("classifies accountingSubmissionAuditEvents as EXEMPT", () => {
    expect(classifyTable(accountingSubmissionAuditEvents)).toBe("EXEMPT");
  });
});

/**
 * Red rows for the four intake tables (FR-2).
 *
 * The tables do not exist in the Accounting schema at the base, so each row
 * reports the missing export as an unclassified table. The check calls the
 * real `classifyTable`, which throws for an unclassified table; a mock that
 * returns EXEMPT for every object would make this check vacuous (A4).
 *
 * Counts are labeled integers (`unclassified_tables=4`).
 */
const INTAKE_TABLE_EXPORTS = [
  "accountingIntakeDocuments",
  "accountingMonthlyCloses",
  "accountingMonthlyCloseAuditEvents",
  "accountingIntakeLeases",
] as const;

describe("Tenant registry classifies the four intake tables", () => {
  it("plans four intake table rows (unclassified_tables floor)", () => {
    expect(
      INTAKE_TABLE_EXPORTS.length,
      `intake_table_rows=${INTAKE_TABLE_EXPORTS.length} — the registry must cover four new tables.`,
    ).toBe(4);
  });

  it("classifies all four intake tables as EXEMPT (unclassified_tables=0)", () => {
    const unclassified: string[] = [];
    for (const exportName of INTAKE_TABLE_EXPORTS) {
      const table = (accountingSchema as Record<string, unknown>)[exportName];
      if (table === undefined) {
        unclassified.push(`${exportName} (not exported)`);
        continue;
      }
      try {
        const classification = classifyTable(table);
        if (classification !== "EXEMPT") {
          unclassified.push(`${exportName} (classified ${classification})`);
        }
      } catch {
        unclassified.push(exportName);
      }
    }
    expect(
      unclassified,
      `unclassified_tables=${unclassified.length}: ${unclassified.join(", ")}. ` +
        `Register all four in packages/domain/src/tenant-registry.ts as EXEMPT, ` +
        `beside the two existing Accounting tables.`,
    ).toEqual([]);
  });
});
