import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { role: "SALES_REP" },
    isAuthenticated: true,
    logout: mocks.logout,
  }),
}));
vi.mock("@reading-advantage/ui", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("./language-switcher", () => ({
  LanguageSwitcher: () => null,
}));

import { Header } from "./header";

describe("Sales Header logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
  });

  it("shows an alert when logout rejects", async () => {
    mocks.logout.mockRejectedValue(new Error("server unavailable"));

    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("logoutError"),
    );
  });
});
