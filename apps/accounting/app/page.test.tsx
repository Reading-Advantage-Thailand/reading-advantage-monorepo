import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the accounting placeholder with a call-to-action button", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Accounting" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
  });
});
