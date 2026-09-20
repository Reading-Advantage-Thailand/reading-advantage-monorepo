import {
  fireEvent,
  render,
 screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";
import { SubmissionHistoryList } from "./submission-history-list";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const APPROVED_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REJECTED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/0001/receipt.pdf`;

const approvedUsdSubmission: AccountingSubmission = {
  id: APPROVED_ID,
  scope: { companyId: COMPANY_ID },
  status: "approved",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "bill",
  payee: "Approved Vendor",
  category: "travel",
  money: { amountMinor: "15000", currency: "USD" },
  evidenceReference: EVIDENCE_REFERENCE,
  settledThbAmount: "520500",
};

const rejectedThbSubmission: AccountingSubmission = {
  ...approvedUsdSubmission,
  id: REJECTED_ID,
  status: "rejected",
  payee: "Rejected Vendor",
  kind: "expense",
  money: { amountMinor: "4500", currency: "THB" },
  settledThbAmount: undefined,
  evidenceReference: `private-evidence://${COMPANY_ID}/submissions/0002/ticket.pdf`,
};

function selectStatusFilter(label: string): void {
  fireEvent.change(screen.getByLabelText("Status"), {
    target: { value: label },
  });
}

describe("SubmissionHistoryList", () => {
  it("renders approved and rejected records with formatted amounts", () => {
    render(
      <SubmissionHistoryList
        submissions={[approvedUsdSubmission, rejectedThbSubmission]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Decision history" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Approved Vendor")).toBeInTheDocument();
    expect(screen.getByText("Rejected Vendor")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("THB 5,205.00")).toBeInTheDocument();
    expect(screen.getByText("THB 45.00")).toBeInTheDocument();

    const historyList = screen.getByRole("list", {
      name: "Decision history",
    });
    expect(within(historyList).getByText("Approved")).toBeInTheDocument();
    expect(within(historyList).getByText("Rejected")).toBeInTheDocument();
  });

  it("filters to approved records only", () => {
    render(
      <SubmissionHistoryList
        submissions={[approvedUsdSubmission, rejectedThbSubmission]}
      />,
    );

    selectStatusFilter("approved");

    expect(screen.getByText("Approved Vendor")).toBeInTheDocument();
    expect(screen.queryByText("Rejected Vendor")).not.toBeInTheDocument();
  });

  it("filters to rejected records only", () => {
    render(
      <SubmissionHistoryList
        submissions={[approvedUsdSubmission, rejectedThbSubmission]}
      />,
    );

    selectStatusFilter("rejected");

    expect(screen.getByText("Rejected Vendor")).toBeInTheDocument();
    expect(screen.queryByText("Approved Vendor")).not.toBeInTheDocument();
  });

  it("shows both statuses again after returning to the all filter", () => {
    render(
      <SubmissionHistoryList
        submissions={[approvedUsdSubmission, rejectedThbSubmission]}
      />,
    );

    selectStatusFilter("rejected");
    selectStatusFilter("all");

    expect(screen.getByText("Approved Vendor")).toBeInTheDocument();
    expect(screen.getByText("Rejected Vendor")).toBeInTheDocument();
  });

  it("shows the empty state when there are no decided records", () => {
    render(<SubmissionHistoryList submissions={[]} />);

    expect(screen.getByText("No decided submissions yet.")).toBeInTheDocument();
  });

  it("shows the empty state when the filter excludes every record", () => {
    render(<SubmissionHistoryList submissions={[approvedUsdSubmission]} />);

    selectStatusFilter("rejected");

    expect(screen.getByText("No decided submissions yet.")).toBeInTheDocument();
  });
});
