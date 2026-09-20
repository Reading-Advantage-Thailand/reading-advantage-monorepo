// @vitest-environment node
/**
 * Tests for the accounting submission approval API route.
 *
 * Mirrors the mocking boundaries and helper style of
 * `apps/accounting/app/api/submissions/route.test.ts` exactly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/submissions/[id]/approve/route";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  approveAccountingSubmission: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/submissions", () => ({
  approveAccountingSubmission: mocks.approveAccountingSubmission,
}));

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
const SUBMISSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/0001/receipt.pdf`;

const ownerUser = {
  id: OWNER_ACCOUNT_ID,
  username: "accounting-owner",
  name: "Accounting Owner",
  role: "OWNER",
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

const approvedSubmission = {
  id: SUBMISSION_ID,
  scope: { companyId: COMPANY_ID },
  status: "approved",
  submittedByAccountId: "11111111-1111-4111-8111-111111111111",
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "expense",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "THB" },
  evidenceReference: EVIDENCE_REFERENCE,
};

function authenticated(user: Record<string, unknown> = ownerUser): void {
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

function forbiddenError(): Error {
  return Object.assign(new Error("forbidden"), {
    name: "AccountingSubmissionError",
    reason: "forbidden",
  });
}

function notFoundError(): Error {
  return Object.assign(new Error("not-found"), {
    name: "AccountingSubmissionError",
    reason: "not-found",
  });
}

function approveRequest(origin = "http://localhost"): Request {
  return new Request(`http://localhost/api/submissions/${SUBMISSION_ID}/approve`, {
    method: "POST",
    headers: { origin },
  });
}

function approveContext(id: string = SUBMISSION_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/submissions/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated();
    mocks.approveAccountingSubmission.mockResolvedValue(approvedSubmission);
  });

  it("returns 401 when the session guard rejects an unauthenticated request", async () => {
    guardDenied(401, "Authentication required");

    const response = await POST(approveRequest(), approveContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required",
    });
    expect(mocks.approveAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 403 when the session carries no accounting role", async () => {
    guardDenied(403, "Accounting access required");

    const response = await POST(approveRequest(), approveContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Accounting access required",
    });
    expect(mocks.approveAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin POST before touching the domain", async () => {
    const response = await POST(
      approveRequest("https://phishing.example"),
      approveContext(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(mocks.approveAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 403 when the origin header is missing", async () => {
    const response = await POST(approveRequest(""), approveContext());

    expect(response.status).toBe(403);
    expect(mocks.approveAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 200 with the approved submission and forwards the session actor and id", async () => {
    const response = await POST(approveRequest(), approveContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(approvedSubmission);
    expect(mocks.approveAccountingSubmission).toHaveBeenCalledTimes(1);
    expect(mocks.approveAccountingSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          accountId: OWNER_ACCOUNT_ID,
          companyId: COMPANY_ID,
          role: "OWNER",
        },
        submissionId: SUBMISSION_ID,
      }),
    );
  });

  it("returns 400 with field errors for invalid submission id", async () => {
    mocks.approveAccountingSubmission.mockRejectedValue(
      invalidInputError({ submissionId: ["Invalid uuid"] }),
    );

    const response = await POST(approveRequest(), approveContext("not-a-uuid"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      readonly fieldErrors: Record<string, readonly string[]>;
    };
    expect(Object.keys(body.fieldErrors)).toContain("submissionId");
  });

  it("returns 403 when the domain rejects a non-OWNER caller", async () => {
    mocks.approveAccountingSubmission.mockRejectedValue(forbiddenError());

    const response = await POST(approveRequest(), approveContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
  });

  it("returns 404 when the submission is unknown or not pending", async () => {
    mocks.approveAccountingSubmission.mockRejectedValue(notFoundError());

    const response = await POST(approveRequest(), approveContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "Submission not found" });
  });
});
