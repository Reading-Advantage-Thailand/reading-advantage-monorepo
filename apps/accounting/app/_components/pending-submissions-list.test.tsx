import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import { PendingSubmissionsList } from "./pending-submissions-list";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STAFF_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const PENDING_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PENDING_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const APPROVED_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REJECTED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const THB_PENDING_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/0001/receipt.pdf`;

const pendingUsdSubmission: AccountingSubmission = {
  id: PENDING_ID,
  scope: { companyId: COMPANY_ID },
  status: "pending",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "bill",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "USD" },
  evidenceReference: EVIDENCE_REFERENCE,
  settledThbAmount: "520500",
};

const otherPendingSubmission: AccountingSubmission = {
  ...pendingUsdSubmission,
  id: OTHER_PENDING_ID,
  submittedByAccountId: OTHER_STAFF_ACCOUNT_ID,
  payee: "Chiang Mai Printers",
  category: "office",
  evidenceReference: `private-evidence://${COMPANY_ID}/submissions/0002/invoice.pdf`,
};

const pendingThbSubmission: AccountingSubmission = {
  id: THB_PENDING_ID,
  scope: { companyId: COMPANY_ID },
  status: "pending",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-11T02:04:05.678Z",
  kind: "expense",
  payee: "Bangkok Metro",
  category: "travel",
  money: { amountMinor: "4500", currency: "THB" },
  evidenceReference: `private-evidence://${COMPANY_ID}/submissions/0003/ticket.pdf`,
};

const pendingJpySubmission: AccountingSubmission = {
  ...pendingUsdSubmission,
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef",
  money: { amountMinor: "10000", currency: "JPY" },
  settledThbAmount: "230000",
  payee: "Tokyo Vendor",
};

const approvedSubmission: AccountingSubmission = {
  ...pendingUsdSubmission,
  id: APPROVED_ID,
  status: "approved",
  payee: "Approved Vendor",
};

const rejectedSubmission: AccountingSubmission = {
  ...pendingUsdSubmission,
  id: REJECTED_ID,
  status: "rejected",
  payee: "Rejected Vendor",
};

const fetchMock = vi.fn();

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PendingSubmissionsList", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigation.refresh.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ status: "approved" }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders payee, kind, category, money, settled THB, derived rate, and evidence for an OWNER", () => {
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.getByText(/Bill/i)).toBeInTheDocument();
    expect(screen.getByText(/travel/i)).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText(/THB\s+5,205\.00/u)).toBeInTheDocument();
    expect(screen.getByText("34.70")).toBeInTheDocument();
    expect(screen.getByText(EVIDENCE_REFERENCE)).toBeInTheDocument();
  });

  it("posts approve with no body, removes the row, and shows a status message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...pendingUsdSubmission, status: "approved" }),
    );
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission]}
        actorRole="OWNER"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/submissions/${PENDING_ID}/approve`,
        expect.objectContaining({ method: "POST" }),
      );
    });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.body).toBeUndefined();
    expect(
      screen.queryByText("Bangkok Taxi Cooperative"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/approved/i);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("requires a reject reason and posts a non-blank reason", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...pendingUsdSubmission, status: "rejected" }),
    );
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission]}
        actorRole="OWNER"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText("Reason is required")).toBeInTheDocument();
    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Duplicate receipt" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/submissions/${PENDING_ID}/reject`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Duplicate receipt" }),
        }),
      );
    });
    expect(
      screen.queryByText("Bangkok Taxi Cooperative"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/rejected/i);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the submission and shows an error when approve returns 404", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Submission not found" }, 404),
    );
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission]}
        actorRole="OWNER"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    expect(
      await screen.findByRole("alert"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("renders a STAFF actor's own submissions without approve or reject buttons", () => {
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission]}
        actorRole="STAFF"
      />,
    );

    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("renders every pending submission for an ACCOUNTANT without approve or reject buttons", () => {
    render(
      <PendingSubmissionsList
        submissions={[pendingUsdSubmission, otherPendingSubmission]}
        actorRole="ACCOUNTANT"
      />,
    );

    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.getByText("Chiang Mai Printers")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("renders the submissions supplied by the server", () => {
    render(
      <PendingSubmissionsList
        submissions={[
          pendingUsdSubmission,
          approvedSubmission,
          rejectedSubmission,
        ]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.getByText("Approved Vendor")).toBeInTheDocument();
    expect(screen.getByText("Rejected Vendor")).toBeInTheDocument();
  });

  it("does not render a derived rate cell for a THB submission", () => {
    render(
      <PendingSubmissionsList
        submissions={[pendingThbSubmission]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("Bangkok Metro")).toBeInTheDocument();
    expect(screen.getByText(/THB\s+45\.00/u)).toBeInTheDocument();
    expect(screen.queryByText("34.70")).not.toBeInTheDocument();
    expect(screen.queryByText(/derived rate/i)).not.toBeInTheDocument();
  });

  it("passes the source currency to derived rate calculation", () => {
    render(
      <PendingSubmissionsList
        submissions={[pendingJpySubmission]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("Tokyo Vendor")).toBeInTheDocument();
    expect(screen.getByText("¥10,000")).toBeInTheDocument();
    expect(screen.getByText(/THB\s+2,300\.00/u)).toBeInTheDocument();
    expect(screen.getByText("0.23")).toBeInTheDocument();
  });

  it("preserves large minor-unit values while formatting currency", () => {
    render(
      <PendingSubmissionsList
        submissions={[
          {
            ...pendingUsdSubmission,
            id: "ffffffff-ffff-4fff-8fff-fffffffffff0",
            money: {
              amountMinor: "900719925474099301",
              currency: "USD",
            },
            settledThbAmount: undefined,
            payee: "Large Value Vendor",
          },
        ]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("$9,007,199,254,740,993.01")).toBeInTheDocument();
  });

  it("preserves the sign for negative minor-unit values", () => {
    render(
      <PendingSubmissionsList
        submissions={[
          {
            ...pendingUsdSubmission,
            id: "ffffffff-ffff-4fff-8fff-fffffffffff1",
            money: { amountMinor: "-45", currency: "USD" },
            settledThbAmount: undefined,
            payee: "Credit Vendor",
          },
        ]}
        actorRole="OWNER"
      />,
    );

    expect(screen.getByText("-$0.45")).toBeInTheDocument();
  });
});
