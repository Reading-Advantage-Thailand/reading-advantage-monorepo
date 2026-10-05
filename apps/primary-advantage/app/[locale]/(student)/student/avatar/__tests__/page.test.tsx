// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  user: { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1" } as Record<string, unknown> | null,
  getAvatarProfile: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ getAvatarProfile: mocks.getAvatarProfile }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/avatar/avatar-picker", () => ({
  AvatarPicker: ({ initial, returnTo }: { initial: unknown; returnTo: string }) => <div data-testid="picker" data-initial={JSON.stringify(initial)} data-return={returnTo} />,
}));

import AvatarPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.user = { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1" };
  mocks.getAvatarProfile.mockResolvedValue(null);
});
afterEach(cleanup);

describe("AvatarPage", () => {
  it("redirects a signed-out visitor", async () => {
    mocks.user = null;
    await AvatarPage({ searchParams: Promise.resolve({}) });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "en" });
  });

  it("renders the picker with the saved avatar and the return target", async () => {
    const profile = { classId: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" };
    mocks.getAvatarProfile.mockResolvedValue(profile);
    renderWithMessages(await AvatarPage({ searchParams: Promise.resolve({ from: "reedy" }) }), { locale: "en" });
    expect(screen.getByRole("heading", { level: 1, name: "My avatar" })).toBeInTheDocument();
    const picker = screen.getByTestId("picker");
    expect(JSON.parse(picker.getAttribute("data-initial")!)).toEqual(profile);
    expect(picker).toHaveAttribute("data-return", "/student/reedy");
  });

  it("falls back to the avatar page when the read fails or the origin is unknown", async () => {
    mocks.getAvatarProfile.mockRejectedValue(new Error("down"));
    mocks.locale = "th";
    renderWithMessages(await AvatarPage({ searchParams: Promise.resolve({ from: "elsewhere" }) }), { locale: "th" });
    const picker = screen.getByTestId("picker");
    expect(picker).toHaveAttribute("data-initial", "null");
    expect(picker).toHaveAttribute("data-return", "/student/avatar");
    expect(screen.getByRole("heading", { level: 1, name: "อวตารของฉัน" })).toBeInTheDocument();
  });
});
