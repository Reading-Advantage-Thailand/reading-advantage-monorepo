// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as accountingSchema from "../schema/index.js";
import {
  accountingSubmissions,
  accountingSubmissionAuditEvents,
} from "../schema/index.js";
import {
  accountingSubmissions as currentAccountingSubmissions,
  accountingSubmissionAuditEvents as currentAccountingSubmissionAuditEvents,
} from "../../schema/accounting.js";

const dialect = new PgDialect();

/** Returns stable Drizzle metadata for parity comparison. */
function tableContract(table: PgTable): unknown {
  const config = getTableConfig(table);
  return {
    checks: config.checks.map((check) => ({
      name: check.name,
      sql: dialect.sqlToQuery(check.value).sql,
    })),
    columns: config.columns.map((column) => ({
      dataType: column.dataType,
      hasDefault: column.hasDefault,
      name: column.name,
      notNull: column.notNull,
      primary: column.primary,
      sqlType: column.getSQLType(),
    })),
    indexes: config.indexes.map((index) => ({
      columns: index.config.columns.map((column) =>
        "name" in column
          ? column.name
          : dialect.sqlToQuery(column as SQL).sql,
      ),
      name: index.config.name,
      unique: index.config.unique,
    })),
    name: config.name,
  };
}

describe("Accounting schema entrypoint parity", () => {
  it("exports exactly the two Accounting tables", () => {
    const exported = Object.keys(accountingSchema).filter((key) =>
      key.startsWith("accounting"),
    );
    expect(new Set(exported)).toEqual(
      new Set(["accountingSubmissions", "accountingSubmissionAuditEvents"]),
    );
  });

  it("names the submissions table accounting_submissions", () => {
    expect(getTableConfig(accountingSubmissions).name).toBe("accounting_submissions");
  });

  it("names the audit table accounting_submission_audit_events", () => {
    expect(
      getTableConfig(accountingSubmissionAuditEvents).name,
    ).toBe("accounting_submission_audit_events");
  });

  it("preserves every submissions column, constraint, and index", () => {
    expect(tableContract(accountingSubmissions)).toEqual(
      tableContract(currentAccountingSubmissions),
    );
  });

  it("preserves every audit-event column, constraint, and index", () => {
    expect(tableContract(accountingSubmissionAuditEvents)).toEqual(
      tableContract(currentAccountingSubmissionAuditEvents),
    );
  });

  it("creates the exact dedicated tables in one 0000 migration", () => {
    const journalDirectory = new URL("../../../accounting/drizzle/", import.meta.url);
    expect(
      existsSync(journalDirectory),
      "packages/db/accounting/drizzle must contain the dedicated journal",
    ).toBe(true);
    if (!existsSync(journalDirectory)) return;
    const migrationFiles = readdirSync(journalDirectory).filter((file) =>
      /^0000_.+\.sql$/u.test(file),
    );
    expect(migrationFiles).toHaveLength(1);
    const sql = readFileSync(new URL(migrationFiles[0] as string, journalDirectory), "utf8");
    for (const requiredSql of [
      'CREATE TABLE "accounting_submissions"',
      'CREATE TABLE "accounting_submission_audit_events"',
      'CONSTRAINT "accounting_submissions_status_check" CHECK',
      'CONSTRAINT "accounting_submission_audit_events_action_check" CHECK',
      'CREATE UNIQUE INDEX "accounting_submissions_idempotency_key_idx"',
      'CREATE INDEX "accounting_submission_audit_events_submission_idx"',
    ]) {
      expect(sql).toContain(requiredSql);
    }
    expect(sql).not.toContain("DO $$");
    expect(sql).not.toMatch(/durable_jobs|company_accounts|campaigns/u);
  });
});
