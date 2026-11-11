/**
 * Tests for the PostgreSQL monthly close repository (`../postgres-monthly-close-repository.ts`).
 *
 * The tests use a tagged SQL double. They prove the snake↔camel mapping, the
 * company scope of every query, and the append-only audit insert. No database
 * runs and no real finance row enters this file.
 */
import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { AccountingMonthlyClose } from "../intake-contracts.js";
import { createPostgresAccountingMonthlyCloseRepository } from "../postgres-monthly-close-repository.js";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const CLOSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERIOD_MONTH = "2026-11";
const REPORT_REFERENCE = `private-evidence://${COMPANY_ID}/monthly-closes/${CLOSE_ID}/report`;

interface SqlCall {
  readonly statement: string;
  readonly values: readonly unknown[];
}

/** Creates a tagged SQL double with ordered query responses and captured bindings. */
function sqlDouble(
  responses: readonly (readonly Record<string, unknown>[])[],
): { readonly calls: SqlCall[]; readonly sql: postgres.Sql } {
  const pending = [...responses];
  const calls: SqlCall[] = [];
  const tagged = vi.fn(
    async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      calls.push({ statement: strings.join("?"), values });
      const response = pending.shift();
      if (response === undefined) throw new Error("Unexpected SQL statement.");
      return response;
    },
  );
  return { calls, sql: tagged as unknown as postgres.Sql };
}

/** Builds one valid close row for the repository tests. */
function closeRow(
  overrides: Partial<AccountingMonthlyClose> = {},
): AccountingMonthlyClose {
  return {
    id: CLOSE_ID,
    periodMonth: PERIOD_MONTH,
    status: "open",
    reportEvidenceReference: REPORT_REFERENCE,
    openedByAccountId: ACCOUNT_ID,
    openedAt: "2026-11-01T02:03:04.000Z",
    signedByAccountId: null,
    signedByRole: null,
    signedAt: null,
    lockedAt: null,
    scopeCompanyId: COMPANY_ID,
    ...overrides,
  };
}

/** Builds the raw snake_case row of one close. */
function rawCloseRow(
  close: Readonly<AccountingMonthlyClose>,
): Record<string, unknown> {
  return {
    id: close.id,
    period_month: close.periodMonth,
    status: close.status,
    report_evidence_reference: close.reportEvidenceReference,
    opened_by_account_id: close.openedByAccountId,
    opened_at: new Date(close.openedAt),
    signed_by_account_id: close.signedByAccountId,
    signed_by_role: close.signedByRole,
    signed_at: close.signedAt === null ? null : new Date(close.signedAt),
    locked_at: close.lockedAt === null ? null : new Date(close.lockedAt),
    scope_company_id: close.scopeCompanyId,
  };
}

/**
 * Widens the port save to the compare-and-swap shape the reviews require: the
 * expected status is bound in the where clause. The port does not hold the
 * second parameter yet, so the cast is narrow and local.
 * @param repository The PostgreSQL close repository under test.
 * @returns The save function with the expected status parameter.
 */
function saveWithExpectedStatus(
  repository: ReturnType<typeof createPostgresAccountingMonthlyCloseRepository>,
): (
  close: AccountingMonthlyClose,
  expectedStatus: string,
) => Promise<AccountingMonthlyClose | undefined> {
  return repository.save as unknown as (
    close: AccountingMonthlyClose,
    expectedStatus: string,
  ) => Promise<AccountingMonthlyClose | undefined>;
}

describe("PostgreSQL accounting monthly close repository", () => {
  it("maps a close row to the validated domain close", async () => {
    const close = closeRow();
    const database = sqlDouble([[rawCloseRow(close)]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      repository.findByPeriodMonth({
        scope: { companyId: COMPANY_ID },
        periodMonth: PERIOD_MONTH,
      }),
    ).resolves.toEqual(close);
    expect(database.calls[0]?.values).toEqual([COMPANY_ID, PERIOD_MONTH]);
    expect(database.calls[0]?.statement).toContain("scope_company_id");
  });

  it("scopes the listing by company and maps every returned row", async () => {
    const close = closeRow();
    const database = sqlDouble([[rawCloseRow(close)]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      repository.listByScope({ companyId: COMPANY_ID }),
    ).resolves.toEqual([close]);
    expect(database.calls[0]?.values).toEqual([COMPANY_ID]);
  });

  it("maps the close fields to insert bindings", async () => {
    const close = closeRow();
    const database = sqlDouble([[rawCloseRow(close)]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(repository.insert(close)).resolves.toEqual(close);
    expect(database.calls[0]?.values).toEqual([
      close.id,
      PERIOD_MONTH,
      "open",
      REPORT_REFERENCE,
      ACCOUNT_ID,
      close.openedAt,
      null,
      null,
      null,
      null,
      COMPANY_ID,
    ]);
    expect(database.calls[0]?.statement.toLowerCase()).toContain("insert into");
  });

  it("maps the signed and locked fields to update bindings", async () => {
    const signedAt = "2026-11-30T02:03:04.000Z";
    const close = closeRow({
      status: "locked",
      signedByAccountId: ACCOUNT_ID,
      signedByRole: "CEO",
      signedAt,
      lockedAt: signedAt,
    });
    const database = sqlDouble([[rawCloseRow(close)]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      saveWithExpectedStatus(repository)(close, "signed"),
    ).resolves.toEqual(close);
    expect(database.calls[0]?.statement.toLowerCase()).toContain("update");
    expect(database.calls[0]?.values).toEqual([
      "locked",
      REPORT_REFERENCE,
      ACCOUNT_ID,
      "CEO",
      signedAt,
      signedAt,
      close.id,
      COMPANY_ID,
      "signed",
    ]);
  });

  it("updates only when the stored status equals the expected status", async () => {
    const close = closeRow({
      status: "signed",
      signedByAccountId: ACCOUNT_ID,
      signedByRole: "CEO",
      signedAt: "2026-11-30T02:03:04.000Z",
    });
    const database = sqlDouble([[rawCloseRow(close)]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await saveWithExpectedStatus(repository)(close, "open");

    const statement = database.calls[0]?.statement ?? "";
    const lower = statement.toLowerCase();
    const whereIndex = lower.indexOf("where");
    expect(whereIndex).toBeGreaterThan(-1);
    const whereClause = lower.slice(whereIndex);
    expect(whereClause).toContain("status");
    expect(whereClause).toContain("id");
    expect(whereClause).toContain("scope_company_id");
    expect(database.calls[0]?.values).toContain("open");
    expect(lower).not.toContain("open");
  });

  it("reports a save that matched no row", async () => {
    const close = closeRow({
      status: "signed",
      signedByAccountId: ACCOUNT_ID,
      signedByRole: "CEO",
      signedAt: "2026-11-30T02:03:04.000Z",
    });
    const database = sqlDouble([[]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      saveWithExpectedStatus(repository)(close, "open"),
    ).resolves.toBeUndefined();
  });

  it("maps a unique violation on insert to conflict", async () => {
    const tagged = vi.fn(async () => {
      throw Object.assign(
        new Error("duplicate key value violates unique constraint"),
        { code: "23505" },
      );
    });
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: tagged as unknown as postgres.Sql,
    });

    await expect(repository.insert(closeRow())).rejects.toMatchObject({
      reason: "conflict",
    });
  });

  it("reads the approved submissions of one period month", async () => {
    const database = sqlDouble([[]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      repository.listApprovedSubmissions({
        scope: { companyId: COMPANY_ID },
        periodMonth: PERIOD_MONTH,
      }),
    ).resolves.toEqual([]);
    expect(database.calls[0]?.values).toEqual([
      COMPANY_ID,
      "approved",
      PERIOD_MONTH,
    ]);
    expect(database.calls[0]?.statement).toContain("accounting_submissions");
  });

  it("appends one audit row and never updates the audit table", async () => {
    const database = sqlDouble([[]]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await repository.recordAuditEvent({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      closeId: CLOSE_ID,
      action: "monthly-close-lock",
      actorAccountId: ACCOUNT_ID,
      actorRole: "CEO",
      reason: null,
      createdAt: "2026-11-30T02:03:04.000Z",
    });

    const statement = database.calls[0]?.statement.toLowerCase() ?? "";
    expect(statement).toContain("insert into");
    expect(statement).toContain("accounting_monthly_close_audit_events");
    expect(statement).not.toContain("update");
    expect(statement).not.toContain("delete");
  });

  it("rejects a malformed stored close row during revalidation", async () => {
    const database = sqlDouble([
      [{ ...rawCloseRow(closeRow()), status: "archived" }],
    ]);
    const repository = createPostgresAccountingMonthlyCloseRepository({
      sql: database.sql,
    });

    await expect(
      repository.listByScope({ companyId: COMPANY_ID }),
    ).rejects.toThrow();
  });
});
