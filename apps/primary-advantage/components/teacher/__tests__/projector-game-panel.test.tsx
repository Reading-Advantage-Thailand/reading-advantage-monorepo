// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const CLASS_BOOK = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({ input: vi.fn(), results: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/actions/lesson-games", () => ({
  getLessonGameInputAction: mocks.input,
  getLessonGameResultsAction: mocks.results,
}));
vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentChallengeRun: () => ({ launch: null, loading: false, failureMessage: null, retry: vi.fn() }),
  useStudentRpg: () => ({ state: null, loading: false, pendingCosmeticId: null, failureMessage: null, newlyUnlockedCosmetics: [], beginSession: vi.fn(), refreshAfterSavedCompletion: vi.fn(), equip: vi.fn(), retry: vi.fn() }),
}));
vi.mock("@reading-advantage/advantage-play-kit/presentation", () => ({ RpgRewardDisclosure: () => null, RpgUnlockNotice: () => null }));
vi.mock("@reading-advantage/game-cartridges-3d", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/game-cartridges-3d")>();
  return { ...actual, GAMES: actual.GAMES.map((g) => ({ ...g, load: async () => ({ manifest: g.manifest }) })) };
});
vi.mock("@reading-advantage/advantage-play-kit-3d/react", () => ({
  StoryGameHost: (props: { helper?: boolean; cartridge: { manifest: { id: string } }; onComplete: (r: unknown, o: string, e: unknown) => void; onExit: () => void }) => (
    <div data-testid="kit" data-game={props.cartridge.manifest.id} data-helper={String(props.helper)}>
      <button type="button" onClick={() => props.onComplete({ accuracy: 0.8, xp: 40, score: 800, correctAnswers: 8, totalAttempts: 10 }, "victory", { schemaVersion: 1, kind: "story-game", gameId: props.cartridge.manifest.id, inputId: "x", level: "A1", seed: 1, durationMs: 1000, items: [], practice: [] })}>finish</button>
      <button type="button" onClick={props.onExit}>exit</button>
    </div>
  ),
}));

import { ProjectorGamePanel } from "../projector-game-panel";

const word = (n: number) => ({ id: `w${n}`, term: `word${n}`, translation: `คำ${n}` });
const sentence = (n: number) => ({ id: `s${n}`, text: `The cat sleeps ${n}.`, translation: `ประโยค ${n}` });
const lesson = (words: number, sentences: number) => ({
  success: true as const,
  input: { schemaVersion: 1, id: `lesson:${ARTICLE}`, level: "A1", vocabulary: Array.from({ length: words }, (_, i) => word(i)), sentences: Array.from({ length: sentences }, (_, i) => sentence(i)) },
});
const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  mocks.input.mockResolvedValue(lesson(10, 8));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const open = async () => {
  renderWithMessages(<ProjectorGamePanel articleId={ARTICLE} classBookId={CLASS_BOOK} lessonNumber={3} />, { locale: "en" });
  await screen.findByTestId("lesson-game-rpg-battle", {}, { timeout: 5000 });
};

describe("ProjectorGamePanel", () => {
  it("asks for the lesson input with the class book and lists the vocabulary and the sentence games", async () => {
    await open();
    expect(mocks.input).toHaveBeenCalledWith({ articleId: ARTICLE, locale: "th", classBookId: CLASS_BOOK, lessonNumber: 3 });
    const vocabulary = screen.getByRole("region", { name: "Vocabulary games" });
    for (const id of ["rpg-battle", "rune-match", "dragon-rider", "enchanted-library"]) expect(within(vocabulary).getByTestId(`lesson-game-${id}`)).toHaveAttribute("data-locked", "false");
    const sentences = screen.getByRole("region", { name: "Sentence games" });
    for (const id of ["castle-defense", "potion-rush"]) expect(within(sentences).getByTestId(`lesson-game-${id}`)).toHaveAttribute("data-locked", "false");
  });

  it("shows no student result and reads no result", async () => {
    await open();
    expect(screen.queryByText(/not played/i)).not.toBeInTheDocument();
    expect(mocks.results).not.toHaveBeenCalled();
  });

  it("locks a game when the lesson has too few items", async () => {
    mocks.input.mockResolvedValue(lesson(10, 2));
    await open();
    expect(screen.getByTestId("lesson-game-castle-defense")).toHaveAttribute("data-locked", "true");
    expect(screen.getByTestId("lesson-game-rpg-battle")).toHaveAttribute("data-locked", "false");
  });

  it("runs the chosen game full screen with the answer hint on, and posts nothing", async () => {
    await open();
    fireEvent.click(within(screen.getByTestId("lesson-game-rune-match")).getByRole("button"));
    const kit = await screen.findByTestId("kit", {}, { timeout: 5000 });
    expect(kit).toHaveAttribute("data-game", "rune-match");
    expect(kit).toHaveAttribute("data-helper", "true");
    expect(screen.getByTestId("projector-game-run")).toBeInTheDocument();
    fireEvent.click(screen.getByText("finish"));
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some((c) => String((c as unknown[])[0]).includes("/api/v1/apk/complete"))).toBe(false);
  });

  it("returns to the lists when the teacher leaves the game", async () => {
    await open();
    fireEvent.click(within(screen.getByTestId("lesson-game-potion-rush")).getByRole("button"));
    fireEvent.click(await screen.findByText("exit"));
    await waitFor(() => expect(screen.queryByTestId("kit")).not.toBeInTheDocument());
    expect(screen.getByTestId("lesson-game-potion-rush")).toBeInTheDocument();
  });

  it("says so when the lesson input fails", async () => {
    mocks.input.mockResolvedValue({ success: false, error: "Lesson game input failed" });
    renderWithMessages(<ProjectorGamePanel articleId={ARTICLE} classBookId={CLASS_BOOK} lessonNumber={3} />, { locale: "en" });
    expect(await screen.findByText(/We could not get the words of this lesson/)).toBeInTheDocument();
    expect(screen.queryByTestId("lesson-game-rpg-battle")).not.toBeInTheDocument();
  });
});
