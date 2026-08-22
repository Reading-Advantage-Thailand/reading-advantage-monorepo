import type postgres from "postgres";
import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";

import type { AccountingSubmission } from "../contracts.js";
import { createPostgresAccountingSubmissionRepository } from "../postgres-submission-repository.js";

const COMPANY_ID = "company-amber";
const ACCOUNT_ID = "10000000-0000-4000-8000-000000000001";
const SUBMISSION_ID = "20000000-0000-4000-8000-000000000001";
const EVIDENCE_REFERENCE =
  "private-evidence://company-amber/submissions/receipt-0001.pdf";

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
  const tagged = vi.fn(async (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => {
    calls.push({ statement: strings.join("?"), values });
    const response = pending.shift();
    if (response === undefined) throw new Error("Unexpected SQL statement.");
    return response;
  });
  return { calls, sql: tagged as unknown as postgres.Sql };
}

/** Creates a transactional tagged-SQL double that captures `sql.begin` and inner queries. */
function transactionalSqlDouble(
  responses: readonly (readonly Record<string, unknown>[])[],
): { readonly calls: SqlCall[]; readonly beginCalls: number; readonly sql: postgres.Sql } {
  const pending = [...responses];
  const calls: SqlCall[] = [];
  let beginCalls = 0;
  const tagged = vi.fn(async (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => {
    calls.push({ statement: strings.join("?"), values });
    const response = pending.shift();
    if (response === undefined) throw new Error("Unexpected SQL statement.");
    return response;
  });
  (tagged as unknown as { begin: unknown }).begin = vi.fn(
    async (callback: (tx: postgres.Sql) => Promise<unknown>) => {
      beginCalls += 1;
      return callback(tagged as unknown as postgres.Sql);
    },
  );
  return {
    get calls() {
      return calls;
    },
    get beginCalls() {
      return beginCalls;
    },
    sql: tagged as unknown as postgres.Sql,
  };
}

/** Creates a valid THB submission without optional fields. */
function thbSubmission(): AccountingSubmission {
  return {
    id: SUBMISSION_ID,
    scope: { companyId: COMPANY_ID },
    status: "pending",
    submittedByAccountId: ACCOUNT_ID,
    submittedAt: "2026-08-20T02:04:05.678Z",
    kind: "expense",
    payee: "Bangkok Taxi Cooperative",
    category: "travel",
    money: { amountMinor: "15000", currency: "THB" },
    evidenceReference: EVIDENCE_REFERENCE,
  };
}

/** Creates a valid USD submission with optional fields. */
function usdSubmission(): AccountingSubmission {
  return {
    id: SUBMISSION_ID,
    scope: { companyId: COMPANY_ID },
    status: "pending",
    submittedByAccountId: ACCOUNT_ID,
    submittedAt: "2026-08-20T02:04:05.678Z",
    kind: "bill",
    payee: "Amazon Web Services",
    category: "hosting",
    description: "Monthly infrastructure bill",
    money: { amountMinor: "4500", currency: "USD" },
    evidenceReference: EVIDENCE_REFERENCE,
    settledThbAmount: "160523",
  };
}

/** Converts a domain submission into the raw snake_case row used by the SQL double. */
function rawRowFor(
  submission: Readonly<AccountingSubmission>,
): Record<string, unknown> {
  return {
    id: submission.id,
    kind: submission.kind,
    payee: submission.payee,
    category: submission.category,
    description: submission.description ?? null,
    amount_minor: submission.money.amountMinor,
    currency: submission.money.currency,
    settled_thb_amount_minor: submission.settledThbAmount ?? null,
    evidence_reference: submission.evidenceReference,
    scope_company_id: submission.scope.companyId,
    status: submission.status,
    submitted_by_account_id: submission.submittedByAccountId,
    submitted_at: submission.submittedAt,
    idempotency_key: null,
  };
}

describe("PostgreSQL accounting submission repository", () => {
  it("maps snake_case rows to the validated domain submission", async () => {
    const submission = usdSubmission();
    const database = sqlDouble([[{
      ...rawRowFor(submission),
      submitted_at: new Date(submission.submittedAt),
      idempotency_key: "submission-request-0001",
    }]]);
    const repository = createPostgresAccountingSubmissionRepository({
      sql: database.sql,
    });

    await expect(
      repository.findByIdempotencyKey({
        scope: { companyId: COMPANY_ID },
        submittedByAccountId: ACCOUNT_ID,
        idempotencyKey: "submission-request-0001",
      }),
    ).resolves.toEqual(submission);
  });

  it("maps domain fields and optional values to insert bindings", async () => {
    const submission = thbSubmission();
    const database = sqlDouble([[rawRowFor(submission)]]);
    const repository = createPostgresAccountingSubmissionRepository({
      sql: database.sql,
    });

    await expect(
      repository.insert(submission, "submission-request-0001"),
    ).resolves.toEqual(submission);
    expect(database.calls[0]?.values).toEqual([
      SUBMISSION_ID,
      "expense",
      "Bangkok Taxi Cooperative",
      "travel",
      null,
      "15000",
      "THB",
      null,
      EVIDENCE_REFERENCE,
      COMPANY_ID,
      "pending",
      ACCOUNT_ID,
      submission.submittedAt,
      "submission-request-0001",
    ]);
  });

  it("scopes idempotency lookup by company, submitter, and key", async () => {
    const database = sqlDouble([[]]);
    const repository = createPostgresAccountingSubmissionRepository({
      sql: database.sql,
    });

    await expect(
      repository.findByIdempotencyKey({
        scope: { companyId: COMPANY_ID },
        submittedByAccountId: ACCOUNT_ID,
        idempotencyKey: "submission-request-0001",
      }),
    ).resolves.toBeUndefined();

    expect(database.calls[0]?.values).toEqual([
      COMPANY_ID,
      ACCOUNT_ID,
      "submission-request-0001",
    ]);
    expect(database.calls[0]?.statement).toContain("scope_company_id");
    expect(database.calls[0]?.statement).toContain("submitted_by_account_id");
    expect(database.calls[0]?.statement).toContain("idempotency_key");
  });

  it("scopes listing by company and maps every returned row", async () => {
    const thb = thbSubmission();
    const usd = usdSubmission();
    const database = sqlDouble([[rawRowFor(thb), rawRowFor(usd)]]);
    const repository = createPostgresAccountingSubmissionRepository({
      sql: database.sql,
    });

    await expect(repository.listByScope({ companyId: COMPANY_ID })).resolves.toEqual([
      thb,
      usd,
    ]);
    expect(database.calls[0]?.values).toEqual([COMPANY_ID]);
    expect(database.calls[0]?.statement).toContain("where scope_company_id");
  });

  it("rejects a malformed stored row during repository revalidation", async () => {
    const database = sqlDouble([[{
      ...rawRowFor(thbSubmission()),
      status: "approved",
    }]]);
    const repository = createPostgresAccountingSubmissionRepository({
      sql: database.sql,
    });

    await expect(repository.listByScope({ companyId: COMPANY_ID })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  describe("transition transaction boundary (red - Task 7)", () => {
    it("transitions a pending submission to approved and inserts an audit event in one transaction", async () => {
      const submission = thbSubmission();
      const updatedRow = rawRowFor({ ...submission, status: "approved" });
      const database = transactionalSqlDouble([[updatedRow], [{}]]);
      const repository = createPostgresAccountingSubmissionRepository({
        sql: database.sql,
      });

      expect(
        typeof (repository as unknown as { transition?: unknown }).transition,
        "transition is missing - red phase expected",
      ).toBe("function");
      if (typeof (repository as unknown as { transition?: unknown }).transition !== "function") return;

      const auditEvent = {
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        submissionId: SUBMISSION_ID,
        action: "approve" as const,
        actorAccountId: ACCOUNT_ID,
        actorRole: "OWNER",
        createdAt: "2026-08-20T02:04:05.678Z",
      };

      const result = await (
        repository as unknown as {
          transition: (input: unknown) => Promise<AccountingSubmission | undefined>;
        }
      ).transition({
        scope: { companyId: COMPANY_ID },
        submissionId: SUBMISSION_ID,
        status: "approved",
        auditEvent,
      });

      expect(result).toEqual(expect.objectContaining({ status: "approved" }));
      expect(database.beginCalls).toBe(1);
      expect(database.calls).toHaveLength(2);
      const [updateCall, insertCall] = database.calls;
      expect(updateCall?.statement.toLowerCase()).toContain("update");
      expect(updateCall?.statement.toLowerCase()).toContain("accounting_submissions");
      expect(updateCall?.statement.toLowerCase()).toContain("where");
      expect(updateCall?.statement).toContain("?");
      expect(updateCall?.values).toEqual(
        expect.arrayContaining([SUBMISSION_ID, COMPANY_ID, "pending"]),
      );
      expect(updateCall?.statement.toLowerCase()).toContain("returning");
      expect(insertCall?.statement.toLowerCase()).toContain("insert into");
      expect(insertCall?.statement.toLowerCase()).toContain("accounting_submission_audit_events");
    });

    it("transitions a pending submission to rejected with reason in one transaction", async () => {
      const submission = thbSubmission();
      const updatedRow = rawRowFor({ ...submission, status: "rejected" });
      const database = transactionalSqlDouble([[updatedRow], [{}]]);
      const repository = createPostgresAccountingSubmissionRepository({
        sql: database.sql,
      });

      expect(
        typeof (repository as unknown as { transition?: unknown }).transition,
        "transition is missing - red phase expected",
      ).toBe("function");
      if (typeof (repository as unknown as { transition?: unknown }).transition !== "function") return;

      const auditEvent = {
        id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        submissionId: SUBMISSION_ID,
        action: "reject" as const,
        actorAccountId: ACCOUNT_ID,
        actorRole: "OWNER",
        reason: "Blurry receipt",
        createdAt: "2026-08-20T02:04:05.678Z",
      };

      const result = await (
        repository as unknown as {
          transition: (input: unknown) => Promise<AccountingSubmission | undefined>;
        }
      ).transition({
        scope: { companyId: COMPANY_ID },
        submissionId: SUBMISSION_ID,
        status: "rejected",
        auditEvent,
      });

      expect(result).toEqual(expect.objectContaining({ status: "rejected" }));
      expect(database.beginCalls).toBe(1);
      expect(database.calls[1]?.values).toEqual(
        expect.arrayContaining(["reject", "Blurry receipt"]),
      );
    });
  });
});
