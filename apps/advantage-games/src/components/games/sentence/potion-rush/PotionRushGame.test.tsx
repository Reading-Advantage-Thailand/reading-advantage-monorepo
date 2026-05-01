import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PotionRushGame from "./PotionRushGame";
import React from "react";
import { usePotionRushStore } from "@/store/usePotionRushStore";

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
  Line: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-line" {...props} />
  ),
  Star: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-star" {...props} />
  ),
  Path: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-path" {...props} />
  ),
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

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockVocabList = [
  { term: "The cat sits on the mat", translation: "แมวนั่งบนเสื่อ", id: "1" },
  { term: "I love to read books", translation: "ฉันชอบอ่านหนังสือ", id: "2" },
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

describe("PotionRushGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    act(() => {
      usePotionRushStore.getState().reset();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the start screen initially", async () => {
    render(
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    expect(
      screen.getByRole("button", { name: /startButton/i }),
    ).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={jest.fn()} />,
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
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("displays konva layer when playing", async () => {
    render(
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={jest.fn()} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-layer")).toBeInTheDocument();
  });

  it("displays HUD elements when playing", async () => {
    render(
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={jest.fn()} />,
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
      screen.getByText(/hud.served/i),
    ).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(
      <PotionRushGame vocabList={mockVocabList} difficulty="normal" onComplete={onComplete} />,
    );
    await waitForAssetsToLoad();
    const startButton = screen.getByRole("button", {
      name: /startButton/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });
});
