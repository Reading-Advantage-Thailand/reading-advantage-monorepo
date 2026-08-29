import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ login: mocks.login }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useSearchParams: mocks.useSearchParams,
}));

import { LoginForm } from "./login-form";

describe("Sales LoginForm company sign-in link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(undefined);
    mocks.usePathname.mockReturnValue("/th/lesson/42");
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("tab=notes"));
  });

  it("carries the current path and query in the company sign-in link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "company" }),
      }),
    );

    render(<LoginForm />);

    const link = await screen.findByRole("link", { name: "submit" });
    expect(link.getAttribute("href")).toBe(
      "/api/auth/company/start?returnTo=%2Fth%2Flesson%2F42%3Ftab%3Dnotes",
    );
  });

  it("carries an English path without a query", async () => {
    mocks.usePathname.mockReturnValue("/en/module/onboarding");
    mocks.useSearchParams.mockReturnValue(new URLSearchParams());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "company" }),
      }),
    );

    render(<LoginForm />);

    const link = await screen.findByRole("link", { name: "submit" });
    expect(link.getAttribute("href")).toBe(
      "/api/auth/company/start?returnTo=%2Fen%2Fmodule%2Fonboarding",
    );
  });
});
