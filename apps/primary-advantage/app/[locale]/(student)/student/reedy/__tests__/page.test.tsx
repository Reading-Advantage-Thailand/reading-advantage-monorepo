// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  locale: "en" as TestLocale,
  session: { user: { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" } as Record<string, unknown> | null,
  getAvatarProfile: vi.fn(),
  getVoiceEntitlement: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ getAvatarProfile: mocks.getAvatarProfile }));
vi.mock("@reading-advantage/domain/primary-voice", () => ({ getVoiceEntitlement: mocks.getVoiceEntitlement, voiceConfigFromEnv: () => ({ monthBudgetSeconds: 480 }) }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getLocale: async () => mocks.locale,
    getTranslations: async (namespace?: string) => createTranslator({ locale: mocks.locale, messages: messages[mocks.locale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/reedy/reedy-session", () => ({
  ReedySession: (props: { articleId: string | null; remainingSeconds: number; blockedBy: string | null }) => <div data-testid="session" data-article={props.articleId ?? ""} data-left={props.remainingSeconds} data-blocked={props.blockedBy ?? ""} />,
}));

import ReedyPage from "../page";

const profile = { classId: "wizard", tints: { skin: "light", hair: "silver", eyes: "violet", cloth: "slate" }, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" };
const params = (articleId?: string) => ({ searchParams: Promise.resolve(articleId ? { articleId } : {}) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "en";
  mocks.session = { user: { id: "s1", username: "ann", name: "Ann", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" };
  mocks.getAvatarProfile.mockResolvedValue(profile);
  mocks.getVoiceEntitlement.mockResolvedValue({ remainingSeconds: 300, budgetSeconds: 480, blockedBy: null });
});
afterEach(cleanup);

describe("ReedyPage", () => {
  it("sends a student with no avatar to the picker first (FR-10b)", async () => {
    mocks.getAvatarProfile.mockResolvedValue(null);
    await ReedyPage(params());
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/student/avatar?from=reedy", locale: "en" });
  });

  it("shows the Preview label, both explanations, the meter, and the session with the lesson article", async () => {
    renderWithMessages(await ReedyPage(params("577addb8-4fb2-4b60-adeb-d52236d2c4c2")), { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reedy");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Preview");
    expect(screen.getByText(/speaking coach/)).toHaveAttribute("lang", "en");
    expect(screen.getByText(/โค้ชฝึกพูด/)).toHaveAttribute("lang", "th");
    expect(screen.getByRole("progressbar", { name: "Reedy minutes" })).toHaveAttribute("aria-valuenow", "300");
    expect(screen.queryByRole("link", { name: "Talk to Reedy" })).not.toBeInTheDocument();
    expect(screen.getByTestId("session")).toHaveAttribute("data-article", "577addb8-4fb2-4b60-adeb-d52236d2c4c2");
    expect(screen.getByTestId("session")).toHaveAttribute("data-left", "300");
  });

  it("drops a malformed article id and treats an entitlement failure as closed", async () => {
    mocks.getVoiceEntitlement.mockRejectedValue(new Error("down"));
    mocks.locale = "th";
    renderWithMessages(await ReedyPage(params("<script>")), { locale: "th" });
    expect(screen.getByTestId("session")).toHaveAttribute("data-article", "");
    expect(screen.getByTestId("session")).toHaveAttribute("data-blocked", "DISABLED");
    expect(screen.getByText("รีดี้พักอยู่ตอนนี้")).toBeInTheDocument();
  });
});
