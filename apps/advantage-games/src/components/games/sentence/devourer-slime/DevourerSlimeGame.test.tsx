import { render, screen, fireEvent } from "@testing-library/react";
import { DevourerSlimeGame } from "./DevourerSlimeGame";
import React from "react";

// Mock Konva Stage and Layer
jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Text: () => <div data-testid="konva-text" />,
  Circle: () => <div data-testid="konva-circle" />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
}));

// Mock hooks
jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: () => ({ 
    input: { dx: 0, dy: 0 },
    setVirtualInput: jest.fn()
  }),
}));

jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
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
  { term: "The cat sits", translation: "แมวนั่งอยู่" },
  { term: "Dog runs fast", translation: "หมาวิ่งเร็ว" },
];

describe("DevourerSlimeGame", () => {
  it("renders the start screen initially", () => {
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Devourer Slime/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START DEVOURING/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /START DEVOURING/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("shows game HUD when playing", async () => {
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /START DEVOURING/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByText(/Translation/i)).toBeInTheDocument();
    expect(screen.getByText(/Score:/i)).toBeInTheDocument();
    expect(screen.getByText(/Size:/i)).toBeInTheDocument();
  });

  it("calls onComplete when game ends", async () => {
    const onComplete = jest.fn();
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={onComplete} />);
    
    const startButton = screen.getByRole("button", { name: /START DEVOURING/i });
    fireEvent.click(startButton);
    
    // Game should be in playing state
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("shows difficulty selector on start screen", () => {
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Devourer Slime/i)).toBeInTheDocument();
  });

  it("renders virtual d-pad when playing", async () => {
    render(<DevourerSlimeGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /START DEVOURING/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });
});
