import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "../components/Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("forwards type attribute", () => {
    render(<Input type="email" data-testid="email-input" />);
    expect(screen.getByTestId("email-input")).toHaveAttribute("type", "email");
  });
});
