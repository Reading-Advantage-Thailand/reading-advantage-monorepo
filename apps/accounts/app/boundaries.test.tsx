// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccountsError from "./error";
import NotFound from "./not-found";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("Accounts route boundaries", () => {
  afterEach(() => cleanup());

  it("offers retry and home navigation after an error", () => {
    const reset = vi.fn();

    render(<AccountsError error={new Error("database failed")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "TRY AGAIN" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "RETURN TO ACCOUNTS" })).toHaveAttribute("href", "/");
  });

  it("offers home navigation for a missing page", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Page not found." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RETURN TO ACCOUNTS" })).toHaveAttribute("href", "/");
  });
});
