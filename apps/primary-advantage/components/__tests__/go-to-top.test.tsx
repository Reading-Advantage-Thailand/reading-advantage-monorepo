// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "./helpers/render-with-messages";
import { GoToTop } from "../go-to-top";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <a {...(props as Record<string, unknown>)}>{children}</a>
  ),
}));

/**
 * Makes window.matchMedia answer the reduced-motion query.
 * @param reduce True when the user asks for reduced motion.
 */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as never;
});
afterEach(cleanup);

describe("GoToTop", () => {
  it("sits above the bottom bar below 1024 px and at bottom-4 from 1024 px", () => {
    setReducedMotion(false);
    renderWithMessages(<GoToTop />);
    const wrapper = screen.getByRole("link", { name: testMessages.en.Components.backToTop }).parentElement!;
    expect(wrapper.className).toContain("var(--bottom-nav-h)");
    expect(wrapper).toHaveClass("lg:bottom-4");
  });

  it("scrolls smoothly when motion is allowed", () => {
    setReducedMotion(false);
    renderWithMessages(<GoToTop />);
    fireEvent.click(screen.getByRole("link", { name: testMessages.en.Components.backToTop }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("jumps without animation when the user asks for reduced motion", () => {
    setReducedMotion(true);
    renderWithMessages(<GoToTop />);
    fireEvent.click(screen.getByRole("link", { name: testMessages.en.Components.backToTop }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});
