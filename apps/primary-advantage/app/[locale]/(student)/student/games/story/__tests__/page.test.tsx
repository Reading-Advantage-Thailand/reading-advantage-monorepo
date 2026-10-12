// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { renderWithMessages as render } from "@/components/__tests__/helpers/render-with-messages";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getAvatarState: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: (...a: unknown[]) => mocks.getCurrentUser(...a) }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({
  getAvatarState: (...a: unknown[]) => mocks.getAvatarState(...a),
  toLaunchAvatar: () => ({ classId: "knight" }),
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/components/story-games/StoryGamesClient", () => ({
  StoryGamesClient: ({ ownerKey, save }: { ownerKey?: string; save?: boolean }) => <div data-testid="client">owner={ownerKey ?? "none"}:save={String(save)}</div>,
}));

import PrimaryStoryGamesPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAvatarState.mockResolvedValue({ profile: null });
});

describe("PrimaryStoryGamesPage", () => {
  it.each(["TEACHER", "ADMIN", "SYSTEM"])("runs the games without saving for %s (Preview mode)", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "t1", role, schoolId: "school-1" });
    render(await PrimaryStoryGamesPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getByTestId("client")).toHaveTextContent("owner=none:save=false");
    expect(mocks.getAvatarState).not.toHaveBeenCalled();
  });

  it("saves for a student", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "s1", role: "STUDENT", schoolId: "school-1" });
    render(await PrimaryStoryGamesPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getByTestId("client")).toHaveTextContent("owner=school-1:s1:save=true");
  });
});
