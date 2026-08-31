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
    expect(tableContract(accountingSubmissions)).toEqual({
      checks: [
        { name: "accounting_submissions_kind_check", sql: '"accounting_submissions"."kind" IN (\'expense\', \'bill\')' },
        { name: "accounting_submissions_payee_check", sql: 'char_length("accounting_submissions"."payee") between 1 and 256 AND "accounting_submissions"."payee" ~ \'[^[:space:]]\'' },
        { name: "accounting_submissions_category_check", sql: 'char_length("accounting_submissions"."category") between 1 and 128 AND "accounting_submissions"."category" ~ \'[^[:space:]]\'' },
        { name: "accounting_submissions_description_check", sql: '"accounting_submissions"."description" IS NULL OR (char_length("accounting_submissions"."description") between 1 and 1024 AND "accounting_submissions"."description" ~ \'[^[:space:]]\')' },
        { name: "accounting_submissions_amount_minor_check", sql: '"accounting_submissions"."amount_minor" ~ \'^[0-9]+$\'' },
        { name: "accounting_submissions_currency_check", sql: '"accounting_submissions"."currency" ~ \'^[A-Z]{3}$\'' },
        { name: "accounting_submissions_settled_thb_amount_minor_check", sql: '"accounting_submissions"."settled_thb_amount_minor" IS NULL OR "accounting_submissions"."settled_thb_amount_minor" ~ \'^[1-9][0-9]*$\'' },
        { name: "accounting_submissions_settled_thb_currency_check", sql: '("accounting_submissions"."currency" = \'THB\' AND "accounting_submissions"."settled_thb_amount_minor" IS NULL) OR ("accounting_submissions"."currency" <> \'THB\' AND "accounting_submissions"."settled_thb_amount_minor" IS NOT NULL)' },
        { name: "accounting_submissions_evidence_reference_check", sql: '"accounting_submissions"."evidence_reference" ~ \'^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$\' AND "accounting_submissions"."evidence_reference" NOT LIKE \'%/../%\' AND "accounting_submissions"."evidence_reference" NOT LIKE \'%/./%\' AND "accounting_submissions"."evidence_reference" NOT LIKE \'%/..\' AND "accounting_submissions"."evidence_reference" NOT LIKE \'%/.\'' },
        { name: "accounting_submissions_status_check", sql: '"accounting_submissions"."status" IN (\'pending\', \'approved\', \'rejected\')' },
      ],
      columns: [
        { dataType: "string", hasDefault: true, name: "id", notNull: true, primary: true, sqlType: "uuid" },
        { dataType: "string", hasDefault: false, name: "kind", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "payee", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "category", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "description", notNull: false, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "amount_minor", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "currency", notNull: true, primary: false, sqlType: "char(3)" },
        { dataType: "string", hasDefault: false, name: "settled_thb_amount_minor", notNull: false, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "evidence_reference", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "scope_company_id", notNull: true, primary: false, sqlType: "uuid" },
        { dataType: "string", hasDefault: true, name: "status", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "submitted_by_account_id", notNull: true, primary: false, sqlType: "uuid" },
        { dataType: "date", hasDefault: true, name: "submitted_at", notNull: true, primary: false, sqlType: "timestamp with time zone" },
        { dataType: "string", hasDefault: false, name: "idempotency_key", notNull: false, primary: false, sqlType: "text" },
        { dataType: "date", hasDefault: true, name: "created_at", notNull: true, primary: false, sqlType: "timestamp with time zone" },
      ],
      indexes: [
        { columns: ["scope_company_id", "status"], name: "accounting_submissions_scope_company_status_idx", unique: false },
        { columns: ["submitted_by_account_id"], name: "accounting_submissions_submitted_by_idx", unique: false },
        { columns: ["scope_company_id", "submitted_by_account_id", "idempotency_key"], name: "accounting_submissions_idempotency_key_idx", unique: true },
      ],
      name: "accounting_submissions",
    });
  });

  it("preserves every audit-event column, constraint, and index", () => {
    expect(tableContract(accountingSubmissionAuditEvents)).toEqual({
      checks: [
        { name: "accounting_submission_audit_events_action_check", sql: '"accounting_submission_audit_events"."action" IN (\'submit\', \'approve\', \'reject\')' },
        { name: "accounting_submission_audit_events_reason_check", sql: '"accounting_submission_audit_events"."reason" IS NULL OR "accounting_submission_audit_events"."reason" ~ \'[^[:space:]]\'' },
      ],
      columns: [
        { dataType: "string", hasDefault: true, name: "id", notNull: true, primary: true, sqlType: "uuid" },
        { dataType: "string", hasDefault: false, name: "submission_id", notNull: true, primary: false, sqlType: "uuid" },
        { dataType: "string", hasDefault: false, name: "action", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "actor_account_id", notNull: true, primary: false, sqlType: "uuid" },
        { dataType: "string", hasDefault: false, name: "actor_role", notNull: true, primary: false, sqlType: "text" },
        { dataType: "string", hasDefault: false, name: "reason", notNull: false, primary: false, sqlType: "text" },
        { dataType: "date", hasDefault: true, name: "created_at", notNull: true, primary: false, sqlType: "timestamp with time zone" },
      ],
      indexes: [
        { columns: ["submission_id", "created_at"], name: "accounting_submission_audit_events_submission_idx", unique: false },
      ],
      name: "accounting_submission_audit_events",
    });
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
      'CONSTRAINT "accounting_submissions_kind_check" CHECK',
      'CONSTRAINT "accounting_submissions_payee_check" CHECK',
      'CONSTRAINT "accounting_submissions_category_check" CHECK',
      'CONSTRAINT "accounting_submissions_description_check" CHECK',
      'CONSTRAINT "accounting_submissions_amount_minor_check" CHECK',
      'CONSTRAINT "accounting_submissions_currency_check" CHECK',
      'CONSTRAINT "accounting_submissions_settled_thb_amount_minor_check" CHECK',
      'CONSTRAINT "accounting_submissions_settled_thb_currency_check" CHECK',
      'CONSTRAINT "accounting_submissions_evidence_reference_check" CHECK',
      'CONSTRAINT "accounting_submission_audit_events_action_check" CHECK',
      'CONSTRAINT "accounting_submission_audit_events_reason_check" CHECK',
      'CREATE INDEX "accounting_submissions_scope_company_status_idx"',
      'CREATE INDEX "accounting_submissions_submitted_by_idx"',
      'CREATE UNIQUE INDEX "accounting_submissions_idempotency_key_idx"',
      'CREATE INDEX "accounting_submission_audit_events_submission_idx"',
    ]) {
      expect(sql).toContain(requiredSql);
    }
    expect(sql).not.toContain("DO $$");
    expect(sql).not.toMatch(/durable_jobs|company_accounts|campaigns/u);
  });
});
