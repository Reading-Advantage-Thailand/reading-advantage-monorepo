// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZodIssue } from "zod";

const domain = vi.hoisted(() => ({
  submit: vi.fn(),
  submitWithOutcome: vi.fn(),
  list: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  createRepository: vi.fn(),
}));
const sqlClient = vi.hoisted(() => ({ kind: "sql" }));
const repository = vi.hoisted(() => ({ kind: "repository" }));
const createAccountingRuntimeClient = vi.hoisted(() => vi.fn());

vi.mock("@reading-advantage/backend/accounting", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@reading-advantage/backend/accounting")
    >();
  return {
    ...actual,
    submitAccountingSubmission: domain.submit,
    submitAccountingSubmissionWithOutcome: domain.submitWithOutcome,
    listAccountingSubmissions: domain.list,
    approveAccountingSubmission: domain.approve,
    rejectAccountingSubmission: domain.reject,
    createPostgresAccountingSubmissionRepository: domain.createRepository,
  };
});

vi.mock("@reading-advantage/db/accounting/runtime", () => ({
  createAccountingRuntimeClient,
}));

import { AccountingSubmissionError } from "@reading-advantage/backend/accounting";

type SubmissionsModule = typeof import("@/app/lib/submissions");

const actor = {
  accountId: "11111111-1111-4111-8111-111111111111",
  companyId: "33333333-3333-4333-8333-333333333333",
  role: "OWNER",
} as const;

const input = {
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference:
    "private-evidence://33333333-3333-4333-8333-333333333333/submissions/00000000-0000-4000-8000-000000000001/evidence",
} as const;

/**
 * Loads a fresh copy of the adapter so its process-local repository resets.
 * @returns The freshly imported submissions adapter module.
 */
async function loadAdapter(): Promise<SubmissionsModule> {
  vi.resetModules();
  return import("@/app/lib/submissions");
}

/**
 * Builds a minimal Zod issue for an invalid-input rejection.
 * @param path Issue path segments.
 * @param message Issue message.
 * @returns A Zod issue value.
 */
function issue(path: (string | number)[], message: string): ZodIssue {
  return { code: "custom", path, message } as ZodIssue;
}

describe("accounting submissions adapter wiring", () => {
  const originalUrl = process.env.ACCOUNTING_DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    createAccountingRuntimeClient.mockResolvedValue(sqlClient);
    domain.createRepository.mockReturnValue(repository);
    process.env.ACCOUNTING_DATABASE_URL = "postgres://unit-test/accounting";
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.ACCOUNTING_DATABASE_URL;
    } else {
      process.env.ACCOUNTING_DATABASE_URL = originalUrl;
    }
  });

  it("builds the repository from the dedicated accounting database URL", async () => {
    const adapter = await loadAdapter();
    domain.list.mockResolvedValue([]);

    await adapter.listAccountingSubmissions({ actor });

    expect(createAccountingRuntimeClient).toHaveBeenCalledWith({
      databaseUrl: "postgres://unit-test/accounting",
    });
    expect(domain.createRepository).toHaveBeenCalledWith({ sql: sqlClient });
  });

  it("passes an empty database URL when the variable is unset", async () => {
    delete process.env.ACCOUNTING_DATABASE_URL;
    const adapter = await loadAdapter();
    domain.list.mockResolvedValue([]);

    await adapter.listAccountingSubmissions({ actor });

    expect(createAccountingRuntimeClient).toHaveBeenCalledWith({
      databaseUrl: "",
    });
  });

  it("creates the repository once per process across calls", async () => {
    const adapter = await loadAdapter();
    domain.list.mockResolvedValue([]);
    domain.approve.mockResolvedValue({ id: "a" });

    await adapter.listAccountingSubmissions({ actor });
    await adapter.approveAccountingSubmission({ actor, submissionId: "a" });
    await adapter.listAccountingSubmissions({ actor });

    expect(createAccountingRuntimeClient).toHaveBeenCalledTimes(1);
    expect(domain.createRepository).toHaveBeenCalledTimes(1);
  });

  it("surfaces a runtime client failure to the caller", async () => {
    const adapter = await loadAdapter();
    const failure = new Error("invalid accounting database URL");
    createAccountingRuntimeClient.mockRejectedValue(failure);

    await expect(adapter.listAccountingSubmissions({ actor })).rejects.toBe(
      failure,
    );
    expect(domain.list).not.toHaveBeenCalled();
  });

  it("submits without optional fields when the caller omits them", async () => {
    const adapter = await loadAdapter();
    const stored = { id: "s1", status: "pending" };
    domain.submit.mockResolvedValue(stored);

    await expect(
      adapter.submitAccountingSubmission({ actor, input }),
    ).resolves.toBe(stored);

    const call = domain.submit.mock.calls[0][0];
    expect(call).toEqual({ repository, actor, input });
    expect(call).not.toHaveProperty("idempotencyKey");
    expect(call).not.toHaveProperty("compareEvidence");
  });

  it("forwards the idempotency key and evidence comparator on submit", async () => {
    const adapter = await loadAdapter();
    const compareEvidence = vi.fn().mockResolvedValue(true);
    domain.submit.mockResolvedValue({ id: "s1" });

    await adapter.submitAccountingSubmission({
      actor,
      input,
      idempotencyKey: "idem-1",
      compareEvidence,
    });

    expect(domain.submit).toHaveBeenCalledWith({
      repository,
      actor,
      input,
      idempotencyKey: "idem-1",
      compareEvidence,
    });
  });

  it("returns the created or replayed outcome from submit with outcome", async () => {
    const adapter = await loadAdapter();
    const outcome = { submission: { id: "s1" }, outcome: "replayed" };
    domain.submitWithOutcome.mockResolvedValue(outcome);

    await expect(
      adapter.submitAccountingSubmissionWithOutcome({
        actor,
        input,
        idempotencyKey: "idem-2",
      }),
    ).resolves.toBe(outcome);
    const call = domain.submitWithOutcome.mock.calls[0][0];
    expect(call).toEqual({
      repository,
      actor,
      input,
      idempotencyKey: "idem-2",
    });
    expect(call).not.toHaveProperty("compareEvidence");
  });

  it("forwards the evidence comparator on submit with outcome", async () => {
    const adapter = await loadAdapter();
    const compareEvidence = vi.fn();
    domain.submitWithOutcome.mockResolvedValue({});

    await adapter.submitAccountingSubmissionWithOutcome({
      actor,
      input,
      compareEvidence,
    });

    const call = domain.submitWithOutcome.mock.calls[0][0];
    expect(call.compareEvidence).toBe(compareEvidence);
    expect(call).not.toHaveProperty("idempotencyKey");
  });

  it("lists submissions under the actor scope", async () => {
    const adapter = await loadAdapter();
    const rows = [{ id: "s1" }, { id: "s2" }];
    domain.list.mockResolvedValue(rows);

    await expect(adapter.listAccountingSubmissions({ actor })).resolves.toBe(
      rows,
    );
    expect(domain.list).toHaveBeenCalledWith({ repository, actor });
  });

  it("approves one submission by id", async () => {
    const adapter = await loadAdapter();
    const approved = { id: "s1", status: "approved" };
    domain.approve.mockResolvedValue(approved);

    await expect(
      adapter.approveAccountingSubmission({ actor, submissionId: "s1" }),
    ).resolves.toBe(approved);
    expect(domain.approve).toHaveBeenCalledWith({
      repository,
      actor,
      submissionId: "s1",
    });
  });

  it("rejects one submission with the given reason", async () => {
    const adapter = await loadAdapter();
    const rejected = { id: "s1", status: "rejected" };
    domain.reject.mockResolvedValue(rejected);

    await expect(
      adapter.rejectAccountingSubmission({
        actor,
        submissionId: "s1",
        reason: "Duplicate receipt",
      }),
    ).resolves.toBe(rejected);
    expect(domain.reject).toHaveBeenCalledWith({
      repository,
      actor,
      submissionId: "s1",
      reason: "Duplicate receipt",
    });
  });

  it("forwards an undefined rejection reason unchanged", async () => {
    const adapter = await loadAdapter();
    domain.reject.mockResolvedValue({ id: "s1" });

    await adapter.rejectAccountingSubmission({
      actor,
      submissionId: "s1",
      reason: undefined,
    });

    const call = domain.reject.mock.calls[0][0];
    expect(call).toHaveProperty("reason", undefined);
  });

  it("groups invalid-input issues into field errors by dotted path", async () => {
    const adapter = await loadAdapter();
    const rejection = new AccountingSubmissionError("invalid-input", [
      issue(["money", "amountMinor"], "Amount must be positive"),
      issue(["money", "amountMinor"], "Amount must be an integer"),
      issue(["payee"], "Payee is required"),
      issue([], "Submission is malformed"),
      issue(["lines", 0, "amount"], "Line amount is required"),
    ]);
    domain.submit.mockRejectedValue(rejection);

    const error = await adapter
      .submitAccountingSubmission({ actor, input })
      .catch((caught: unknown) => caught);

    expect(error).toBe(rejection);
    expect(error).toMatchObject({
      name: "AccountingSubmissionError",
      reason: "invalid-input",
      message: "Submission validation failed",
      fieldErrors: {
        "money.amountMinor": [
          "Amount must be positive",
          "Amount must be an integer",
        ],
        payee: ["Payee is required"],
        submission: ["Submission is malformed"],
        "lines.0.amount": ["Line amount is required"],
      },
    });
  });

  it("returns empty field errors when invalid input carries no issues", async () => {
    const adapter = await loadAdapter();
    domain.approve.mockRejectedValue(
      new AccountingSubmissionError("invalid-input"),
    );

    await expect(
      adapter.approveAccountingSubmission({ actor, submissionId: "bad" }),
    ).rejects.toMatchObject({
      message: "Submission validation failed",
      fieldErrors: {},
    });
  });

  it.each([
    ["forbidden", "list"],
    ["not-found", "approve"],
    ["forbidden", "reject"],
  ] as const)(
    "passes a %s domain rejection from %s through unchanged",
    async (reason, operation) => {
      const adapter = await loadAdapter();
      const rejection = new AccountingSubmissionError(reason);
      domain[operation].mockRejectedValue(rejection);

      const call =
        operation === "list"
          ? adapter.listAccountingSubmissions({ actor })
          : operation === "approve"
            ? adapter.approveAccountingSubmission({ actor, submissionId: "x" })
            : adapter.rejectAccountingSubmission({
                actor,
                submissionId: "x",
                reason: "no",
              });
      const error = await call.catch((caught: unknown) => caught);

      expect(error).toBe(rejection);
      expect(error).toMatchObject({ message: reason });
      expect(error).not.toHaveProperty("fieldErrors");
    },
  );

  it("passes a non-domain error from submit with outcome through unchanged", async () => {
    const adapter = await loadAdapter();
    const failure = new Error("connection reset");
    domain.submitWithOutcome.mockRejectedValue(failure);

    const error = await adapter
      .submitAccountingSubmissionWithOutcome({ actor, input })
      .catch((caught: unknown) => caught);

    expect(error).toBe(failure);
    expect(error).toMatchObject({ message: "connection reset" });
    expect(error).not.toHaveProperty("fieldErrors");
  });
});
