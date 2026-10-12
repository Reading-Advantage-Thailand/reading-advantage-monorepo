// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn(), refresh: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next-intl", async () => {
  const en = (await import("../../messages/en.json")).default as any;
  return {
    useTranslations: (ns: string) => (key: string) =>
      ns.split(".").reduce((o: any, k) => o[k], en)[key] ?? key,
  };
});

import { ChangeUsernameForm } from "../change-username-form";
import en from "../../messages/en.json";

const up = (en as any).Settings.userProfile;

describe("ChangeUsernameForm (display name)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels the field Display name", () => {
    render(<ChangeUsernameForm username="Old" />);
    expect(screen.getByText("Display name")).toBeTruthy();
  });

  it("sends PATCH /api/users/me", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    render(<ChangeUsernameForm username="Old" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New Name" } });
    await waitFor(() => expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/users/me");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
  });

  it("shows the code-only message and an error toast on 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    render(<ChangeUsernameForm username="Old" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New Name" } });
    await waitFor(() => expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(up.codeOnlyError));
    expect(screen.getByRole("alert").textContent).toBe(up.codeOnlyError);
  });
});
