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
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/submissions/route";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  submitAccountingSubmission: vi.fn(),
  listAccountingSubmissions: vi.fn(),
  putPrivateEvidence: vi.fn(),
  deletePrivateEvidence: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/submissions", () => ({
  submitAccountingSubmission: mocks.submitAccountingSubmission,
  listAccountingSubmissions: mocks.listAccountingSubmissions,
}));
vi.mock("@/app/lib/private-evidence-storage", () => ({
  putPrivateEvidence: mocks.putPrivateEvidence,
  deletePrivateEvidence: mocks.deletePrivateEvidence,
}));

const ROUTE_URL = "http://localhost/api/submissions";
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/0001/receipt.pdf`;

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

function invalidInputError(fieldErrors: Record<string, string[]>): Error {
  return Object.assign(new Error("Submission validation failed"), {
    name: "AccountingSubmissionError",
    reason: "invalid-input",
    fieldErrors,
  });
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
    readonly idempotencyKey?: string;
  } = {},
): Request {
  const form = new FormData();
  for (const file of options.files ?? (options.file ? [options.file] : [])) {
    form.append("evidence", file);
  }
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return new Request(ROUTE_URL, {
    method: "POST",
    headers: options.idempotencyKey
      ? { "idempotency-key": options.idempotencyKey }
      : undefined,
    body: form,
  });
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated();
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: EVIDENCE_REFERENCE,
    });
    mocks.deletePrivateEvidence.mockResolvedValue(undefined);
    mocks.submitAccountingSubmission.mockResolvedValue(storedSubmission);
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
    expect(mocks.submitAccountingSubmission).not.toHaveBeenCalled();
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
    expect(mocks.submitAccountingSubmission).not.toHaveBeenCalled();
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
        fileName: "receipt.pdf",
        contentType: "application/pdf",
      }),
    );
    const upload = mocks.putPrivateEvidence.mock.calls[0]?.[0] as {
      readonly body: Uint8Array;
    };
    expect(Buffer.from(upload.body)).toEqual(
      Buffer.from(await file.arrayBuffer()),
    );
    // The domain receives the storage-issued reference and the actor derived
    // from the session — never caller-supplied scope or references.
    expect(mocks.submitAccountingSubmission).toHaveBeenCalledTimes(1);
    expect(mocks.submitAccountingSubmission).toHaveBeenCalledWith(
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
    const domainCall = mocks.submitAccountingSubmission.mock.calls[0]?.[0] as {
      readonly input: { readonly evidenceReference: string };
    };
    expect(domainCall.input.evidenceReference).toBe(EVIDENCE_REFERENCE);
  });

  it("forwards the Idempotency-Key header to the domain", async () => {
    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: "submission-request-0001",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.submitAccountingSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "submission-request-0001",
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
    expect(mocks.submitAccountingSubmission).not.toHaveBeenCalled();
  });

  it.each([
    [
      "multiple evidence files",
      [evidenceFile(), evidenceFile()],
    ],
    ["an empty evidence file", [new File([], "empty.pdf", { type: "application/pdf" })]],
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
    expect(mocks.submitAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 400 with field errors for a lowercase currency", async () => {
    mocks.submitAccountingSubmission.mockRejectedValue(
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
    const uploadedReference = `private-evidence://${COMPANY_ID}/submissions/retry/uploaded.pdf`;
    mocks.putPrivateEvidence.mockResolvedValue({
      evidenceReference: uploadedReference,
    });

    const response = await POST(
      postRequest(expenseFields, {
        file: evidenceFile(),
        idempotencyKey: "retry-1",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: uploadedReference,
    });
  });

  it("deletes newly uploaded evidence when the domain submission fails", async () => {
    const submissionError = new Error("Accounting service unavailable");
    mocks.submitAccountingSubmission.mockRejectedValue(submissionError);

    await expect(
      POST(postRequest(expenseFields, { file: evidenceFile() })),
    ).rejects.toThrow("Accounting service unavailable");
    expect(mocks.deletePrivateEvidence).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      evidenceReference: EVIDENCE_REFERENCE,
    });
  });

  it("returns 400 with field errors for a non-THB submission missing settledThbAmount", async () => {
    mocks.submitAccountingSubmission.mockRejectedValue(
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
    mocks.submitAccountingSubmission.mockRejectedValue(
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
