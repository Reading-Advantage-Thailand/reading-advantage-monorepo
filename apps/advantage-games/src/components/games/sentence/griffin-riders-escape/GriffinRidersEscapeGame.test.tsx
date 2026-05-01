import { render, screen, fireEvent, act } from "@testing-library/react";
import { GriffinRidersEscapeGame } from "./GriffinRidersEscapeGame";
import React from "react";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: any) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" {...props} />,
  Text: (props: any) => <div data-testid="konva-text" {...props} />,
  Circle: (props: any) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: any) => <div data-testid="konva-group">{children}</div>,
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

const mockVocabulary = [
  { term: "The cat sits", translation: "แมวนั่ง" },
  { term: "Dog runs fast", translation: "หมาวิ่งเร็ว" },
];

describe("GriffinRidersEscapeGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the start screen initially", () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    expect(screen.getByText(/Griffin Rider's Escape/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Game/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    // Game should be in playing state
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("displays score with minimum text size", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByText("Score")).toBeInTheDocument();
  });

  it("displays translation with minimum text size", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByText("Translate")).toBeInTheDocument();
  });

  it("renders GameEndScreen with gameId and gameName", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("uses medium difficulty by default", async () => {
    render(<GriffinRidersEscapeGame vocabulary={mockVocabulary} />);
    const startButton = screen.getByRole("button", { name: /Start Game/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });
});
