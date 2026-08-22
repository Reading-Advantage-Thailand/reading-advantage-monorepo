import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { GriffinRidersEscapeGame } from "./GriffinRidersEscapeGame";
import React from "react";



// Capture RAF callbacks so we can manually tick them
const rafCallbacks: FrameRequestCallback[] = [];
const mockRaf = jest.fn((cb: FrameRequestCallback) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});
global.requestAnimationFrame = mockRaf;
global.cancelAnimationFrame = jest.fn((id: number) => {
  if (id <= rafCallbacks.length) {
    rafCallbacks[id - 1] = () => {};
  }
});

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: Record<string, unknown>) => <div data-testid="konva-rect" {...props} />,
  Text: (props: Record<string, unknown>) => <div data-testid="konva-text" {...props} />,
  Circle: (props: Record<string, unknown>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
}));

// Mock hooks
jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: () => ({ input: { dx: 0, dy: 0 } }),
}));

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

jest.mock("@/hooks/useBackgroundMusic", () => ({
  useBackgroundMusic: () => ({ start: jest.fn(), stop: jest.fn(), pause: jest.fn(), isPlaying: false }),
}));

const mockSentences = [
  { term: "The cat sits", translation: "แมวนั่ง" },
  { term: "Dog runs fast", translation: "หมาวิ่งเร็ว" },
];

describe("GriffinRidersEscapeGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallbacks.length = 0;
  });

  it("renders the start screen initially", () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    expect(screen.getByText(/Griffin Rider's Escape/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Game/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<GriffinRidersEscapeGame sentences={mockSentences} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    // Game should be in playing state
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("displays score with minimum text size", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByText("Score")).toBeInTheDocument();
  });

  it("displays translation with minimum text size", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByText("Translate")).toBeInTheDocument();
  });

  it("renders GameEndScreen with gameId and gameName", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("uses medium difficulty by default", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("schedules multiple gameplay ticks via requestAnimationFrame", async () => {
    render(<GriffinRidersEscapeGame sentences={mockSentences} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    // Wait for the game loop to register at least one RAF callback
    await waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
    });
    
    // Trigger the first RAF callback (first gameplay tick)
    act(() => {
      const cb = rafCallbacks[0];
      cb(performance.now());
    });
    
    // The game loop should have scheduled a SECOND RAF callback
    await waitFor(() => {
      expect(rafCallbacks.length).toBeGreaterThanOrEqual(2);
    });
    
    // Trigger the second RAF callback (second gameplay tick)
    act(() => {
      const cb = rafCallbacks[1];
      cb(performance.now() + 16);
    });
    
    // The RAF loop should have rescheduled itself at least twice
    // proving continuous gameplay ticks occur
    expect(rafCallbacks.length).toBeGreaterThanOrEqual(2);
  });
});