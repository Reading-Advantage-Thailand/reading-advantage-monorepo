// @vitest-environment node
/**
 * Red tests for the accounting submissions API route
 * (`@/app/api/submissions/route.ts` — does not exist yet).
 *
 * Decisions baked into these tests (the Green phase implements to them):
 *
 * - POST accepts `multipart/form-data` ONLY (no JSON-with-reference variant):
 *   fields `kind`, `payee`, `category`, `amountMinor`, `currency`, optional
 *   `description`, optional `settledThbAmount`, and exactly one required
 *   `evidence` file part. An optional `Idempotency-Key` request header is
 *   forwarded to the domain. This keeps evidence bytes and metadata on one
 *   atomic boundary and prevents callers from referencing storage objects the
 *   server never received.
 * - The route uploads the evidence file to private storage ONLY through the
 *   `putPrivateEvidence` port exported by `@/app/lib/private-evidence-storage`
 *   (a Green-phase adapter over `@reading-advantage/storage`; the storage
 *   package today ships only a read adapter). The route never builds storage
 *   keys or evidence references itself and ignores any caller-supplied
 *   `evidenceReference` form field.
 * - Domain behavior is reached through `@/app/lib/submissions`, a Green-phase
 *   adapter that wires `@reading-advantage/backend/accounting` domain
 *   functions to a Postgres-backed `AccountingSubmissionRepository`. The
 *   route maps the guard's session user to a domain actor
 *   `{ accountId, companyId, role }`; `companyId` comes from the session's
 *   organization identity, never from the request.
 * - Responses: 201 with the stored submission JSON on success; the guard's
 *   401/403 responses pass through untouched; validation failures (missing
 *   evidence file, or a domain `AccountingSubmissionError` with reason
 *   "invalid-input") return 400 with `{ message, fieldErrors }`.
 * - GET returns 200 with `{ submissions: [...] }`; the STAFF/OWNER/ACCOUNTANT
 *   visibility rule is enforced by the domain, so the route only forwards the
 *   actor.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/submissions/route";
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
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000001/evidence`;
const VALID_IDEMPOTENCY_KEY = "44444444-4444-4444-8444-444444444444";

const staffUser = {
  id: STAFF_ACCOUNT_ID,
  username: "accounting-user",
  name: "Accounting User",
  role: "STAFF",
  organizationId: COMPANY_ID,
  applicationRoles: ["STAFF"],
};

const expenseFields = {
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  amountMinor: "15000",
  currency: "THB",
} as const;

const storedSubmission = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: { companyId: COMPANY_ID },
  status: "pending",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference: EVIDENCE_REFERENCE,
};

function authenticated(user: Record<string, unknown> = staffUser): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: true,
    session: { user },
  });
}

function guardDenied(status: 401 | 403, message: string): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ message }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  });
}

function invalidInputError(
  fieldErrors: Record<string, string[]>,
): AccountingSubmissionError {
  const error = new AccountingSubmissionError("invalid-input");
  error.message = "Submission validation failed";
  Object.assign(error, { fieldErrors });
  return error;
}

function conflictError(): AccountingSubmissionError {
  return new AccountingSubmissionError("conflict");
}

function proxyWithThrowingGetPrototypeOf(): unknown {
  return new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("provider proxy inspected");
      },
    },
  );
}

function errorWithThrowingClassificationGetters(message: string): Error {
  const error = new Error(message);
  Object.defineProperties(error, {
    name: {
      configurable: true,
      get() {
        throw new Error("sensitive name getter");
      },
    },
    reason: {
      configurable: true,
      get() {
        throw new Error("sensitive reason getter");
      },
    },
  });
  return error;
}

function evidenceFile(): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "receipt.pdf", {
    type: "application/pdf",
  });
}

function postRequest(
  fields: Record<string, string>,
  options: {
    readonly file?: File;
    readonly files?: readonly File[];
    readonly idempotencyKey?: string | null;
    readonly origin?: string;
  } = {},
): Request {
  const form = new FormData();
  for (const file of options.files ?? (options.file ? [options.file] : [])) {
    form.append("evidence", file);
  }
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  const idempotencyKey =
    options.idempotencyKey === undefined
      ? VALID_IDEMPOTENCY_KEY
      : options.idempotencyKey;
  return new Request(ROUTE_URL, {
    method: "POST",
    headers: {
      ...(idempotencyKey !== null ? { "idempotency-key": idempotencyKey } : {}),
      origin: options.origin ?? "http://localhost",
    },
    body: form,
  });
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorMock.mockReset();
    authenticated();
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: EVIDENCE_REFERENCE,
    });
    mocks.readPrivateEvidence.mockResolvedValue(
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    );
    mocks.deletePrivateEvidence.mockResolvedValue(undefined);
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: storedSubmission,
      outcome: "created",
    });
  });

  it("returns 401 when the session guard rejects an unauthenticated request", async () => {
    guardDenied(401, "Authentication required");

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required",
    });
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 403 when the session carries no accounting role", async () => {
    guardDenied(403, "Accounting access required");

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Accounting access required",
    });
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin POST before storing evidence", async () => {
    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        origin: "https://phishing.example",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 403 when the origin header is missing", async () => {
    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile(), origin: "" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 201 with the stored submission and stores evidence only through the private-evidence port", async () => {
    const file = evidenceFile();

    const response = await POST(postRequest(expenseFields, { file }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(storedSubmission);
    expect(mocks.putPrivateEvidence).toHaveBeenCalledTimes(1);
    expect(mocks.putPrivateEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY_ID,
        contentType: "application/pdf",
      }),
    );
    const upload = mocks.putPrivateEvidence.mock.calls[0]?.[0] as {
      readonly body: Uint8Array;
    };
    expect(Buffer.from(upload.body)).toEqual(
      Buffer.from(await file.arrayBuffer()),
    );
    expect(upload).not.toHaveProperty("fileName");
    // The domain receives the storage-issued reference and the actor derived
    // from the session — never caller-supplied scope or references.
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      1,
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          accountId: STAFF_ACCOUNT_ID,
          companyId: COMPANY_ID,
          role: "STAFF",
        },
        input: expect.objectContaining({
          kind: "expense",
          payee: "Bangkok Taxi Cooperative",
          category: "travel",
          money: { amountMinor: "15000", currency: "THB" },
          evidenceReference: EVIDENCE_REFERENCE,
        }),
      }),
    );
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
  });

  it("ignores a caller-supplied evidenceReference form field", async () => {
    const response = await POST(
      postRequest(
        {
          ...expenseFields,
          evidenceReference: "private-evidence://other-company/forged.pdf",
        },
        { file: evidenceFile() },
      ),
    );

    expect(response.status).toBe(201);
    const domainCall = mocks.submitAccountingSubmissionWithOutcome.mock
      .calls[0]?.[0] as {
      readonly input: { readonly evidenceReference: string };
    };
    expect(domainCall.input.evidenceReference).toBe(EVIDENCE_REFERENCE);
  });

  it("forwards the Idempotency-Key header to the domain", async () => {
    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: VALID_IDEMPOTENCY_KEY,
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: VALID_IDEMPOTENCY_KEY,
      }),
    );
  });

  it("returns 400 with field errors when the evidence file is missing", async () => {
    const response = await POST(postRequest(expenseFields));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly message: string;
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(body.message).toMatch(/evidence/i);
    expect(Object.keys(body.fieldErrors)).toContain("evidence");
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("accepts a missing idempotency key and does not send one to the domain", async () => {
    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: null,
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.putPrivateEvidence).toHaveBeenCalledTimes(1);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledWith(
      expect.not.objectContaining({ idempotencyKey: expect.anything() }),
    );
  });

  it.each([
    ["blank", ""],
    ["overlong", "a".repeat(257)],
  ] as const)(
    "returns 400 for a %s supplied idempotency key before upload",
    async (_case, idempotencyKey) => {
      const response = await POST(
        postRequest(expenseFields, { file: evidenceFile(), idempotencyKey }),
      );

      expect(response.status).toBe(400);
      expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
      expect(
        mocks.submitAccountingSubmissionWithOutcome,
      ).not.toHaveBeenCalled();
    },
  );

  it("accepts a non-UUID idempotency key within the backend contract", async () => {
    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: "submission-request-0001",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "submission-request-0001" }),
    );
  });

  it.each([
    ["multiple evidence files", [evidenceFile(), evidenceFile()]],
    [
      "an empty evidence file",
      [new File([], "empty.pdf", { type: "application/pdf" })],
    ],
    [
      "an unsupported evidence MIME type",
      [new File(["receipt"], "receipt.txt", { type: "text/plain" })],
    ],
  ] as const)("returns 400 with field errors for %s", async (_case, files) => {
    const response = await POST(postRequest(expenseFields, { files }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly message: string;
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(body.message).toMatch(/evidence/i);
    expect(Object.keys(body.fieldErrors)).toContain("evidence");
    expect(mocks.putPrivateEvidence).not.toHaveBeenCalled();
    expect(mocks.submitAccountingSubmissionWithOutcome).not.toHaveBeenCalled();
  });

  it("returns 400 with field errors for a lowercase currency", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      invalidInputError({
        "money.currency": ["Currency must be uppercase ISO-4217"],
      }),
    );

    const response = await POST(
      postRequest(
        { ...expenseFields, currency: "usd" },
        { file: evidenceFile() },
      ),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(Object.keys(body.fieldErrors)).toContain("money.currency");
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: EVIDENCE_REFERENCE,
    });
  });

  it("deletes newly uploaded evidence when the domain replays an existing submission", async () => {
    const uploadedReference = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000002/evidence`;
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: uploadedReference,
    });
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: storedSubmission,
      outcome: "replayed",
    });

    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: "55555555-5555-4555-8555-555555555555",
      }),
    );

    expect(response.status).toBe(200);
    const domainCall = mocks.submitAccountingSubmissionWithOutcome.mock
      .calls[0]?.[0] as {
      readonly compareEvidence?: (input: {
        readonly candidateEvidenceReference: string;
        readonly storedEvidenceReference: string;
      }) => Promise<boolean>;
    };
    expect(domainCall.compareEvidence).toBeTypeOf("function");
    await expect(
      domainCall.compareEvidence?.({
        candidateEvidenceReference: uploadedReference,
        storedEvidenceReference: EVIDENCE_REFERENCE,
      }),
    ).resolves.toBe(true);
    expect(mocks.readPrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: EVIDENCE_REFERENCE,
    });
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: uploadedReference,
    });
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledTimes(1);
  });

  it("compares legacy stored evidence bytes and deletes the replay upload", async () => {
    const uploadedReference = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000003/evidence`;
    const legacyStoredReference = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000004/receipt-0001.pdf`;
    const replayedSubmission = {
      ...storedSubmission,
      evidenceReference: legacyStoredReference,
    };
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: uploadedReference,
    });
    mocks.submitAccountingSubmissionWithOutcome.mockResolvedValue({
      submission: replayedSubmission,
      outcome: "replayed",
    });

    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: "66666666-6666-4666-8666-666666666666",
      }),
    );

    expect(response.status).toBe(200);
    const domainCall = mocks.submitAccountingSubmissionWithOutcome.mock
      .calls[0]?.[0] as {
      readonly compareEvidence?: (input: {
        readonly candidateEvidenceReference: string;
        readonly storedEvidenceReference: string;
      }) => Promise<boolean>;
    };
    expect(domainCall.compareEvidence).toBeTypeOf("function");
    await expect(
      domainCall.compareEvidence?.({
        candidateEvidenceReference: uploadedReference,
        storedEvidenceReference: legacyStoredReference,
      }),
    ).resolves.toBe(true);
    expect(mocks.readPrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: legacyStoredReference,
    });
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: uploadedReference,
    });
  });

  it("returns 409 and deletes new evidence when scalar content conflicts", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      conflictError(),
    );

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(409);
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: EVIDENCE_REFERENCE,
    });
  });

  it("returns 409 when replay evidence bytes differ", async () => {
    const uploadedReference = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000002/evidence`;
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: uploadedReference,
    });
    mocks.readPrivateEvidence.mockResolvedValue(new Uint8Array([0x00]));
    mocks.submitAccountingSubmissionWithOutcome.mockImplementationOnce(
      async (input) => {
        const request = input as {
          readonly compareEvidence?: (input: {
            readonly candidateEvidenceReference: string;
            readonly storedEvidenceReference: string;
          }) => Promise<boolean>;
        };
        if (
          !(await request.compareEvidence?.({
            candidateEvidenceReference: uploadedReference,
            storedEvidenceReference: EVIDENCE_REFERENCE,
          }))
        ) {
          throw conflictError();
        }
        return { submission: storedSubmission, outcome: "replayed" };
      },
    );

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(409);
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: uploadedReference,
    });
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledTimes(1);
  });

  it("resolves a commit-succeeded-response-failed outcome with the same idempotency key", async () => {
    const uploadedReference = `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000002/evidence`;
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: uploadedReference,
    });
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({
        submission: {
          ...storedSubmission,
          evidenceReference: uploadedReference,
        },
        outcome: "replayed",
      });

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(200);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      2,
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
  });

  it("keeps a plain structural error unknown", async () => {
    const forgedError = Object.assign(new Error("forged details"), {
      name: "AccountingSubmissionError",
      reason: "invalid-input",
      fieldErrors: { payee: ["forged field"] },
    });
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(forgedError);

    await expect(
      POST(
        postRequest(expenseFields, {
          file: evidenceFile(),
          idempotencyKey: null,
        }),
      ),
    ).rejects.toBe(forgedError);

    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledOnce();
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const serializedLog = String(consoleErrorMock.mock.calls[0]?.[0]);
    const log = JSON.parse(serializedLog) as Record<string, unknown>;
    expect(log.errorName).toBe("Error");
    expect(serializedLog).not.toContain("forged details");
    expect(serializedLog).not.toContain("forged field");
  });

  it("keeps hostile field errors unknown after one guarded copy pass", async () => {
    const hostileMessages = new Proxy(["safe"], {
      get(target, property, receiver) {
        if (property === "every") return () => true;
        if (property === "0") return { attacker: "field detail" };
        return Reflect.get(target, property, receiver);
      },
    });
    const primaryError = invalidInputError({
      payee: hostileMessages as unknown as string[],
    });
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(primaryError);

    await expect(
      POST(
        postRequest(expenseFields, {
          file: evidenceFile(),
          idempotencyKey: null,
        }),
      ),
    ).rejects.toBe(primaryError);

    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const serializedLog = String(consoleErrorMock.mock.calls[0]?.[0]);
    expect(serializedLog).not.toContain("field detail");
    expect(JSON.parse(serializedLog)).toMatchObject({ errorName: "Error" });
  });

  it("logs a fixed label without inspecting a primary provider proxy", async () => {
    const primaryError = proxyWithThrowingGetPrototypeOf();
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(primaryError);

    await expect(
      POST(
        postRequest(expenseFields, {
          file: evidenceFile(),
          idempotencyKey: null,
        }),
      ),
    ).rejects.toBe(primaryError);

    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const serializedLog = String(consoleErrorMock.mock.calls[0]?.[0]);
    expect(JSON.parse(serializedLog)).toMatchObject({ errorName: "Error" });
    expect(serializedLog).not.toContain("provider proxy inspected");
  });

  it("logs a fixed label for a resolution provider proxy and preserves the primary error", async () => {
    const primaryError = new Error("primary failure");
    const resolutionError = proxyWithThrowingGetPrototypeOf();
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(resolutionError);

    await expect(
      POST(postRequest(expenseFields, { file: evidenceFile() })),
    ).rejects.toBe(primaryError);

    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const serializedLog = String(consoleErrorMock.mock.calls[0]?.[0]);
    expect(JSON.parse(serializedLog)).toMatchObject({
      errorName: "Error",
      secondaryErrorName: "Error",
    });
    expect(serializedLog).not.toContain("provider proxy inspected");
  });

  it("preserves the primary error and evidence when outcome resolution also fails", async () => {
    const primaryError = new Error("response lost");
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(new Error("database still unavailable"));

    await expect(
      POST(postRequest(expenseFields, { file: evidenceFile() })),
    ).rejects.toThrow("response lost");
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
  });

  it("does not retry an unresolved outcome without an idempotency key", async () => {
    const primaryError = Object.assign(new Error("response lost"), {
      name: "PrimaryFailure",
    });
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(primaryError);

    await expect(
      POST(
        postRequest(expenseFields, {
          file: evidenceFile(),
          idempotencyKey: null,
        }),
      ),
    ).rejects.toBe(primaryError);

    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledOnce();
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
    const log = JSON.parse(
      String(consoleErrorMock.mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(log).toEqual({
      level: "error",
      event: "accounting_submission_outcome_unresolved",
      operation: "submit_accounting_submission",
      companyId: COMPANY_ID,
      requestId: "00000000-0000-4000-8000-000000000001",
      errorName: "Error",
    });
  });

  it("does not replace a known rejection when evidence cleanup fails", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      invalidInputError({ payee: ["Payee is required"] }),
    );
    const cleanupError = Object.assign(new Error("cleanup failed"), {
      name: "SensitiveCleanupError",
    });
    mocks.deletePrivateEvidence.mockRejectedValue(cleanupError);

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Submission validation failed",
    });
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const log = JSON.parse(
      String(consoleErrorMock.mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(log).toEqual({
      level: "error",
      event: "accounting_submission_cleanup_failed",
      operation: "submit_accounting_submission",
      companyId: COMPANY_ID,
      requestId: "00000000-0000-4000-8000-000000000001",
      errorName: "Error",
    });
    expect(log).not.toHaveProperty("evidenceReference");
    expect(JSON.stringify(log)).not.toContain("SensitiveCleanupError");
    expect(JSON.stringify(log)).not.toContain("Payee is required");
  });

  it("preserves a known response when the cleanup error name getter throws", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      invalidInputError({ payee: ["Payee is required"] }),
    );
    const cleanupError = new Error("cleanup failed");
    Object.defineProperty(cleanupError, "name", {
      configurable: true,
      get() {
        throw new Error("name access failed");
      },
    });
    mocks.deletePrivateEvidence.mockRejectedValue(cleanupError);

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(400);
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const log = JSON.parse(
      String(consoleErrorMock.mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(log.errorName).toBe("Error");
    expect(JSON.stringify(log)).not.toContain("name access failed");
  });

  it("preserves the primary error and logs one safe record when outcome resolution also fails", async () => {
    const primaryError = Object.assign(new Error("response lost"), {
      name: "PrimaryFailure",
    });
    const resolutionError = Object.assign(
      new Error("database still unavailable"),
      {
        name: "ResolutionFailure",
      },
    );
    mocks.submitAccountingSubmissionWithOutcome
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(resolutionError);

    await expect(
      POST(postRequest(expenseFields, { file: evidenceFile() })),
    ).rejects.toBe(primaryError);
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const log = JSON.parse(
      String(consoleErrorMock.mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(log).toEqual({
      level: "error",
      event: "accounting_submission_outcome_unresolved",
      operation: "submit_accounting_submission",
      companyId: COMPANY_ID,
      requestId: "00000000-0000-4000-8000-000000000001",
      errorName: "Error",
      secondaryErrorName: "Error",
    });
    expect(log).not.toHaveProperty("evidenceReference");
    expect(JSON.stringify(log)).not.toContain("response lost");
    expect(JSON.stringify(log)).not.toContain("database still unavailable");
    expect(JSON.stringify(log)).not.toContain("Bangkok Taxi Cooperative");
  });

  it("retries with the same key when primary error classification getters throw", async () => {
    const primaryError =
      errorWithThrowingClassificationGetters("primary details");
    let calls = 0;
    mocks.submitAccountingSubmissionWithOutcome.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw primaryError;
      return { submission: storedSubmission, outcome: "replayed" };
    });

    const response = await POST(
      postRequest(expenseFields, { file: evidenceFile() }),
    );

    expect(response.status).toBe(200);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      2,
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it("preserves the primary error when resolution classification getters throw", async () => {
    const primaryError =
      errorWithThrowingClassificationGetters("primary details");
    const resolutionError =
      errorWithThrowingClassificationGetters("resolution details");
    let calls = 0;
    mocks.submitAccountingSubmissionWithOutcome.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw primaryError;
      throw resolutionError;
    });

    await expect(
      POST(postRequest(expenseFields, { file: evidenceFile() })),
    ).rejects.toBe(primaryError);
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenCalledTimes(
      2,
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(mocks.submitAccountingSubmissionWithOutcome).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: VALID_IDEMPOTENCY_KEY }),
    );
    expect(mocks.deletePrivateEvidence).not.toHaveBeenCalled();
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    const serializedLog = String(consoleErrorMock.mock.calls[0]?.[0]);
    const log = JSON.parse(serializedLog) as Record<string, unknown>;
    expect(log).toMatchObject({
      errorName: "Error",
      secondaryErrorName: "Error",
    });
    expect(serializedLog).not.toContain("sensitive name getter");
    expect(serializedLog).not.toContain("sensitive reason getter");
    expect(serializedLog).not.toContain("primary details");
    expect(serializedLog).not.toContain("resolution details");
  });

  it("returns 400 with field errors for a non-THB submission missing settledThbAmount", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      invalidInputError({
        settledThbAmount: [
          "A non-THB submission requires the bank-settled THB total in minor units",
        ],
      }),
    );

    const response = await POST(
      postRequest(
        { ...expenseFields, kind: "bill", currency: "USD" },
        { file: evidenceFile() },
      ),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(Object.keys(body.fieldErrors)).toContain("settledThbAmount");
  });

  it("returns 400 with field errors for a THB submission carrying settledThbAmount", async () => {
    mocks.submitAccountingSubmissionWithOutcome.mockRejectedValue(
      invalidInputError({
        settledThbAmount: [
          "A THB submission cannot carry a settled THB amount",
        ],
      }),
    );

    const response = await POST(
      postRequest(
        { ...expenseFields, settledThbAmount: "15000" },
        { file: evidenceFile() },
      ),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(Object.keys(body.fieldErrors)).toContain("settledThbAmount");
  });
});

describe("GET /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated();
    mocks.listAccountingSubmissions.mockResolvedValue([storedSubmission]);
  });

  it("returns 401 when the session guard rejects an unauthenticated request", async () => {
    guardDenied(401, "Authentication required");

    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(401);
    expect(mocks.listAccountingSubmissions).not.toHaveBeenCalled();
  });

  it("returns 403 when the session carries no accounting role", async () => {
    guardDenied(403, "Accounting access required");

    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(403);
    expect(mocks.listAccountingSubmissions).not.toHaveBeenCalled();
  });

  it("returns the session actor's submissions and delegates the role visibility rule to the domain", async () => {
    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      submissions: [storedSubmission],
    });
    expect(mocks.listAccountingSubmissions).toHaveBeenCalledTimes(1);
    expect(mocks.listAccountingSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          accountId: STAFF_ACCOUNT_ID,
          companyId: COMPANY_ID,
          role: "STAFF",
        },
      }),
    );
  });
});
