import { render, screen } from "@testing-library/react";
import PotionRushGame from "./PotionRushGame";
import { usePotionRushStore } from "@/store/usePotionRushStore";
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

jest.mock("react-konva", () => ({
  Stage: ({ children }: KonvaBaseProps) => (
    <div data-testid="stage">{children}</div>
  ),
  Layer: ({ children }: KonvaBaseProps) => (
    <div data-testid="layer">{children}</div>
  ),
  Group: ({ children }: KonvaBaseProps) => <div>{children}</div>,
  Rect: ({ width, height, fill }: RectProps) => (
    <div data-testid="rect" style={{ width, height, background: fill }} />
  ),
  Circle: () => <div data-testid="circle" />,
  Image: ({ name }: ImageProps) => <div data-testid={name || "image"} />,
  Text: ({ text }: TextProps) => <span>{text}</span>,
}));

jest.mock("@/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get: () => 800,
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get: () => 600,
});

Object.defineProperty(global.Image.prototype, "src", {
  set(src) {
    if (src) {
      setTimeout(() => {
        if (this.onload) this.onload(new Event("load"));
      }, 0);
    }
  },
});

const vocabulary: VocabularyItem[] = [
  { term: "Elixir of Night", translation: "Эликсир ночи" },
  { term: "Potion of Dawn", translation: "Зелье рассвета" },
];

describe("PotionRushGame", () => {
  beforeEach(() => {
    usePotionRushStore.getState().reset();
  });

  it("renders the shared start screen copy initially", async () => {
    render(
      <PotionRushGame
        vocabList={vocabulary}
        difficulty="normal"
        onComplete={jest.fn()}
      />,
    );
    expect(await screen.findByText(/How to Play/i)).toBeInTheDocument();
    expect(screen.getByText(/Vocabulary List/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start brewing/i }),
    ).toBeInTheDocument();
  });
});
