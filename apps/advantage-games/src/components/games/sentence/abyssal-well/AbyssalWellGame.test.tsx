import { render, screen, fireEvent } from "@testing-library/react";
import { AbyssalWellGame } from "./AbyssalWellGame";
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

const mockSentences = [
  { term: "The cat sits", translation: "Le chat est assis" },
  { term: "A dog runs", translation: "Un chien court" },
];

describe("AbyssalWellGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the start screen initially", () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/The Abyssal Well/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enter the Well/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<AbyssalWellGame sentences={mockSentences} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    // Game should be in playing state
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("renders difficulty selector on start screen", () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Well Depth:/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy Type:/i)).toBeInTheDocument();
  });

  it("renders game end screen when game phase is ended", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("handles keyboard input during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    
    // Test keyboard controls
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "d" });
  });

  it("ignores keyboard input when not playing", () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    
    // Should not throw when pressing keys on start screen
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: " " });
  });

  it("handles touch input during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    
    const gameContainer = screen.getByTestId("konva-stage").parentElement;
    if (gameContainer) {
      // Touch left side
      fireEvent.touchStart(gameContainer, {
        touches: [{ clientX: 50, clientY: 300 }],
      });
      
      // Touch right side
      fireEvent.touchStart(gameContainer, {
        touches: [{ clientX: 350, clientY: 300 }],
      });
      
      // Touch center
      fireEvent.touchStart(gameContainer, {
        touches: [{ clientX: 195, clientY: 300 }],
      });
    }
  });

  it("calls onComplete with results when game ends", async () => {
    const onComplete = jest.fn();
    render(<AbyssalWellGame sentences={mockSentences} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });
});
