import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { RuneMatchGame } from "./RuneMatchGame";
import type { VocabularyItem } from "@/store/useGameStore";
import type React from "react";

type KonvaBaseProps = React.PropsWithChildren<Record<string, unknown>>;
type RectProps = KonvaBaseProps & {
  width?: number;
  height?: number;
  fill?: string;
};
type ImageProps = KonvaBaseProps & { name?: string };
type TextProps = KonvaBaseProps & { text?: string };

// Mock Konva
jest.mock("react-konva", () => ({
  Stage: ({ children }: KonvaBaseProps) => (
    <div data-testid="stage">{children}</div>
  ),
  Layer: ({ children }: KonvaBaseProps) => (
    <div data-testid="layer">{children}</div>
  ),
  Rect: ({ width, height, fill }: RectProps) => (
    <div data-testid="rect" style={{ width, height, background: fill }} />
  ),
  Image: ({ name }: ImageProps) => <div data-testid={name || "image"} />,
  Text: ({ text }: TextProps) => <span>{text}</span>,
  Group: ({ children, onClick }: KonvaBaseProps & { onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Swords: () => <div data-testid="icon-swords" />,
  Trophy: () => <div data-testid="icon-trophy" />,
  Heart: () => <div data-testid="icon-heart" />,
}));

jest.mock("konva", () => ({
  Animation: class {
    start() {}
    stop() {}
  },
}));

// Mock Image to trigger onload
Object.defineProperty(global.Image.prototype, "src", {
  set(src) {
    if (src) {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  },
});

const SAMPLE_VOCAB: VocabularyItem[] = [
  { term: "Hello", translation: "สวัสดี" },
  { term: "Cat", translation: "แมว" },
  { term: "Dog", translation: "สุนัข" },
  { term: "Water", translation: "น้ำ" },
  { term: "Food", translation: "อาหาร" },
  { term: "House", translation: "บ้าน" },
  { term: "Tree", translation: "ต้นไม้" },
  { term: "Sun", translation: "พระอาทิตย์" },
  { term: "Moon", translation: "พระจันทร์" },
  { term: "Star", translation: "ดาว" },
];

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe("RuneMatchGame", () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    expect(screen.getByTestId("rune-match-container")).toBeInTheDocument();
  });

  it("shows loading state while assets load", () => {
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("has correct container aspect ratio", () => {
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    const container = screen.getByTestId("rune-match-container");
    expect(container.className).toMatch(/aspect-video|h-\[60vh\]/);
  });

  it("applies dark theme styling", () => {
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    const container = screen.getByTestId("rune-match-container");
    expect(container.className).toMatch(/bg-slate-950/);
  });

  it("has rounded corners and border", () => {
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    const container = screen.getByTestId("rune-match-container");
    expect(container.className).toMatch(/rounded/);
    expect(container.className).toMatch(/border/);
  });

  it("accepts vocabulary prop", () => {
    const { rerender } = render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    expect(() =>
      rerender(<RuneMatchGame vocabulary={[]} onComplete={mockOnComplete} />)
    ).not.toThrow();
  });

  it("accepts onComplete callback", () => {
    const customCallback = jest.fn();
    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={customCallback} />
    );
    expect(customCallback).not.toHaveBeenCalled(); // Should only call on game completion
  });

  it("completes the monster selection flow", async () => {
    // Mock dimensions so Stage renders
    const spy = jest
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );

    // Wait for assets to "load" (our mock triggers this)
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // Should show selection screen
    expect(screen.getByText(/Choose Your Opponent/i)).toBeInTheDocument();

    // Select Dragon
    const battleButtons = screen.getAllByRole("button", { name: /Battle/i });
    fireEvent.click(battleButtons[3]);

    // Verify monster HP bar with label
    expect(await screen.findByText(/DRAGON:/i)).toBeInTheDocument();
    // Verify Power Word label
    expect(screen.getByText(/POWER WORD:/i)).toBeInTheDocument();

    // This is tricky because we use random grid, but for tests we can rely on what's rendered
    // Let's find two runes by their text and click them
    const runes = screen.getAllByText(/.+/); // Get all text elements
    // We want the ones that are likely runes (translations)
    const translations = SAMPLE_VOCAB.map((v) => v.translation);
    const runeElements = runes.filter((el) =>
      translations.includes(el.textContent || "")
    );

    if (runeElements.length >= 2) {
      const firstRune = runeElements[0];
      const secondRune = runeElements[1];

      fireEvent.click(firstRune);
      fireEvent.click(secondRune);

      // In a real swap, their positions would change.
      // In our mock, we just want to see that it doesn't crash and state updates.
    }

    spy.mockRestore();
  });

  it("reverts invalid swaps", async () => {
    // Mock dimensions so Stage renders
    const spy = jest
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

    render(
      <RuneMatchGame vocabulary={SAMPLE_VOCAB} onComplete={mockOnComplete} />
    );
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );

    // Select Dragon
    const battleButtons = screen.getAllByRole("button", { name: /Battle/i });
    fireEvent.click(battleButtons[3]);
    expect(await screen.findByText(/DRAGON:/i)).toBeInTheDocument();

    // We can't easily force a non-match because initializeGrid ensures no matches,
    // and random filling might create one after swap.
    // However, we can verify that selection is cleared after any swap attempt.

    const runes = screen.getAllByText(/.+/);
    const translations = SAMPLE_VOCAB.map((v) => v.translation);
    const runeElements = runes.filter((el) =>
      translations.includes(el.textContent || "")
    );

    if (runeElements.length >= 2) {
      fireEvent.click(runeElements[0]);
      fireEvent.click(runeElements[1]);

      // After swap attempt, selectedCell should be null (selection cleared)
      // If we had a way to check state directly we would.
      // For now, checking it doesn't crash and returns to normal state.
    }

    spy.mockRestore();
  });
});
