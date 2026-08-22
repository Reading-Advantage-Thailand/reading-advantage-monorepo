/**
 * Red tests for the Accounting submission domain module (`../submissions.ts`).
 *
 * These tests define the expected domain API for the Green phase:
 *
 * - `AccountingActor`: the SSO-authorized caller. The actor alone carries the
 *   company scope (`companyId`) — the domain derives the persistence scope
 *   from the actor and NEVER accepts a caller-supplied scope. This is a
 *   deliberate deviation from the loose `{ repository, scope, actor, ... }`
 *   sketch: scope is actor-derived, so no `scope` parameter exists.
 * - `AccountingSubmissionRepository`: injected persistence port (faked here;
 *   no real DB in unit tests), with `insert`, `findByIdempotencyKey`, and
 *   `listByScope`.
 * - `submitAccountingSubmission({ repository, actor, input, idempotencyKey? })`:
 *   validates `input` against `accountingSubmissionInputSchema`, requires the
 *   actor role to be STAFF, OWNER, or ACCOUNTANT, persists via the repository
 *   port, and returns the stored `AccountingSubmission`. With an
 *   `idempotencyKey`, a replay with the same key and actor returns the
 *   original submission without a second insert (repository-mediated replay,
 *   mirroring the finance-operations append-with-replay pattern).
 * - `listAccountingSubmissions({ repository, actor })`: STAFF actors receive
 *   only their own submissions; OWNER and ACCOUNTANT actors receive every
 *   submission in the actor's company scope.
 * - `AccountingSubmissionError`: structured failure with a stable `reason`
 *   ("invalid-input" carries zod `issues`; "forbidden" for actors without an
 *   accounting role).
 *
 * The module must export NO approval/mutation function; approvals arrive in a
 * later phase as new append-only records.
 */
import { describe, expect, it, vi } from "vitest";

import {
  accountingSubmissionSchema,
  type AccountingSubmission,
  type AccountingSubmissionInput,
} from "../contracts.js";
import {
  AccountingSubmissionError,
  listAccountingSubmissions,
  submitAccountingSubmission,
  type AccountingActor,
  type AccountingSubmissionRepository,
} from "../submissions.js";

const COMPANY_ID = "reading-advantage";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STAFF_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_SUBMISSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EVIDENCE_REFERENCE =
  "private-evidence://reading-advantage/submissions/receipt-0001.pdf";

const staffActor: AccountingActor = {
  accountId: STAFF_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "STAFF",
};

const thbExpenseInput: AccountingSubmissionInput = {
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference: EVIDENCE_REFERENCE,
};

const usdBillInput: AccountingSubmissionInput = {
  kind: "bill",
  payee: "Amazon Web Services",
  category: "hosting",
  description: "Monthly infrastructure bill",
  money: { amountMinor: "4500", currency: "USD" },
  evidenceReference: EVIDENCE_REFERENCE,
  settledThbAmount: "160523",
};

function storedSubmission(
  overrides: Partial<AccountingSubmission> = {},
): AccountingSubmission {
  return accountingSubmissionSchema.parse({
    id: SUBMISSION_ID,
    scope: { companyId: COMPANY_ID },
    status: "pending",
    submittedByAccountId: STAFF_ACCOUNT_ID,
    submittedAt: "2026-08-10T02:04:05.678Z",
    ...thbExpenseInput,
    ...overrides,
  });
}

function createFakeRepository(
  stored: readonly AccountingSubmission[] = [],
): AccountingSubmissionRepository & {
  readonly submissions: AccountingSubmission[];
  readonly auditEvents: unknown[];
} {
  const submissions = [...stored];
  const auditEvents: unknown[] = [];
  return {
    submissions,
    auditEvents,
    insert: vi.fn(
      async (
        submission: AccountingSubmission,
        _idempotencyKey?: string,
        auditEvent?: unknown,
      ) => {
        if (auditEvent !== undefined) auditEvents.push(auditEvent);
        submissions.push(submission);
        return submission;
      },
    ),
    findByIdempotencyKey: vi.fn(async () => undefined),
    listByScope: vi.fn(async (scope: { readonly companyId: string }) =>
      submissions.filter(
        (submission) => submission.scope.companyId === scope.companyId,
      ),
    ),
  } as unknown as AccountingSubmissionRepository & {
    readonly submissions: AccountingSubmission[];
    readonly auditEvents: unknown[];
  };
}

describe("accounting submissions module boundary", () => {
  it("exports submission, listing, and approval behavior", () => {
    return import("../submissions.js").then((module) => {
      expect(Object.keys(module).sort()).toEqual([
        "AccountingSubmissionError",
        "approveAccountingSubmission",
        "listAccountingSubmissions",
        "rejectAccountingSubmission",
        "submitAccountingSubmission",
      ]);
    });
  });
});

describe("submitAccountingSubmission", () => {
  it("accepts a valid THB expense without a settled amount and stores it under the actor's company scope", async () => {
    const repository = createFakeRepository();

    const submission = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: thbExpenseInput,
    });

    expect(accountingSubmissionSchema.safeParse(submission).success).toBe(true);
    expect(submission.scope).toEqual({ companyId: COMPANY_ID });
    expect(submission.status).toBe("pending");
    expect(submission.submittedByAccountId).toBe(STAFF_ACCOUNT_ID);
    expect(submission.kind).toBe("expense");
    expect(submission.money).toEqual({ amountMinor: "15000", currency: "THB" });
    expect(submission.settledThbAmount).toBeUndefined();
    expect(repository.insert).toHaveBeenCalledTimes(1);
    const persisted = vi.mocked(repository.insert).mock.calls[0]?.[0];
    expect(accountingSubmissionSchema.safeParse(persisted).success).toBe(true);
    expect(persisted?.scope.companyId).toBe(COMPANY_ID);
  });

  it.each(["OWNER", "ACCOUNTANT"] as const)(
    "accepts a submission from an actor with the %s role",
    async (role) => {
      const repository = createFakeRepository();

      const submission = await submitAccountingSubmission({
        repository,
        actor: { ...staffActor, role },
        input: thbExpenseInput,
      });

      expect(submission.scope.companyId).toBe(COMPANY_ID);
      expect(repository.insert).toHaveBeenCalledTimes(1);
    },
  );

  it("accepts a valid non-THB bill carrying the bank-settled THB total", async () => {
    const repository = createFakeRepository();

    const submission = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: usdBillInput,
    });

    expect(submission.kind).toBe("bill");
    expect(submission.money.currency).toBe("USD");
    expect(submission.settledThbAmount).toBe("160523");
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects a submission without an evidence reference", async () => {
    const repository = createFakeRepository();
    const { evidenceReference: _omitted, ...input } = thbExpenseInput;

    const error = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: input as AccountingSubmissionInput,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a money currency that is not uppercase ISO-4217", async () => {
    const repository = createFakeRepository();

    const error = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: {
        ...thbExpenseInput,
        money: { amountMinor: "15000", currency: "usd" },
      },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a non-THB submission missing the settled THB amount", async () => {
    const repository = createFakeRepository();
    const { settledThbAmount: _omitted, ...input } = usdBillInput;

    const error = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a THB submission carrying a settled THB amount", async () => {
    const repository = createFakeRepository();

    const error = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: { ...thbExpenseInput, settledThbAmount: "15000" },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects control characters in the payee", async () => {
    const repository = createFakeRepository();

    const error = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: { ...thbExpenseInput, payee: "Vendor\u0007Name" },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects an actor without an accounting role", async () => {
    const repository = createFakeRepository();

    const error = await submitAccountingSubmission({
      repository,
      actor: { ...staffActor, role: "MEMBER" },
      input: thbExpenseInput,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "forbidden" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("returns the original submission on an idempotent replay without a second insert", async () => {
    const repository = createFakeRepository();
    const idempotencyKey = "submission-request-0001";

    const original = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: thbExpenseInput,
      idempotencyKey,
    });
    vi.mocked(repository.findByIdempotencyKey).mockResolvedValue(original);

    const replay = await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: thbExpenseInput,
      idempotencyKey,
    });

    expect(replay).toEqual(original);
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { companyId: COMPANY_ID },
        submittedByAccountId: STAFF_ACCOUNT_ID,
        idempotencyKey,
      }),
    );
  });

  it("scopes idempotency keys per actor so another staff member's key inserts anew", async () => {
    const repository = createFakeRepository();
    const idempotencyKey = "submission-request-0001";

    await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: thbExpenseInput,
      idempotencyKey,
    });
    // The replay lookup is keyed by actor: the original is only visible to the
    // submitting actor, so another actor's identical key finds nothing.
    vi.mocked(repository.findByIdempotencyKey).mockResolvedValue(undefined);

    await submitAccountingSubmission({
      repository,
      actor: { ...staffActor, accountId: OTHER_STAFF_ACCOUNT_ID },
      input: thbExpenseInput,
      idempotencyKey,
    });

    expect(repository.insert).toHaveBeenCalledTimes(2);
    expect(repository.findByIdempotencyKey).toHaveBeenLastCalledWith(
      expect.objectContaining({
        submittedByAccountId: OTHER_STAFF_ACCOUNT_ID,
        idempotencyKey,
      }),
    );
  });

  it("writes one 'submit' audit event through the same transaction boundary", async () => {
    const repository = createFakeRepository();

    await submitAccountingSubmission({
      repository,
      actor: staffActor,
      input: thbExpenseInput,
    });

    expect((repository as unknown as { auditEvents: unknown[] }).auditEvents).toHaveLength(1);
    expect((repository as unknown as { auditEvents: unknown[] }).auditEvents[0]).toMatchObject({
      action: "submit",
    });
  });
});

describe("listAccountingSubmissions", () => {
  const ownSubmission = storedSubmission();
  const otherSubmission = storedSubmission({
    id: OTHER_SUBMISSION_ID,
    submittedByAccountId: OTHER_STAFF_ACCOUNT_ID,
  });

  it("returns only the STAFF actor's own submissions within the company scope", async () => {
    const repository = createFakeRepository([ownSubmission, otherSubmission]);

    const submissions = await listAccountingSubmissions({
      repository,
      actor: staffActor,
    });

    expect(repository.listByScope).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
    });
    expect(submissions).toEqual([ownSubmission]);
  });

  it.each(["OWNER", "ACCOUNTANT"] as const)(
    "returns every company-scoped submission to an %s actor",
    async (role) => {
      const repository = createFakeRepository([ownSubmission, otherSubmission]);

      const submissions = await listAccountingSubmissions({
        repository,
        actor: { ...staffActor, role },
      });

      expect(submissions).toEqual([ownSubmission, otherSubmission]);
    },
  );

  it("rejects listing for an actor without an accounting role", async () => {
    const repository = createFakeRepository([ownSubmission]);

    const error = await listAccountingSubmissions({
      repository,
      actor: { ...staffActor, role: "MEMBER" },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "forbidden" });
    expect(repository.listByScope).not.toHaveBeenCalled();
  });
});
