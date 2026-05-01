import { render, screen, fireEvent, act } from "@testing-library/react";
import { WizardZombieGame } from "./WizardZombieGame";
import { VocabularyItem } from "@/store/useGameStore";
import type React from "react";

type KonvaBaseProps = React.PropsWithChildren<Record<string, unknown>>;
type CircleProps = KonvaBaseProps & {
  radius?: number;
  fill?: string;
  name?: string;
};
type RectProps = KonvaBaseProps & {
  width?: number;
  height?: number;
  fill?: string;
};
type ImageProps = KonvaBaseProps & { name?: string };
type TextProps = KonvaBaseProps & { text?: string };

// Mock Konva
jest.mock("react-konva", () => {
  return {
    Stage: ({ children }: KonvaBaseProps) => (
      <div data-testid="stage">{children}</div>
    ),
    Layer: ({ children }: KonvaBaseProps) => (
      <div data-testid="layer">{children}</div>
    ),
    Circle: ({ radius, fill, name }: CircleProps) => (
      <div
        data-testid={name || "circle"}
        data-radius={radius}
        data-fill={fill}
      />
    ),
    Rect: ({ width, height, fill }: RectProps) => (
      <div data-testid="rect" style={{ width, height, background: fill }} />
    ),
    Image: ({ name }: ImageProps) => <div data-testid={name || "image"} />,
    Text: ({ text }: TextProps) => <span>{text}</span>,
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

describe("WizardZombieGame", () => {
  const startGame = async () => {
    render(
      <WizardZombieGame
        vocabulary={vocabulary}
        onComplete={jest.fn()}
        difficulty="normal"
      />,
    );
    // Wait for assets to "load"
    const startButton = await screen.findByRole("button", {
      name: /start survival/i,
    });
    fireEvent.click(startButton);
  };

  it("renders the briefing screen initially", async () => {
    render(
      <WizardZombieGame
        vocabulary={vocabulary}
        onComplete={jest.fn()}
        difficulty="normal"
      />,
    );
    expect(await screen.findByText(/Arcane Survival/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start survival/i }),
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

  it("renders orbs", async () => {
    await startGame();
    // Should have 4 orbs initially (1 correct, 3 decoys)
    const orbs = await screen.findAllByTestId("orb");
    expect(orbs).toHaveLength(4);
  });

  it("displays the target word UI", async () => {
    await startGame();
    expect(await screen.findByText(/Find:/i)).toBeInTheDocument();
  });
});
