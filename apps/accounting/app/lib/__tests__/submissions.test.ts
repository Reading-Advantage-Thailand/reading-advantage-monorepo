// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitDomainAccountingSubmission = vi.hoisted(() => vi.fn());
const accountingRuntimeClient = vi.hoisted(() => ({}));
const createAccountingRuntimeClient = vi.hoisted(() =>
  vi.fn().mockResolvedValue(accountingRuntimeClient),
);

vi.mock("@reading-advantage/backend/accounting", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@reading-advantage/backend/accounting")
    >();
  return {
    ...actual,
    submitAccountingSubmission: submitDomainAccountingSubmission,
  };
});

vi.mock("@reading-advantage/db/accounting/runtime", () => ({
  createAccountingRuntimeClient,
}));

import {
  submitAccountingSubmission,
  type SubmitAccountingSubmissionRequest,
} from "@/app/lib/submissions";
import { AccountingSubmissionError } from "@reading-advantage/backend/accounting";

const request = {
  actor: {
    accountId: "11111111-1111-4111-8111-111111111111",
    companyId: "33333333-3333-4333-8333-333333333333",
    role: "STAFF",
  },
  input: {
    kind: "expense",
    payee: "Bangkok Taxi Cooperative",
    category: "travel",
    money: { amountMinor: "15000", currency: "THB" },
    evidenceReference:
      "private-evidence://33333333-3333-4333-8333-333333333333/submissions/00000000-0000-4000-8000-000000000001/evidence",
  },
} satisfies SubmitAccountingSubmissionRequest;

describe("accounting submissions adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rethrows the exact provider value when error classification traps", async () => {
    const providerError = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("provider prototype inspected");
        },
      },
    );
    submitDomainAccountingSubmission.mockRejectedValue(providerError);

    await expect(submitAccountingSubmission(request)).rejects.toBe(
      providerError,
    );
  });

  it("rethrows the exact provider value when error enrichment traps", async () => {
    const providerError = new Proxy(
      new AccountingSubmissionError("invalid-input", []),
      {
        set() {
          throw new Error("provider error mutated");
        },
      },
    );
    submitDomainAccountingSubmission.mockRejectedValue(providerError);

    await expect(submitAccountingSubmission(request)).rejects.toBe(
      providerError,
    );
  });
});
