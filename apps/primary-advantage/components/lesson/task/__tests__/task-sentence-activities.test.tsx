// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({ input: vi.fn(), results: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/actions/lesson-games", () => ({
  getLessonGameInputAction: mocks.input,
  getLessonGameResultsAction: mocks.results,
}));
vi.mock("@/components/games/game-host", () => ({
  GameHost: (props: {
    gameId: string; articleId?: string; save?: boolean; ownerKey?: string; avatar?: unknown;
    onResult?: (r: { correctAnswers: number; totalAttempts: number; victory: boolean }) => void;
    onCompleted?: (s: { correctAnswers: number; totalAttempts: number; victory: boolean; xpEarned?: number }) => void;
    onLoadError?: () => void; onExit?: () => void;
  }) => (
    <div data-testid="host" data-game={props.gameId} data-article={props.articleId} data-save={String(props.save)} data-owner={props.ownerKey} data-avatar={JSON.stringify(props.avatar ?? null)}>
      <button type="button" onClick={() => { props.onResult?.({ correctAnswers: 4, totalAttempts: 5, victory: true }); props.onCompleted?.({ correctAnswers: 4, totalAttempts: 5, victory: true, xpEarned: 6 }); }}>finish</button>
      <button type="button" onClick={props.onLoadError}>fail</button>
      <button type="button" onClick={props.onExit}>exit</button>
    </div>
  ),
}));
vi.mock("../../games/lesson-sentence-order", () => ({ default: () => <div /> }));
vi.mock("../../games/lesson-sentence-cloze-test", () => ({ default: () => <div /> }));
vi.mock("../../games/lesson-sentence-order-word", () => ({ default: () => <div /> }));
vi.mock("../../games/lesson-matching-game", () => ({ default: () => <div /> }));

import TaskSentenceActivities from "../task-sentence-activities";

const sentence = (n: number) => ({ id: `s${n}`, text: `Sentence ${n}.`, translation: `ประโยค ${n}` });
const lesson = (count: number) => ({
  success: true as const,
  input: { schemaVersion: 1, id: `lesson:${ARTICLE}`, level: "A1", vocabulary: [], sentences: Array.from({ length: count }, (_, i) => sentence(i)) },
});
const saved = (...latest: unknown[]) => ({ success: true as const, results: { latest, totalXp: 0 } });
const castle = { gameId: "castle-defense", correctAnswers: 4, totalAttempts: 5, xpEarned: 6, playedAt: "2026-10-12T10:00:00.000Z" };

beforeEach(() => {
  mocks.input.mockResolvedValue(lesson(8));
  mocks.results.mockResolvedValue(saved(castle));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ assignmentActivity: null }) }));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const open = async () => {
  renderWithMessages(<TaskSentenceActivities articleId={ARTICLE} />, { locale: "en" });
  await screen.findByTestId("lesson-game-castle-defense", {}, { timeout: 5000 });
};

describe("TaskSentenceActivities cartridges", () => {
  it("asks for the lesson input and results, and shows the two sentence games with the last result", async () => {
    await open();
    expect(mocks.input).toHaveBeenCalledWith({ articleId: ARTICLE, locale: "th" });
    expect(screen.getByTestId("lesson-game-castle-defense")).toHaveAttribute("data-locked", "false");
    expect(screen.getByTestId("lesson-game-potion-rush")).toHaveAttribute("data-locked", "false");
    expect(screen.queryByTestId("lesson-game-rpg-battle")).toBeNull();
    expect(screen.getByTestId("lesson-game-result-castle-defense")).toHaveTextContent("Last: 4/5 correct");
    expect(screen.getByText("8 sentences ready")).toBeInTheDocument();
  });

  it("keeps the four activities below the games", async () => {
    await open();
    const games = screen.getByTestId("lesson-game-castle-defense");
    const activity = await screen.findByRole("heading", { name: /Order Sentences/i });
    expect(games.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("locks the games with fewer than 3 sentences while the activities stay open", async () => {
    mocks.input.mockResolvedValue(lesson(2));
    await open();
    const card = screen.getByTestId("lesson-game-castle-defense");
    expect(card).toHaveAttribute("data-locked", "true");
    expect(card).toHaveTextContent("Needs 3 sentences");
    expect(card.querySelector("button")).toBeDisabled();
    expect((await screen.findAllByRole("button", { name: /Start|Review|Begin|Order|Play|Cloze|Match/i })).some((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("plays a game with the article id and saves, then returns to the step", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-potion-rush").querySelector("button")!);
    const host = screen.getByTestId("host");
    expect(host).toHaveAttribute("data-game", "potion-rush");
    expect(host).toHaveAttribute("data-article", ARTICLE);
    expect(host).toHaveAttribute("data-save", "true");
    fireEvent.click(screen.getByText("exit"));
    expect(await screen.findByTestId("lesson-game-castle-defense")).toBeInTheDocument();
    await waitFor(() => expect(mocks.results).toHaveBeenCalledTimes(2));
  });

  it("points to the activities when a game fails to load", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-castle-defense").querySelector("button")!);
    fireEvent.click(screen.getByText("fail"));
    expect(await screen.findByTestId("lesson-game-notice")).toHaveTextContent("The game did not start. Play one of the four activities below.");
    expect(screen.queryByTestId("host")).toBeNull();
  });

  it("points to the activities when the lesson input fails", async () => {
    mocks.input.mockResolvedValue({ success: false, error: "Lesson game input failed" });
    renderWithMessages(<TaskSentenceActivities articleId={ARTICLE} />, { locale: "en" });
    expect(await screen.findByTestId("lesson-game-notice", {}, { timeout: 5000 })).toHaveTextContent("We could not get the sentences of this lesson. Play one of the four activities below.");
    expect(screen.queryByTestId("lesson-game-castle-defense")).toBeNull();
  });

  it("shows the last run line with the XP after a game, as task 10 does (lesson games low)", async () => {
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-castle-defense").querySelector("button")!);
    fireEvent.click(screen.getByText("finish"));
    fireEvent.click(screen.getByText("exit"));
    expect(await screen.findByTestId("lesson-game-last-run")).toHaveTextContent("You got 4 of 5. +6 XP");
  });

  it("passes the owner key and the avatar of the student to the host", async () => {
    mocks.input.mockResolvedValue({ ...lesson(8), ownerKey: "school-1:s1", avatar: { hero: "knight" } });
    await open();
    fireEvent.click(screen.getByTestId("lesson-game-castle-defense").querySelector("button")!);
    expect(screen.getByTestId("host")).toHaveAttribute("data-owner", "school-1:s1");
    expect(screen.getByTestId("host")).toHaveAttribute("data-avatar", JSON.stringify({ hero: "knight" }));
  });

  it("holds the place of the games while they load, so the activities do not move", async () => {
    mocks.input.mockReturnValue(new Promise(() => undefined));
    renderWithMessages(<TaskSentenceActivities articleId={ARTICLE} />, { locale: "en" });
    expect(screen.getByTestId("lesson-games-placeholder")).toBeInTheDocument();
    await screen.findByRole("heading", { name: /Order Sentences/i });
    expect(screen.getByTestId("lesson-games-placeholder")).toBeInTheDocument();
  });

  it("still shows the last result on a card that is locked now", async () => {
    mocks.input.mockResolvedValue(lesson(2));
    await open();
    expect(screen.getByTestId("lesson-game-castle-defense")).toHaveAttribute("data-locked", "true");
    expect(screen.getByTestId("lesson-game-result-castle-defense")).toHaveTextContent("Last: 4/5 correct");
  });

  it("passes save false in a demo", async () => {
    renderWithMessages(<TaskSentenceActivities articleId={ARTICLE} save={false} />, { locale: "en" });
    fireEvent.click((await screen.findByTestId("lesson-game-castle-defense", {}, { timeout: 5000 })).querySelector("button")!);
    expect(screen.getByTestId("host")).toHaveAttribute("data-save", "false");
  });
});
