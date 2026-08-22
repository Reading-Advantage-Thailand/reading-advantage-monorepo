/**
 * Red tests for Accounting approval transitions and audit events (Task 7).
 *
 * This suite defines the OWNER-only approve/reject workflow that Task 9 will
 * implement. The in-memory fake repository mirrors `submissions.test.ts` but
 * adds `auditEvents` and the two new repository methods (`findById`,
 * `transition`). Against the current code every test fails (red): the
 * approve/reject exports, the `not-found` branch, and the `invalid-input`
 * guard do not exist yet.
 */
import { describe, expect, it, vi } from "vitest";

import {
  accountingSubmissionSchema,
  type AccountingSubmission,
  type AccountingSubmissionInput,
} from "../contracts.js";
import { AccountingSubmissionError } from "../submissions.js";

const COMPANY_ID = "reading-advantage";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";
const ACCOUNTANT_ACCOUNT_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_STAFF_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const UNKNOWN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const EVIDENCE_REFERENCE =
  "private-evidence://reading-advantage/submissions/receipt-0001.pdf";

const ownerActor = {
  accountId: OWNER_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "OWNER" as const,
};
const staffActor = {
  accountId: STAFF_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "STAFF" as const,
};
const accountantActor = {
  accountId: ACCOUNTANT_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "ACCOUNTANT" as const,
};

const thbExpenseInput: AccountingSubmissionInput = {
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference: EVIDENCE_REFERENCE,
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
): {
  readonly submissions: AccountingSubmission[];
  readonly auditEvents: unknown[];
  readonly insert: ReturnType<typeof vi.fn>;
  readonly findByIdempotencyKey: ReturnType<typeof vi.fn>;
  readonly listByScope: ReturnType<typeof vi.fn>;
  readonly findById: ReturnType<typeof vi.fn>;
  readonly transition: ReturnType<typeof vi.fn>;
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
      submissions.filter((s) => s.scope.companyId === scope.companyId),
    ),
    findById: vi.fn(
      async (input: { readonly scope: { readonly companyId: string }; readonly submissionId: string }) =>
        submissions.find(
          (s) =>
            s.id === input.submissionId &&
            s.scope.companyId === input.scope.companyId,
        ),
    ),
    transition: vi.fn(
      async (input: {
        readonly scope: { readonly companyId: string };
        readonly submissionId: string;
        readonly status: "approved" | "rejected";
        readonly auditEvent: unknown;
      }) => {
        const idx = submissions.findIndex(
          (s) =>
            s.id === input.submissionId &&
            s.scope.companyId === input.scope.companyId,
        );
        if (idx === -1) return undefined;
        const current = submissions[idx] as AccountingSubmission;
        if (current.status !== "pending") return undefined;
        const updated = { ...current, status: input.status } as AccountingSubmission;
        submissions[idx] = updated;
        auditEvents.push(input.auditEvent);
        return updated;
      },
    ),
  };
}

describe("approveAccountingSubmission (red - Task 7)", () => {
  it("OWNER approves a pending submission -> approved + exactly one 'approve' audit event", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.approveAccountingSubmission, "approveAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.approveAccountingSubmission !== "function") return;
    const approve = mod.approveAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([storedSubmission()]);
    const result = (await approve({
      repository,
      actor: ownerActor,
      submissionId: SUBMISSION_ID,
    })) as AccountingSubmission;

    expect(result.status).toBe("approved");
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({ action: "approve" });
  });

  it.each(["STAFF", "ACCOUNTANT"] as const)(
    "rejects %s callers with forbidden",
    async (role) => {
      const mod = (await import("../submissions.js")) as Record<string, unknown>;
      expect(mod.approveAccountingSubmission, "approveAccountingSubmission is missing - red phase expected").toBeDefined();
      if (typeof mod.approveAccountingSubmission !== "function") return;
      const approve = mod.approveAccountingSubmission as (args: unknown) => Promise<unknown>;

      const repository = createFakeRepository([storedSubmission()]);
      const error = await approve({
        repository,
        actor: { ...ownerActor, role, accountId: role === "STAFF" ? STAFF_ACCOUNT_ID : ACCOUNTANT_ACCOUNT_ID },
        submissionId: SUBMISSION_ID,
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect((error as AccountingSubmissionError).reason).toBe("forbidden");
      expect(repository.auditEvents).toHaveLength(0);
    },
  );

  it("approving an unknown submission -> not-found with no audit event", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.approveAccountingSubmission, "approveAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.approveAccountingSubmission !== "function") return;
    const approve = mod.approveAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([storedSubmission()]);
    const error = await approve({
      repository,
      actor: ownerActor,
      submissionId: UNKNOWN_ID,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect((error as AccountingSubmissionError).reason).toBe("not-found");
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("approving a non-pending submission -> not-found with no audit event", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.approveAccountingSubmission, "approveAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.approveAccountingSubmission !== "function") return;
    const approve = mod.approveAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([
      storedSubmission({ status: "approved" as unknown as "pending" }),
    ]);
    const error = await approve({
      repository,
      actor: ownerActor,
      submissionId: SUBMISSION_ID,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect((error as AccountingSubmissionError).reason).toBe("not-found");
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("rejectAccountingSubmission (red - Task 7)", () => {
  it("OWNER rejects with a reason -> rejected + one 'reject' event carrying the reason", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.rejectAccountingSubmission, "rejectAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.rejectAccountingSubmission !== "function") return;
    const rejectFn = mod.rejectAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([storedSubmission()]);
    const result = (await rejectFn({
      repository,
      actor: ownerActor,
      submissionId: SUBMISSION_ID,
      reason: "Receipt is blurry",
    })) as AccountingSubmission;

    expect(result.status).toBe("rejected");
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "reject",
      reason: "Receipt is blurry",
    });
  });

  it("OWNER rejects without a reason -> invalid-input", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.rejectAccountingSubmission, "rejectAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.rejectAccountingSubmission !== "function") return;
    const rejectFn = mod.rejectAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([storedSubmission()]);
    const error = await rejectFn({
      repository,
      actor: ownerActor,
      submissionId: SUBMISSION_ID,
      reason: "",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect((error as AccountingSubmissionError).reason).toBe("invalid-input");
    expect(repository.auditEvents).toHaveLength(0);
  });

  it.each(["STAFF", "ACCOUNTANT"] as const)(
    "reject rejects %s callers with forbidden",
    async (role) => {
      const mod = (await import("../submissions.js")) as Record<string, unknown>;
      expect(mod.rejectAccountingSubmission, "rejectAccountingSubmission is missing - red phase expected").toBeDefined();
      if (typeof mod.rejectAccountingSubmission !== "function") return;
      const rejectFn = mod.rejectAccountingSubmission as (args: unknown) => Promise<unknown>;

      const repository = createFakeRepository([storedSubmission()]);
      const error = await rejectFn({
        repository,
        actor: { ...ownerActor, role, accountId: role === "STAFF" ? STAFF_ACCOUNT_ID : ACCOUNTANT_ACCOUNT_ID },
        submissionId: SUBMISSION_ID,
        reason: "Needs fix",
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect((error as AccountingSubmissionError).reason).toBe("forbidden");
      expect(repository.auditEvents).toHaveLength(0);
    },
  );

  it("rejecting an unknown submission -> not-found with no audit event", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.rejectAccountingSubmission, "rejectAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.rejectAccountingSubmission !== "function") return;
    const rejectFn = mod.rejectAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([storedSubmission()]);
    const error = await rejectFn({
      repository,
      actor: ownerActor,
      submissionId: UNKNOWN_ID,
      reason: "Nope",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect((error as AccountingSubmissionError).reason).toBe("not-found");
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("rejecting a non-pending submission -> not-found with no audit event", async () => {
    const mod = (await import("../submissions.js")) as Record<string, unknown>;
    expect(mod.rejectAccountingSubmission, "rejectAccountingSubmission is missing - red phase expected").toBeDefined();
    if (typeof mod.rejectAccountingSubmission !== "function") return;
    const rejectFn = mod.rejectAccountingSubmission as (args: unknown) => Promise<unknown>;

    const repository = createFakeRepository([
      storedSubmission({ status: "rejected" as unknown as "pending" }),
    ]);
    const error = await rejectFn({
      repository,
      actor: ownerActor,
      submissionId: SUBMISSION_ID,
      reason: "Already rejected",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect((error as AccountingSubmissionError).reason).toBe("not-found");
    expect(repository.auditEvents).toHaveLength(0);
  });
});
