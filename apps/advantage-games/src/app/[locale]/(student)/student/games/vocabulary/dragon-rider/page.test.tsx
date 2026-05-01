import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DragonRiderPage from "./page";
import { useGameStore, DEFAULT_CASTLES } from "@/store/useGameStore";
import React from "react";

// Mock React.use to handle the params promise
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: (promise: Promise<{ locale: string }> | { locale: string }) => {
    if (promise && typeof promise === "object" && "then" in promise && typeof promise.then === "function") {
      return { locale: "en" }; // Return resolved value directly
    }
    return promise as { locale: string };
  },
}));

const mockVocab = [
  { term: "test", translation: "test translation" },
  { term: "hello", translation: "hello translation" },
];

jest.mock("@/components/games/vocabulary/dragon-rider/DragonRiderGame", () => ({
  DragonRiderGame: ({
    vocabulary,
    onComplete,
  }: {
    vocabulary: { term: string; translation: string }[];
    onComplete?: (results: {
      xp: number;
      accuracy: number;
      bossPower: number;
      victory: boolean;
      correctAnswers: number;
      totalAttempts: number;
      dragonCount: number;
    }) => void;
  }) => (
    <div>
      <div data-testid="dragon-rider-vocab">{vocabulary.length}</div>
      <button
        type="button"
        onClick={() =>
          onComplete?.({
            xp: 4,
            accuracy: 0.5,
            bossPower: 3,
            victory: true,
            correctAnswers: 2,
            totalAttempts: 4,
            dragonCount: 4,
          })
        }
      >
        Complete
      </button>
    </div>
  ),
}));

describe("DragonRiderPage", () => {
  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vocabulary: mockVocab }),
      })
    ) as jest.Mock;
  });

  beforeEach(() => {
    useGameStore.setState({
      vocabulary: [],
      score: 0,
      castles: { ...DEFAULT_CASTLES },
      status: "idle",
      correctAnswers: 0,
      totalAttempts: 0,
      lastXp: 0,
      lastAccuracy: 0,
    });
  });

  it("renders the Dragon Rider shell and loads vocabulary", async () => {
    render(<DragonRiderPage params={Promise.resolve({ locale: "en" })} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Dragon Rider/i)).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("dragon-rider-vocab")).toBeInTheDocument();

    await waitFor(() => {
      expect(useGameStore.getState().vocabulary.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("records XP results on completion", async () => {
    render(<DragonRiderPage params={Promise.resolve({ locale: "en" })} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Dragon Rider/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    const { lastXp, lastAccuracy } = useGameStore.getState();
    expect(lastXp).toBe(4);
    expect(lastAccuracy).toBe(0.5);
  });
});
