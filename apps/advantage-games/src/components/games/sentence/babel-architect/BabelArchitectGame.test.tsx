import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { BabelArchitectGame } from "./BabelArchitectGame";

const mockEnterFullscreen = jest.fn();
const mockExitFullscreen = jest.fn();
const mockDestroy = jest.fn();

jest.mock("./babelArchitectAdapter", () => ({
  createBabelArchitectGame: jest.fn((options: { onPlaceBlock: (id: string) => void }) => ({
    setState: jest.fn(),
    destroy: mockDestroy,
    __onPlaceBlock: options.onPlaceBlock,
  })),
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

const mockSentences = [
  { term: "Build high", translation: "สร้างให้สูง" },
  { term: "Stone rises", translation: "หินสูงขึ้น" },
];

const singleSentence = [{ term: "Build high", translation: "สร้างให้สูง" }];

function lastAdapterOnPlaceBlock(): ((id: string) => void) | undefined {
  const mock = jest.requireMock("./babelArchitectAdapter") as {
    createBabelArchitectGame: jest.Mock;
  };
  const calls = mock.createBabelArchitectGame.mock.calls;
  if (calls.length === 0) return undefined;
  return calls[calls.length - 1][0].onPlaceBlock as (id: string) => void;
}

describe("BabelArchitectGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the start screen initially", () => {
    render(<BabelArchitectGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Babel's Architect/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Raise the Tower/i }),
    ).toBeInTheDocument();
  });

  it("renders the difficulty selector on the start screen", () => {
    render(<BabelArchitectGame sentences={mockSentences} onComplete={jest.fn()} />);
    expect(screen.getByText(/Tower Height:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tower Height/i)).toBeInTheDocument();
  });

  it("mounts the phaser container and enters fullscreen when started", async () => {
    render(<BabelArchitectGame sentences={mockSentences} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Raise the Tower/i }));

    await waitFor(() => {
      expect(mockEnterFullscreen).toHaveBeenCalled();
    });
    expect(screen.getByText(/Tap blocks in sentence order/i)).toBeInTheDocument();
  });

  it("shows the translation and stability in the DOM HUD during play", async () => {
    render(<BabelArchitectGame sentences={mockSentences} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Raise the Tower/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stability:/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/สร้างให้สูง/)).toBeInTheDocument();
    expect(screen.getByText(/Sentence 1\/2/i)).toBeInTheDocument();
  });

  it("calls onComplete and shows the end screen on victory", async () => {
    const onComplete = jest.fn();
    render(<BabelArchitectGame sentences={singleSentence} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Raise the Tower/i }));

    await waitFor(() => {
      expect(lastAdapterOnPlaceBlock()).toBeDefined();
    });

    const placeBlock = lastAdapterOnPlaceBlock()!;
    const createAdapter = jest.requireMock("./babelArchitectAdapter")
      .createBabelArchitectGame as jest.Mock;
    const initialState = createAdapter.mock.calls[0][0].initialState;
    await act(async () => {
      for (const block of initialState.blocks) {
        placeBlock(block.id);
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Victory/i)).toBeInTheDocument();
    });
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ victory: true, correctAnswers: 2 }),
    );
  });

  it("destroys the phaser adapter when returning to the start screen", async () => {
    render(<BabelArchitectGame sentences={singleSentence} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Raise the Tower/i }));

    await waitFor(() => {
      expect(lastAdapterOnPlaceBlock()).toBeDefined();
    });

    const placeBlock = lastAdapterOnPlaceBlock()!;
    const createAdapter = jest.requireMock("./babelArchitectAdapter")
      .createBabelArchitectGame as jest.Mock;
    const initialState = createAdapter.mock.calls[0][0].initialState;
    await act(async () => {
      for (const block of initialState.blocks) {
        placeBlock(block.id);
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Victory/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Restart/i }));
    expect(mockDestroy).toHaveBeenCalled();
    expect(screen.getByText(/Babel's Architect/i)).toBeInTheDocument();
  });

  it("places blocks via number-key keyboard input during play", async () => {
    const onComplete = jest.fn();
    render(<BabelArchitectGame sentences={singleSentence} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Raise the Tower/i }));

    await waitFor(() => {
      expect(lastAdapterOnPlaceBlock()).toBeDefined();
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: "1" });
      fireEvent.keyDown(window, { key: "2" });
    });

    await waitFor(() => {
      expect(screen.getByText(/Victory/i)).toBeInTheDocument();
    });
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ victory: true, correctAnswers: 2 }),
    );
  });

  it("ignores keyboard input when not playing", () => {
    render(<BabelArchitectGame sentences={mockSentences} onComplete={jest.fn()} />);
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByText(/Babel's Architect/i)).toBeInTheDocument();
  });
});
