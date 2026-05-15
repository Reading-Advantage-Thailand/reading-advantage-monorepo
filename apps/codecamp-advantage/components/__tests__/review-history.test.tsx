import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewHistory } from "../review-history";

describe("ReviewHistory", () => {
  it("renders review timeline with current status", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="needs_changes"
        summary="Add error handling for empty inputs"
      />
    );

    expect(screen.getByText(/history/i)).toBeInTheDocument();
    expect(screen.getAllByText(/statusNeedsChanges/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows pending state when no review yet", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="pending"
        summary={null}
      />
    );

    expect(screen.getByText(/statusPendingMsg/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review timeline: pending/i)).toBeInTheDocument();
  });

  it("shows approved state with success message", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="approved"
        summary="Great work! All tests pass."
      />
    );

    expect(screen.getAllByText(/statusApproved/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Great work! All tests pass./i)).toBeInTheDocument();
  });

  it("shows reviewed state without blocking", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="reviewed"
        summary="Initial review complete. Minor style suggestions."
      />
    );

    expect(screen.getAllByText(/statusReviewed/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders PR link with shortened display", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/reading-advantage/tracker/pull/5"
        reviewStatus="pending"
        summary={null}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://github.com/reading-advantage/tracker/pull/5");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows all timeline steps", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="needs_changes"
        summary="Fix the error handling"
      />
    );

    expect(screen.getAllByText(/prSubmitted/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/firstReview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/revisions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/approvedDesc/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders without summary when summary is null", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="pending"
        summary={null}
      />
    );

    expect(screen.queryByText(/feedback/i)).not.toBeInTheDocument();
    expect(screen.getByText(/statusPendingMsg/i)).toBeInTheDocument();
  });

  it("renders with empty string summary", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="reviewed"
        summary=""
      />
    );

    expect(screen.queryByRole("heading", { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.getByText(/statusReviewedMsg/i)).toBeInTheDocument();
  });
});
