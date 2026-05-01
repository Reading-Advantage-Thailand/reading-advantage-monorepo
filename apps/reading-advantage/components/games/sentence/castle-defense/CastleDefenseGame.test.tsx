import { render, screen, fireEvent, act } from "@testing-library/react";
import { CastleDefenseGame } from "./CastleDefenseGame";
import { VocabularyItem } from "@/store/useGameStore";
import * as castleDefense from "@/lib/games/castleDefense";
import type React from "react";

jest.mock("@/lib/castleDefense", () => {
  const actual = jest.requireActual("@/lib/castleDefense");
  return {
    ...actual,
    createCastleDefenseState: jest.fn(actual.createCastleDefenseState),
  };
});

const actualCastleDefense = jest.requireActual(
  "@/lib/castleDefense",
) as typeof castleDefense;

type KonvaBaseProps = React.PropsWithChildren<Record<string, unknown>>;
type CircleProps = KonvaBaseProps & {
  fill?: string;
  stroke?: string;
  radius?: number;
};
type TextProps = KonvaBaseProps & { text?: string; offsetX?: number };

jest.mock("react-konva", () => ({
  Stage: ({ children }: KonvaBaseProps) => (
    <div data-testid="stage">{children}</div>
  ),
  Layer: ({ children }: KonvaBaseProps) => (
    <div data-testid="layer">{children}</div>
  ),
  Circle: ({ fill, stroke, radius }: CircleProps) => (
    <div
      data-testid="circle"
      data-fill={fill}
      data-stroke={stroke}
      data-radius={radius}
    />
  ),
  Rect: () => <div data-testid="rect" />,
  Image: () => <div data-testid="image" />,
  Text: ({ text, offsetX }: TextProps) => (
    <span data-offset-x={offsetX}>{text}</span>
  ),
  Group: ({ children }: KonvaBaseProps) => <div>{children}</div>,
}));

jest.mock("@/hooks/useDirectionalInput", () => ({
  useDirectionalInput: () => ({
    input: { dx: 0, dy: 0, cast: false },
    setVirtualInput: jest.fn(),
    consumeCast: jest.fn(),
  }),
}));

global.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    this.callback(
      [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
};

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
  { term: "hello world", translation: "hola mundo" },
  { term: "good morning", translation: "buenos dias" },
];

describe("CastleDefenseGame", () => {
  const startGame = async () => {
    render(
      <CastleDefenseGame vocabulary={vocabulary} onComplete={jest.fn()} />,
    );
    const startButton = await screen.findByRole("button", {});
    fireEvent.click(startButton);
  };

  it("renders the start screen initially", async () => {
    render(
      <CastleDefenseGame vocabulary={vocabulary} onComplete={jest.fn()} />,
    );
    expect(
      await screen.findByRole("heading", { name: /castle defense/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/how to play/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start defense/i }),
    ).toBeInTheDocument();
  });

  it("renders the game stage after starting", async () => {
    await startGame();
    expect(await screen.findByTestId("stage")).toBeInTheDocument();
  });

  it("renders word orbs as white circles", async () => {
    jest.useFakeTimers();

    render(
      <CastleDefenseGame vocabulary={vocabulary} onComplete={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    const startButton = screen.getByRole("button", { name: /start defense/i });
    fireEvent.click(startButton);

    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    const circles = screen.getAllByTestId("circle");
    const whiteCircles = circles.filter(
      (circle) => circle.getAttribute("data-fill") === "white",
    );
    expect(whiteCircles.length).toBeGreaterThan(0);

    jest.useRealTimers();
  });

  it("centers word text using the orb radius offset", async () => {
    jest.useFakeTimers();

    render(
      <CastleDefenseGame vocabulary={vocabulary} onComplete={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    const startButton = screen.getByRole("button", { name: /start defense/i });
    fireEvent.click(startButton);

    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    const wordTexts = screen.getAllByText((_, element) => {
      return element?.getAttribute?.("data-offset-x") === "25";
    });
    expect(wordTexts.length).toBeGreaterThan(0);

    jest.useRealTimers();
  });

  it("shows the Thai sentence in the HUD", async () => {
    const thaiVocabulary: VocabularyItem[] = [
      { term: "The cat sits", translation: "แมวนั่ง" },
    ];

    render(
      <CastleDefenseGame vocabulary={thaiVocabulary} onComplete={jest.fn()} />,
    );
    const startButton = await screen.findByRole("button", {
      name: /start defense/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByText("แมวนั่ง")).toBeInTheDocument();
    expect(screen.queryByText(/find target/i)).not.toBeInTheDocument();
  });

  it("shows sentence progress and wave info", async () => {
    const progressVocabulary: VocabularyItem[] = [
      { term: "The cat sits", translation: "แมวนั่ง" },
    ];
    const createMock = castleDefense.createCastleDefenseState as jest.Mock;
    createMock.mockImplementation((vocab) => {
      const baseState = actualCastleDefense.createCastleDefenseState(vocab);
      return {
        ...baseState,
        currentSentenceThai: "แมวนั่ง",
        sentenceWords: ["The", "cat", "sits"],
        collectedWordIndices: [0, 1],
        wave: 2,
        enemiesKilledThisWave: 3,
        totalEnemiesThisWave: 8,
      };
    });

    try {
      render(
        <CastleDefenseGame
          vocabulary={progressVocabulary}
          onComplete={jest.fn()}
        />,
      );
      const startButton = await screen.findByRole("button", {
        name: /start defense/i,
      });
      fireEvent.click(startButton);

      expect(await screen.findByText(/progress/i)).toBeInTheDocument();
      expect(screen.getAllByText("The").length).toBeGreaterThan(0);
      expect(screen.getAllByText("cat").length).toBeGreaterThan(0);
      expect(screen.getAllByText("___").length).toBeGreaterThan(0);
      expect(screen.getByText(/Wave 2\/6 - Enemies: 3\/8/)).toBeInTheDocument();
    } finally {
      createMock.mockImplementation(
        actualCastleDefense.createCastleDefenseState,
      );
    }
  });

  it("shows a sentence complete message when ready to build", async () => {
    const readyVocabulary: VocabularyItem[] = [
      { term: "The cat sits", translation: "แมวนั่ง" },
    ];
    const createMock = castleDefense.createCastleDefenseState as jest.Mock;
    createMock.mockImplementation((vocab) => {
      const baseState = actualCastleDefense.createCastleDefenseState(vocab);
      return {
        ...baseState,
        sentenceCompleted: true,
      };
    });

    try {
      render(
        <CastleDefenseGame
          vocabulary={readyVocabulary}
          onComplete={jest.fn()}
        />,
      );
      const startButton = await screen.findByRole("button", {
        name: /start defense/i,
      });
      fireEvent.click(startButton);

      expect(
        await screen.findByText(/sentence complete - build tower!/i),
      ).toBeInTheDocument();
    } finally {
      createMock.mockImplementation(
        actualCastleDefense.createCastleDefenseState,
      );
    }
  });

  it("does not render the inventory HUD", async () => {
    const inventoryVocabulary: VocabularyItem[] = [
      { term: "The cat sits", translation: "แมวนั่ง" },
    ];

    render(
      <CastleDefenseGame
        vocabulary={inventoryVocabulary}
        onComplete={jest.fn()}
      />,
    );
    const startButton = await screen.findByRole("button", {
      name: /start defense/i,
    });
    fireEvent.click(startButton);

    expect(screen.queryByText(/empty handed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inventory/i)).not.toBeInTheDocument();
  });

  it("renders the virtual d-pad", async () => {
    const dpadVocabulary: VocabularyItem[] = [
      { term: "The cat sits", translation: "แมวนั่ง" },
    ];

    render(
      <CastleDefenseGame vocabulary={dpadVocabulary} onComplete={jest.fn()} />,
    );
    const startButton = await screen.findByRole("button", {
      name: /start defense/i,
    });
    fireEvent.click(startButton);

    expect(await screen.findByTestId("virtual-dpad")).toBeInTheDocument();
  });
});
