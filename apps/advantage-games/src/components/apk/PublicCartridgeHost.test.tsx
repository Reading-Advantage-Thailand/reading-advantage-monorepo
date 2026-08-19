import { render, screen, waitFor } from "@testing-library/react";

import { PUBLIC_ARCADE_SENTENCE_FIXTURE } from "@/lib/apk/public-sentence-fixture";
import { PUBLIC_ARCADE_VOCABULARY_FIXTURE } from "@/lib/apk/public-vocabulary-fixture";
import { withBasePath } from "@/lib/games-runtime";

import { PublicCartridgeHost, publicArcadeNavigation } from "./PublicCartridgeHost";

const mockCartridgeLoader = jest.fn();
const mockStartMusic = jest.fn();
const mockStopMusic = jest.fn();
const mockUseBackgroundMusic = jest.fn(() => ({
  start: mockStartMusic,
  stop: mockStopMusic,
  pause: jest.fn(),
  isPlaying: false,
}));
const mockAPKGameHost = jest.fn(
  ({ cartridge, input }: {
    cartridge: { manifest: { id: string } };
    input: unknown;
    edition: { pack: { root: string } };
    standardExperience?: unknown;
    responsive?: unknown;
    className?: string;
    onLifecycleTransition?: (transition: {
      from: string;
      event: string;
      to: string;
    }) => void;
    onNavigate?: (destination: string) => void;
  }) => (
    <div data-testid="apk-game-host" data-cartridge-id={cartridge.manifest.id}>
      {JSON.stringify(input)}
    </div>
  ),
);

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => (props: { cartridge: { manifest: { id: string } }; input: unknown; edition: unknown; standardExperience?: unknown }) =>
    mockAPKGameHost(props),
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeLoaders: {
    "dragon-flight": (...args: unknown[]) => mockCartridgeLoader(...args),
    "astral-mage": (...args: unknown[]) => mockCartridgeLoader(...args),
  },
}));
jest.mock("@/lib/games-runtime", () => ({
  withBasePath: (path: string) => `/test-base${path}`,
}));
jest.mock("@/lib/games/basePath", () => ({
  withBasePath: (path: string) => `/test-base${path}`,
}));
jest.mock("@/hooks/useBackgroundMusic", () => {
  const actual = jest.requireActual("@/hooks/useBackgroundMusic") as typeof import("@/hooks/useBackgroundMusic");
  return {
    ...actual,
    useBackgroundMusic: (...args: unknown[]) => mockUseBackgroundMusic(...args),
  };
});

describe("PublicCartridgeHost", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const standardExperience = {
      definition: { briefing: {}, tutorial: {}, debrief: {} },
      createTutorialActionDriver: jest.fn(),
    };
    mockCartridgeLoader.mockResolvedValue({
      manifest: {
        id: "dragon-flight",
        title: "Dragon Flight",
        description: "Choose the correct gate.",
        version: "1.0.0",
        runtimeApiVersion: "1.0.0",
        inputMode: "vocabulary",
        requiredAssetBindings: ["player.hero"],
        capabilities: [],
      },
      standardExperience,
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });
  });

  it("uses the stable built-in vocabulary fixture for every host render", async () => {
    const view = render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

    await screen.findByTestId("apk-game-host");
    view.rerender(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

    for (const [props] of mockAPKGameHost.mock.calls) {
      expect(props.input).toBe(PUBLIC_ARCADE_VOCABULARY_FIXTURE);
      expect(props.edition).toBe(mockAPKGameHost.mock.calls[0]?.[0].edition);
    }
  });

  it("loads the catalog cartridge and mounts one APK host", async () => {
    render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

    expect(await screen.findByTestId("apk-game-host")).toHaveAttribute(
      "data-cartridge-id",
      "dragon-flight",
    );
    expect(mockCartridgeLoader).toHaveBeenCalledTimes(1);
    expect(mockAPKGameHost).toHaveBeenCalledTimes(1);
    expect(mockAPKGameHost).toHaveBeenCalledWith(
      expect.objectContaining({
        standardExperience: expect.objectContaining({
          createTutorialActionDriver: expect.any(Function),
        }),
        responsive: expect.objectContaining({
          inputCapabilities: { touch: true, pointer: true, keyboard: true },
        }),
        className: expect.stringContaining("[&_[data-apk-canvas-host]]:h-[844px]"),
      }),
    );
    expect(screen.getByText("Preview mode")).toBeInTheDocument();
    expect(
      screen.getByText(/built-in sample content.*does not save progress/i),
    ).toBeInTheDocument();
  });

  it("uses sentence input for sentence cartridges", async () => {
    mockCartridgeLoader.mockResolvedValue({
      manifest: {
        id: "astral-mage",
        inputMode: "sentence",
        requiredAssetBindings: [],
      },
      standardExperience: {
        definition: { briefing: {}, tutorial: {}, debrief: {} },
        createTutorialActionDriver: jest.fn(),
      },
      createGameConfig: jest.fn(() => ({ scene: {} })),
    });

    render(
      <PublicCartridgeHost
        cartridgeId="astral-mage"
        description="Cast sentence words in order."
        inputMode="sentence"
        title="Astral Mage"
      />,
    );

    await screen.findByTestId("apk-game-host");
    expect(mockAPKGameHost).toHaveBeenCalledWith(
      expect.objectContaining({ input: PUBLIC_ARCADE_SENTENCE_FIXTURE }),
    );
  });

  it("prefixes the developer pack root with withBasePath", async () => {
    render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

    await screen.findByTestId("apk-game-host");
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      withBasePath("/assets/apk/standard-pack-qc/"),
    );
    expect(mockAPKGameHost.mock.calls[0]?.[0].edition.pack.root).toBe(
      "/test-base/assets/apk/standard-pack-qc/",
    );
  });

  it("assigns the locale-scoped games catalog when Exit navigates to catalog", async () => {
    const assign = jest.spyOn(publicArcadeNavigation, "assign").mockImplementation(() => undefined);

    render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        locale="th"
        title="Dragon Flight"
      />,
    );

    await screen.findByTestId("apk-game-host");
    const onNavigate = mockAPKGameHost.mock.calls[0]?.[0].onNavigate;
    expect(onNavigate).toEqual(expect.any(Function));
    onNavigate?.("catalog");
    expect(assign).toHaveBeenCalledWith("/th/student/games");
  });

  it("starts catalog music on mount and when play begins, then stops on unmount", async () => {
    const { unmount } = render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

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

  it("assigns the app root when catalog Exit has no locale", async () => {
    const assign = jest.spyOn(publicArcadeNavigation, "assign").mockImplementation(() => undefined);

    render(
      <PublicCartridgeHost
        cartridgeId="dragon-flight"
        description="Choose the correct gate."
        inputMode="vocabulary"
        title="Dragon Flight"
      />,
    );

    await screen.findByTestId("apk-game-host");
    mockAPKGameHost.mock.calls[0]?.[0].onNavigate?.("catalog");
    expect(assign).toHaveBeenCalledWith("/");
  });
});
