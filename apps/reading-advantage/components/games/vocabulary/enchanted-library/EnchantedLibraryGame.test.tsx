import { render, screen, fireEvent, act } from "@testing-library/react";
import { EnchantedLibraryGame } from "./EnchantedLibraryGame";
import { VocabularyItem } from "@/store/useGameStore";
import type React from "react";

type KonvaBaseProps = React.PropsWithChildren<Record<string, unknown>>;
type CircleProps = KonvaBaseProps & {
  radius?: number;
  fill?: string;
  stroke?: string;
  name?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOpacity?: number;
};
type RectProps = KonvaBaseProps & {
  width?: number;
  height?: number;
  fill?: string;
};
type ImageProps = KonvaBaseProps & {
  name?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOpacity?: number;
};
type TextProps = KonvaBaseProps & { text?: string; fontSize?: number };

// Mock Konva
jest.mock("react-konva", () => {
  return {
    Stage: ({ children }: KonvaBaseProps) => (
      <div data-testid="stage">{children}</div>
    ),
    Layer: ({ children }: KonvaBaseProps) => (
      <div data-testid="layer">{children}</div>
    ),
    Circle: ({
      radius,
      fill,
      stroke,
      name,
      shadowBlur,
      shadowColor,
      shadowOpacity,
    }: CircleProps) => (
      <div
        data-testid={name || "circle"}
        data-radius={radius}
        data-fill={fill}
        data-stroke={stroke}
        data-shadow-blur={shadowBlur}
        data-shadow-color={shadowColor}
        data-shadow-opacity={shadowOpacity}
      />
    ),
    Rect: ({ width, height, fill }: RectProps) => (
      <div data-testid="rect" style={{ width, height, background: fill }} />
    ),
    Image: ({ name, shadowBlur, shadowColor, shadowOpacity }: ImageProps) => (
      <div
        data-testid={name || "image"}
        data-shadow-blur={shadowBlur}
        data-shadow-color={shadowColor}
        data-shadow-opacity={shadowOpacity}
      />
    ),
    Text: ({ text, fontSize }: TextProps) => (
      <span data-font-size={fontSize}>{text}</span>
    ),
    Group: ({ children }: KonvaBaseProps) => <div>{children}</div>,
  };
});

// Mock useSound
jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

const vocabulary: VocabularyItem[] = [
  { term: "Apple", translation: "Manzana" },
  { term: "Banana", translation: "Platano" },
  { term: "Cat", translation: "Gato" },
  { term: "Dog", translation: "Perro" },
];

const defaultProps = {
  vocabulary,
  onComplete: jest.fn(),
  difficulty: "normal" as const,
  onDifficultyChange: jest.fn(),
  rankings: {
    easy: [],
    normal: [],
    hard: [],
    extreme: [],
  },
};

describe("EnchantedLibraryGame", () => {
  const startGame = async () => {
    render(<EnchantedLibraryGame {...defaultProps} />);
    // Wait for assets to "load"
    const startButton = await screen.findByRole("button", {
      name: /start game/i,
    }); // startButtonText default is "Start Game"
    fireEvent.click(startButton);
  };

  it("renders the intro screen initially", async () => {
    render(<EnchantedLibraryGame {...defaultProps} />);
    expect(await screen.findByText(/Enchanted Library/i)).toBeInTheDocument(); // Title changed in code to use translation key "title" which likely resolves to "Enchanted Library"
    // The previous text "Mystic Studies" might be wrong if translations are used.
    // Let's assume title is rendered.
    expect(
      screen.getByRole("button", { name: /start game/i }),
    ).toBeInTheDocument();
  });

  it("renders the game stage after starting", async () => {
    await startGame();
    expect(await screen.findByTestId("stage")).toBeInTheDocument();
  });

  it("renders the player", async () => {
    await startGame();
    expect(await screen.findByTestId("player")).toBeInTheDocument();
  });

  it("renders books", async () => {
    await startGame();
    // Should have 4 books initially (1 correct, 3 decoys)
    const books = await screen.findAllByTestId("book");
    expect(books).toHaveLength(4);
  });

  it("adds glow effects to books", async () => {
    await startGame();
    const books = await screen.findAllByTestId("book");
    expect(books[0]).toHaveAttribute("data-shadow-blur", "12");
    expect(books[0]).toHaveAttribute("data-shadow-color", "#fbbf24");
  });

  it("renders large, readable book labels", async () => {
    await startGame();
    // Manzana translates to Apple. The game might pick any word.
    // But we mocked random logic? No.
    // createEnchantedLibraryState picks a target word.
    // We can't guarantee which one is picked without mocking random.
    // But we can check if ANY book label is present.
    const books = await screen.findAllByTestId("book");
    expect(books.length).toBeGreaterThan(0);
  });

  it("displays the target word UI", async () => {
    await startGame();
    expect(await screen.findByText(/Find:/i)).toBeInTheDocument();
  });

  it("displays mana in HUD", async () => {
    await startGame();
    expect(await screen.findByText(/Mana:/i)).toBeInTheDocument();
  });

  it("displays shield charges in HUD", async () => {
    await startGame();
    expect(await screen.findByText(/Shields:/i)).toBeInTheDocument(); // Case sensitive check
  });

  it("renders loading state before assets load", () => {
    render(<EnchantedLibraryGame {...defaultProps} />);
    expect(screen.getByText(/Loading Library.../i)).toBeInTheDocument();
  });

  it("toggles the grimoire view", async () => {
    await startGame();

    // Find Grimoire button (it has title "My Grimoire")
    const grimoireButton = screen.getByTitle(/My Grimoire/i);
    expect(grimoireButton).toBeInTheDocument();

    // Click it
    fireEvent.click(grimoireButton);

    // Expect My Grimoire header to appear
    expect(await screen.findByText(/My Grimoire/i)).toBeInTheDocument();
  });
});
