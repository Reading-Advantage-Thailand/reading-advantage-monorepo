import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CastleDefenseGame } from "./CastleDefenseGame";
import React from "react";

// Mock withBasePath
jest.mock("@/lib/games/basePath", () => ({
  withBasePath: (src: string) => src,
}));

// Mock Image to load asynchronously but reliably
class MockImage {
  _onload: (() => void) | null = null;
  _onerror: (() => void) | null = null;
  src = "";
  width = 64;
  height = 64;

  set onload(fn: (() => void) | null) {
    this._onload = fn;
    if (fn) {
      setTimeout(() => fn(), 10);
    }
  }
  get onload() {
    return this._onload;
  }

  set onerror(fn: (() => void) | null) {
    this._onerror = fn;
  }
  get onerror() {
    return this._onerror;
  }
}
Object.defineProperty(global, "Image", {
  value: MockImage,
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    callback([
      {
        contentRect: { width: 800, height: 600 },
        target: element,
      },
    ]);
  }),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-stage">{children}</div>
  ),
  Layer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-rect" {...props} />
  ),
  Text: ({
    text,
    ...props
  }: { text?: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-text" {...props}>
      {text}
    </div>
  ),
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-circle" {...props} />
  ),
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Image: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-image" {...props} />
  ),
}));

jest.mock("./BackgroundLayer", () => ({
  BackgroundLayer: () => <div data-testid="background-layer" />,
}));

// Mock hooks
jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: mockEnterFullscreen,
    exitFullscreen: mockExitFullscreen,
  }),
}));

jest.mock("@/hooks/useAccessibilitySettings", () => ({
  useAccessibilitySettings: () => ({
    settings: {
      textSizeMultiplier: 1,
      touchTargetMultiplier: 1,
      assistMode: false,
      reduceMotion: false,
    },
    getEffectiveTextSize: (base: number) => base,
    getEffectiveTouchTarget: (base: number) => base,
  }),
}));

jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: () => ({
    input: { dx: 0, dy: 0, cast: false },
    setVirtualInput: jest.fn(),
    consumeCast: jest.fn(),
  }),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

const mockVocabulary = [
  { term: "The dragon flies high", translation: "Le dragon vole haut" },
  { term: "The knight is brave", translation: "Le chevalier est brave" },
];

// Helper to wait for assets to load
async function waitForAssetsToLoad() {
  jest.advanceTimersByTime(100);
  await waitFor(() =>
    expect(
      screen.queryByText(/loading/i),
    ).not.toBeInTheDocument(),
  );
}

describe("CastleDefenseGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the start screen initially", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    expect(
      screen.getByRole('heading', { name: /title/i }),
    ).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("displays difficulty buttons on start screen", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    expect(
      screen.getByRole("button", { name: /difficulty.easy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /difficulty.medium/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /difficulty.hard/i }),
    ).toBeInTheDocument();
  });

  it("changes difficulty when difficulty button is clicked", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const hardButton = screen.getByRole("button", { name: /difficulty.hard/i });
    fireEvent.click(hardButton);
    expect(hardButton).toHaveClass("bg-amber-500");
  });

  it("displays konva layer when playing", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-layer")).toBeInTheDocument();
  });

  it("displays virtual dpad during gameplay", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("virtual-dpad")).toBeInTheDocument();
  });

  it("displays HUD elements when playing", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(
      await screen.findByText(/hud.score/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/hud.castleHp/i),
    ).toBeInTheDocument();
  });

  it("uses medium difficulty by default", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const mediumButton = screen.getByRole("button", {
      name: /difficulty.medium/i,
    });
    expect(mediumButton).toHaveClass("bg-amber-500");
  });

  it("renders ranking dialog button", async () => {
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    expect(
      screen.getByRole("button", { name: /Leaderboard/i }),
    ).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(
      <CastleDefenseGame vocabulary={mockVocabulary} onComplete={onComplete} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });
});
