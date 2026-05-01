import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlchemistsSynthesisGame } from "./AlchemistsSynthesisGame";
import type { VocabularyItem } from "@/store/useGameStore";

const mockVocabulary: VocabularyItem[] = [
  { term: "Run", translation: "Correr" },
  { term: "Jump", translation: "Saltar" },
  { term: "Eat", translation: "Comer" },
  { term: "Sleep", translation: "Dormir" },
  { term: "Play", translation: "Jugar" },
];

const mockOnComplete = jest.fn();

jest.mock("@/hooks/useGameFullscreen", () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
  }),
}));

jest.mock("@/hooks/useAccessibilitySettings", () => ({
  useAccessibilitySettings: () => ({
    getEffectiveTextSize: (size: number) => size,
    getEffectiveTouchTarget: (size: number) => size,
  }),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useCurrentLocale: () => "en",
}));

jest.mock("react-konva", () => ({
  Stage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-stage">{children}</div>
  ),
  Layer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Text: ({ text }: { text: string }) => <span data-testid="konva-text">{text}</span>,
  Group: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="konva-group" onClick={onClick}>{children}</div>
  ),
  Rect: () => <div data-testid="konva-rect" />,
  Image: () => <div data-testid="konva-image" />,
}));

describe("AlchemistsSynthesisGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render start screen initially", () => {
    render(
      <AlchemistsSynthesisGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("should start game when start button is clicked", () => {
    render(
      <AlchemistsSynthesisGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    );

    const startButton = screen.getByText("Start Game");
    fireEvent.click(startButton);

    expect(screen.getByTestId("konva-stage")).toBeInTheDocument();
  });

  it("should render game canvas when playing", () => {
    render(
      <AlchemistsSynthesisGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    );

    const startButton = screen.getByText("Start Game");
    fireEvent.click(startButton);

    expect(screen.getByTestId("konva-stage")).toBeInTheDocument();
    expect(screen.getByTestId("konva-layer")).toBeInTheDocument();
  });

  it("should handle option selection", () => {
    render(
      <AlchemistsSynthesisGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    );

    const startButton = screen.getByText("Start Game");
    fireEvent.click(startButton);

    const groups = screen.getAllByTestId("konva-group");
    expect(groups.length).toBeGreaterThan(0);

    if (groups[0]) {
      fireEvent.click(groups[0]);
    }
  });
});
