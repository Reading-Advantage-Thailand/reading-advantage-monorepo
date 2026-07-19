import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ login: mocks.login }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { AuthEntry } from "./auth-entry";

describe("Codecamp AuthEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no credential or company path before validated mode resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<AuthEntry variant="panel" />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking sign-in mode");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByLabelText("username")).toBeNull();
  });

  it("shows Accounts only in company mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "company" }),
      }),
    );

    render(<AuthEntry variant="panel" />);

    const link = await screen.findByRole("link", { name: "login" });
    expect(link).toHaveAttribute("href", "/api/auth/company/start");
    expect(screen.queryByLabelText("username")).toBeNull();
  });

  it("shows and submits local credentials only in explicit legacy mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: "legacy" }),
      }),
    );

    render(<AuthEntry variant="panel" />);

    fireEvent.change(await screen.findByLabelText("username"), {
      target: { value: "legacy-intern" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "secret" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "login" }).closest("form")!);

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith("legacy-intern", "secret"),
    );
  });
});
