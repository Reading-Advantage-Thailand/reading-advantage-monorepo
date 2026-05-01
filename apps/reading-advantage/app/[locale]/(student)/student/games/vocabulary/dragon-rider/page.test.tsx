import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DragonRiderPage from "./page";
import { useGameStore, DEFAULT_CASTLES } from "@/store/useGameStore";

jest.mock("@/lib/vocabLoader", () => ({
  loadVocabulary: jest.fn().mockResolvedValue([
    { term: "test", translation: "ทดสอบ" },
    { term: "hello", translation: "สวัสดี" },
  ]),
}));

const mockVocab = [
  { term: "test", translation: "ทดสอบ" },
  { term: "hello", translation: "สวัสดี" },
];

jest.mock("@/components/dragon-rider/DragonRiderGame", () => ({
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

    expect(
      screen.getByRole("heading", { name: /dragon rider/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/choose the correct gate/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(useGameStore.getState().vocabulary).toEqual(mockVocab);
    });

    expect(screen.getByTestId("dragon-rider-vocab")).toHaveTextContent(
      mockVocab.length.toString(),
    );
  });

  it("records XP results on completion", () => {
    render(<DragonRiderPage params={Promise.resolve({ locale: "en" })} />);

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    const { lastXp, lastAccuracy } = useGameStore.getState();
    expect(lastXp).toBe(4);
    expect(lastAccuracy).toBe(0.5);
  });
});
