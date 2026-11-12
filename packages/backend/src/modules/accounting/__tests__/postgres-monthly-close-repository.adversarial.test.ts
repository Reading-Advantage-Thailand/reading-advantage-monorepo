/**
 * Adversarial tests for the PostgreSQL monthly close repository
 * (`../postgres-monthly-close-repository.ts`), Phase 2 of
 * accounting_drive_intake_20261109.
 *
 * The tests use a tagged SQL double that records each statement and its bound
 * values. They prove the company scope of every lookup, the rethrow of every
 * driver error that is not a unique violation, and the shape of each failure.
 * No database runs and no real finance row enters this file.
 */
import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { AccountingMonthlyClose } from "../intake-contracts.js";
import { createPostgresAccountingMonthlyCloseRepository } from "../postgres-monthly-close-repository.js";
import { AccountingSubmissionError } from "../submissions.js";

const COMPANY_ID = "00000000-0000-4000-8000-0000000000a1";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const CLOSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERIOD_MONTH = "2026-11";
const REPORT_REFERENCE = `private-evidence://${COMPANY_ID}/monthly-closes/${CLOSE_ID}/report`;

interface SqlCall {
  readonly statement: string;
  readonly values: readonly unknown[];
}

/**
 * Creates a tagged SQL double. Each response is a row list to return or an
 * object holding a value to throw.
 * @param responses Ordered query outcomes.
 * @returns The recorded calls and the `postgres.Sql` double.
 */
function sqlDouble(
  responses: readonly (
    | readonly Record<string, unknown>[]
    | { readonly throws: unknown }
  )[],
): { readonly calls: SqlCall[]; readonly sql: postgres.Sql } {
  const pending = [...responses];
  const calls: SqlCall[] = [];
  const tagged = vi.fn(
    async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      calls.push({ statement: strings.join("?"), values });
      const response = pending.shift();
      if (response === undefined) throw new Error("Unexpected SQL statement.");
      if ("throws" in response) throw response.throws;
      return response;
    },
  );
  return { calls, sql: tagged as unknown as postgres.Sql };
}

/** Builds one valid close. */
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

/** Builds a repository over one SQL double. */
function repositoryOver(sql: postgres.Sql) {
  return createPostgresAccountingMonthlyCloseRepository({ sql });
}

describe("monthly close repository, insert failures", () => {
  it("maps a unique violation to a bare conflict that carries no driver detail", async () => {
    const driverError = Object.assign(
      new Error(
        'duplicate key value violates unique constraint "accounting_monthly_closes_company_period_key" host=10.0.0.5',
      ),
      { code: "23505", detail: "Key (scope_company_id)=(secret) already exists." },
    );
    const database = sqlDouble([{ throws: driverError }]);

    const error = await repositoryOver(database.sql)
      .insert(closeRow())
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "conflict", message: "conflict" });
    const serialized = JSON.stringify({
      message: (error as Error).message,
      keys: Object.keys(error as object),
      cause: (error as { cause?: unknown }).cause ?? null,
    });
    expect(serialized).not.toContain("10.0.0.5");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("accounting_monthly_closes");
  });

  it.each([
    ["a foreign key violation", Object.assign(new Error("fk"), { code: "23503" })],
    ["a serialization failure", Object.assign(new Error("serialize"), { code: "40001" })],
    ["a connection failure", Object.assign(new Error("reset"), { code: "08006" })],
    ["an error with no code", new Error("no code")],
    ["a numeric 23505", Object.assign(new Error("numeric"), { code: 23505 })],
    ["a 23505 with padding", Object.assign(new Error("padded"), { code: " 23505" })],
    ["a lowercase-looking code", Object.assign(new Error("other"), { code: "2350" })],
  ])("rethrows %s unchanged", async (_label, failure) => {
    const database = sqlDouble([{ throws: failure }]);

    const error = await repositoryOver(database.sql)
      .insert(closeRow())
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(AccountingSubmissionError);
  });

  it.each([
    ["null", null],
    ["a string", "driver exploded"],
    ["a number", 23505],
  ])("rethrows a thrown %s unchanged", async (_label, failure) => {
    const database = sqlDouble([{ throws: failure }]);

    const outcome = await repositoryOver(database.sql)
      .insert(closeRow())
      .then(
        () => ({ rejected: false as const }),
        (caught: unknown) => ({ rejected: true as const, caught }),
      );

    expect(outcome).toEqual({ rejected: true, caught: failure });
  });

  it("fails with a plain error, not a domain error, when the insert returns no row", async () => {
    const database = sqlDouble([[]]);

    const error = await repositoryOver(database.sql)
      .insert(closeRow())
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AccountingSubmissionError);
  });

  it("issues one statement for an insert", async () => {
    const close = closeRow();
    const database = sqlDouble([[rawCloseRow(close)]]);

    await repositoryOver(database.sql).insert(close);

    expect(database.calls).toHaveLength(1);
  });
});

describe("monthly close repository, the company scope of every lookup", () => {
  it("scopes findById by the company and the close id, both bound", async () => {
    const database = sqlDouble([[]]);

    const found = await repositoryOver(database.sql).findById({
      scope: { companyId: COMPANY_ID },
      closeId: CLOSE_ID,
    });

    expect(found).toBeUndefined();
    expect(database.calls).toHaveLength(1);
    expect(database.calls[0]?.values).toEqual([COMPANY_ID, CLOSE_ID]);
    const lower = database.calls[0]?.statement.toLowerCase() ?? "";
    expect(lower).toContain("from accounting_monthly_closes");
    expect(lower).toMatch(/where\s+scope_company_id\s*=\s*\?/u);
    expect(lower).toMatch(/and\s+id\s*=\s*\?/u);
  });

  it("returns undefined when findByPeriodMonth finds no row", async () => {
    const database = sqlDouble([[]]);

    await expect(
      repositoryOver(database.sql).findByPeriodMonth({
        scope: { companyId: COMPANY_ID },
        periodMonth: PERIOD_MONTH,
      }),
    ).resolves.toBeUndefined();
  });

  it("scopes the approved submissions by company, the approved status, and the month, all bound", async () => {
    const database = sqlDouble([[]]);

    await repositoryOver(database.sql).listApprovedSubmissions({
      scope: { companyId: COMPANY_ID },
      periodMonth: PERIOD_MONTH,
    });

    const lower = database.calls[0]?.statement.toLowerCase() ?? "";
    expect(lower).toMatch(/where\s+scope_company_id\s*=\s*\?/u);
    expect(lower).toMatch(/and\s+status\s*=\s*\?/u);
    expect(lower).not.toContain("approved");
    expect(lower).not.toContain(PERIOD_MONTH);
  });

  it("binds a hostile company id and a hostile month as values, never as statement text", async () => {
    const hostile = "x'; drop table accounting_monthly_closes; --";
    const database = sqlDouble([[], [], []]);
    const repository = repositoryOver(database.sql);

    await repository.listByScope({ companyId: hostile });
    await repository.findByPeriodMonth({
      scope: { companyId: hostile },
      periodMonth: hostile,
    });
    await repository.findById({ scope: { companyId: hostile }, closeId: hostile });

    for (const call of database.calls) {
      expect(call.statement).not.toContain("drop table");
      expect(call.values).toContain(hostile);
    }
  });
});

describe("monthly close repository, save", () => {
  it("returns undefined and issues one statement when no row matches the expected status", async () => {
    const database = sqlDouble([[]]);

    const result = await repositoryOver(database.sql).save(
      closeRow({ status: "signed", signedByAccountId: ACCOUNT_ID, signedByRole: "CEO", signedAt: "2026-11-30T02:03:04.000Z" }),
      "open",
    );

    expect(result).toBeUndefined();
    expect(database.calls).toHaveLength(1);
  });

  it("binds the scope company of the close in the where clause, after the id", async () => {
    const close = closeRow({
      status: "signed",
      signedByAccountId: ACCOUNT_ID,
      signedByRole: "CEO",
      signedAt: "2026-11-30T02:03:04.000Z",
    });
    const database = sqlDouble([[rawCloseRow(close)]]);

    await repositoryOver(database.sql).save(close, "open");

    const lower = database.calls[0]?.statement.toLowerCase() ?? "";
    const whereClause = lower.slice(lower.indexOf("where"));
    expect(whereClause).toMatch(/id\s*=\s*\?/u);
    expect(whereClause).toMatch(/and\s+scope_company_id\s*=\s*\?/u);
    expect(whereClause).toMatch(/and\s+status\s*=\s*\?/u);
    const values = database.calls[0]?.values ?? [];
    expect(values.slice(-3)).toEqual([CLOSE_ID, COMPANY_ID, "open"]);
    expect(lower).not.toMatch(/'(open|signed|locked)'/u);
  });

  it("rejects a returned row that breaks the close contract instead of returning it", async () => {
    const close = closeRow();
    const database = sqlDouble([
      [{ ...rawCloseRow(close), status: "locked", locked_at: null }],
    ]);

    await expect(repositoryOver(database.sql).save(close, "open")).rejects.toThrow();
  });

  it("rethrows a driver error of the save unchanged", async () => {
    const failure = Object.assign(new Error("deadlock detected"), { code: "40P01" });
    const database = sqlDouble([{ throws: failure }]);

    const error = await repositoryOver(database.sql)
      .save(closeRow(), "open")
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBe(failure);
  });
});

describe("monthly close repository, the audit insert", () => {
  const event = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    closeId: CLOSE_ID,
    action: "monthly-close-sign",
    actorAccountId: ACCOUNT_ID,
    actorRole: "CEO",
    reason: null,
    createdAt: "2026-11-30T02:03:04.000Z",
  } as const;

  it("propagates a driver failure of the audit insert and does not swallow it", async () => {
    const failure = new Error("audit insert failed");
    const database = sqlDouble([{ throws: failure }]);

    const error = await repositoryOver(database.sql)
      .recordAuditEvent(event)
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBe(failure);
  });

  it("binds the seven audit fields in column order and issues one statement", async () => {
    const database = sqlDouble([[]]);

    const stored = await repositoryOver(database.sql).recordAuditEvent(event);

    expect(stored).toEqual(event);
    expect(database.calls).toHaveLength(1);
    expect(database.calls[0]?.values).toEqual([
      event.id,
      event.closeId,
      event.action,
      event.actorAccountId,
      event.actorRole,
      null,
      event.createdAt,
    ]);
  });
});
