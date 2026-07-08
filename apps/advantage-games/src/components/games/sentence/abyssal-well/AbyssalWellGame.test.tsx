import { render, screen, fireEvent } from "@testing-library/react";
import { AbyssalWellGame } from "./AbyssalWellGame";
import React from "react";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();

// Mock the R3F canvas: rendering a real WebGL canvas is impossible in jsdom.
// The scene itself is covered by AbyssalWellScene.test.tsx via
// @react-three/test-renderer; here we only assert the game shell.
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas" data-children={React.Children.count(children)} />
  ),
}));

jest.mock("./AbyssalWellScene", () => ({
  AbyssalWellScene: () => null,
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

  it("transitions to playing phase with an R3F canvas when start is clicked", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("r3f-canvas")).toBeInTheDocument();
  });

  it("shows the sentence translation in the DOM HUD during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Enter the Well/i }));

    await screen.findByTestId("r3f-canvas");
    expect(
      screen.getByText(/Le chat est assis|Un chien court/)
    ).toBeInTheDocument();
  });

  it("shows the target word and lives in the DOM HUD during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Enter the Well/i }));

    await screen.findByTestId("r3f-canvas");
    expect(screen.getByText(/Target:/i)).toBeInTheDocument();
    expect(screen.getByText(/❤️/)).toBeInTheDocument();
  });

  it("enters fullscreen when game starts", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("r3f-canvas")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });

  it("renders difficulty selector on start screen", () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Well Depth:/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy Type:/i)).toBeInTheDocument();
  });

  it("handles keyboard input during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);

    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("r3f-canvas")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "d" });
  });

  it("ignores keyboard input when not playing", () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: " " });
  });

  it("handles touch input during gameplay", async () => {
    render(<AbyssalWellGame sentences={mockSentences} onComplete={jest.fn()} />);

    const startButton = screen.getByRole("button", { name: /Enter the Well/i });
    fireEvent.click(startButton);

    const canvas = await screen.findByTestId("r3f-canvas");
    const gameContainer = canvas.parentElement;
    if (gameContainer) {
      fireEvent.touchStart(gameContainer, {
        touches: [{ clientX: 50, clientY: 300 }],
      });
      fireEvent.touchStart(gameContainer, {
        touches: [{ clientX: 350, clientY: 300 }],
      });
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

    expect(await screen.findByTestId("r3f-canvas")).toBeInTheDocument();
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });
});
