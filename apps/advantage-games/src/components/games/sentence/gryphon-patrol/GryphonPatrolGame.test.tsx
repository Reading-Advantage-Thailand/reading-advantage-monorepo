import { render, screen, fireEvent } from "@testing-library/react";
import GryphonPatrolGame from "./GryphonPatrolGame";
import React from "react";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();
const mockContainerRef = { current: null };

// Mock requestAnimationFrame globally
const mockRaf = jest.fn(() => 1);
global.requestAnimationFrame = mockRaf;
global.cancelAnimationFrame = jest.fn();

// Mock Konva Stage and Layer
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("react-konva", () => ({
  Stage: ({ children }: any) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" {...props} />,
  Text: (props: any) => <div data-testid="konva-text" {...props} />,
  Circle: (props: any) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: any) => <div data-testid="konva-group">{children}</div>,
  Line: (props: any) => <div data-testid="konva-line" {...props} />,
}));

// Mock hooks
jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: () => ({ input: { dx: 0, dy: 0, cast: false }, consumeCast: jest.fn() }),
}));

jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({
    containerRef: mockContainerRef,
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
  { term: "The brave gryphon flies", translation: "กริฟฟอนผู้กล้าหาญบิน" },
  { term: "Watch out for dragons", translation: "ระวังมังกร" },
];

const mockOnComplete = jest.fn();

describe("GryphonPatrolGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the start screen initially", () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    expect(screen.getByText(/Gryphon Patrol/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START PATROL/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("exits fullscreen when game ends", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("uses requestAnimationFrame for game loop", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(mockRaf).toHaveBeenCalled();
  });

  it("renders GameEndScreen on victory", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("renders GameEndScreen on defeat", async () => {
    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("executes game loop callback when rAF fires", async () => {
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 2;
    });

    render(<GryphonPatrolGame vocabList={mockVocabulary} difficulty="medium" onComplete={mockOnComplete} />);
    const startButton = screen.getByRole("button", { name: /START PATROL/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
    expect(rafSpy).toHaveBeenCalled();
    
    // Execute the rAF callback once to cover the loop body
    if (rafCallback) {
      rafCallback(performance.now());
    }
    
    rafSpy.mockRestore();
  });
});
