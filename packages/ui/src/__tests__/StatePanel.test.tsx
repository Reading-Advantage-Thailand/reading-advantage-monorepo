import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, ErrorState } from "../index";

describe("EmptyState", () => {
  it("shows the title, the hint, and the next action, with a decorative icon", () => {
    render(
      <EmptyState icon={<svg data-testid="icon" />} title="No story yet" description="Pick a story." action={<a href="/read">Find a story</a>} />,
    );
    expect(screen.getByText("No story yet")).toBeInTheDocument();
    expect(screen.getByText("Pick a story.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a story" })).toBeInTheDocument();
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces the problem as an alert and keeps the retry action", () => {
    render(<ErrorState title="Something went wrong" description="Try again." action={<button type="button">Try again</button>} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders the title as a heading when asked", () => {
    render(<ErrorState titleAs="h1" title="Something went wrong" />);
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
  });
});
