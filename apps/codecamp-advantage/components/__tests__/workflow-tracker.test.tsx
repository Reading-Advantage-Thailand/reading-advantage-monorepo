import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkflowTracker } from "../workflow-tracker";

describe("WorkflowTracker", () => {
  const defaultProps = {
    issueTitle: "Fix navigation bug in dashboard",
    issueNumber: 42,
    steps: [
      { id: "claim", label: "Issue Claimed", description: "Pick an issue to work on", status: "completed" as const },
      { id: "branch", label: "Branch Created", description: "Create a feature branch", status: "completed" as const },
      { id: "pr", label: "PR Opened", description: "Open a pull request", status: "in_progress" as const },
      { id: "review", label: "Review Received", description: "Address feedback", status: "pending" as const },
      { id: "merge", label: "Merged", description: "Merge to main", status: "pending" as const },
    ],
  };

  it("renders issue title and number", () => {
    render(<WorkflowTracker {...defaultProps} />);
    expect(screen.getByText(/#42/)).toBeInTheDocument();
    expect(screen.getByText(/Fix navigation bug in dashboard/)).toBeInTheDocument();
  });

  it("renders all workflow steps", () => {
    render(<WorkflowTracker {...defaultProps} />);
    expect(screen.getByText("Issue Claimed")).toBeInTheDocument();
    expect(screen.getByText("Branch Created")).toBeInTheDocument();
    expect(screen.getByText("PR Opened")).toBeInTheDocument();
    expect(screen.getByText("Review Received")).toBeInTheDocument();
    expect(screen.getByText("Merged")).toBeInTheDocument();
  });

  it("shows completed steps with checkmark", () => {
    render(<WorkflowTracker {...defaultProps} />);
    const completedSteps = screen.getAllByLabelText(/completed/i);
    expect(completedSteps.length).toBeGreaterThanOrEqual(2);
  });

  it("shows in-progress step with active indicator", () => {
    render(<WorkflowTracker {...defaultProps} />);
    expect(screen.getByLabelText(/in progress: PR Opened/i)).toBeInTheDocument();
  });

  it("shows pending steps without completion marker", () => {
    render(<WorkflowTracker {...defaultProps} />);
    const reviewStep = screen.getByText("Review Received").closest("[data-step-id]");
    expect(reviewStep).toHaveAttribute("data-status", "pending");
  });

  it("renders step descriptions", () => {
    render(<WorkflowTracker {...defaultProps} />);
    expect(screen.getByText("Pick an issue to work on")).toBeInTheDocument();
    expect(screen.getByText("Create a feature branch")).toBeInTheDocument();
  });

  it("handles all-completed workflow", () => {
    const allCompleted = {
      ...defaultProps,
      steps: defaultProps.steps.map((s) => ({ ...s, status: "completed" as const })),
    };
    render(<WorkflowTracker {...allCompleted} />);
    expect(screen.getByText(/All steps completed/i)).toBeInTheDocument();
  });

  it("handles empty steps array", () => {
    render(<WorkflowTracker issueTitle="Empty issue" issueNumber={1} steps={[]} />);
    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(screen.queryByText(/All steps completed/i)).not.toBeInTheDocument();
  });

  it("renders fallback icon for unknown step id", () => {
    const props = {
      issueTitle: "Unknown step",
      issueNumber: 2,
      steps: [{ id: "unknown", label: "Custom Step", description: "A step without a mapped icon", status: "pending" as const }],
    };
    render(<WorkflowTracker {...props} />);
    expect(screen.getByText("Custom Step")).toBeInTheDocument();
  });
});
