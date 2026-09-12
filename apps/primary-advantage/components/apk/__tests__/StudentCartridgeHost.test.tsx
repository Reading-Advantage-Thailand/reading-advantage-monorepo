// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameResults, ListeningEvidence } from "@reading-advantage/game-contracts";
import type { GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";

import { StudentCartridgeHost } from "../StudentCartridgeHost";

const {
  mockAPKGameHost,
  mockCartridgeLoader,
  mockFetch,
  mockRpgBeginSession,
  mockRpgRefreshAfterSavedCompletion,
  mockRpgRetry,
  mockChallengeRetry,
  mockUseStudentChallengeRun,
  mockUseStudentRpg,
} = vi.hoisted(() => ({
  mockAPKGameHost: vi.fn(),
  mockCartridgeLoader: vi.fn(),
  mockFetch: vi.fn(),
  mockRpgBeginSession: vi.fn(),
  mockRpgRefreshAfterSavedCompletion: vi.fn().mockResolvedValue(undefined),
  mockRpgRetry: vi.fn().mockResolvedValue(undefined),
  mockChallengeRetry: vi.fn().mockResolvedValue(undefined),
  mockUseStudentChallengeRun: vi.fn(),
  mockUseStudentRpg: vi.fn(),
}));

type APKGameHostProps = {
  cartridge: { manifest: { id: string } };
    input: unknown;
    instructions?: string;
  createAnswerAudioSession?: () => unknown;
  briefingExtension?: ReactNode;
  resultExtension?: ReactNode;
  onComplete: (result: GameResults, outcome: GameTerminalOutcome, evidence?: ListeningEvidence) => Promise<{
    xpEarned: number;
    duplicate: boolean;
  }>;
  onLifecycleTransition?: (transition: {
    from: string;
    event: string;
    to: string;
  }) => void;
  seed?: number;
};

vi.mock("next/dynamic", () => ({
  default: () => (props: APKGameHostProps) => {
    mockAPKGameHost(props);
    return (
      <div data-testid="apk-game-host" data-cartridge-id={props.cartridge.manifest.id}>
        {JSON.stringify(props.input)}
      </div>
    );
  },
}));

vi.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeLoaders: {
    "dragon-flight": (...args: unknown[]) => mockCartridgeLoader(...args),
    "dragon-rider": (...args: unknown[]) => mockCartridgeLoader(...args),
    "wizard-vs-zombie": (...args: unknown[]) => mockCartridgeLoader(...args),
    "magic-defense": (...args: unknown[]) => mockCartridgeLoader(...args),
    "castle-defense": (...args: unknown[]) => mockCartridgeLoader(...args),
    "griffin-sky-joust": (...args: unknown[]) => mockCartridgeLoader(...args),
    "rune-match": (...args: unknown[]) => mockCartridgeLoader(...args),
    "enchanted-library": (...args: unknown[]) => mockCartridgeLoader(...args),
    "alchemists-synthesis": (...args: unknown[]) => mockCartridgeLoader(...args),
    "potion-rush": (...args: unknown[]) => mockCartridgeLoader(...args),
    "rpg-battle": (...args: unknown[]) => mockCartridgeLoader(...args),
    "archers-revenge": (...args: unknown[]) => mockCartridgeLoader(...args),
    "paladins-twin-soul": (...args: unknown[]) => mockCartridgeLoader(...args),
    "spellweavers-run": (...args: unknown[]) => mockCartridgeLoader(...args),
    "shadow-gate-dungeon": (...args: unknown[]) => mockCartridgeLoader(...args),
    "labyrinth-goblin-king": (...args: unknown[]) => mockCartridgeLoader(...args),
    "dungeon-liberator": (...args: unknown[]) => mockCartridgeLoader(...args),
    "rune-forge-chamber": (...args: unknown[]) => mockCartridgeLoader(...args),
    "realm-carver": (...args: unknown[]) => mockCartridgeLoader(...args),
    "storm-castle-tower": (...args: unknown[]) => mockCartridgeLoader(...args),
    "abyssal-well": (...args: unknown[]) => mockCartridgeLoader(...args),
    "devourer-slime": (...args: unknown[]) => mockCartridgeLoader(...args),
  },
  createCatalogStandardEdition: () => ({ id: "catalog-standard-pack" }),
  CARTRIDGE_CHALLENGE_CAPABILITIES: {
    "dragon-flight": {
      version: "2026-09-09.1",
      inputMode: "vocabulary",
      modalities: ["reading", "read-to-select-audio"],
    },
  },
}));

vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentChallengeRun: (...args: unknown[]) => mockUseStudentChallengeRun(...args),
  useStudentRpg: (...args: unknown[]) => mockUseStudentRpg(...args),
}));

vi.mock("../apk-host-layout", () => ({
  APK_HOST_LAYOUT_CLASS: "apk-host-layout",
  APK_HOST_RESPONSIVE_OPTIONS: {
    inputCapabilities: { touch: true, pointer: true, keyboard: true },
  },
}));

const firstSessionKey = "10000000-0000-4000-8000-000000000001";
const replaySessionKey = "20000000-0000-4000-8000-000000000002";
const gameResult: GameResults = {
  accuracy: 0.75,
  xp: 25,
  score: 80,
  correctAnswers: 3,
  totalAttempts: 4,
};
const listeningEvidence = {
  schemaVersion: 1, declaredModality: "listen-to-select", effectiveModality: "listen-to-select",
  sourceLocale: "en-US", targetLocale: "th", itemCount: 1,
  assistedItemPositions: [], fallbackItemPositions: [], replayCounts: [], audioFailures: [],
} as const satisfies ListeningEvidence;


function renderHost(locale = "en") {
  return render(
    <StudentCartridgeHost
      cartridgeId="dragon-flight"
      description="Choose the correct gate."
      inputMode="vocabulary"
      locale={locale}
      title="Dragon Flight"
    />,
  );
}

function currentGameHostProps(): APKGameHostProps {
  const props = mockAPKGameHost.mock.calls.at(-1)?.[0] as APKGameHostProps | undefined;
  if (!props) throw new Error("Expected the APK game host to mount.");
  return props;
}

describe("StudentCartridgeHost", () => {
  it("reserves one compact viewport for the canvas and live controls", async () => {
    const { APK_HOST_LAYOUT_CLASS: layoutClass, APK_HOST_RESPONSIVE_OPTIONS: responsive } = await vi.importActual<typeof import("../apk-host-layout")>("../apk-host-layout");
    expect(layoutClass).toContain("min-h-[calc(100svh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))]");
    expect(layoutClass).toContain("[&_[data-apk-canvas-host]]:h-[min(844px,calc(100svh_-_140px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))]");
    expect(layoutClass).toContain("[&[data-apk-session-phase=tutorial]_[data-apk-canvas-host]]:h-[clamp(592px,calc(100svh_-_252px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),844px)]");
    expect(layoutClass).toContain("[&_[data-apk-game-controls]_button]:min-h-12");
    expect(responsive.resolveSafeArea).toEqual(expect.any(Function));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce(firstSessionKey)
        .mockReturnValue(replaySessionKey),
    });
    mockCartridgeLoader.mockResolvedValue({
      manifest: {
        id: "dragon-flight",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
      },
      standardExperience: {
        definition: { briefing: {}, tutorial: {}, debrief: {} },
        createTutorialActionDriver: vi.fn(),
      },
      createGameConfig: vi.fn(() => ({ scene: {} })),
    });
    mockUseStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      newlyUnlockedCosmetics: [],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: vi.fn().mockResolvedValue(undefined),
      retry: mockRpgRetry,
    });
    mockUseStudentChallengeRun.mockReturnValue({
      launch: null,
      loading: false,
      failureMessage: null,
      retry: mockChallengeRetry,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        mode: "vocabulary",
        source: "student-flashcards",
        requestedTargetLocale: "th", selectedTargetLocales: ["th"],
        content: [{ term: "river", translation: "river" }],
      }),
    });
  });

  it("scopes RPG requests and starts a baseline only for a new run", async () => {
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");

    expect(mockUseStudentRpg).toHaveBeenCalledWith({
      endpoint: "/api/v1/apk/rpg",
      ownerKey: "school-1:student-7",
      enabled: true,
    });
    const lifecycle = currentGameHostProps().onLifecycleTransition;
    act(() => {
      lifecycle?.({ from: "briefing", event: "start", to: "playing" });
      lifecycle?.({ from: "paused", event: "resume", to: "playing" });
      lifecycle?.({ from: "results", event: "replay", to: "briefing" });
      lifecycle?.({ from: "briefing", event: "startPractice", to: "tutorial" });
    });
    expect(mockRpgBeginSession).toHaveBeenCalledTimes(2);
  });

  it("mounts a validated reading challenge without loading ordinary content", async () => {
    mockUseStudentChallengeRun.mockReturnValue({
      launch: {
        runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        challengeId: "11111111-1111-4111-8111-111111111111",
        userId: "student-7",
        challenge: {
          id: "11111111-1111-4111-8111-111111111111",
          classId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          title: "River words",
          gameId: "dragon-flight",
          gameVersion: "2026-09-09.1",
          contentMode: "vocabulary",
          contentLocale: "th",
          contentItemCount: 1,
          seed: 73,
          difficulty: "medium",
          modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
          startsAt: "2026-09-09T01:00:00.000Z",
          expiresAt: "2026-09-10T01:00:00.000Z",
          target: 10,
          contributionCount: 0,
        },
        content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] },
        issuedAt: "2026-09-09T02:00:00.000Z",
        expiresAt: "2026-09-09T03:00:00.000Z",
      },
      loading: false,
      failureMessage: null,
      retry: mockChallengeRetry,
    });

    render(<StudentCartridgeHost cartridgeId="dragon-flight" challengeId="11111111-1111-4111-8111-111111111111" description="Choose the gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");

    expect(mockUseStudentChallengeRun).toHaveBeenCalledWith(expect.objectContaining({
      ownerKey: "school-1:student-7",
      challengeId: "11111111-1111-4111-8111-111111111111",
    }));
    expect(currentGameHostProps().seed).toBe(73);
    expect(screen.getByTestId("apk-game-host")).toHaveTextContent("แม่น้ำ");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retains the challenge selection in the sign-in return path", () => {
    const challengeId = "11111111-1111-4111-8111-111111111111";
    render(<StudentCartridgeHost cartridgeId="dragon-flight" challengeId={challengeId} description="Choose the gate." inputMode="vocabulary" locale="th" title="Dragon Flight" />);

    expect(screen.getByRole("link", { name: "Sign in to play this challenge" })).toHaveAttribute(
      "href",
      `/auth/signin?redirect=${encodeURIComponent(`/th/student/games/apk/dragon-flight?challengeId=${challengeId}`)}`,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("saves the current challenge run and requests a new run on replay", async () => {
    const challengeRunId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const challengeId = "11111111-1111-4111-8111-111111111111";
    const challengeLaunch = {
      runId: challengeRunId,
      challengeId,
      userId: "student-7",
      challenge: {
        id: challengeId, classId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", title: "River words",
        gameId: "dragon-flight", gameVersion: "2026-09-09.1", contentMode: "vocabulary", contentLocale: "th",
        contentItemCount: 1, seed: 73, difficulty: "medium",
        modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
        startsAt: "2026-09-09T01:00:00.000Z", expiresAt: "2026-09-10T01:00:00.000Z", target: 10, contributionCount: 0,
      },
      content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] },
      issuedAt: "2026-09-09T02:00:00.000Z", expiresAt: "2026-09-09T03:00:00.000Z",
    };
    mockUseStudentChallengeRun.mockReturnValue({ launch: challengeLaunch, loading: false, failureMessage: null, retry: mockChallengeRetry });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" challengeId={challengeId} description="Choose the gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ xpEarned: 25, activityId: "game:dragon-flight:challenge", duplicate: false, status: 200 }) });

    await currentGameHostProps().onComplete(gameResult, "victory");
    const completionBody = JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body));
    expect(completionBody.challengeRunId).toBe(challengeRunId);
    expect(completionBody.metadata.contentSource).toBe("class-challenge");
    act(() => currentGameHostProps().onLifecycleTransition?.({ from: "results", event: "replay", to: "briefing" }));
    expect(mockChallengeRetry).toHaveBeenCalledTimes(1);
  });

  it("reloads content when the validated RPG owner changes", async () => {
    const mounted = render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mounted.rerender(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-2:student-7" title="Dragon Flight" />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockUseStudentRpg).toHaveBeenLastCalledWith(expect.objectContaining({
      ownerKey: "school-2:student-7",
    }));
  });

  it("refreshes rewards after a valid receipt without failing the saved completion", async () => {
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:rpg-refresh",
        duplicate: false,
        status: 200,
      }),
    });
    mockRpgRefreshAfterSavedCompletion.mockRejectedValueOnce(new Error("Rewards unavailable"));

    await expect(currentGameHostProps().onComplete(gameResult, "victory")).resolves.toEqual({ xpEarned: 25, duplicate: false });
    expect(mockRpgRefreshAfterSavedCompletion).toHaveBeenCalledTimes(1);
  });

  it("shows confirmed rewards in briefing and only new rewards in results", async () => {
    const cosmetics = [
      { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: "2026-09-09T00:00:00.000Z", equipped: false },
      { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: "2026-09-09T00:00:00.000Z", equipped: false },
      { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
    ];
    mockUseStudentRpg.mockReturnValue({
      state: {
        schemaVersion: 1,
        equippedEmblemId: null,
        cosmetics,
        quests: [
          { id: "first-ward", completed: true, completedAt: "2026-09-09T00:00:00.000Z", rewardId: "apprentice-wand" },
          { id: "complete-the-ward", completed: true, completedAt: "2026-09-09T00:00:00.000Z", rewardId: "graveyard-staff" },
          { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
        ],
      },
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      newlyUnlockedCosmetics: [cosmetics[1]],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: vi.fn().mockResolvedValue(undefined),
      retry: mockRpgRetry,
    });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    const host = currentGameHostProps();

    const briefing = render(<>{host.briefingExtension}</>);
    expect(briefing.getByText("Wizard rewards · 2/3")).toBeInTheDocument();
    briefing.unmount();
    render(<>{host.resultExtension}</>);
    expect(screen.getByRole("heading", { name: "New Wizard rewards" })).toBeInTheDocument();
    expect(screen.getByText("Graveyard Staff")).toBeInTheDocument();
    expect(screen.queryByText("Apprentice Wand")).not.toBeInTheDocument();
  });

  it("keeps an initial reward failure available for retry", async () => {
    mockUseStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: "Rewards could not be loaded. Try again.",
      newlyUnlockedCosmetics: [],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: vi.fn().mockResolvedValue(undefined),
      retry: mockRpgRetry,
    });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose the correct gate." inputMode="vocabulary" locale="th" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    render(<>{currentGameHostProps().briefingExtension}</>);

    expect(screen.getByRole("alert")).toHaveTextContent("Rewards could not be loaded");
    act(() => screen.getByRole("button", { name: "Try again" }).click());
    expect(mockRpgRetry).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps a completion key for retries and renews it after replay", async () => {
    renderHost("th");

    expect(await screen.findByTestId("apk-game-host")).toHaveTextContent("river");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: "Retry completion." } }),
      })
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          xpEarned: 25,
          activityId: `game:dragon-flight:${firstSessionKey}`,
          duplicate: false,
          status: 200,
        }),
      });

    const host = currentGameHostProps();
    await expect(host.onComplete(gameResult, "victory", listeningEvidence)).rejects.toThrow("Retry completion.");
    const confirmation = await host.onComplete(gameResult, "victory", listeningEvidence);
    expect(confirmation).toEqual({ xpEarned: 25, duplicate: false });
    await act(async () => {
      host.onLifecycleTransition?.({
        from: "results",
        event: "replay",
        to: "briefing",
      });
    });
    const replayHost = currentGameHostProps();
    await act(async () => {
      await replayHost.onComplete(gameResult, "victory", listeningEvidence);
    });

    const completionKeys = mockFetch.mock.calls
      .slice(1)
      .map(([, options]) => JSON.parse(String((options as RequestInit).body)).idempotencyKey);
    expect(completionKeys).toEqual([
      firstSessionKey,
      firstSessionKey,
      replaySessionKey,
    ]);
    const completionBodies = mockFetch.mock.calls
      .slice(1)
      .map(([, options]) => String((options as RequestInit).body));
    expect(completionBodies[1]).toBe(completionBodies[0]);
    expect(completionBodies[2]).not.toBe(completionBodies[0]);
    const completionEvidence = mockFetch.mock.calls
      .slice(1)
      .map(([, options]) => JSON.parse(String((options as RequestInit).body)).metadata.learningEvidence);
    expect(completionEvidence).toEqual([
      listeningEvidence,
      listeningEvidence,
      listeningEvidence,
    ]);
  });

  it("rejects an invalid successful completion response", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    await expect(
      currentGameHostProps().onComplete(gameResult, "victory"),
    ).rejects.toThrow("The game-progress response is invalid.");
  });

  it("rejects a completion receipt after the loaded session changes", async () => {
    const mounted = renderHost();
    await screen.findByTestId("apk-game-host");
    const staleHost = currentGameHostProps();
    let resolveResponse!: (response: unknown) => void;
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    const pending = staleHost.onComplete(gameResult, "victory", listeningEvidence);

    await act(async () => {
      mounted.rerender(
        <StudentCartridgeHost
          cartridgeId="dragon-flight"
          description="Choose the correct gate."
          inputMode="vocabulary"
          locale="th"
          title="Dragon Flight"
        />,
      );
    });
    resolveResponse({
      ok: true,
      json: vi.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:stale",
        duplicate: false,
        status: 200,
      }),
    });

    await expect(pending).rejects.toThrow("The game session changed before progress was saved.");
  });

  it("rejects an ambiguous complete outcome", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");

    await expect(currentGameHostProps().onComplete(gameResult, "complete"))
      .rejects.toThrow("Authenticated completion requires a victory or defeat outcome.");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries a transient content-load failure", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({
          error: { message: "Learning content is temporarily unavailable." },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          mode: "vocabulary",
          source: "student-flashcards",
          content: [{ term: "river", translation: "river" }],
        }),
      });

    renderHost();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Learning content is temporarily unavailable.",
    );

    await act(async () => {
      screen.getByRole("button", { name: "Retry" }).click();
    });

    expect(await screen.findByTestId("apk-game-host")).toHaveTextContent("river");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("keeps Thai targets when the interface uses English", async () => {
    render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Wizard vs. Zombie" />);
    await screen.findByTestId("apk-game-host");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ credentials: "same-origin" }));
    expect(screen.getByRole("button", { name: "Read Thai" })).toHaveClass("min-h-12", "bg-primary");
    expect(screen.getByRole("button", { name: "Listen to English" })).toHaveClass("min-h-12", "bg-background");
  });

  it.each(["dragon-flight", "dragon-rider"])(
    "requests Thai targets for %s when the interface uses English",
    async (cartridgeId) => {
      render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Dragon game" />);
      await screen.findByTestId("apk-game-host");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/apk/content?mode=vocabulary&locale=th",
        expect.objectContaining({ credentials: "same-origin" }),
      );
      expect(mockAPKGameHost.mock.calls.at(-1)?.[0].instructions).toBeUndefined();
    },
  );

  it.each([
    ["magic-defense", "vocabulary"],
    ["rune-match", "vocabulary"],
    ["enchanted-library", "vocabulary"],
    ["rpg-battle", "vocabulary"],
    ["archers-revenge", "vocabulary"],
    ["alchemists-synthesis", "vocabulary"],
    ["paladins-twin-soul", "vocabulary"],
    ["castle-defense", "sentence"],
    ["griffin-sky-joust", "sentence"],
    ["potion-rush", "sentence"],
    ["spellweavers-run", "sentence"],
    ["shadow-gate-dungeon", "sentence"],
    ["labyrinth-goblin-king", "sentence"],
    ["dungeon-liberator", "sentence"],
    ["rune-forge-chamber", "sentence"],
    ["realm-carver", "sentence"],
    ["storm-castle-tower", "sentence"],
    ["abyssal-well", "sentence"],
    ["devourer-slime", "sentence"],
  ] as const)("requests Thai targets for corrected %s content with an English interface", async (cartridgeId, inputMode) => {
    mockCartridgeLoader.mockResolvedValue({
      manifest: { id: cartridgeId, inputMode, requiredAssetBindings: [] },
      standardExperience: { definition: { briefing: {}, tutorial: {}, debrief: {} }, createTutorialActionDriver: vi.fn() },
      createGameConfig: vi.fn(() => ({ scene: {} })),
    });
    render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Corrected game" inputMode={inputMode} locale="en" title="Corrected game" />);
    await screen.findByTestId("apk-game-host");
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/v1/apk/content?mode=${inputMode}&locale=th`,
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it.each([
    ["magic-defense", "vocabulary"],
    ["rune-match", "vocabulary"],
    ["enchanted-library", "vocabulary"],
    ["rpg-battle", "vocabulary"],
    ["archers-revenge", "vocabulary"],
    ["alchemists-synthesis", "vocabulary"],
    ["paladins-twin-soul", "vocabulary"],
    ["castle-defense", "sentence"],
    ["griffin-sky-joust", "sentence"],
    ["potion-rush", "sentence"],
    ["spellweavers-run", "sentence"],
    ["shadow-gate-dungeon", "sentence"],
    ["labyrinth-goblin-king", "sentence"],
    ["dungeon-liberator", "sentence"],
    ["rune-forge-chamber", "sentence"],
    ["realm-carver", "sentence"],
    ["storm-castle-tower", "sentence"],
    ["abyssal-well", "sentence"],
    ["devourer-slime", "sentence"],
  ] as const)("rejects fallback target locales for corrected %s content", async (cartridgeId, inputMode) => {
    mockCartridgeLoader.mockResolvedValue({
      manifest: { id: cartridgeId, inputMode, requiredAssetBindings: [] },
      standardExperience: { definition: { briefing: {}, tutorial: {}, debrief: {} }, createTutorialActionDriver: vi.fn() },
      createGameConfig: vi.fn(() => ({ scene: {} })),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({
      mode: inputMode, source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["en"], content: [{ term: "river", translation: "river" }],
    }) });
    render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Corrected game" inputMode={inputMode} locale="en" title="Corrected game" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Thai translations are unavailable");
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });

  it("rejects an English fallback instead of displaying it as the Thai target", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["en"], content: [{ term: "river", translation: "river" }],
    }) });
    render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Wizard vs. Zombie" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Thai translations are unavailable");
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });

  it.each(["wizard-vs-zombie", "dragon-flight", "dragon-rider"])(
    "loads complete English audio answers for %s before mounting the audio session",
    async (cartridgeId) => {
    render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Choose the English meaning." inputMode="vocabulary" locale="th" title="Vocabulary game" />);
    await screen.findByTestId("apk-game-host");
    expect(currentGameHostProps().createAnswerAudioSession).toBeUndefined();
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["th"], content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: { modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true },
      preparedAnswerAudio: { clips: [{ itemPosition: 0, url: "https://audio.example/river.mp3",
        mediaType: "audio/mpeg", sourceLocale: "en-US" }] },
    }) });
    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      `/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`,
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    ));
    await waitFor(() => expect(currentGameHostProps().createAnswerAudioSession).toEqual(expect.any(Function)));
    },
  );

  it("keeps unavailable answer audio separate from reading", async () => {
    render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Choose the English meaning." inputMode="vocabulary" locale="th" title="Wizard vs. Zombie" />);
    await screen.findByTestId("apk-game-host");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503,
      json: vi.fn().mockResolvedValue({ error: { message: "English answer audio is unavailable" } }) });
    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    expect(await screen.findByRole("button", { name: "Read instead" })).toBeInTheDocument();
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });


  it("cancels obsolete content requests on mode change and unmount", async () => {
    const mounted = render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Listen and choose." inputMode="vocabulary" locale="th" title="Wizard vs. Zombie" />);
    await screen.findByTestId("apk-game-host");
    const fetchMock = mockFetch;
    const firstSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);
    fetchMock.mockImplementationOnce(() => new Promise(() => undefined));

    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const nextSignal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(nextSignal.aborted).toBe(false);

    mounted.unmount();
    expect(nextSignal.aborted).toBe(true);
  });

});
