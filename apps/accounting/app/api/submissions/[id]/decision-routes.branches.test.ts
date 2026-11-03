// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as approve } from "@/app/api/submissions/[id]/approve/route";
import { POST as reject } from "@/app/api/submissions/[id]/reject/route";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  approveAccountingSubmission: vi.fn(),
  rejectAccountingSubmission: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/submissions", () => ({
  approveAccountingSubmission: mocks.approveAccountingSubmission,
  rejectAccountingSubmission: mocks.rejectAccountingSubmission,
}));

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const SUBMISSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const owner = {
  id: "99999999-9999-4999-8999-999999999999",
  username: "accounting-owner",
  name: "Accounting Owner",
  role: "OWNER",
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

/**
 * Builds a same-origin decision request.
 * @param action Decision path segment.
 * @param body Raw request body, or undefined for none.
 * @returns The route request.
 */
function decisionRequest(
  action: "approve" | "reject",
  body?: string,
): Request {
  return new Request(
    `http://localhost/api/submissions/${SUBMISSION_ID}/${action}`,
    {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      ...(body === undefined ? {} : { body }),
    },
  );
}

const syncParams = { params: { id: SUBMISSION_ID } };

describe("approve route branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountingSession.mockResolvedValue({
      ok: true,
      session: { user: owner },
    });
  });

  it("accepts synchronous route params", async () => {
    mocks.approveAccountingSubmission.mockResolvedValue({ id: SUBMISSION_ID });

    const response = await approve(decisionRequest("approve"), syncParams);

    expect(response.status).toBe(200);
    expect(mocks.approveAccountingSubmission).toHaveBeenCalledWith({
      actor: { accountId: owner.id, companyId: COMPANY_ID, role: "OWNER" },
      submissionId: SUBMISSION_ID,
    });
  });

  it("rethrows an unclassified domain failure", async () => {
    const failure = new Error("database unavailable");
    mocks.approveAccountingSubmission.mockRejectedValue(failure);

    await expect(
      approve(decisionRequest("approve"), syncParams),
    ).rejects.toBe(failure);
  });

  it("rethrows a conflict rejection instead of mapping it", async () => {
    const conflict = Object.assign(new Error("conflict"), {
      name: "AccountingSubmissionError",
      reason: "conflict",
    });
    mocks.approveAccountingSubmission.mockRejectedValue(conflict);

    await expect(
      approve(decisionRequest("approve"), syncParams),
    ).rejects.toBe(conflict);
  });
});

describe("reject route branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountingSession.mockResolvedValue({
      ok: true,
      session: { user: owner },
    });
  });

  it("returns 400 for a malformed JSON body without calling the domain", async () => {
    const response = await reject(
      decisionRequest("reject", "{not json"),
      syncParams,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid JSON body",
      fieldErrors: { reason: ["Reason is required"] },
    });
    expect(mocks.rejectAccountingSubmission).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty body without calling the domain", async () => {
    const response = await reject(decisionRequest("reject"), syncParams);

    expect(response.status).toBe(400);
    expect(mocks.rejectAccountingSubmission).not.toHaveBeenCalled();
  });

  it.each([
    ["a JSON null body", "null"],
    ["a numeric reason", JSON.stringify({ reason: 42 })],
    ["a missing reason", JSON.stringify({})],
    ["a JSON array body", JSON.stringify(["Duplicate"])],
  ])("forwards an undefined reason for %s", async (_label, body) => {
    mocks.rejectAccountingSubmission.mockResolvedValue({ id: SUBMISSION_ID });

    const response = await reject(decisionRequest("reject", body), syncParams);

    expect(response.status).toBe(200);
    expect(mocks.rejectAccountingSubmission).toHaveBeenCalledWith({
      actor: { accountId: owner.id, companyId: COMPANY_ID, role: "OWNER" },
      submissionId: SUBMISSION_ID,
      reason: undefined,
    });
  });

  it("forwards the reason text unchanged", async () => {
    mocks.rejectAccountingSubmission.mockResolvedValue({ id: SUBMISSION_ID });

    await reject(
      decisionRequest("reject", JSON.stringify({ reason: "  Duplicate  " })),
      { params: Promise.resolve({ id: SUBMISSION_ID }) },
    );

    expect(mocks.rejectAccountingSubmission.mock.calls[0][0].reason).toBe(
      "  Duplicate  ",
    );
  });

  it("rethrows an unclassified domain failure", async () => {
    const failure = new Error("database unavailable");
    mocks.rejectAccountingSubmission.mockRejectedValue(failure);

    await expect(
      reject(
        decisionRequest("reject", JSON.stringify({ reason: "Duplicate" })),
        syncParams,
      ),
    ).rejects.toBe(failure);
  });
});
