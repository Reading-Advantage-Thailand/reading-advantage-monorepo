// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: useAuthMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { MarketingAppShell } from "@/marketing-app-shell";
import MarketingHomePage from "@/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Marketing application authorization surface", () => {
  it("shows an accessible forbidden surface for authenticated users without a Marketing role", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: true,
      isForbidden: true,
      isLoading: false,
    });

    render(
      <MarketingAppShell>
        <p>Protected Marketing content</p>
      </MarketingAppShell>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/marketing access/i);
    expect(screen.queryByText("Protected Marketing content")).not.toBeInTheDocument();
  });

  it("hides the Settings home action from Marketing members", () => {
    useAuthMock.mockReturnValue({ user: { role: "MEMBER" } });

    render(<MarketingHomePage />);

    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Campaigns" })).toBeInTheDocument();
  });

  it("shows Settings navigation only to Marketing administrators", () => {
    useAuthMock.mockReturnValue({
      user: { role: "MEMBER" },
      isAuthenticated: true,
      isForbidden: false,
      isLoading: false,
    });
    const { rerender } = render(
      <MarketingAppShell>
        <p>Content</p>
      </MarketingAppShell>,
    );
    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();

    useAuthMock.mockReturnValue({
      user: { role: "ADMIN" },
      isAuthenticated: true,
      isForbidden: false,
      isLoading: false,
    });
    rerender(
      <MarketingAppShell>
        <p>Content</p>
      </MarketingAppShell>,
    );
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
