// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.getCurrentUser,
  getCurrentUser: mocks.getCurrentUser,
}));
// redirect is the sign-in-redirect primitive; a call to it is a regression.
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/nav/main-nav", () => ({
  MainNav: () => <nav data-testid="main-nav" />,
}));
vi.mock("@/components/nav/user-account-nav", () => ({
  UserAccountNav: () => <div data-testid="user-nav" />,
}));
vi.mock("@/components/switchers/locale-switcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));
vi.mock("@/components/switchers/theme-switcher-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

import NotfoundPageLayout from "../layout";

afterEach(cleanup);

describe("not-found layout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the 404 content for an anonymous visitor without redirecting", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const ui = await NotfoundPageLayout({
      children: <p>missing page content</p>,
    });
    render(ui);

    expect(screen.getByText("missing page content")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.queryByTestId("user-nav")).not.toBeInTheDocument();
  });

  it("renders the 404 content with the account nav for a signed-in user", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });

    const ui = await NotfoundPageLayout({
      children: <p>missing page content</p>,
    });
    render(ui);

    expect(screen.getByText("missing page content")).toBeInTheDocument();
    expect(screen.getByTestId("user-nav")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
