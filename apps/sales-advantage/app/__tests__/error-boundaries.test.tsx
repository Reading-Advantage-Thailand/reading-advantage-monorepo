// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LocaleError from "../[locale]/error";
import NotFound from "../not-found";

const error = new Error("boundary failure");

afterEach(() => {
  cleanup();
});

describe("Sales error boundaries", () => {
  it("renders a retry action for route errors", () => {
    const reset = vi.fn();

    render(<LocaleError error={error} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders the home action for unmatched routes", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go home" }).getAttribute("href")).toBe(
      "/",
    );
  });
});
