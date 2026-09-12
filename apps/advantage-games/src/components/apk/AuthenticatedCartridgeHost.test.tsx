import { act, render, screen, waitFor } from "@testing-library/react";

import {
  AuthenticatedCartridgeHost,
  authenticatedHostNavigation,
  buildAuthenticatedApkLoginHref,
} from "./AuthenticatedCartridgeHost";
import type { GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";
import type { ListeningEvidence } from "@reading-advantage/game-contracts";
import { withBasePath } from "@/lib/games-runtime";

const mockCartridgeLoader = jest.fn();
const mockRecordSession = jest.fn();
const mockStartMusic = jest.fn();
const mockStopMusic = jest.fn();
const mockMuteMusic = jest.fn();
const mockRpgBeginSession = jest.fn();
const mockRpgRefreshAfterSavedCompletion = jest.fn().mockResolvedValue(undefined);
const mockRpgEquip = jest.fn().mockResolvedValue(undefined);
const mockRpgRetry = jest.fn().mockResolvedValue(undefined);
const mockUseStudentRpg = jest.fn();
const mockUseStudentChallengeRun = jest.fn();
const mockUseBackgroundMusic = jest.fn(() => ({
  start: mockStartMusic,
  stop: mockStopMusic,
  duck: jest.fn(() => () => undefined),
  setMuted: mockMuteMusic,
  pause: jest.fn(),
  isPlaying: false,
}));
const mockAPKGameHost = jest.fn(
  (props: {
    cartridge: { manifest: { id: string } };
    input: unknown;
    instructions?: string;
    edition: { pack: { root: string } };
    standardExperience: unknown;
    responsive?: unknown;
    className?: string;
    createAnswerAudioSession?: () => unknown;
    seed?: number;
    launchPhase?: string;
    briefingExtension?: React.ReactNode;
    resultExtension?: React.ReactNode;
    onComplete: (result: unknown, outcome: GameTerminalOutcome, evidence?: ListeningEvidence) => Promise<void>;
    onLifecycleTransition?: (transition: {
      from: string;
      event: string;
      to: string;
    }) => void;
    onMutedChange?: (muted: boolean) => void;
    onNavigate?: (destination: string) => void;
  }) => (
    <div data-testid="apk-game-host" data-cartridge-id={props.cartridge.manifest.id}>
      {JSON.stringify(props.input)}
    </div>
  ),
);

const listeningEvidence = {
  schemaVersion: 1, declaredModality: "listen-to-select", effectiveModality: "listen-to-select",
  sourceLocale: "en-US", targetLocale: "th", itemCount: 1,
  assistedItemPositions: [], fallbackItemPositions: [], replayCounts: [], audioFailures: [],
} as const satisfies ListeningEvidence;

const challengeLaunch = {
  runId: "44444444-4444-4444-8444-444444444444",
  challengeId: "33333333-3333-4333-8333-333333333333",
  userId: "student-1",
  challenge: {
    id: "33333333-3333-4333-8333-333333333333",
    classId: "22222222-2222-4222-8222-222222222222",
    title: "River",
    gameId: "dragon-flight",
    gameVersion: "2026-09-09.1",
    contentMode: "vocabulary",
    contentLocale: "th",
    contentItemCount: 1,
    seed: 73,
    difficulty: "medium",
    modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
    startsAt: "2026-09-09T00:00:00.000Z",
    expiresAt: "2026-09-10T00:00:00.000Z",
    target: 1,
    contributionCount: 0,
  },
  content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] },
  issuedAt: "2026-09-09T01:00:00.000Z",
  expiresAt: "2026-09-10T00:00:00.000Z",
} as const;

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => (props: Parameters<typeof mockAPKGameHost>[0]) => mockAPKGameHost(props),
}));
jest.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentRpg: (...args: unknown[]) => mockUseStudentRpg(...args),
  useStudentChallengeRun: (...args: unknown[]) => mockUseStudentChallengeRun(...args),
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: {
    "dragon-flight": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading"] },
  },
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
  createCatalogStandardEdition: (_bindings: readonly string[], packRoot: string) => ({
    id: "catalog-standard-pack",
    pack: {
      id: "standard-pack-qc",
      root: packRoot,
      files: {
        "player-idle": { path: "asset-6aeab3f50c0f6be4.png" },
        "enemy-idle": { path: "asset-0edfb7ed11f9c4cf.png" },
      },
    },
    bindings: {
      "player:idle": { file: "player-idle" },
      "enemy:idle": { file: "enemy-idle" },
    },
  }),
}));
jest.mock("@/lib/games-runtime", () => ({
  withBasePath: (path: string) => `/test-base${path}`,
}));
jest.mock("@/lib/games/basePath", () => ({
  withBasePath: (path: string) => `/test-base${path}`,
}));
jest.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    recordSession: (...args: unknown[]) => mockRecordSession(...args),
  }),
}));
jest.mock("@/hooks/useBackgroundMusic", () => {
  const actual = jest.requireActual("@/hooks/useBackgroundMusic") as typeof import("@/hooks/useBackgroundMusic");
  return {
    ...actual,
    useBackgroundMusic: (...args: unknown[]) => mockUseBackgroundMusic(...args),
  };
});

const standardExperience = {
  definition: { briefing: {}, tutorial: {}, debrief: {} },
  createTutorialActionDriver: jest.fn(),
};

function renderHost(
  overrides: Partial<Parameters<typeof AuthenticatedCartridgeHost>[0]> = {},
) {
  return render(
    <AuthenticatedCartridgeHost
      cartridgeId="dragon-flight"
      description="Choose the correct gate."
      inputMode="vocabulary"
      locale="th"
      contentLocale="th"
      title="Dragon Flight"
      {...overrides}
    />,
  );
}

describe("AuthenticatedCartridgeHost", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      newlyUnlockedCosmetics: [],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: mockRpgEquip,
      retry: mockRpgRetry,
    });
    mockUseStudentChallengeRun.mockReturnValue({
      launch: null,
      loading: false,
      failureMessage: null,
      retry: jest.fn().mockResolvedValue(undefined),
    });
    mockCartridgeLoader.mockResolvedValue({
      manifest: {
        id: "dragon-flight",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
      },
      standardExperience,
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        mode: "vocabulary",
        source: "student-flashcards",
        requestedTargetLocale: "th", selectedTargetLocales: ["th"],
        content: [{ term: "river", translation: "แม่น้ำ" }],
      }),
    });
  });

  it("mounts a validated reading challenge without loading ordinary flashcards", async () => {
    mockUseStudentChallengeRun.mockReturnValue({
      launch: challengeLaunch,
      loading: false,
      failureMessage: null,
      retry: jest.fn(),
    });
    renderHost({ challengeId: challengeLaunch.challengeId, ownerKey: "student-1" });

    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    const props = mockAPKGameHost.mock.calls.at(-1)?.[0];
    expect(props).toMatchObject({
      input: challengeLaunch.content.items,
      seed: 73,
      launchPhase: "briefing",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pins the challenge run reference in the completion request", async () => {
    mockUseStudentChallengeRun.mockReturnValue({
      launch: challengeLaunch,
      loading: false,
      failureMessage: null,
      retry: jest.fn(),
    });
    renderHost({ challengeId: challengeLaunch.challengeId, ownerKey: "student-1" });
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ xpEarned: 20, activityId: "activity-1", duplicate: false, status: 200 }),
    });

    await mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete(
      { score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, xp: 20 },
      "victory",
    );
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body)).toMatchObject({
      challengeRunId: challengeLaunch.runId,
      difficulty: "medium",
      metadata: { contentSource: "class-challenge", challengeModality: challengeLaunch.challenge.modality },
    });
  });

  it("rejects unsupported challenge difficulty before mounting gameplay", async () => {
    mockUseStudentChallengeRun.mockReturnValue({
      launch: { ...challengeLaunch, challenge: { ...challengeLaunch.challenge, difficulty: "hard" } },
      loading: false,
      failureMessage: null,
      retry: jest.fn(),
    });
    renderHost({ challengeId: challengeLaunch.challengeId, ownerKey: "student-1" });

    expect(await screen.findByRole("alert")).toHaveTextContent("medium challenge difficulty only");
    expect(mockAPKGameHost).not.toHaveBeenCalled();
  });

  it("invalidates the old challenge completion and requests a fresh run on replay", async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    mockUseStudentChallengeRun.mockReturnValue({
      launch: challengeLaunch,
      loading: false,
      failureMessage: null,
      retry,
    });
    renderHost({ challengeId: challengeLaunch.challengeId, ownerKey: "student-1" });
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    const oldComplete = mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete;
    const lifecycle = mockAPKGameHost.mock.calls.at(-1)?.[0].onLifecycleTransition;
    if (!oldComplete || !lifecycle) throw new Error("The challenge host callbacks are required");

    act(() => lifecycle({ from: "results", event: "replay", to: "briefing" }));

    expect(retry).toHaveBeenCalledTimes(1);
    await expect(oldComplete(
      { score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, xp: 20 },
      "victory",
    )).rejects.toThrow(/session changed/i);
  });

  it("keeps the selected challenge in the sign-in return path", () => {
    expect(buildAuthenticatedApkLoginHref("th", "dragon-flight", challengeLaunch.challengeId))
      .toContain(encodeURIComponent(`/th/student/games/apk/dragon-flight?challengeId=${encodeURIComponent(challengeLaunch.challengeId)}`));
  });

  it("does not mount stale challenge content during an ordinary-mode transition", async () => {
    mockUseStudentChallengeRun.mockReturnValue({
      launch: challengeLaunch,
      loading: false,
      failureMessage: null,
      retry: jest.fn(),
    });
    const view = renderHost({ challengeId: challengeLaunch.challengeId, ownerKey: "student-1" });
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalledTimes(1));

    view.rerender(
      <AuthenticatedCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="th"
        contentLocale="th"
        ownerKey="student-1"
        title="Dragon Flight"
      />,
    );
    expect(mockAPKGameHost).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalledTimes(2));
  });

  it("scopes RPG requests to the validated owner and starts baselines only for new runs", async () => {
    renderHost({ ownerKey: "student-7" });
    await screen.findByTestId("apk-game-host");

    expect(mockUseStudentRpg).toHaveBeenCalledWith({
      endpoint: "/test-base/api/v1/apk/rpg",
      ownerKey: "student-7",
      enabled: true,
    });
    const lifecycle = mockAPKGameHost.mock.calls.at(-1)?.[0].onLifecycleTransition;
    act(() => {
      lifecycle?.({ from: "briefing", event: "start", to: "playing" });
      lifecycle?.({ from: "paused", event: "resume", to: "playing" });
      lifecycle?.({ from: "results", event: "replay", to: "briefing" });
    });
    expect(mockRpgBeginSession).toHaveBeenCalledTimes(2);
  });

  it("reloads content and changes the RPG scope when the validated owner changes", async () => {
    const mounted = renderHost({ ownerKey: "school-1:student-7" });
    await screen.findByTestId("apk-game-host");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    mounted.rerender(
      <AuthenticatedCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="th"
        contentLocale="th"
        ownerKey="school-2:student-7"
        title="Dragon Flight"
      />,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(mockUseStudentRpg).toHaveBeenLastCalledWith({
      endpoint: "/test-base/api/v1/apk/rpg",
      ownerKey: "school-2:student-7",
      enabled: true,
    });
  });

  it("refreshes RPG state only after a valid saved completion", async () => {
    renderHost({ ownerKey: "student-7" });
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:rpg-refresh",
        duplicate: false,
        status: 200,
      }),
    });

    await act(async () => {
      await mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete({
        accuracy: 1,
        xp: 999,
        score: 80,
        correctAnswers: 4,
        totalAttempts: 4,
      }, "victory");
    });

    expect(mockRpgRefreshAfterSavedCompletion).toHaveBeenCalledTimes(1);
  });

  it("shows the full reward panel in briefing and only new rewards after confirmation", async () => {
    const cosmetics = [
      { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: "2026-09-09T00:00:00.000Z", equipped: false },
      { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: "2026-09-09T00:00:00.000Z", equipped: false },
      { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
    ];
    const state = {
      schemaVersion: 1,
      equippedEmblemId: null,
      cosmetics,
      quests: [
        { id: "first-ward", completed: true, completedAt: "2026-09-09T00:00:00.000Z", rewardId: "apprentice-wand" },
        { id: "complete-the-ward", completed: true, completedAt: "2026-09-09T00:00:00.000Z", rewardId: "graveyard-staff" },
        { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
      ],
    };
    mockUseStudentRpg.mockReturnValue({
      state,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      newlyUnlockedCosmetics: [cosmetics[1]],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: mockRpgEquip,
      retry: mockRpgRetry,
    });
    renderHost({ ownerKey: "student-7" });
    await screen.findByTestId("apk-game-host");
    const host = mockAPKGameHost.mock.calls.at(-1)?.[0];

    const briefing = render(<>{host.briefingExtension}</>);
    expect(briefing.getByText("Apprentice Wand")).toBeInTheDocument();
    briefing.unmount();
    render(<>{host.resultExtension}</>);
    expect(screen.getByRole("heading", { name: "New Wizard rewards" })).toBeInTheDocument();
    expect(screen.getByText("Graveyard Staff")).toBeInTheDocument();
    expect(screen.queryByText("Apprentice Wand")).not.toBeInTheDocument();
  });

  it("keeps the initial RPG failure in the briefing with a retry action", async () => {
    mockUseStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: "Rewards could not be loaded. Try again.",
      newlyUnlockedCosmetics: [],
      beginSession: mockRpgBeginSession,
      refreshAfterSavedCompletion: mockRpgRefreshAfterSavedCompletion,
      equip: mockRpgEquip,
      retry: mockRpgRetry,
    });
    renderHost({ ownerKey: "school-1:student-7" });
    await screen.findByTestId("apk-game-host");
    render(<>{mockAPKGameHost.mock.calls.at(-1)?.[0].briefingExtension}</>);

    expect(screen.getByRole("alert")).toHaveTextContent("Rewards could not be loaded");
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toHaveClass("min-h-12");
    act(() => retry.click());
    expect(mockRpgRetry).toHaveBeenCalledTimes(1);
  });

  it("loads student-owned content and mounts the standard experience", async () => {
    renderHost();

    expect(await screen.findByTestId("apk-game-host")).toHaveTextContent("river");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    expect(mockAPKGameHost).toHaveBeenCalledWith(
      expect.objectContaining({
        standardExperience,
        responsive: expect.objectContaining({
          inputCapabilities: { touch: true, pointer: true, keyboard: true },
        }),
        className: expect.stringContaining("[&_[data-apk-canvas-host]]:h-[min(844px,calc(100svh_-_140px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))]"),
      }),
    );
    expect(screen.getByText("Student content")).toBeInTheDocument();
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      withBasePath("/assets/apk/standard-pack-qc/"),
    );
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      "/test-base/assets/apk/standard-pack-qc/",
    );
    expect(Object.keys(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.files ?? {})).toEqual(
      ["player-idle", "enemy-idle"],
    );
  });

  it.each([
    ["victory", true],
    ["defeat", false],
  ] as const)(
    "maps a %s cartridge result to the authenticated completion endpoint",
    async (outcome, victory) => {
      renderHost();
      await screen.findByTestId("apk-game-host");
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          xpEarned: 25,
          activityId: "game:dragon-flight:session",
          duplicate: false,
          status: 200,
        }),
      });

      let confirmation;
      await act(async () => {
        confirmation = await mockAPKGameHost.mock.calls[0]?.[0].onComplete({
          accuracy: 0.75,
          xp: 999,
          score: 80,
          correctAnswers: 3,
          totalAttempts: 4,
        }, outcome, listeningEvidence);
      });

      const completionCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(completionCall[0]).toBe("/api/v1/apk/complete");
      const payload = JSON.parse(completionCall[1].body as string);
      expect(payload).toMatchObject({
        gameType: "dragon-flight",
        difficulty: "medium",
        score: 80,
        accuracy: 0.75,
        correctAnswers: 3,
        totalAttempts: 4,
        victory,
        metadata: expect.objectContaining({ learningEvidence: listeningEvidence }),
      });
      expect(payload).not.toHaveProperty("xp");
      expect(payload.idempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(payload.duration).toEqual(expect.any(Number));
      expect(confirmation).toEqual({ xpEarned: 25, duplicate: false });
      expect(mockRecordSession).toHaveBeenCalledWith(
        "dragon-flight",
        "Dragon Flight",
        80,
        25,
        0.75,
      );
    },
  );

  it("rejects legacy complete outcomes instead of guessing a victory value", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");

    await expect(
      mockAPKGameHost.mock.calls[0]?.[0].onComplete({
        accuracy: 0.75,
        xp: 999,
        score: 80,
        correctAnswers: 3,
        totalAttempts: 4,
      }, "complete"),
    ).rejects.toThrow("Authenticated completion requires a victory or defeat outcome.");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockRecordSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid successful receipt before recording a leaderboard session", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ xpEarned: 25 }),
    });

    await expect(mockAPKGameHost.mock.calls[0]?.[0].onComplete({
      accuracy: 1,
      xp: 999,
      score: 80,
      correctAnswers: 4,
      totalAttempts: 4,
    }, "victory")).rejects.toThrow("The game-progress response is invalid.");
    expect(mockRecordSession).not.toHaveBeenCalled();
    expect(mockRpgRefreshAfterSavedCompletion).not.toHaveBeenCalled();
  });

  it("does not record duplicate or stale completion receipts locally", async () => {
    const mounted = renderHost();
    await screen.findByTestId("apk-game-host");
    const host = mockAPKGameHost.mock.calls[0]?.[0];
    const result = {
      accuracy: 1,
      xp: 999,
      score: 80,
      correctAnswers: 4,
      totalAttempts: 4,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:duplicate",
        duplicate: true,
        status: 200,
      }),
    });
    await host.onComplete(result, "victory");
    expect(mockRecordSession).not.toHaveBeenCalled();

    let resolveResponse!: (response: unknown) => void;
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    const pending = host.onComplete(result, "victory");
    const completionBodies = (global.fetch as jest.Mock).mock.calls
      .slice(1)
      .map(([, options]) => options.body as string);
    expect(completionBodies[1]).toBe(completionBodies[0]);
    await act(async () => {
      mounted.rerender(
        <AuthenticatedCartridgeHost
          cartridgeId="dragon-flight"
          description="Choose the correct gate."
          inputMode="vocabulary"
          locale="zh"
          contentLocale="cn"
          title="Dragon Flight"
        />,
      );
    });
    resolveResponse({
      ok: true,
      json: jest.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:stale",
        duplicate: false,
        status: 200,
      }),
    });
    await expect(pending).rejects.toThrow("The game session changed before progress was saved.");
    expect(mockRecordSession).not.toHaveBeenCalled();
  });

  it("records one leaderboard entry when repeated accepted receipts are not marked duplicate", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");
    const receipt = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:accepted",
        duplicate: false,
        status: 200,
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(receipt);
    const result = {
      accuracy: 1,
      xp: 999,
      score: 80,
      correctAnswers: 4,
      totalAttempts: 4,
    };

    await Promise.all([
      mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory"),
      mockAPKGameHost.mock.calls[0]?.[0].onComplete({ ...result, score: 1, accuracy: 0 }, "defeat"),
    ]);

    expect(mockRecordSession).toHaveBeenCalledTimes(1);
    expect(mockRecordSession).toHaveBeenCalledWith("dragon-flight", "Dragon Flight", 80, 25, 1);
  });

  it("keeps Thai targets when the interface uses English", async () => {
    renderHost({ cartridgeId: "wizard-vs-zombie", title: "Wizard vs. Zombie", locale: "en", contentLocale: "en" });
    await screen.findByTestId("apk-game-host");
    expect((global.fetch as jest.Mock)).toHaveBeenCalledWith("/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ credentials: "same-origin" }));
    expect(screen.getByRole("button", { name: "Read Thai" })).toHaveClass("min-h-12", "bg-primary");
    expect(screen.getByRole("button", { name: "Listen to English" })).toHaveClass("min-h-12", "bg-background");
  });

  it.each(["dragon-flight", "dragon-rider"])(
    "requests Thai targets for %s when the interface uses English",
    async (cartridgeId) => {
      render(<AuthenticatedCartridgeHost cartridgeId={cartridgeId} description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Dragon game" />);
      await screen.findByTestId("apk-game-host");
      expect(global.fetch).toHaveBeenCalledWith(
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
      standardExperience,
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
    renderHost({ cartridgeId, inputMode, locale: "en", contentLocale: "en", title: "Corrected game" });
    await screen.findByTestId("apk-game-host");
    expect(global.fetch).toHaveBeenCalledWith(
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
      standardExperience,
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
      mode: inputMode, source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["en"], content: [{ term: "river", translation: "river" }],
    }) });
    renderHost({ cartridgeId, inputMode, locale: "en", contentLocale: "en", title: "Corrected game" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Thai translations are unavailable");
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });

  it("rejects an English fallback instead of displaying it as the Thai target", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["en"], content: [{ term: "river", translation: "river" }],
    }) });
    renderHost({ cartridgeId: "wizard-vs-zombie", title: "Wizard vs. Zombie", locale: "en", contentLocale: "en" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Thai translations are unavailable");
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });

  it.each(["wizard-vs-zombie", "dragon-flight", "dragon-rider"])(
    "loads complete English audio answers for %s before mounting the audio session",
    async (cartridgeId) => {
    renderHost({ cartridgeId, title: "Vocabulary game" });
    await screen.findByTestId("apk-game-host");
    expect(mockAPKGameHost.mock.calls.at(-1)?.[0].createAnswerAudioSession).toBeUndefined();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["th"], content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: { modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true },
      preparedAnswerAudio: { clips: [{ itemPosition: 0, url: "https://audio.example/river.mp3",
        mediaType: "audio/mpeg", sourceLocale: "en-US" }] },
    }) });
    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    await waitFor(() => expect((global.fetch as jest.Mock)).toHaveBeenCalledWith(
      `/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`,
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    ));
    await waitFor(() => expect(mockAPKGameHost.mock.calls.at(-1)?.[0].createAnswerAudioSession).toEqual(expect.any(Function)));
    },
  );

  it("keeps unavailable answer audio separate from reading", async () => {
    renderHost({ cartridgeId: "wizard-vs-zombie", title: "Wizard vs. Zombie" });
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503,
      json: jest.fn().mockResolvedValue({ error: { message: "English answer audio is unavailable" } }) });
    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    expect(await screen.findByRole("button", { name: "Read instead" })).toBeInTheDocument();
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });



  it("does not record a leaderboard session when completion persistence fails", async () => {
    renderHost();
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: { message: "Game progress could not be saved." },
      }),
    });

    await expect(
      mockAPKGameHost.mock.calls[0]?.[0].onComplete({
        accuracy: 0.75,
        xp: 999,
        score: 80,
        correctAnswers: 3,
        totalAttempts: 4,
      }, "victory"),
    ).rejects.toThrow("Game progress could not be saved.");
    expect(mockRecordSession).not.toHaveBeenCalled();
    expect(mockRpgRefreshAfterSavedCompletion).not.toHaveBeenCalled();
  });

  it("requests Thai dragon content and keeps the route locale for catalog Exit", async () => {
    const assign = jest
      .spyOn(authenticatedHostNavigation, "assign")
      .mockImplementation(() => undefined);

    renderHost({ locale: "zh", contentLocale: "cn" });

    await screen.findByTestId("apk-game-host");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    mockAPKGameHost.mock.calls[0]?.[0].onNavigate?.("catalog");
    expect(assign).toHaveBeenCalledWith("/zh/student/games");
  });

  it("links a 401 load error to login with an encoded return path", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        error: { message: "Authentication required" },
      }),
    });

    renderHost({ locale: "zh", contentLocale: "cn" });

    const loginLink = await screen.findByRole("link", {
      name: "Sign in to play this game",
    });
    expect(loginLink).toHaveAttribute(
      "href",
      buildAuthenticatedApkLoginHref("zh", "dragon-flight"),
    );
    expect(loginLink).toHaveAttribute(
      "href",
      `/test-base/login?redirect=${encodeURIComponent("/zh/student/games/apk/dragon-flight")}`,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toContainElement(loginLink);
    expect(alert).not.toHaveTextContent(/^Authentication required$/);
    await waitFor(() => expect(mockAPKGameHost).not.toHaveBeenCalled());
  });

  it("starts catalog music on mount and when play begins, then stops on unmount", async () => {
    const { unmount } = renderHost();

    await screen.findByTestId("apk-game-host");
    expect(mockUseBackgroundMusic).toHaveBeenCalledWith("dragon-flight");
    await waitFor(() => expect(mockStartMusic).toHaveBeenCalled());

    mockStartMusic.mockClear();
    mockAPKGameHost.mock.calls[0]?.[0].onLifecycleTransition?.({
      from: "briefing",
      event: "start",
      to: "playing",
    });
    expect(mockStartMusic).toHaveBeenCalledTimes(1);
    mockAPKGameHost.mock.calls[0]?.[0].onMutedChange?.(true);
    expect(mockMuteMusic).toHaveBeenCalledWith(true);

    unmount();
    expect(mockStopMusic).toHaveBeenCalled();
  });

  it("shows a non-auth load error without a login link", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        error: { message: "Learning content could not be loaded." },
      }),
    });

    renderHost();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Learning content could not be loaded.",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("cancels obsolete content requests on mode change and unmount", async () => {
    const mounted = renderHost({ cartridgeId: "wizard-vs-zombie", title: "Wizard vs. Zombie" });
    await screen.findByTestId("apk-game-host");
    const fetchMock = global.fetch as jest.Mock;
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

describe("buildAuthenticatedApkLoginHref", () => {
  it("prefixes login and encodes the current APK path as redirect", () => {
    expect(buildAuthenticatedApkLoginHref("th", "dragon-flight")).toBe(
      `/test-base/login?redirect=${encodeURIComponent("/th/student/games/apk/dragon-flight")}`,
    );
  });

});
