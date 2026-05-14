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

    expect(screen.getByText(/Review History/i)).toBeInTheDocument();
    expect(screen.getByText(/needs changes/i)).toBeInTheDocument();
  });

  it("shows pending state when no review yet", () => {
    render(
      <ReviewHistory
        prUrl="https://github.com/org/repo/pull/5"
        reviewStatus="pending"
        summary={null}
      />
    );

    expect(screen.getByText(/Awaiting first review/i)).toBeInTheDocument();
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

    // "Approved" appears in both status badge and timeline step
    expect(screen.getAllByText(/approved/i).length).toBeGreaterThanOrEqual(1);
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

    // "Reviewed" appears in both status badge and timeline step
    expect(screen.getAllByText(/reviewed/i).length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getByText(/PR Submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/First Review/i)).toBeInTheDocument();
    // "Revisions" appears in both the step label and the status message for needs_changes
    expect(screen.getAllByText(/Revisions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
  });
});
