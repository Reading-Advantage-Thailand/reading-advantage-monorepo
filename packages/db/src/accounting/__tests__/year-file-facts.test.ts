/**
 * Red tests for the Accounting year-file facts table (plan task 10.3, FR-28,
 * spec section 9b).
 *
 * The table `accounting_year_file_facts` does not exist at the base of Phase
 * 10. The test reads the Drizzle table objects, so a failure names the missing
 * export `accountingYearFileFacts` and never a bare load error. It does not run
 * a migration; the migration proof is the deploy probe.
 *
 * The rows pin the nine columns of FR-28, the unique intake reference that
 * gives one facts row for each year file, the two widened checks of Q15
 * (`document_type` holds 16 keys, `history_source` holds 3 values), the new
 * duplicate target of the intake table, and the absence of any hash column
 * (AGENTS.md hashing policy, Q28).
 *
 * Fake data only: the test reads metadata and writes no row and no finance
 * document.
 *
 * Anti-pattern coverage:
 * - A3: counts are labeled integers (`facts_columns=9`, `hash_columns=0`,
 *   `document_type_keys=16`, `history_source_values=3`).
 * - A4: the expected column count is asserted before the column loop, and the
 *   check rows assert the presence of the check before they read its values.
 * - A5: every assertion names the table it proves.
 */
import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as accountingSchema from "../schema/index.js";

const dialect = new PgDialect();

type ExpectedColumn = {
  readonly name: string;
  readonly sqlType: string;
  readonly notNull: boolean;
};

/** THE nine columns of FR-28, in the order of the requirement. */
const EXPECTED_FACTS_COLUMNS: readonly ExpectedColumn[] = [
  { name: "id", sqlType: "uuid", notNull: true },
  { name: "intake_document_id", sqlType: "uuid", notNull: true },
  { name: "form_type", sqlType: "text", notNull: true },
  { name: "filing_kind", sqlType: "text", notNull: true },
  { name: "period_kind", sqlType: "text", notNull: true },
  { name: "period_start", sqlType: "date", notNull: true },
  { name: "period_end", sqlType: "date", notNull: true },
  { name: "tax_year", sqlType: "integer", notNull: true },
  { name: "facts", sqlType: "jsonb", notNull: true },
];

/** The eight base intake type keys of the contract at the base. */
const BASE_DOCUMENT_TYPE_KEYS = [
  "receipt",
  "tax-invoice",
  "bank-statement",
  "payroll-sheet",
  "withholding-certificate",
  "payment-voucher-sheet",
  "cloud-invoice",
  "openai-invoice",
] as const;

/** The eight year-file type keys of spec section 9b. */
const YEAR_FILE_TYPE_KEYS = [
  "wht-filing-pnd1",
  "wht-filing-pnd1a",
  "wht-filing-pnd3",
  "wht-filing-pnd53",
  "corporate-tax-pnd50",
  "year-end-financial-statement",
  "general-ledger",
  "dbd-filing-sbor3",
] as const;

/** The 16 keys the widened `document_type` check must hold. */
const EXPECTED_DOCUMENT_TYPE_KEYS = [
  ...BASE_DOCUMENT_TYPE_KEYS,
  ...YEAR_FILE_TYPE_KEYS,
];

/** The three values the widened `history_source` check must hold (Q15). */
const EXPECTED_HISTORY_SOURCE_VALUES = [
  "drive-folder",
  "drive-modified-date",
  "document",
] as const;

const FACTS_COLUMNS = EXPECTED_FACTS_COLUMNS.length;
const DOCUMENT_TYPE_KEYS = EXPECTED_DOCUMENT_TYPE_KEYS.length;
const HISTORY_SOURCE_VALUES = EXPECTED_HISTORY_SOURCE_VALUES.length;

if (FACTS_COLUMNS !== 9) {
  throw new Error(`facts_columns=${FACTS_COLUMNS} is wrong; FR-28 names nine columns.`);
}
if (DOCUMENT_TYPE_KEYS !== 16) {
  throw new Error(`document_type_keys=${DOCUMENT_TYPE_KEYS} is wrong; Q15 names 16 keys.`);
}
if (HISTORY_SOURCE_VALUES !== 3) {
  throw new Error(
    `history_source_values=${HISTORY_SOURCE_VALUES} is wrong; Q15 names 3 values.`,
  );
}

console.log(`facts_columns=${FACTS_COLUMNS}`);
console.log(`document_type_keys=${DOCUMENT_TYPE_KEYS}`);
console.log(`history_source_values=${HISTORY_SOURCE_VALUES}`);

/** Returns a table export or fails with the export name. */
function requireTable(exportName: string): PgTable {
  const value = (accountingSchema as Record<string, unknown>)[exportName];
  expect(
    value,
    `Missing table export ${exportName} from packages/db/src/accounting/schema/index.ts. ` +
      `FR-28 names the table accounting_year_file_facts.`,
  ).toBeDefined();
  return value as PgTable;
}

/** Reads the column metadata of one Drizzle table. */
function readColumns(table: PgTable): readonly ExpectedColumn[] {
  return getTableConfig(table).columns.map((column) => ({
    name: column.name,
    sqlType: column.getSQLType(),
    notNull: column.notNull,
  }));
}

/** Reads the check-constraint metadata of one Drizzle table. */
function readChecks(
  table: PgTable,
): readonly { readonly name: string; readonly sql: string }[] {
  return getTableConfig(table).checks.map((tableCheck) => ({
    name: tableCheck.name,
    sql: dialect.sqlToQuery(tableCheck.value).sql,
  }));
}

/**
 * Reads the unique column sets of one table, from the unique indexes and the
 * unique constraints.
 * @param table Drizzle table to read.
 * @returns One column-name array for each unique set.
 */
function readUniqueColumnSets(table: PgTable): (readonly string[])[] {
  const config = getTableConfig(table);
  const fromIndexes = config.indexes
    .filter((tableIndex) => tableIndex.config.unique)
    .map((tableIndex) =>
      tableIndex.config.columns.map((column) => {
        if ("name" in column) {
          return (column as { name?: string }).name ?? "<unnamed>";
        }
        return dialect.sqlToQuery(column as SQL).sql;
      }),
    );
  const fromConstraints = config.uniqueConstraints.map((constraint) =>
    constraint.columns.map((column) => column.name),
  );
  return [...fromIndexes, ...fromConstraints];
}

/** Finds one check of a table by the part of its name that the test pins. */
function requireCheck(
  table: PgTable,
  namePart: string,
): { readonly name: string; readonly sql: string } {
  const found = readChecks(table).find((tableCheck) =>
    tableCheck.name.includes(namePart),
  );
  expect(
    found,
    `The table ${getTableConfig(table).name} must hold a check whose name holds "${namePart}".`,
  ).toBeDefined();
  return found as { readonly name: string; readonly sql: string };
}

/**
 * Reads the quoted string values of one check expression.
 * @param sql SQL text of the check.
 * @returns The quoted values.
 */
function quotedValues(sql: string): readonly string[] {
  return [...sql.matchAll(/'([^']*)'/gu)].map((match) => match[1] ?? "");
}

describe("Accounting year-file facts table at the Red base", () => {
  it("exports the facts table accountingYearFileFacts", () => {
    const table = requireTable("accountingYearFileFacts");
    expect(
      getTableConfig(table).name,
      "accountingYearFileFacts must map to accounting_year_file_facts (FR-28)",
    ).toBe("accounting_year_file_facts");
  });

  it("holds the nine columns of FR-28 (facts_columns=9)", () => {
    const columns = readColumns(requireTable("accountingYearFileFacts"));
    expect(columns.length, `facts_columns=${FACTS_COLUMNS}`).toBe(FACTS_COLUMNS);
    expect(
      [...columns.map((column) => column.name)].sort(),
      "accounting_year_file_facts column names must match FR-28",
    ).toEqual(EXPECTED_FACTS_COLUMNS.map((column) => column.name).sort());
    for (const expectedColumn of EXPECTED_FACTS_COLUMNS) {
      const actual = columns.find((column) => column.name === expectedColumn.name);
      expect(
        actual,
        `accounting_year_file_facts.${expectedColumn.name} must exist`,
      ).toBeDefined();
      expect(
        actual?.sqlType,
        `accounting_year_file_facts.${expectedColumn.name} must be ${expectedColumn.sqlType}`,
      ).toBe(expectedColumn.sqlType);
      expect(
        actual?.notNull,
        `accounting_year_file_facts.${expectedColumn.name} notNull must be ${expectedColumn.notNull}`,
      ).toBe(expectedColumn.notNull);
    }
  });

  it("gives one facts row for each year file (facts_rows_per_year_file=1)", () => {
    const uniqueSets = readUniqueColumnSets(requireTable("accountingYearFileFacts"));
    expect(
      uniqueSets.some(
        (columns) =>
          columns.length === 1 && columns[0] === "intake_document_id",
      ),
      "accounting_year_file_facts.intake_document_id must be unique, so one year file gives one facts row (FR-28)",
    ).toBe(true);
  });

  it("holds no hash, checksum, or manifest column (hash_columns=0)", () => {
    const forbidden: string[] = [];
    const scanTables = ["accountingYearFileFacts", "accountingIntakeDocuments"];
    for (const exportName of scanTables) {
      for (const column of readColumns(requireTable(exportName))) {
        if (/hash|checksum|digest|manifest/iu.test(column.name)) {
          forbidden.push(`${exportName}.${column.name}`);
        }
      }
    }
    expect(
      forbidden,
      "AGENTS.md hashing policy: the year-file facts table holds no hash, checksum, or manifest column (Q28)",
    ).toEqual([]);
    console.log(`hash_columns=${forbidden.length}`);
  });

  it("widens the document_type check to 16 keys (document_type_keys=16)", () => {
    const intake = requireTable("accountingIntakeDocuments");
    const check = requireCheck(intake, "document_type");
    const values = quotedValues(check.sql);
    expect(
      values.length,
      `document_type_keys=${values.length} — the check must hold the 16 keys of Q15.`,
    ).toBe(DOCUMENT_TYPE_KEYS);
    expect(
      [...values].sort(),
      "accounting_intake_documents.document_type must accept the eight base keys and the eight year-file keys (Q15)",
    ).toEqual([...EXPECTED_DOCUMENT_TYPE_KEYS].sort());
  });

  it("widens the history_source check to three values (history_source_values=3)", () => {
    const intake = requireTable("accountingIntakeDocuments");
    const check = requireCheck(intake, "history_source");
    const values = quotedValues(check.sql).filter((value) =>
      EXPECTED_HISTORY_SOURCE_VALUES.includes(
        value as (typeof EXPECTED_HISTORY_SOURCE_VALUES)[number],
      ),
    );
    expect(
      values.length,
      `history_source_values=${values.length} — the check must allow drive-folder, drive-modified-date, and document (Q15).`,
    ).toBe(HISTORY_SOURCE_VALUES);
    for (const expected of EXPECTED_HISTORY_SOURCE_VALUES) {
      expect(
        values,
        `accounting_intake_documents.history_source must accept ${expected}`,
      ).toContain(expected);
    }
    expect(
      check.sql.includes("is_history"),
      "the history_source check stays paired with is_history (Q15)",
    ).toBe(true);
  });

  it("adds the duplicate target duplicate_of_intake_document_id to the intake table", () => {
    const columns = readColumns(requireTable("accountingIntakeDocuments"));
    const duplicateColumn = columns.find(
      (column) => column.name === "duplicate_of_intake_document_id",
    );
    expect(
      duplicateColumn,
      "accounting_intake_documents must hold duplicate_of_intake_document_id (FR-28)",
    ).toBeDefined();
    expect(
      duplicateColumn?.sqlType,
      "duplicate_of_intake_document_id must be uuid",
    ).toBe("uuid");
    expect(
      duplicateColumn?.notNull,
      "duplicate_of_intake_document_id must be nullable",
    ).toBe(false);
  });

  it("holds the three year-file checks of period, kind, and form type", () => {
    const facts = requireTable("accountingYearFileFacts");
    const checks = readChecks(facts);
    const allSql = checks.map((check) => check.sql).join("\n");
    expect(
      allSql.includes("period_kind"),
      "accounting_year_file_facts must check period_kind in ('month', 'year')",
    ).toBe(true);
    expect(
      allSql.includes("filing_kind"),
      "accounting_year_file_facts must check filing_kind in ('form', 'attachment', 'receipt', 'statement')",
    ).toBe(true);
    expect(
      allSql.includes("form_type"),
      "accounting_year_file_facts must check form_type against the year-file type keys",
    ).toBe(true);
  });
});
