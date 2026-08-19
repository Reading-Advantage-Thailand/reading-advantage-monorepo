import { act, render, screen, waitFor } from "@testing-library/react";

import {
  AuthenticatedCartridgeHost,
  authenticatedHostNavigation,
  buildAuthenticatedApkLoginHref,
} from "./AuthenticatedCartridgeHost";
import type { GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";
import { withBasePath } from "@/lib/games-runtime";

const mockCartridgeLoader = jest.fn();
const mockRecordSession = jest.fn();
const mockStartMusic = jest.fn();
const mockStopMusic = jest.fn();
const mockUseBackgroundMusic = jest.fn(() => ({
  start: mockStartMusic,
  stop: mockStopMusic,
  pause: jest.fn(),
  isPlaying: false,
}));
const mockAPKGameHost = jest.fn(
  (props: {
    cartridge: { manifest: { id: string } };
    input: unknown;
    edition: { pack: { root: string } };
    standardExperience: unknown;
    responsive?: unknown;
    className?: string;
    onComplete: (result: unknown, outcome: GameTerminalOutcome) => Promise<void>;
    onLifecycleTransition?: (transition: {
      from: string;
      event: string;
      to: string;
    }) => void;
    onNavigate?: (destination: string) => void;
  }) => (
    <div data-testid="apk-game-host" data-cartridge-id={props.cartridge.manifest.id}>
      {JSON.stringify(props.input)}
    </div>
  ),
);

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => (props: Parameters<typeof mockAPKGameHost>[0]) => mockAPKGameHost(props),
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeLoaders: {
    "dragon-flight": (...args: unknown[]) => mockCartridgeLoader(...args),
  },
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
        content: [{ term: "river", translation: "แม่น้ำ" }],
      }),
    });
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
        className: expect.stringContaining("[&_[data-apk-canvas-host]]:h-[844px]"),
      }),
    );
    expect(screen.getByText("Student content")).toBeInTheDocument();
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      withBasePath("/assets/apk/standard-pack-qc/"),
    );
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      "/test-base/assets/apk/standard-pack-qc/",
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
        json: jest.fn().mockResolvedValue({ xpEarned: 25, duplicate: false, status: 200 }),
      });

      await act(async () => {
        await mockAPKGameHost.mock.calls[0]?.[0].onComplete({
          accuracy: 0.75,
          xp: 999,
          score: 80,
          correctAnswers: 3,
          totalAttempts: 4,
        }, outcome);
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
      });
      expect(payload).not.toHaveProperty("xp");
      expect(payload.idempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(payload.duration).toEqual(expect.any(Number));
      expect(mockRecordSession).toHaveBeenCalledWith(
        "dragon-flight",
        "Dragon Flight",
        80,
        999,
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
  });

  it("requests content with contentLocale and keeps the route locale for catalog Exit", async () => {
    const assign = jest
      .spyOn(authenticatedHostNavigation, "assign")
      .mockImplementation(() => undefined);

    renderHost({ locale: "zh", contentLocale: "cn" });

    await screen.findByTestId("apk-game-host");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/apk/content?mode=vocabulary&locale=cn",
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
});

describe("buildAuthenticatedApkLoginHref", () => {
  it("prefixes login and encodes the current APK path as redirect", () => {
    expect(buildAuthenticatedApkLoginHref("th", "dragon-flight")).toBe(
      `/test-base/login?redirect=${encodeURIComponent("/th/student/games/apk/dragon-flight")}`,
    );
  });
});
