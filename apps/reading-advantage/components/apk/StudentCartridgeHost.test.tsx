import { act, render, screen } from "@testing-library/react";

import type { GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";

import { StudentCartridgeHost } from "./StudentCartridgeHost";

const mockCartridgeLoader = jest.fn();
const mockAPKGameHost = jest.fn(
  (props: {
    cartridge: { manifest: { id: string } };
    input: unknown;
    onComplete: (result: unknown, outcome: GameTerminalOutcome) => Promise<void>;
    onLifecycleTransition?: (transition: {
      from: string;
      event: string;
      to: string;
    }) => void;
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
  createCatalogStandardEdition: () => ({ id: "catalog-standard-pack" }),
}));

jest.mock("./apk-host-layout", () => ({
  APK_HOST_LAYOUT_CLASS: "apk-host-layout",
  APK_HOST_RESPONSIVE_OPTIONS: {
    inputCapabilities: { touch: true, pointer: true, keyboard: true },
  },
}));

const firstSessionKey = "10000000-0000-4000-8000-000000000001";
const replaySessionKey = "20000000-0000-4000-8000-000000000002";

describe("StudentCartridgeHost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        content: [{ term: "river", translation: "แม่น้ำ" }],
      }),
    });
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
      mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory"),
    ).rejects.toThrow("Retry completion.");
    await act(async () => {
      await mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory");
    });
    mockAPKGameHost.mock.calls[0]?.[0].onLifecycleTransition?.({
      from: "results",
      event: "replay",
      to: "briefing",
    });
    await act(async () => {
      await mockAPKGameHost.mock.calls[0]?.[0].onComplete(result, "victory");
    });

    const completionKeys = (global.fetch as jest.Mock).mock.calls
      .slice(1)
      .map(([, options]) => JSON.parse(options.body as string).idempotencyKey);
    expect(completionKeys).toEqual([
      firstSessionKey,
      firstSessionKey,
      replaySessionKey,
    ]);
  });

  it("rejects an invalid successful completion response", async () => {
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
});
