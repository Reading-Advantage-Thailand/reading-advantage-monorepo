import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ login: mocks.login }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { LoginForm } from "./login-form";

describe("Sales LoginForm auth mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(undefined);
  });

  it("renders no navigable sign-in path until the server mode resolves", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    render(<LoginForm />);

    expect(screen.getByRole("status").textContent).toContain(
      "Checking sign-in mode",
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByLabelText("Username")).toBeNull();
  });

  it("shows and submits credentials only in explicit legacy-school mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "legacy-school" }),
      }),
    );
    render(<LoginForm />);

    fireEvent.change(await screen.findByLabelText("Username"), {
      target: { value: "legacy-rep" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "submit" }).closest("form")!,
    );

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith("legacy-rep", "secret"),
    );
  });

  it("keeps Accounts sign-in as the company-mode browser path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "company" }),
      }),
    );
    render(<LoginForm />);

    const link = await screen.findByRole("link", { name: "submit" });
    expect(link.getAttribute("href")).toBe("/api/auth/company/start");
    expect(screen.queryByLabelText("Username")).toBeNull();
  });
});
