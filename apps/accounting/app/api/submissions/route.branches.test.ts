// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/submissions/route";
import { AccountingSubmissionError } from "@reading-advantage/backend/accounting";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  submitAccountingSubmissionWithOutcome: vi.fn(),
  listAccountingSubmissions: vi.fn(),
  putPrivateEvidence: vi.fn(),
  readPrivateEvidence: vi.fn(),
  deletePrivateEvidence: vi.fn(),
}));

const consoleErrorMock = vi
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

afterAll(() => {
  consoleErrorMock.mockRestore();
});

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/submissions", () => ({
  submitAccountingSubmissionWithOutcome:
    mocks.submitAccountingSubmissionWithOutcome,
  listAccountingSubmissions: mocks.listAccountingSubmissions,
}));
vi.mock("@/app/lib/private-evidence-storage", () => ({
  putPrivateEvidence: mocks.putPrivateEvidence,
  readPrivateEvidence: mocks.readPrivateEvidence,
  deletePrivateEvidence: mocks.deletePrivateEvidence,
}));

const ROUTE_URL = "http://localhost/api/submissions";
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_ID = "00000000-0000-4000-8000-000000000001";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/${UPLOAD_ID}/evidence`;
const OTHER_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000009/evidence`;
const IDEMPOTENCY_KEY = "44444444-4444-4444-8444-444444444444";

const user = {
  id: ACCOUNT_ID,
  username: "accounting-user",
  name: "Accounting User",
  role: "OWNER",
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

const fields = {
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  amountMinor: "15000",
  currency: "THB",
} as const;

const stored = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  status: "pending",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference: EVIDENCE_REFERENCE,
};

/**
 * Builds an evidence file with the given MIME type and bytes.
 * @param type Declared MIME type.
 * @param bytes File contents.
 * @returns A File part for the evidence field.
 */
function evidence(type = "application/pdf", bytes = [1, 2, 3, 4]): File {
  return new File([new Uint8Array(bytes)], "receipt", { type });
}

/**
 * Builds a same-origin multipart POST request.
 * @param form Form fields and files.
 * @param idempotencyKey Header value, or null to omit it.
 * @returns The route request.
 */
function post(
  form: FormData,
  idempotencyKey: string | null = IDEMPOTENCY_KEY,
): Request {
  return new Request(ROUTE_URL, {
    method: "POST",
    headers: {
      origin: "http://localhost",
      ...(idempotencyKey === null ? {} : { "idempotency-key": idempotencyKey }),
    },
    body: form,
  });
}

/**
 * Builds a form with the default fields, overrides, and one evidence file.
 * @param overrides Field values to set or replace.
 * @param files Evidence files to attach.
 * @returns The populated form.
 */
function formWith(
  overrides: Record<string, string> = {},
  files: File[] = [evidence()],
): FormData {
  const form = new FormData();
  for (const file of files) form.append("evidence", file);
  for (const [name, value] of Object.entries({ ...fields, ...overrides })) {
    form.set(name, value);
  }
  return form;
}

/**
 * Returns the request object passed to the submit adapter on one call.
 * @param call Zero-based call index.
 * @returns The submit request.
 */
function submitCall(call = 0) {
  return mocks.submitAccountingSubmissionWithOutcome.mock.calls[call][0];
}

describe("POST /api/submissions branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountingSession.mockResolvedValue({
      ok: true,
      session: { user },
    });
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: EVIDENCE_REFERENCE,
    });
    mocks.deletePrivateEvidence.mockResolvedValue(undefined);
  });

  it.each(["", "   ", "k".repeat(257)])(
    "returns 400 for an invalid idempotency key %#",
    async (key) => {
      const response = await POST(post(formWith(), key));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        message: "The idempotency key is invalid",
        fieldErrors: {
          idempotencyKey: [
            "Send a nonblank idempotency key with at most 256 characters",
          ],
        },
      });
      expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    },
  );

  it("returns 400 when the body is not multipart form data", async () => {
    const response = await POST(
      new Request(ROUTE_URL, {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify(fields),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "A multipart/form-data body is required",
      fieldErrors: { body: ["Send multipart/form-data"] },
    });
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
  });

  it.each([
    ["two evidence files", [evidence(), evidence()]],
    ["an empty evidence file", [evidence("application/pdf", [])]],
    ["a text evidence file", [evidence("text/plain")]],
    ["an untyped evidence file", [evidence("")]],
  ])("returns 400 for %s without storing evidence", async (_label, files) => {
    const response = await POST(post(formWith({}, files)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "An evidence file is required",
      fieldErrors: { evidence: ["Attach exactly one evidence file"] },
    });
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 400 when the evidence field is a text value", async () => {
    const form = formWith({}, []);
    form.set("evidence", "not a file");

    const response = await POST(post(form));

    expect(response.status).toBe(400);
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
  });

  it("accepts an image type in any letter case and stores its bytes", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });

    const response = await POST(
      post(formWith({}, [evidence("IMAGE/PNG", [9, 8, 7])])),
    );

    expect(response.status).toBe(201);
    const put = mocks.putPrivateEvidence.mock.calls[0][0];
    expect(put.companyId).toBe(COMPANY_ID);
    expect(put.contentType).toBe("image/png");
    expect(Array.from(put.body as Uint8Array)).toEqual([9, 8, 7]);
  });

  it("sends empty strings for missing scalar fields to the domain", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });
    const form = new FormData();
    form.append("evidence", evidence());

    await POST(post(form));

    expect(submitCall().input).toEqual({
      kind: "",
      payee: "",
      category: "",
      money: { amountMinor: "", currency: "" },
      evidenceReference: EVIDENCE_REFERENCE,
    });
  });

  it("forwards description and settled THB amount for a foreign bill", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });

    await POST(
      post(
        formWith({
          kind: "bill",
          currency: "USD",
          amountMinor: "2000",
          description: "Hosting",
          settledThbAmount: "69200",
        }),
      ),
    );

    expect(submitCall()).toMatchObject({
      actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "OWNER" },
      idempotencyKey: IDEMPOTENCY_KEY,
      input: {
        kind: "bill",
        description: "Hosting",
        money: { amountMinor: "2000", currency: "USD" },
        settledThbAmount: "69200",
        evidenceReference: EVIDENCE_REFERENCE,
      },
    });
  });

  it("keeps the amount as the raw minor-unit string without rounding", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });

    await POST(post(formWith({ amountMinor: "900719925474099199" })));

    expect(submitCall().input.money.amountMinor).toBe("900719925474099199");
  });

  it("returns 200 without cleanup for a replay that stored this upload", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "replayed",
    });

    const response = await POST(post(formWith()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
  });

  it("does not read stored evidence when the candidate reference differs", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });
    await POST(post(formWith()));

    const same = await submitCall().compareEvidence({
      candidateEvidenceReference: OTHER_REFERENCE,
      storedEvidenceReference: EVIDENCE_REFERENCE,
    });

    expect(same).toBe(false);
    expect(mocks.readPrivateEvidence).not.toHaveBeenCalled();
  });

  it("treats stored evidence of a different length as different", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });
    mocks.readPrivateEvidence.mockResolvedValue(new Uint8Array([1, 2, 3]));
    await POST(post(formWith()));

    const same = await submitCall().compareEvidence({
      candidateEvidenceReference: EVIDENCE_REFERENCE,
      storedEvidenceReference: OTHER_REFERENCE,
    });

    expect(same).toBe(false);
    expect(mocks.readPrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: OTHER_REFERENCE,
    });
  });

  it("treats stored evidence with identical bytes as the same", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: stored,
      outcome: "created",
    });
    mocks.readPrivateEvidence.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    await POST(post(formWith()));

    await expect(
      submitCall().compareEvidence({
        candidateEvidenceReference: EVIDENCE_REFERENCE,
        storedEvidenceReference: OTHER_REFERENCE,
      }),
    ).resolves.toBe(true);
  });

  it("deletes the upload and rethrows a forbidden domain rejection", async () => {
    const rejection = new AccountingSubmissionError("forbidden");
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(rejection);

    await expect(POST(post(formWith()))).rejects.toBe(rejection);
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: EVIDENCE_REFERENCE,
    });
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      1,
    );
  });

  it("returns 409 and deletes the upload when the retry hits a conflict", async () => {
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(new Error("response lost after commit"))
      .mockRejectedValueOnce(new AccountingSubmissionError("conflict"));

    const response = await POST(post(formWith()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "The idempotency key is already used for different content",
    });
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      2,
    );
    expect(submitCall(1).idempotencyKey).toBe(IDEMPOTENCY_KEY);
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledTimes(1);
  });

  it("returns the retry result when the second attempt succeeds", async () => {
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(new Error("response lost after commit"))
      .mockResolvedValueOnce({ submission: stored, outcome: "replayed" });

    const response = await POST(post(formWith()));

    expect(response.status).toBe(200);
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a not-found domain reason",
      () => new AccountingSubmissionError("not-found"),
    ],
    [
      "a renamed domain error",
      () => {
        const error = new AccountingSubmissionError("conflict");
        error.name = "OtherError";
        return error;
      },
    ],
    [
      "invalid input with array field errors",
      () =>
        Object.assign(new AccountingSubmissionError("invalid-input"), {
          fieldErrors: ["payee"],
        }),
    ],
    [
      "invalid input with a non-array message list",
      () =>
        Object.assign(new AccountingSubmissionError("invalid-input"), {
          fieldErrors: { payee: "Payee is required" },
        }),
    ],
    [
      "invalid input with a non-string message",
      () =>
        Object.assign(new AccountingSubmissionError("invalid-input"), {
          fieldErrors: { payee: [42] },
        }),
    ],
    [
      "invalid input without field errors",
      () => new AccountingSubmissionError("invalid-input"),
    ],
  ])(
    "treats %s as unknown and rethrows without an idempotency key",
    async (_label, makeError) => {
      const rejection = makeError();
      mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(rejection);

      await expect(POST(post(formWith(), null))).rejects.toBe(rejection);
      expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
      expect(
        mocks.submitAccountingSubmissionWithOutcome,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it("logs requestId unknown when the stored reference is malformed", async () => {
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: "not-a-private-reference",
    });
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      new Error("database down"),
    );

    await expect(POST(post(formWith(), null))).rejects.toThrow(
      "database down",
    );
    const records = consoleErrorMock.mock.calls.map((call) =>
      JSON.parse(String(call[0])),
    );
    expect(records.at(-1)).toEqual({
      level: "error",
      event: "accounting_submission_outcome_unresolved",
      operation: "submit_accounting_submission",
      companyId: COMPANY_ID,
      requestId: "unknown",
      errorName: "Error",
    });
  });

  it("logs the upload id as requestId for a well-formed reference", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      new Error("database down"),
    );

    await expect(POST(post(formWith(), null))).rejects.toThrow();
    const record = JSON.parse(
      String(consoleErrorMock.mock.calls.at(-1)?.[0]),
    );
    expect(record.requestId).toBe(UPLOAD_ID);
  });
});
