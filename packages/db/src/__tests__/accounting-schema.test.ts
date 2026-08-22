/**
 * Red tests for accounting schema audit table and tenant registry (Task 7).
 *
 * This suite defines the Phase 3 expectations that Task 8 will satisfy:
 * - `accountingSubmissionAuditEvents` exists with an action check covering
 *   submit|approve|reject.
 * - `classifyTable` returns EXEMPT for both accounting tables.
 * - `accountingSubmissions` status check admits approved and rejected.
 *
 * Against the current code every assertion fails (red): the audit table does
 * not exist, the status check is still `= 'pending'`, and the audit table is
 * not registered as EXEMPT.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../..");
const TENANT_REGISTRY = join(REPO_ROOT, "packages/domain/src/tenant-registry.ts");
const dialect = new PgDialect();

function tableOrUndefined(name: string): unknown {
  return (schema as Record<string, unknown>)[name];
}

describe("accounting submission audit events schema (red - Task 7)", () => {
  it("accountingSubmissionAuditEvents exists with action check covering submit|approve|reject", () => {
    const table = tableOrUndefined("accountingSubmissionAuditEvents");
    expect(table, "accountingSubmissionAuditEvents is missing - red phase expected").toBeDefined();
    if (!table) return;
    const config = getTableConfig(table as Parameters<typeof getTableConfig>[0]);
    const actionCheck = config.checks.find(
      (c) => c.name === "accounting_submission_audit_events_action_check",
    );
    expect(actionCheck, "missing accounting_submission_audit_events_action_check").toBeDefined();
    if (!actionCheck) return;
    const { sql } = dialect.sqlToQuery(actionCheck.value);
    expect(sql).toContain("submit");
    expect(sql).toContain("approve");
    expect(sql).toContain("reject");
  });

  it("classifies both accounting tables as EXEMPT", async () => {
    // classifyTable keys on object identity. Load the built package tables
    // so the objects match the ones tenant-registry registers.
    const dbIndex = join(REPO_ROOT, "packages/db/dist/index.js");
    const db = (await import(/* @vite-ignore */ pathToFileURL(dbIndex).href)) as Record<
      string,
      unknown
    >;
    const submissionsTable = db.accountingSubmissions;
    const auditTable = db.accountingSubmissionAuditEvents;
    expect(submissionsTable, "accountingSubmissions is missing").toBeDefined();
    expect(auditTable, "accountingSubmissionAuditEvents is missing - red phase expected").toBeDefined();
    if (!submissionsTable || !auditTable) return;
    const registry = (await import(/* @vite-ignore */ pathToFileURL(TENANT_REGISTRY).href)) as {
      classifyTable(table: unknown): string;
    };
    expect(registry.classifyTable(submissionsTable)).toBe("EXEMPT");
    expect(registry.classifyTable(auditTable)).toBe("EXEMPT");
  });

  it("accountingSubmissions status check admits approved and rejected", () => {
    const table = tableOrUndefined("accountingSubmissions");
    expect(table, "accountingSubmissions is missing").toBeDefined();
    if (!table) return;
    const config = getTableConfig(table as Parameters<typeof getTableConfig>[0]);
    const statusCheck = config.checks.find((c) => c.name === "accounting_submissions_status_check");
    expect(statusCheck, "missing accounting_submissions_status_check").toBeDefined();
    if (!statusCheck) return;
    const { sql } = dialect.sqlToQuery(statusCheck.value);
    expect(sql, "status check must admit approved").toContain("approved");
    expect(sql, "status check must admit rejected").toContain("rejected");
    expect(sql).toContain("pending");
  });
});
