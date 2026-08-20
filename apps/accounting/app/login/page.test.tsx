import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders a sign-in control linking to the company SSO start route", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Accounting sign in" }),
    ).toBeInTheDocument();
    const signIn = screen.getByRole("link", {
      name: "Sign in with Company SSO",
    });
    expect(signIn).toHaveAttribute("href", "/api/auth/company/start");
  });
});
