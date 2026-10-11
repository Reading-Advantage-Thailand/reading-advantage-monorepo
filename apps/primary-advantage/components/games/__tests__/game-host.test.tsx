// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentChallengeRunLaunch } from "@reading-advantage/game-contracts";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { GameHost } from "../game-host";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  launch: null as unknown,
  failureMessage: null as string | null,
  retry: vi.fn(),
  fetchAnswerAudio: vi.fn(async () => ({ content: [{ term: "apple", translation: "แอปเปิล" }, { term: "river", translation: "แม่น้ำ" }] })),
  rpg: {
    state: null as unknown,
    loading: false,
    pendingCosmeticId: null,
    failureMessage: null as string | null,
    newlyUnlockedCosmetics: [] as unknown[],
    beginSession: vi.fn(),
    refreshAfterSavedCompletion: vi.fn(async () => undefined),
    equip: vi.fn(),
    retry: vi.fn(),
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentChallengeRun: () => ({ launch: mocks.launch, loading: false, failureMessage: mocks.failureMessage, retry: mocks.retry }),
  useStudentRpg: () => mocks.rpg,
}));
type RewardPanelProps = { assetUrls: Record<string, string>; credit?: string | null };
vi.mock("@reading-advantage/advantage-play-kit/presentation", () => ({
  RpgRewardDisclosure: ({ assetUrls, credit }: RewardPanelProps) => <div data-testid="rpg-disclosure" data-icon={assetUrls["echo-staff"]} data-credit={String(credit)} />,
  RpgUnlockNotice: ({ assetUrls, credit }: RewardPanelProps) => <div data-testid="rpg-unlock" data-icon={assetUrls["echo-staff"]} data-credit={String(credit)} />,
}));
// The prepared clips: the route has its own tests; the host only needs the content and the session.
vi.mock("@/lib/games/answer-audio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/games/answer-audio")>()),
  fetchAnswerAudio: mocks.fetchAnswerAudio,
  // The manifests declare the mode with the Forge F2 release; the gate itself has its own test.
  offersAnswerAudio: (game: { id: string }) => game.id === "hero-vs-zombie",
}));
vi.mock("@reading-advantage/game-cartridges-3d", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/game-cartridges-3d")>();
  return { ...actual, GAMES: actual.GAMES.map((g) => ({ ...g, load: async () => ({ manifest: g.manifest }) })) };
});
// The kit host: a stand-in that exposes its props and lets a test drive the phases and the completion.
vi.mock("@reading-advantage/advantage-play-kit-3d/react", () => ({
  StoryGameHost: (props: {
    input: { id: string } | unknown[]; seed?: number; replay?: boolean; cartridge: { manifest: { id: string } };
    onPhase?: (phase: string) => void; onComplete: (result: unknown, outcome: string, evidence: unknown, answerEvidence?: unknown) => void; onExit: () => void;
    answerAudio?: () => unknown;
  }) => (
    <div data-testid="kit" data-input={Array.isArray(props.input) ? `apk:${props.input.length}` : props.input.id} data-seed={props.seed ?? "random"} data-replay={String(props.replay)} data-game={props.cartridge.manifest.id} data-audio={String(Boolean(props.answerAudio))}>
      <button type="button" onClick={() => props.onPhase?.("playing")}>start</button>
      <button type="button" onClick={() => props.onComplete(props.answerAudio ? { accuracy: 0.67, xp: 10, score: 200, correctAnswers: 2, totalAttempts: 3 } : { accuracy: 0.8, xp: 40, score: 800, correctAnswers: 8, totalAttempts: 10 }, "victory", evidence(props.cartridge.manifest.id), props.answerAudio ? answerEvidence : undefined)}>finish</button>
      <button type="button" onClick={() => props.onPhase?.("results")}>results</button>
      <button type="button" onClick={props.onExit}>exit</button>
    </div>
  ),
}));

// Two questions, one wrong choice first: 3 submitted choices, 2 correct.
const answerEvidence = {
  schemaVersion: 1, declaredModality: "read-to-select-audio", effectiveModality: "read-to-select-audio",
  promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", itemCount: 2,
  questions: [
    { questionPosition: 0, promptItemPosition: 0, selectionAttempts: [
      { attemptIndex: 0, clipItemPosition: 1, playbackResult: "completed", submitted: true, completedQuestion: false },
      { attemptIndex: 1, clipItemPosition: 0, playbackResult: "completed", submitted: true, completedQuestion: true },
    ] },
    { questionPosition: 1, promptItemPosition: 1, selectionAttempts: [
      { attemptIndex: 0, clipItemPosition: 1, playbackResult: "completed", submitted: true, completedQuestion: true },
    ] },
  ],
  replayCounts: [], audioFailures: [],
};
const evidence = (gameId: string) => ({ schemaVersion: 1, kind: "story-game", gameId, inputId: "saved", level: "A1", seed: 1, durationMs: 1000, items: [], practice: [] });
const word = (n: number) => ({ id: `w${n}`, term: `word${n}`, translation: `คำ${n}` });
const sentence = (n: number) => ({ id: `s${n}`, text: `The cat sleeps ${n}.`, words: ["The", "cat", "sleeps", `${n}.`] });
const practice = (words: number, sentences: number) => ({
  schemaVersion: 1 as const, id: "saved", level: "A1" as const,
  vocabulary: Array.from({ length: words }, (_, i) => word(i)),
  sentences: Array.from({ length: sentences }, (_, i) => sentence(i)),
});
const modality = { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true };
const launch = (change: Record<string, unknown> = {}) => ({
  runId: "22222222-2222-4222-8222-222222222222", challengeId: "33333333-3333-4333-8333-333333333333", userId: "student-7",
  challenge: {
    id: "33333333-3333-4333-8333-333333333333", classId: "44444444-4444-4444-8444-444444444444", title: "Week 3", gameId: "wizard-vs-zombie", gameVersion: "2026-10-06.1",
    contentMode: "vocabulary", contentLocale: "th", contentItemCount: 2, seed: 29, difficulty: "medium", modality,
    startsAt: "2026-10-06T00:00:00.000Z", expiresAt: "2026-10-13T00:00:00.000Z", target: 100, contributionCount: 0, ...change,
  },
  content: { mode: "vocabulary", items: [{ term: "apple", translation: "แอปเปิล" }, { term: "river", translation: "แม่น้ำ" }] },
  issuedAt: "2026-10-06T10:00:00.000Z", expiresAt: "2026-10-06T11:00:00.000Z",
}) as unknown as StudentChallengeRunLaunch;

const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("/practice") ? practice(10, 8) : { xpEarned: 40, activityId: "a1", duplicate: false, status: 200 }), { status: 200 }));
const postedBody = () => JSON.parse((fetchMock.mock.calls.find((c) => (c as unknown as [string])[0] === "/api/v1/apk/complete") as unknown as [string, { body: string }])[1].body);

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  mocks.launch = null;
  mocks.failureMessage = null;
  mocks.rpg.state = null;
  mocks.rpg.beginSession.mockClear();
  mocks.rpg.refreshAfterSavedCompletion.mockClear();
  mocks.push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GameHost", () => {
  it("plays a practice run on the given saved items, with a random seed and replay, and saves it as a story game", async () => {
    const onCompleted = vi.fn();
    renderWithMessages(<GameHost gameId="rune-match" locale="en" ownerKey="s:1" input={practice(10, 8)} onCompleted={onCompleted} />, { locale: "en" });
    // The first render of a cold worker loads the game registry: allow more than the default second.
    const kit = await screen.findByTestId("kit", {}, { timeout: 5000 });
    expect(kit).toHaveAttribute("data-input", "saved");
    expect(kit).toHaveAttribute("data-seed", "random");
    expect(kit).toHaveAttribute("data-replay", "true");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/practice"), expect.anything());
    fireEvent.click(screen.getByText("start"));
    expect(mocks.rpg.beginSession).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("finish"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Result saved"));
    expect(postedBody()).toMatchObject({ gameType: "rune-match-story", correctAnswers: 8, totalAttempts: 10, victory: true });
    expect(mocks.rpg.refreshAfterSavedCompletion).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith({ correctAnswers: 8, totalAttempts: 10, victory: true });
  });

  it("plays English answer audio on the prepared words with a controller per run, and saves the answer evidence", async () => {
    renderWithMessages(<GameHost gameId="wizard-vs-zombie" locale="en" ownerKey="s:1" input={practice(10, 8)} />, { locale: "en" });
    expect(await screen.findByTestId("kit", {}, { timeout: 5000 })).toHaveAttribute("data-audio", "false");
    fireEvent.click(screen.getByRole("button", { name: "Listen to English" }));
    await waitFor(() => expect(screen.getByTestId("kit")).toHaveAttribute("data-audio", "true"));
    expect(mocks.fetchAnswerAudio).toHaveBeenCalledWith("hero-vs-zombie", expect.any(AbortSignal));
    expect(screen.getByTestId("kit")).toHaveAttribute("data-input", "apk:2");
    fireEvent.click(screen.getByText("finish"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Result saved"));
    expect(postedBody()).toMatchObject({ gameType: "hero-vs-zombie", correctAnswers: 2, totalAttempts: 3, metadata: { contentSource: "student-flashcards", learningEvidence: answerEvidence } });
  });

  it("offers no answer audio in a game without the mode", async () => {
    renderWithMessages(<GameHost gameId="rune-match" locale="en" ownerKey="s:1" input={practice(10, 8)} />, { locale: "en" });
    await screen.findByTestId("kit", {}, { timeout: 5000 });
    expect(screen.queryByRole("button", { name: "Listen to English" })).toBeNull();
  });

  it("fetches the saved items when the page has none, and locks a game that needs more", async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify(practice(10, 1)), { status: 200 }));
    renderWithMessages(<GameHost gameId="potion-rush" locale="en" />, { locale: "en" });
    expect(await screen.findByTestId("locked", {}, { timeout: 5000 })).toHaveTextContent("Save 2 more sentences to play.");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/apk/practice?locale=th", expect.anything());
    expect(screen.queryByTestId("kit")).toBeNull();
  });

  it("runs a class challenge on the server's content and seed, posts it under the challenge game id, and offers no replay", async () => {
    mocks.launch = launch();
    const onCompleted = vi.fn();
    renderWithMessages(<GameHost gameId="hero-vs-zombie" locale="en" ownerKey="s:1" challengeId="33333333-3333-4333-8333-333333333333" onCompleted={onCompleted} />, { locale: "en" });
    const kit = await screen.findByTestId("kit");
    expect(kit).toHaveAttribute("data-input", "apk:2");
    expect(kit).toHaveAttribute("data-seed", "29");
    expect(kit).toHaveAttribute("data-replay", "false");
    expect(kit).toHaveAttribute("data-game", "hero-vs-zombie");
    fireEvent.click(screen.getByText("finish"));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledWith({ challengeRunId: "22222222-2222-4222-8222-222222222222", correctAnswers: 8, totalAttempts: 10, victory: true }));
    expect(postedBody()).toMatchObject({ gameType: "wizard-vs-zombie", challengeRunId: "22222222-2222-4222-8222-222222222222", metadata: { contentSource: "class-challenge" } });
  });

  it("refuses a challenge the installed game cannot run", async () => {
    mocks.launch = launch({ gameVersion: "2026-09-09.1" });
    renderWithMessages(<GameHost gameId="hero-vs-zombie" locale="en" ownerKey="s:1" challengeId="33333333-3333-4333-8333-333333333333" />, { locale: "en" });
    expect(await screen.findByRole("alert")).toHaveTextContent("This game cannot run this challenge.");
    expect(screen.queryByTestId("kit")).toBeNull();
  });

  it("asks a guest to sign in before a challenge", () => {
    renderWithMessages(<GameHost gameId="hero-vs-zombie" locale="en" challengeId="33333333-3333-4333-8333-333333333333" />, { locale: "en" });
    expect(screen.getByRole("link", { name: "Sign in to play this challenge" })).toHaveAttribute("href", expect.stringContaining("/auth/signin?redirect="));
  });

  it("saves nothing in demo mode, and exits to the catalog by default", async () => {
    renderWithMessages(<GameHost gameId="rune-match" locale="en" input={practice(10, 8)} save={false} />, { locale: "en" });
    await screen.findByTestId("kit");
    fireEvent.click(screen.getByText("finish"));
    await act(async () => undefined);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("exit"));
    expect(mocks.push).toHaveBeenCalledWith("/student/games");
  });

  it("shows the RPG rewards around the briefing and the unlock notice on the results for a student", async () => {
    mocks.rpg.state = { quests: [] };
    renderWithMessages(<GameHost gameId="rune-match" locale="en" ownerKey="s:1" input={practice(10, 8)} />, { locale: "en" });
    await screen.findByTestId("kit");
    // The Forge reward icons, with no ElvGames credit line.
    expect(screen.getByTestId("rpg-disclosure")).toHaveAttribute("data-icon", "/rpg/items/echo-staff.webp");
    expect(screen.getByTestId("rpg-disclosure")).toHaveAttribute("data-credit", "null");
    fireEvent.click(screen.getByText("start"));
    expect(screen.queryByTestId("rpg-disclosure")).toBeNull();
    mocks.rpg.newlyUnlockedCosmetics = [{ id: "apprentice-wand" }];
    fireEvent.click(screen.getByText("results"));
    expect(await screen.findByTestId("rpg-unlock")).toHaveAttribute("data-icon", "/rpg/items/echo-staff.webp");
    expect(screen.getByTestId("rpg-unlock")).toHaveAttribute("data-credit", "null");
    mocks.rpg.newlyUnlockedCosmetics = [];
  });

  it("reports an unknown game", () => {
    renderWithMessages(<GameHost gameId="monster-encounters" locale="en" />, { locale: "en" });
    expect(screen.getByRole("alert")).toHaveTextContent("The game could not load.");
  });
});
