import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";
import type { ListeningEvidence } from "@reading-advantage/game-contracts";

import { StudentCartridgeHost } from "./StudentCartridgeHost";

const mockCartridgeLoader = jest.fn();
const mockUseStudentRpg = jest.fn();
const mockUseStudentChallengeRun = jest.fn();
const mockRpgRewardDisclosure = jest.fn((props: { state: unknown; failureMessage?: string | null }) => (
  <div data-testid="rpg-reward-disclosure">{props.failureMessage ?? "confirmed rewards"}</div>
));
const mockRpgUnlockNotice = jest.fn((props: { cosmetics: readonly { name: string }[]; failureMessage?: string | null }) => (
  <div data-testid="rpg-unlock-notice">{props.failureMessage ?? props.cosmetics.map(({ name }) => name).join(", ")}</div>
));
const mockAPKGameHost = jest.fn(
  (props: {
    cartridge: { manifest: { id: string } };
    input: unknown;
    instructions?: string;
    createAnswerAudioSession?: () => unknown;
    seed?: number;
    launchPhase?: string;
    briefingExtension?: ReactNode;
    resultExtension?: ReactNode;
    onComplete: (result: unknown, outcome: GameTerminalOutcome, evidence?: ListeningEvidence) => Promise<{
      xpEarned: number;
      duplicate: boolean;
    }>;
    onLifecycleTransition?: (transition: {
      from: string;
      event: string;
      to: string;
    }) => void;
  }) => (
    <div data-testid="apk-game-host" data-cartridge-id={props.cartridge.manifest.id}>
      {JSON.stringify(props.input)}
      {props.briefingExtension}
      {props.resultExtension}
    </div>
  ),
);

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => (props: Parameters<typeof mockAPKGameHost>[0]) => mockAPKGameHost(props),
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
  createCatalogStandardEdition: () => ({ id: "catalog-standard-pack" }),
}));

jest.mock("@reading-advantage/advantage-play-kit/react", () => ({
  useStudentRpg: (...args: unknown[]) => mockUseStudentRpg(...args),
  useStudentChallengeRun: (...args: unknown[]) => mockUseStudentChallengeRun(...args),
}));

jest.mock("@reading-advantage/advantage-play-kit/presentation", () => ({
  RpgRewardDisclosure: (props: { state: unknown; failureMessage?: string | null }) => mockRpgRewardDisclosure(props),
  RpgUnlockNotice: (props: { cosmetics: readonly { name: string }[]; failureMessage?: string | null }) => mockRpgUnlockNotice(props),
  resolveRpgRewardAssetUrls: () => ({
    "apprentice-wand": "/assets/apk/standard-pack-qc/rpg-apprentice-wand.png",
    "graveyard-staff": "/assets/apk/standard-pack-qc/rpg-graveyard-staff.png",
    "echo-staff": "/assets/apk/standard-pack-qc/rpg-echo-staff.png",
  }),
}));

jest.mock("@reading-advantage/advantage-play-kit/responsive", () => ({
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG: {},
  resolveBrowserSafeAreaInsets: jest.fn(),
}), { virtual: true });

jest.mock("./apk-host-layout", () => ({
  APK_HOST_LAYOUT_CLASS: "apk-host-layout",
  APK_HOST_RESPONSIVE_OPTIONS: {
    inputCapabilities: { touch: true, pointer: true, keyboard: true },
  },
}));

const firstSessionKey = "10000000-0000-4000-8000-000000000001";
const replaySessionKey = "20000000-0000-4000-8000-000000000002";
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
    title: "River", gameId: "dragon-flight", gameVersion: "2026-09-09.1",
    contentMode: "vocabulary", contentLocale: "th", contentItemCount: 1,
    seed: 73, difficulty: "medium",
    modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
    startsAt: "2026-09-09T00:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z", target: 1, contributionCount: 0,
  },
  content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] },
  issuedAt: "2026-09-09T01:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z",
} as const;


describe("StudentCartridgeHost", () => {
  it("reserves one compact viewport for the canvas and live controls", () => {
    const { APK_HOST_LAYOUT_CLASS: layoutClass, APK_HOST_RESPONSIVE_OPTIONS: responsive } = jest.requireActual("./apk-host-layout") as typeof import("./apk-host-layout");
    expect(layoutClass).toContain("min-h-[calc(100svh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))]");
    expect(layoutClass).toContain("[&_[data-apk-canvas-host]]:h-[min(844px,calc(100svh_-_140px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))]");
    expect(layoutClass).toContain("[&[data-apk-session-phase=tutorial]_[data-apk-canvas-host]]:h-[clamp(592px,calc(100svh_-_252px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),844px)]");
    expect(layoutClass).toContain("[&_[data-apk-game-controls]_button]:min-h-12");
    expect(responsive.resolveSafeArea).toEqual(expect.any(Function));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      newlyUnlockedCosmetics: [],
      beginSession: jest.fn(),
      refreshAfterSavedCompletion: jest.fn().mockResolvedValue(undefined),
      equip: jest.fn().mockResolvedValue(undefined),
      retry: jest.fn().mockResolvedValue(undefined),
    });
    mockUseStudentChallengeRun.mockReturnValue({
      launch: null, loading: false, failureMessage: null, retry: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(firstSessionKey)
      .mockReturnValue(replaySessionKey);
    mockCartridgeLoader.mockResolvedValue({
      manifest: {
        id: "dragon-flight",
        inputMode: "vocabulary",
        requiredAssetBindings: [],
      },
      standardExperience: {
        definition: { briefing: {}, tutorial: {}, debrief: {} },
        createTutorialActionDriver: jest.fn(),
      },
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
    mockUseStudentChallengeRun.mockReturnValue({ launch: challengeLaunch, loading: false, failureMessage: null, retry: jest.fn() });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" challengeId={challengeLaunch.challengeId} />);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    expect(mockAPKGameHost.mock.calls.at(-1)?.[0]).toMatchObject({ input: challengeLaunch.content.items, seed: 73, launchPhase: "briefing" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pins the challenge run reference in the completion request", async () => {
    mockUseStudentChallengeRun.mockReturnValue({ launch: challengeLaunch, loading: false, failureMessage: null, retry: jest.fn() });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" challengeId={challengeLaunch.challengeId} />);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ xpEarned: 20, activityId: "activity-1", duplicate: false, status: 200 }) });
    await mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete({ score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, xp: 20 }, "victory");
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body)).toMatchObject({ challengeRunId: challengeLaunch.runId, difficulty: "medium", metadata: { contentSource: "class-challenge" } });
  });

  it("rejects unsupported challenge difficulty before mounting gameplay", async () => {
    mockUseStudentChallengeRun.mockReturnValue({ launch: { ...challengeLaunch, challenge: { ...challengeLaunch.challenge, difficulty: "hard" } }, loading: false, failureMessage: null, retry: jest.fn() });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" challengeId={challengeLaunch.challengeId} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("medium challenge difficulty only");
    expect(mockAPKGameHost).not.toHaveBeenCalled();
  });

  it("invalidates challenge completion and requests a fresh run on replay", async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    mockUseStudentChallengeRun.mockReturnValue({ launch: challengeLaunch, loading: false, failureMessage: null, retry });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" challengeId={challengeLaunch.challengeId} />);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalled());
    const props = mockAPKGameHost.mock.calls.at(-1)?.[0];
    act(() => props?.onLifecycleTransition?.({ from: "results", event: "replay", to: "briefing" }));
    expect(retry).toHaveBeenCalledTimes(1);
    await expect(props?.onComplete({ score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, xp: 20 }, "victory")).rejects.toThrow(/session changed/i);
  });

  it("does not mount stale challenge content during an ordinary-mode transition", async () => {
    mockUseStudentChallengeRun.mockReturnValue({ launch: challengeLaunch, loading: false, failureMessage: null, retry: jest.fn() });
    const view = render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" challengeId={challengeLaunch.challengeId} />);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalledTimes(1));
    view.rerender(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="th" ownerKey="student-1" title="Dragon Flight" />);
    expect(mockAPKGameHost).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockAPKGameHost).toHaveBeenCalledTimes(2));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps one completion key for retries and creates a new key after replay", async () => {
    render(
      <StudentCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="th"
        title="Dragon Flight"
      />,
    );

    expect(await screen.findByTestId("apk-game-host")).toHaveTextContent("river");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );

    const result = {
      accuracy: 0.75,
      xp: 25,
      score: 80,
      correctAnswers: 3,
      totalAttempts: 4,
    };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: { message: "Retry completion." } }),
      })
      .mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          xpEarned: 25,
          activityId: `game:dragon-flight:${firstSessionKey}`,
          duplicate: false,
          status: 200,
        }),
      });

    await expect(
      mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory", listeningEvidence),
    ).rejects.toThrow("Retry completion.");
    const confirmation = await mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory", listeningEvidence);
    expect(confirmation).toEqual({ xpEarned: 25, duplicate: false });
    await act(async () => {
      mockAPKGameHost.mock.calls.at(-1)?.[0].onLifecycleTransition?.({
        from: "results",
        event: "replay",
        to: "briefing",
      });
    });
    await act(async () => {
      await mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete(result, "victory", listeningEvidence);
    });

    const completionKeys = (global.fetch as jest.Mock).mock.calls
      .slice(1)
      .map(([, options]) => JSON.parse(options.body as string).idempotencyKey);
    expect(completionKeys).toEqual([
      firstSessionKey,
      firstSessionKey,
      replaySessionKey,
    ]);
    const completionBodies = (global.fetch as jest.Mock).mock.calls
      .slice(1)
      .map(([, options]) => options.body as string);
    expect(completionBodies[1]).toBe(completionBodies[0]);
    expect(completionBodies[2]).not.toBe(completionBodies[0]);
    const completionEvidence = (global.fetch as jest.Mock).mock.calls
      .slice(1)
      .map(([, options]) => JSON.parse(options.body as string).metadata.learningEvidence);
    expect(completionEvidence).toEqual([
      listeningEvidence,
      listeningEvidence,
      listeningEvidence,
    ]);
  });

  it("loads RPG state for the validated owner and shows confirmed rewards in briefing", async () => {
    const rpgState = { cosmetics: [], quests: [], equippedEmblemId: null };
    mockUseStudentRpg.mockReturnValue({
      state: rpgState, loading: false, pendingCosmeticId: null, failureMessage: null,
      newlyUnlockedCosmetics: [], beginSession: jest.fn(), refreshAfterSavedCompletion: jest.fn(),
      equip: jest.fn(), retry: jest.fn(),
    });

    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="en" ownerKey="school-1:student-7" title="Dragon Flight" />);

    expect(await screen.findByTestId("rpg-reward-disclosure")).toHaveTextContent("confirmed rewards");
    expect(mockUseStudentRpg).toHaveBeenCalledWith({
      endpoint: "/api/v1/apk/rpg",
      ownerKey: "school-1:student-7",
      enabled: true,
    });
  });

  it("offers an RPG retry when the initial request fails before state exists", async () => {
    const retry = jest.fn();
    mockUseStudentRpg.mockReturnValue({
      state: null, loading: false, pendingCosmeticId: null,
      failureMessage: "Rewards could not be loaded. Try again.", newlyUnlockedCosmetics: [],
      beginSession: jest.fn(), refreshAfterSavedCompletion: jest.fn(), equip: jest.fn(), retry,
    });

    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="en" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    act(() => screen.getAllByRole("button", { name: "Try again" })[0]?.click());

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("records RPG baselines only for replay and fresh play transitions", async () => {
    const beginSession = jest.fn();
    mockUseStudentRpg.mockReturnValue({
      state: null, loading: false, pendingCosmeticId: null, failureMessage: null,
      newlyUnlockedCosmetics: [], beginSession, refreshAfterSavedCompletion: jest.fn(),
      equip: jest.fn(), retry: jest.fn(),
    });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="en" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("apk-game-host");
    const transition = mockAPKGameHost.mock.calls.at(-1)?.[0].onLifecycleTransition;

    act(() => {
      transition?.({ from: "briefing", event: "startPractice", to: "practice" });
      transition?.({ from: "paused", event: "resume", to: "playing" });
      transition?.({ from: "briefing", event: "start", to: "playing" });
      transition?.({ from: "results", event: "replay", to: "briefing" });
    });

    expect(beginSession).toHaveBeenCalledTimes(2);
  });

  it("refreshes rewards after a valid saved receipt and shows only new unlocks", async () => {
    const refreshAfterSavedCompletion = jest.fn().mockResolvedValue(undefined);
    const unlocked = { id: "graveyard-staff", name: "Graveyard Staff", unlockedAt: "2026-09-09", equipped: false };
    mockUseStudentRpg.mockReturnValue({
      state: { cosmetics: [unlocked], quests: [], equippedEmblemId: null }, loading: false,
      pendingCosmeticId: null, failureMessage: null, newlyUnlockedCosmetics: [unlocked],
      beginSession: jest.fn(), refreshAfterSavedCompletion, equip: jest.fn(), retry: jest.fn(),
    });
    render(<StudentCartridgeHost cartridgeId="dragon-flight" description="Choose." inputMode="vocabulary" locale="en" ownerKey="school-1:student-7" title="Dragon Flight" />);
    await screen.findByTestId("rpg-unlock-notice");
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ xpEarned: 25, activityId: "game:dragon-flight:1", duplicate: false, status: 200 }),
    });

    await mockAPKGameHost.mock.calls.at(-1)?.[0].onComplete({ accuracy: 1, xp: 25, score: 100, correctAnswers: 1, totalAttempts: 1 }, "victory");

    expect(refreshAfterSavedCompletion).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("rpg-unlock-notice")).toHaveTextContent("Graveyard Staff");
    expect(mockRpgUnlockNotice.mock.calls.at(-1)?.[0].cosmetics).toEqual([unlocked]);
  });

  it("rejects an invalid successful completion response", async () => {
    const refreshAfterSavedCompletion = jest.fn();
    mockUseStudentRpg.mockReturnValue({
      state: null, loading: false, pendingCosmeticId: null, failureMessage: null,
      newlyUnlockedCosmetics: [], beginSession: jest.fn(), refreshAfterSavedCompletion,
      equip: jest.fn(), retry: jest.fn(),
    });
    render(
      <StudentCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="en"
        title="Dragon Flight"
      />,
    );
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(
      mockAPKGameHost.mock.calls[0]?.[0].onComplete({
        accuracy: 0.75,
        xp: 25,
        score: 80,
        correctAnswers: 3,
        totalAttempts: 4,
      }, "victory"),
    ).rejects.toThrow("The game-progress response is invalid.");
    expect(refreshAfterSavedCompletion).not.toHaveBeenCalled();
  });

  it("rejects a completion receipt after the route locale changes", async () => {
    const mounted = render(
      <StudentCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="en"
        title="Dragon Flight"
      />,
    );
    await screen.findByTestId("apk-game-host");
    const staleHost = mockAPKGameHost.mock.calls.at(-1)?.[0];
    if (!staleHost) throw new Error("Expected the APK game host to mount.");
    let resolveResponse!: (response: unknown) => void;
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    const pending = staleHost.onComplete({
      accuracy: 0.75,
      xp: 25,
      score: 80,
      correctAnswers: 3,
      totalAttempts: 4,
    }, "victory", listeningEvidence);

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
      json: jest.fn().mockResolvedValue({
        xpEarned: 25,
        activityId: "game:dragon-flight:stale",
        duplicate: false,
        status: 200,
      }),
    });

    await expect(pending).rejects.toThrow("The game session changed before progress was saved.");
  });

  it("retries a transient content-load failure", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({
          error: { message: "Learning content is temporarily unavailable." },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          mode: "vocabulary",
          source: "student-flashcards",
          content: [{ term: "river", translation: "river" }],
        }),
      });

    render(
      <StudentCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="en"
        title="Dragon Flight"
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Learning content is temporarily unavailable.",
    );

    await act(async () => {
      screen.getByRole("button", { name: "Retry" }).click();
    });

    expect(await screen.findByTestId("apk-game-host")).toHaveTextContent("river");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps Thai targets when the interface uses English", async () => {
    render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Wizard vs. Zombie" />);
    await screen.findByTestId("apk-game-host");
    expect((global.fetch as jest.Mock)).toHaveBeenCalledWith("/api/v1/apk/content?mode=vocabulary&locale=th",
      expect.objectContaining({ credentials: "same-origin" }));
    expect(screen.getByRole("button", { name: "Read Thai" })).toHaveClass("min-h-12", "bg-primary");
    expect(screen.getByRole("button", { name: "Listen to English" })).toHaveClass("min-h-12", "bg-background");
  });

  it.each(["dragon-flight", "dragon-rider"])(
    "requests Thai targets for %s when the interface uses English",
    async (cartridgeId) => {
      render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Choose the English meaning." inputMode="vocabulary" locale="en" title="Dragon game" />);
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
      standardExperience: { definition: { briefing: {}, tutorial: {}, debrief: {} }, createTutorialActionDriver: jest.fn() },
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
    render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Corrected game" inputMode={inputMode} locale="en" title="Corrected game" />);
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
      standardExperience: { definition: { briefing: {}, tutorial: {}, debrief: {} }, createTutorialActionDriver: jest.fn() },
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
      mode: inputMode, source: "student-flashcards", requestedTargetLocale: "th",
      selectedTargetLocales: ["en"], content: [{ term: "river", translation: "river" }],
    }) });
    render(<StudentCartridgeHost cartridgeId={cartridgeId} description="Corrected game" inputMode={inputMode} locale="en" title="Corrected game" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Thai translations are unavailable");
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });

  it("rejects an English fallback instead of displaying it as the Thai target", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({
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
    render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Choose the English meaning." inputMode="vocabulary" locale="th" title="Wizard vs. Zombie" />);
    await screen.findByTestId("apk-game-host");
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503,
      json: jest.fn().mockResolvedValue({ error: { message: "English answer audio is unavailable" } }) });
    act(() => screen.getByRole("button", { name: "Listen to English" }).click());
    expect(await screen.findByRole("button", { name: "Read instead" })).toBeInTheDocument();
    expect(screen.queryByTestId("apk-game-host")).not.toBeInTheDocument();
  });


  it("cancels obsolete content requests on mode change and unmount", async () => {
    const mounted = render(<StudentCartridgeHost cartridgeId="wizard-vs-zombie" description="Listen and choose." inputMode="vocabulary" locale="th" title="Wizard vs. Zombie" />);
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
