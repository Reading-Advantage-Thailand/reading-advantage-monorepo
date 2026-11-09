/**
 * Red tests for the four Accounting intake tables (FR-3 to FR-6).
 *
 * The tables do not exist in `../schema/index.ts` at the base. The test reads
 * the Drizzle table objects, so the failure names the missing table export and
 * never a bare load error. It does not run a migration; the deploy probe is the
 * migration proof.
 *
 * Fake data only: the test reads metadata and writes no row and no finance
 * document. No hash field exists in any table.
 *
 * Anti-pattern coverage:
 * - A3: counts are labeled integers (`tables=4`, `unique_indexes=3`,
 *   `check_constraints=4`).
 * - A4: the expected table count is asserted before the metadata loop.
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

type ExpectedTable = {
  readonly exportName: string;
  readonly tableName: string;
  readonly columns: readonly ExpectedColumn[];
  readonly uniqueIndexes: readonly (readonly string[])[];
};

const EXPECTED_TABLES: readonly ExpectedTable[] = [
  {
    exportName: "accountingIntakeDocuments",
    tableName: "accounting_intake_documents",
    columns: [
      { name: "id", sqlType: "uuid", notNull: true },
      { name: "drive_file_id", sqlType: "text", notNull: true },
      { name: "drive_folder_id", sqlType: "text", notNull: true },
      { name: "source_month", sqlType: "text", notNull: true },
      { name: "document_type", sqlType: "text", notNull: true },
      { name: "status", sqlType: "text", notNull: true },
      { name: "submission_id", sqlType: "uuid", notNull: false },
      { name: "duplicate_of_submission_id", sqlType: "uuid", notNull: false },
      { name: "evidence_reference", sqlType: "text", notNull: false },
      { name: "extraction", sqlType: "text", notNull: false },
      { name: "failure_reason", sqlType: "text", notNull: false },
      { name: "failure_count", sqlType: "integer", notNull: true },
      { name: "sighting_count", sqlType: "integer", notNull: true },
      { name: "evidence_byte_size", sqlType: "integer", notNull: false },
      { name: "is_history", sqlType: "boolean", notNull: true },
      { name: "history_source", sqlType: "text", notNull: false },
      {
        name: "first_seen_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
      {
        name: "last_seen_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
      { name: "scope_company_id", sqlType: "uuid", notNull: true },
    ],
    uniqueIndexes: [["scope_company_id", "drive_file_id"]],
  },
  {
    exportName: "accountingMonthlyCloses",
    tableName: "accounting_monthly_closes",
    columns: [
      { name: "id", sqlType: "uuid", notNull: true },
      { name: "period_month", sqlType: "text", notNull: true },
      { name: "status", sqlType: "text", notNull: true },
      { name: "report_evidence_reference", sqlType: "text", notNull: false },
      { name: "opened_by_account_id", sqlType: "uuid", notNull: true },
      {
        name: "opened_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
      { name: "signed_by_account_id", sqlType: "uuid", notNull: false },
      { name: "signed_by_role", sqlType: "text", notNull: false },
      {
        name: "signed_at",
        sqlType: "timestamp with time zone",
        notNull: false,
      },
      {
        name: "locked_at",
        sqlType: "timestamp with time zone",
        notNull: false,
      },
      { name: "scope_company_id", sqlType: "uuid", notNull: true },
    ],
    uniqueIndexes: [["scope_company_id", "period_month"]],
  },
  {
    exportName: "accountingMonthlyCloseAuditEvents",
    tableName: "accounting_monthly_close_audit_events",
    columns: [
      { name: "id", sqlType: "uuid", notNull: true },
      { name: "close_id", sqlType: "uuid", notNull: true },
      { name: "action", sqlType: "text", notNull: true },
      { name: "actor_account_id", sqlType: "uuid", notNull: true },
      { name: "actor_role", sqlType: "text", notNull: true },
      { name: "reason", sqlType: "text", notNull: false },
      {
        name: "created_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
    ],
    uniqueIndexes: [],
  },
  {
    exportName: "accountingIntakeLeases",
    tableName: "accounting_intake_leases",
    columns: [
      { name: "id", sqlType: "uuid", notNull: true },
      { name: "queue_name", sqlType: "text", notNull: true },
      { name: "lease_token", sqlType: "text", notNull: true },
      { name: "worker_id", sqlType: "text", notNull: true },
      {
        name: "lease_expires_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
      {
        name: "claimed_at",
        sqlType: "timestamp with time zone",
        notNull: true,
      },
      { name: "scope_company_id", sqlType: "uuid", notNull: true },
    ],
    uniqueIndexes: [["scope_company_id", "queue_name"]],
  },
];

const TABLE_COUNT = EXPECTED_TABLES.length;
const UNIQUE_INDEX_COUNT = EXPECTED_TABLES.reduce(
  (total, table) => total + table.uniqueIndexes.length,
  0,
);

if (TABLE_COUNT !== 4) {
  throw new Error(`tables=${TABLE_COUNT} is wrong; FR-3 to FR-6 name four tables.`);
}
if (UNIQUE_INDEX_COUNT !== 3) {
  throw new Error(
    `unique_indexes=${UNIQUE_INDEX_COUNT} is wrong; the plan names three unique indexes.`,
  );
}

type IndexContract = {
  readonly columns: readonly string[];
  readonly unique: boolean;
};

/** Returns a table export or fails with the export name. */
function requireTable(exportName: string): PgTable {
  const value = (accountingSchema as Record<string, unknown>)[exportName];
  expect(
    value,
    `Missing table export ${exportName} from packages/db/src/accounting/schema/index.ts. ` +
      `The intake schema must export the four tables of FR-3 to FR-6.`,
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

/** Reads the index metadata of one Drizzle table. */
function readIndexes(table: PgTable): readonly IndexContract[] {
  return getTableConfig(table).indexes.map((tableIndex) => ({
    columns: tableIndex.config.columns.map((column) => {
      if ("name" in column) {
        // An unnamed index column must fail the index checks, so map it to a marker that no real column matches.
        return column.name ?? "<unnamed-index-column>";
      }
      return dialect.sqlToQuery(column as SQL).sql;
    }),
    unique: tableIndex.config.unique,
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

/** Compares two column-name arrays. */
function sameColumns(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((column, index) => column === right[index])
  );
}

describe("Accounting intake schema at the Red base", () => {
  it("plans four tables and three unique indexes (tables=4, unique_indexes=3)", () => {
    expect(TABLE_COUNT, "tables=4").toBe(4);
    expect(UNIQUE_INDEX_COUNT, "unique_indexes=3").toBe(3);
  });

  it("exports the four intake tables (tables=4)", () => {
    const missing = EXPECTED_TABLES.filter((table) => {
      const value = (accountingSchema as Record<string, unknown>)[
        table.exportName
      ];
      return value === undefined;
    }).map((table) => table.exportName);
    expect(
      missing,
      `tables=${TABLE_COUNT}; missing table exports: ${missing.join(", ")}.`,
    ).toEqual([]);
  });

  it("names the four tables as FR-3 to FR-6 name them", () => {
    for (const table of EXPECTED_TABLES) {
      expect(
        getTableConfig(requireTable(table.exportName)).name,
        `${table.exportName} must map to ${table.tableName}`,
      ).toBe(table.tableName);
    }
  });

  for (const table of EXPECTED_TABLES) {
    it(`preserves the ${table.tableName} columns`, () => {
      const columns = readColumns(requireTable(table.exportName));
      const actualNames = columns.map((column) => column.name);
      const expectedNames = table.columns.map((column) => column.name);
      expect(
        [...actualNames].sort(),
        `${table.tableName} column names must match FR-3 to FR-6`,
      ).toEqual([...expectedNames].sort());
      for (const expectedColumn of table.columns) {
        const actual = columns.find(
          (column) => column.name === expectedColumn.name,
        );
        expect(
          actual,
          `${table.tableName}.${expectedColumn.name} must exist`,
        ).toBeDefined();
        expect(
          actual?.sqlType,
          `${table.tableName}.${expectedColumn.name} must be ${expectedColumn.sqlType}`,
        ).toBe(expectedColumn.sqlType);
        expect(
          actual?.notNull,
          `${table.tableName}.${expectedColumn.name} notNull must be ${expectedColumn.notNull}`,
        ).toBe(expectedColumn.notNull);
      }
    });
  }

  it("holds the three unique indexes (unique_indexes=3)", () => {
    const actualUniqueIndexes: (readonly string[])[] = [];
    for (const table of EXPECTED_TABLES) {
      for (const tableIndex of readIndexes(requireTable(table.exportName))) {
        if (tableIndex.unique) {
          actualUniqueIndexes.push(tableIndex.columns);
        }
      }
    }
    expect(
      actualUniqueIndexes.map((columns) => [...columns]).sort(),
      `unique_indexes=${UNIQUE_INDEX_COUNT}`,
    ).toEqual(
      EXPECTED_TABLES.flatMap((table) =>
        table.uniqueIndexes.map((columns) => [...columns]),
      ).sort(),
    );
  });

  it("holds the non-unique evidence size index and the close audit index", () => {
    const intakeIndexes = readIndexes(requireTable("accountingIntakeDocuments"));
    expect(
      intakeIndexes.some(
        (tableIndex) =>
          tableIndex.unique === false &&
          sameColumns(tableIndex.columns, [
            "scope_company_id",
            "evidence_byte_size",
          ]),
      ),
      "accounting_intake_documents must hold a non-unique (scope_company_id, evidence_byte_size) index (D-28)",
    ).toBe(true);

    const auditIndexes = readIndexes(
      requireTable("accountingMonthlyCloseAuditEvents"),
    );
    expect(
      auditIndexes.some(
        (tableIndex) =>
          tableIndex.unique === false &&
          sameColumns(tableIndex.columns, ["close_id", "created_at"]),
      ),
      "accounting_monthly_close_audit_events must hold a non-unique (close_id, created_at) index",
    ).toBe(true);
  });

  it("holds at least four check constraints (check_constraints=4)", () => {
    const allChecks = EXPECTED_TABLES.flatMap((table) =>
      readChecks(requireTable(table.exportName)).map((tableCheck) => ({
        ...tableCheck,
        tableName: table.tableName,
      })),
    );
    expect(
      allChecks.length,
      `check_constraints=${allChecks.length} — the floor is 4.`,
    ).toBeGreaterThanOrEqual(4);

    const intakeChecks = readChecks(requireTable("accountingIntakeDocuments"));
    expect(
      intakeChecks.some(
        (tableCheck) =>
          tableCheck.sql.includes("is_history") &&
          tableCheck.sql.includes("history_source"),
      ),
      "accounting_intake_documents must hold the paired is_history and history_source check",
    ).toBe(true);

    const leaseChecks = readChecks(requireTable("accountingIntakeLeases"));
    expect(
      leaseChecks.some(
        (tableCheck) =>
          tableCheck.sql.includes("lease_expires_at") &&
          tableCheck.sql.includes("claimed_at"),
      ),
      "accounting_intake_leases must hold a check that lease_expires_at is after claimed_at",
    ).toBe(true);
  });

  it("holds no hash or checksum column in any intake table", () => {
    const forbiddenColumns: string[] = [];
    for (const table of EXPECTED_TABLES) {
      for (const column of readColumns(requireTable(table.exportName))) {
        if (/hash|checksum/iu.test(column.name)) {
          forbiddenColumns.push(`${table.tableName}.${column.name}`);
        }
      }
    }
    expect(
      forbiddenColumns,
      "AGENTS.md hashing policy: the intake tables hold no hash and no checksum column",
    ).toEqual([]);
  });
});
