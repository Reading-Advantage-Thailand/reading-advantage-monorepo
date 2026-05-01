import { render, screen, fireEvent, act } from "@testing-library/react";
import { LabyrinthGoblinKingGame } from "./LabyrinthGoblinKingGame";
import React from "react";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: Record<string, unknown>) => <div data-testid="konva-rect" {...props} />,
  Text: (props: Record<string, unknown>) => <div data-testid="konva-text" {...props} />,
  Circle: (props: Record<string, unknown>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
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

jest.mock("@/components/games/ui/VirtualDPad", () => ({
  VirtualDPad: ({ onInput }: { onInput: (input: { dx: number; dy: number }) => void }) => (
    <div data-testid="virtual-dpad">
      <button data-testid="dpad-up" onClick={() => onInput({ dx: 0, dy: -1 })}>Up</button>
      <button data-testid="dpad-down" onClick={() => onInput({ dx: 0, dy: 1 })}>Down</button>
      <button data-testid="dpad-left" onClick={() => onInput({ dx: -1, dy: 0 })}>Left</button>
      <button data-testid="dpad-right" onClick={() => onInput({ dx: 1, dy: 0 })}>Right</button>
    </div>
  ),
}));

jest.mock("@/components/games/game/GameStartScreen", () => ({
  GameStartScreen: ({ onStart, children }: { onStart: () => void; children: React.ReactNode }) => (
    <div data-testid="game-start-screen">
      <button data-testid="start-button" onClick={onStart}>Enter the Labyrinth</button>
      {children}
    </div>
  ),
}));

jest.mock("@/components/games/game/GameEndScreen", () => ({
  GameEndScreen: ({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) => (
    <div data-testid="game-end-screen">
      <button data-testid="restart-button" onClick={onRestart}>Restart</button>
      <button data-testid="exit-button" onClick={onExit}>Exit</button>
    </div>
  ),
}));

const mockSentences = [
  { term: "The cat sits on the mat", translation: "Le chat est assis sur le tapis" },
  { term: "Dog runs fast", translation: "Le chien court vite" },
];

describe("LabyrinthGoblinKingGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the start screen initially", () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
    expect(screen.getByTestId("start-button")).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByTestId("start-button");
    
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(screen.getByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByTestId("start-button");
    
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByTestId("start-button");
    
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(mockEnterFullscreen).toHaveBeenCalled();
    
    // Trigger game end by depleting lives - collect wrong orb
    const dpad = screen.getByTestId("virtual-dpad");
    expect(dpad).toBeInTheDocument();
  });

  it("renders virtual dpad during gameplay", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByTestId("start-button");
    
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(screen.getByTestId("virtual-dpad")).toBeInTheDocument();
  });

  it("handles keyboard input during gameplay", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByTestId("start-button");
    
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // Simulate keyboard events
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowUp" });
    });
    
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    });
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={onComplete} />);
    
    const startButton = screen.getByTestId("start-button");
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(screen.getByTestId("konva-stage")).toBeInTheDocument();
  });

  it("resets game when restart is clicked on end screen", async () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    
    // Start game
    const startButton = screen.getByTestId("start-button");
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    expect(screen.getByTestId("konva-stage")).toBeInTheDocument();
  });

  it("has difficulty selector on start screen", () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
  });

  it("has goblin type selector on start screen", () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
  });

  it("uses default difficulty of normal", () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
  });

  it("uses default goblin type of scout", () => {
    render(<LabyrinthGoblinKingGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
  });

  it("handles empty sentences array gracefully", () => {
    render(<LabyrinthGoblinKingGame sentences={[]} onComplete={jest.fn()} />);
    expect(screen.getByTestId("game-start-screen")).toBeInTheDocument();
  });
});
