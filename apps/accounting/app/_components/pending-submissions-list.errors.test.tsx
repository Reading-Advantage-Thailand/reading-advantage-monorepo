import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import { PendingSubmissionsList } from "./pending-submissions-list";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const PENDING_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const pending: AccountingSubmission = {
  id: PENDING_ID,
  scope: { companyId: COMPANY_ID },
  status: "pending",
  submittedByAccountId: "11111111-1111-4111-8111-111111111111",
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "expense",
  payee: "Bangkok Metro",
  category: "travel",
  money: { amountMinor: "4500", currency: "THB" },
  evidenceReference: `private-evidence://${COMPANY_ID}/submissions/0003/ticket.pdf`,
};

const fetchMock = vi.fn();
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

/**
 * Builds a fetch response with an optional JSON body.
 * @param status HTTP status.
 * @param body JSON body, or a raw string for a non-JSON body.
 * @returns The response.
 */
function reply(status: number, body?: unknown): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body ?? {}),
    { status, headers: { "content-type": "application/json" } },
  );
}

/** Renders the list for an OWNER with one pending THB row. */
function renderOwnerList(): void {
  render(<PendingSubmissionsList submissions={[pending]} actorRole="OWNER" />);
}

/**
 * Opens the reject form and types the given reason.
 * @param reason Reason text to enter.
 */
function enterRejectReason(reason: string): void {
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  fireEvent.change(screen.getByLabelText("Rejection reason"), {
    target: { value: reason },
  });
}

describe("PendingSubmissionsList review errors", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigation.refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [400, { message: "Submission is not pending" }, "Submission is not pending"],
    [400, { message: "" }, "We could not update this submission."],
    [400, "not json", "We could not update this submission."],
    [403, { message: "Forbidden" }, "You do not have permission to review this submission."],
    [404, {}, "Submission not found"],
    [404, { message: "Already decided" }, "Already decided"],
    [500, { message: 42 }, "We could not update this submission."],
    [503, { message: "Accounts unavailable" }, "Accounts unavailable"],
  ])(
    "shows the mapped message for approve status %i",
    async (status, body, expected) => {
      fetchMock.mockResolvedValue(reply(status, body));
      renderOwnerList();

      fireEvent.click(screen.getByRole("button", { name: "Approve" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      expect(screen.getByText("Bangkok Metro")).toBeInTheDocument();
      expect(navigation.refresh).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    },
  );

  it("shows a generic error and keeps the row when approve fetch throws", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    renderOwnerList();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not update this submission.",
    );
    expect(screen.getByText("Bangkok Metro")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled(),
    );
  });

  it("shows the mapped message and keeps the reason when reject fails", async () => {
    fetchMock.mockResolvedValue(reply(403, { message: "Forbidden" }));
    renderOwnerList();
    enterRejectReason("Duplicate receipt");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to review this submission.",
    );
    expect(screen.getByLabelText("Rejection reason")).toHaveValue(
      "Duplicate receipt",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/submissions/${PENDING_ID}/reject`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Duplicate receipt" }),
      },
    );
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows a generic error when reject fetch throws", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    renderOwnerList();
    enterRejectReason("Duplicate receipt");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not update this submission.",
    );
    expect(screen.getByText("Bangkok Metro")).toBeInTheDocument();
  });

  it("blocks a whitespace-only reason before any request", () => {
    renderOwnerList();
    enterRejectReason("   ");

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes the reject form and clears the reason on cancel", () => {
    renderOwnerList();
    enterRejectReason("Wrong vendor");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Rejection reason")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByLabelText("Rejection reason")).toHaveValue("");
  });

  it("closes an open reject form when approve succeeds for that row", async () => {
    fetchMock.mockResolvedValue(reply(200, { ...pending, status: "approved" }));
    renderOwnerList();
    enterRejectReason("Second thoughts");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Approved");
    expect(screen.queryByLabelText("Rejection reason")).not.toBeInTheDocument();
    expect(screen.getByText("No pending submissions yet.")).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["", "", "/api/submissions/export"],
    ["2026-08-01", "", "/api/submissions/export?from=2026-08-01"],
    ["", "2026-08-31", "/api/submissions/export?to=2026-08-31"],
    [
      "2026-08-01",
      "2026-08-31",
      "/api/submissions/export?from=2026-08-01&to=2026-08-31",
    ],
  ])("builds the export link for from=%s to=%s", (from, to, href) => {
    render(
      <PendingSubmissionsList submissions={[]} actorRole="ACCOUNTANT" />,
    );
    if (from) {
      fireEvent.change(screen.getByLabelText("From"), {
        target: { value: from },
      });
    }
    if (to) {
      fireEvent.change(screen.getByLabelText("To"), { target: { value: to } });
    }

    expect(
      screen.getByRole("link", { name: "Export approved submissions (CSV)" }),
    ).toHaveAttribute("href", href);
  });

  it("hides review buttons and export for STAFF", () => {
    render(<PendingSubmissionsList submissions={[pending]} actorRole="STAFF" />);

    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Export approved submissions (CSV)" }),
    ).not.toBeInTheDocument();
  });

  it("hides the derived rate for a foreign row without a settled amount", () => {
    render(
      <PendingSubmissionsList
        submissions={[{ ...pending, money: { amountMinor: "2000", currency: "USD" } }]}
        actorRole="ACCOUNTANT"
      />,
    );

    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.queryByText("Derived rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Settled THB amount")).not.toBeInTheDocument();
  });
});
