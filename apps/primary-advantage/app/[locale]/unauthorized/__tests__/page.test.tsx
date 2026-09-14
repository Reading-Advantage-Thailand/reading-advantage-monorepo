// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The page links home through the locale-aware navigation wrapper.
// Render it as a plain anchor so the href can be asserted without a router.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import UnauthorizedPage from "../page";

afterEach(cleanup);

describe("unauthorized page", () => {
  it("explains the role denial and links back home", () => {
    render(<UnauthorizedPage />);

    expect(
      screen.getByRole("heading", { name: "Unauthorized" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your account does not have access to this page."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
