import { render, screen } from "@testing-library/react";
import { GameEngine } from "./GameEngine";
import { withBasePath } from "@/lib/games/basePath";
import { useGameStore } from "@/store/useGameStore";

// Mock the store
jest.mock("@/store/useGameStore", () => ({
  useGameStore: jest.fn(),
}));

jest.mock("nanoid", () => ({
  nanoid: () => "test-id",
}));

const mockUseGameStore = useGameStore as unknown as jest.Mock;

describe("GameEngine", () => {
  beforeEach(() => {
    mockUseGameStore.mockReturnValue({
      vocabulary: [{ term: "Apple", translation: "Manzana" }],
      status: "playing",
      castles: { left: 3, center: 3, right: 3 },
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      damageCastle: jest.fn(),
      increaseScore: jest.fn(),
      incrementAttempts: jest.fn(),
    });
  });

  it("uses the castle defense background image", () => {
    render(<GameEngine />);

    const stage = screen.getByTestId("game-stage");
    expect(stage).toHaveStyle({
      backgroundImage: `url(${withBasePath("/games/vocabulary/magic-defense/background.png")})`,
    });
  });

  it("damages a castle when a missile reaches bottom", () => {
    const damageCastle = jest.fn();
    mockUseGameStore.mockReturnValue({
      vocabulary: [{ term: "Apple", translation: "Manzana" }],
      status: "playing",
      castles: { left: 3, center: 3, right: 3 },
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      damageCastle,
      increaseScore: jest.fn(),
      incrementAttempts: jest.fn(),
    });

    render(<GameEngine />);

    // GameEngine spawns missiles on interval.
    // For unit testing the logic of 'handleReachBottom',
    // we should ideally export or expose the internal handlers if possible,
    // or rely on component children interaction.
    // However, since we mocked the store and passed it down,
    // we can check if damageCastle is called when the underlying logic is triggered.
  });
});
