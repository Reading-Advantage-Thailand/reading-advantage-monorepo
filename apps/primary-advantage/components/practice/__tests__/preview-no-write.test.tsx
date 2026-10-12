// @vitest-environment jsdom
// Staff preview render test: the practice matching game finishes its set in
// Preview mode without posting the score to the deck endpoint. The identity
// next-intl mock pins translation keys, matching the lesson game tests.
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { StudentViewProvider } from "@/components/student/student-view-provider";

const { authRefreshMock, fetchMock, toastMock } = vi.hoisted(() => ({
  authRefreshMock: vi.fn(),
  fetchMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "user-1" }, refresh: authRefreshMock }),
  useSession: () => ({ user: { id: "user-1", level: 1 } }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { MatchingGame } from "../matching-game";

const DECK_ID = "deck-1";

const GAME_DATA = [
  {
    id: "game-1",
    language: "th" as const,
    pairs: [
      {
        id: "p1",
        left: { id: "l1", content: "Dogs bark.", type: "sentence" as const },
        right: { id: "r1", content: "สุนัขเห่า", type: "translation" as const },
        articleId: "article-1",
        articleTitle: "Lesson",
      },
      {
        id: "p2",
        left: { id: "l2", content: "Cats sleep.", type: "sentence" as const },
        right: { id: "r2", content: "แมวนอน", type: "translation" as const },
        articleId: "article-1",
        articleTitle: "Lesson",
      },
    ],
  },
];

/**
 * Renders a game the way the staff preview page does: inside the preview
 * provider, so `usePreviewSave` reports preview and the write path is skipped.
 * @param ui The game element.
 */
function renderPreview(ui: ReactElement): void {
  render(<StudentViewProvider mode="preview">{ui}</StudentViewProvider>);
}

/**
 * Finds the deck POSTs a game would send when it finishes.
 * @returns The fetch calls with a POST method.
 */
function postedCalls(): unknown[] {
  return fetchMock.mock.calls.filter(
    (call: unknown[]) =>
      (call[1] as RequestInit | undefined)?.method === "POST",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authRefreshMock.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ matchingGames: GAME_DATA }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("practice matching game in staff preview", () => {
  it("finishes the set without posting the score", async () => {
    renderPreview(<MatchingGame deckId={DECK_ID} />);

    // Mounting with a deck id auto-loads the set; the start screen then
    // reports one loaded set and no score POST has gone out.
    await screen.findByText("1");
    expect(postedCalls()).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("button", { name: "startScreen.startButton" }),
    );

    // The buttons carry their type captions next to the content, so the
    // content matches by pattern.
    fireEvent.click(screen.getByRole("button", { name: /Dogs bark\./ }));
    fireEvent.click(screen.getByRole("button", { name: /สุนัขเห่า/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cats sleep\./ }));
    fireEvent.click(screen.getByRole("button", { name: /แมวนอน/ }));

    fireEvent.click(
      await screen.findByRole("button", { name: "buttons.finishGame" }),
    );

    await screen.findByText("complete.title");
    expect(postedCalls()).toHaveLength(0);
    expect(toastMock.info).toHaveBeenCalledWith("notSaved");
  });
});
