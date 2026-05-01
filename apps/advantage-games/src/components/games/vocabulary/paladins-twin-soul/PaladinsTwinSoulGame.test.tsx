import { render, screen, fireEvent } from "@testing-library/react";
import { PaladinsTwinSoulGame } from "./PaladinsTwinSoulGame";
import { VocabularyItem } from "@/lib/games/paladinsTwinSoul";
import React from "react";

// Mock hooks
jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: jest.fn(() => ({
    input: { dx: 0, dy: 0 },
    consumeCast: jest.fn(),
    setVirtualInput: jest.fn(),
  })),
}));

jest.mock("@/hooks/useSound", () => ({
  useSound: jest.fn(() => ({ playSound: jest.fn() })),
}));

jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: jest.fn(() => ({
    containerRef: { current: null },
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
  })),
}));

jest.mock("@/hooks/useAccessibilitySettings", () => ({
  useAccessibilitySettings: jest.fn(() => ({
    getEffectiveTextSize: jest.fn((size: number) => size),
    getEffectiveTouchTarget: jest.fn((size: number) => size),
  })),
}));

jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: Record<string, unknown>) => <div data-testid="konva-rect" {...props} />,
  Text: (props: Record<string, unknown>) => <div data-testid="konva-text" {...props} />,
  Circle: (props: Record<string, unknown>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
  Line: (props: Record<string, unknown>) => <div data-testid="konva-line" {...props} />,
}));

describe("PaladinsTwinSoulGame", () => {
  const vocabulary: VocabularyItem[] = [
    { term: "Run", translation: "Correr" },
    { term: "Jump", translation: "Saltar" },
  ];
  
  it("renders the start screen initially", () => {
    render(<PaladinsTwinSoulGame vocabulary={vocabulary} onComplete={jest.fn()} />);
    expect(screen.getByText(/Paladin's Twin-Soul/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Begin Defense/i })).toBeInTheDocument();
  });

  it("transitions to playing phase when start is clicked", async () => {
    render(<PaladinsTwinSoulGame vocabulary={vocabulary} onComplete={jest.fn()} />);
    const startButton = screen.getByRole("button", { name: /Begin Defense/i });
    fireEvent.click(startButton);
    
    expect(await screen.findByTestId("konva-stage")).toBeInTheDocument();
  });

  it("renders the player and enemies", async () => {
    render(<PaladinsTwinSoulGame vocabulary={vocabulary} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Begin Defense/i }));
    
    expect(await screen.findAllByTestId("konva-rect")).toHaveLength(27);
  });
});
