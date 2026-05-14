import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForkInstruction } from "../fork-instruction";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    codecamp: {
      createPrReview: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: "pr1", reviewStatus: "pending" }),
          isPending: false,
        }),
      },
      prReviewByPrUrl: {
        useQuery: () => ({ data: null }),
      },
    },
  },
}));

describe("ForkInstruction", () => {
  it("renders step-by-step fork instructions", () => {
    render(
      <ForkInstruction
        repoUrl="https://github.com/org/repo"
        repoDescription="Test Exercise"
        exerciseRepoId="r1"
      />
    );

    expect(screen.getByText(/Fork the repository/i)).toBeInTheDocument();
    expect(screen.getByText(/Clone your fork/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a branch/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete the exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/Push and open a PR/i)).toBeInTheDocument();
  });

  it("shows GitHub repo link in first step", () => {
    render(
      <ForkInstruction
        repoUrl="https://github.com/org/repo"
        repoDescription="Test Exercise"
        exerciseRepoId="r1"
      />
    );

    const link = screen.getByText(/Open Test Exercise on GitHub/i);
    expect(link).toHaveAttribute("href", "https://github.com/org/repo");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows git clone command", () => {
    render(
      <ForkInstruction
        repoUrl="https://github.com/org/repo"
        repoDescription="Test Exercise"
        exerciseRepoId="r1"
      />
    );

    expect(screen.getByText(/git clone git@github.com:org\/repo.git/i)).toBeInTheDocument();
  });

  it("disables Track PR button for invalid URL", () => {
    render(
      <ForkInstruction
        repoUrl="https://github.com/org/repo"
        repoDescription="Test Exercise"
        exerciseRepoId="r1"
      />
    );

    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    fireEvent.change(input, { target: { value: "not-a-url" } });

    const button = screen.getByRole("button", { name: /Track PR/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Please enter a valid GitHub Pull Request URL/i)).toBeInTheDocument();
  });

  it("enables Track PR button for valid PR URL", () => {
    render(
      <ForkInstruction
        repoUrl="https://github.com/org/repo"
        repoDescription="Test Exercise"
        exerciseRepoId="r1"
      />
    );

    const input = screen.getByPlaceholderText(/https:\/\/github.com/i);
    fireEvent.change(input, { target: { value: "https://github.com/org/repo/pull/5" } });

    const button = screen.getByRole("button", { name: /Track PR/i });
    expect(button).not.toBeDisabled();
  });
});
