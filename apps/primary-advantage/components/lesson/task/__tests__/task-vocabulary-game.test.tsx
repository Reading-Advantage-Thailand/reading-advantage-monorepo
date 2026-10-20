// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  input: vi.fn(),
  results: vi.fn(),
  host: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/actions/lesson-games", () => ({
  getLessonGameInputAction: mocks.input,
  getLessonGameResultsAction: mocks.results,
}));
// The host: a stand-in that exposes its props and lets a test drive the callbacks.
vi.mock("@/components/games/game-host", () => ({
  GameHost: (props: {
    gameId: string; articleId?: string; save?: boolean; input?: { id: string };
    onResult?: (r: { correctAnswers: number; totalAttempts: number; victory: boolean }) => void;
    onCompleted?: (s: { correctAnswers: number; totalAttempts: number; victory: boolean; xpEarned?: number }) => void;
    onLoadError?: () => void; onExit?: () => void;
  }) => {
    mocks.host(props);
    return (
      <div data-testid="host" data-game={props.gameId} data-article={props.articleId} data-input={props.input?.id} data-save={String(props.save)}>
        <button type="button" onClick={() => { props.onResult?.({ correctAnswers: 8, totalAttempts: 10, victory: true }); props.onCompleted?.({ correctAnswers: 8, totalAttempts: 10, victory: true, xpEarned: 9 }); }}>finish</button>
        <button type="button" onClick={props.onLoadError}>fail</button>
        <button type="button" onClick={props.onExit}>exit</button>
      </div>
    );
  },
}));
vi.mock("@/components/lesson/games/lesson-matching-game", () => ({
  default: ({ articleId }: { articleId: string }) => <div data-testid="matching" data-article={articleId} />,
}));

import TaskVocabularyGame from "../task-vocabulary-game";

const word = (n: number) => ({ id: `w${n}`, term: `word${n}`, translation: `คำ${n}` });
const lesson = (words: number) => ({
  success: true as const,
  input: { schemaVersion: 1, id: `lesson:${ARTICLE}`, level: "A1", vocabulary: Array.from({ length: words }, (_, i) => word(i)), sentences: [] },
});
const saved = (...latest: unknown[]) => ({ success: true as const, results: { latest, totalXp: 0 } });
const rune = { gameId: "rune-match", correctAnswers: 8, totalAttempts: 10, xpEarned: 8, playedAt: "2026-10-12T10:00:00.000Z" };

beforeEach(() => {
  mocks.input.mockResolvedValue(lesson(10));
  mocks.results.mockResolvedValue(saved(rune));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const open = async () => {
  renderWithMessages(<TaskVocabularyGame articleId={ARTICLE} />, { locale: "en" });
  await screen.findByTestId("lesson-game-rpg-battle", {}, { timeout: 5000 });
};

describe("TaskVocabularyGame", () => {
  it("asks for the lesson input and the results of the article, with the thai translation on an English page", async () => {
    await open();
    expect(mocks.input).toHaveBeenCalledWith({ articleId: ARTICLE, locale: "th" });
    expect(mocks.results).toHaveBeenCalledWith({ articleId: ARTICLE });
  });

  it("shows the four vocabulary games with the last result of each", async () => {
    await open();
    for (const id of ["rpg-battle", "rune-match", "dragon-rider", "enchanted-library"]) {
      expect(screen.getByTestId(`lesson-game-${id}`)).toHaveAttribute("data-locked", "false");
    }
    expect(screen.queryByTestId("lesson-game-castle-defense")).toBeNull();
    expect(screen.getByTestId("lesson-game-result-rune-match")).toHaveTextContent("Last: 8/10 correct");
    expect(screen.getByTestId("lesson-game-result-rune-match")).toHaveTextContent("+8 XP");
    expect(screen.getByTestId("lesson-game-rpg-battle")).toHaveTextContent("New: not played yet");
    expect(screen.getByTestId("lesson-game-rune-match")).toHaveTextContent("Play again");
    expect(screen.getByText("10 words ready")).toBeInTheDocument();
  });

  it("locks a game that needs more words than the lesson has, and keeps the others open", async () => {
    mocks.input.mockResolvedValue(lesson(5));
    await open();
    const runeCard = screen.getByTestId("lesson-game-rune-match");
    expect(runeCard).toHaveAttribute("data-locked", "true");
    expect(runeCard).toHaveTextContent("Needs 6 words");
    expect(runeCard.querySelector("button")).toBeDisabled();
    expect(screen.getByTestId("lesson-game-rpg-battle")).toHaveAttribute("data-locked", "false");
  });

  it("plays a game with the lesson input and the article id, and saves", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-rune-match").querySelector("button")!);
    const host = screen.getByTestId("host");
    expect(host).toHaveAttribute("data-game", "rune-match");
    expect(host).toHaveAttribute("data-article", ARTICLE);
    expect(host).toHaveAttribute("data-input", `lesson:${ARTICLE}`);
    expect(host).toHaveAttribute("data-save", "true");
    // On the body: the transform of the lesson task wrapper must not hold the full-screen run (manual test E3).
    expect(screen.getByTestId("lesson-game-run").parentElement).toBe(document.body);
  });

  it("shows the real count and the real XP of the run after the game, and reads the results again", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-rpg-battle").querySelector("button")!);
    fireEvent.click(screen.getByText("finish"));
    fireEvent.click(screen.getByText("exit"));
    expect(await screen.findByTestId("lesson-game-last-run")).toHaveTextContent("You got 8 of 10. +9 XP");
    await waitFor(() => expect(mocks.results).toHaveBeenCalledTimes(2));
  });

  it("opens the simple matching game from the Simple game choice, and goes back", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Simple game" }));
    expect(screen.getByTestId("matching")).toHaveAttribute("data-article", ARTICLE);
    fireEvent.click(screen.getByRole("button", { name: "Back to the games" }));
    expect(screen.getByTestId("lesson-game-rpg-battle")).toBeInTheDocument();
  });

  it("opens the matching game when a game fails to load", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-dragon-rider").querySelector("button")!);
    fireEvent.click(screen.getByText("fail"));
    expect(await screen.findByTestId("matching")).toBeInTheDocument();
    expect(screen.getByTestId("lesson-game-notice")).toHaveTextContent("The game did not start");
  });

  it("opens the matching game when the lesson input fails", async () => {
    mocks.input.mockResolvedValue({ success: false, error: "Lesson game input failed" });
    renderWithMessages(<TaskVocabularyGame articleId={ARTICLE} />, { locale: "en" });
    expect(await screen.findByTestId("matching", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId("lesson-game-notice")).toHaveTextContent("We could not get the words");
  });

  it("opens the matching game when no game fits the lesson", async () => {
    mocks.input.mockResolvedValue(lesson(3));
    renderWithMessages(<TaskVocabularyGame articleId={ARTICLE} />, { locale: "en" });
    expect(await screen.findByTestId("matching", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId("lesson-game-notice")).toHaveTextContent("No game fits this lesson yet");
  });

  it("passes save false to the game in a demo", async () => {
    renderWithMessages(<TaskVocabularyGame articleId={ARTICLE} save={false} />, { locale: "en" });
    fireEvent.click((await screen.findByTestId("lesson-game-rpg-battle", {}, { timeout: 5000 })).querySelector("button")!);
    expect(screen.getByTestId("host")).toHaveAttribute("data-save", "false");
  });
});
