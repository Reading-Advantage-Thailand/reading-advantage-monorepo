import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PotionRushPage from "./page";
import React from "react";

// Mock next/dynamic
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const DynamicComponent = ({ vocabList, difficulty, onComplete }: { vocabList: unknown[]; difficulty: string; onComplete: () => void }) => (
      <div data-testid="potion-rush-game">
        <div data-testid="game-difficulty">{difficulty}</div>
        <button onClick={onComplete}>Complete Game</button>
      </div>
    );
    DynamicComponent.displayName = "PotionRushGame";
    return DynamicComponent;
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
  useScopedI18n: () => (key: string) => key,
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "mock-user-id",
        name: "Player",
        email: "player@example.com",
        xp: 0,
        role: "student",
        level: 1,
      },
    },
    status: "authenticated",
    update: async () => undefined,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe("PotionRushPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        sentences: [
          { term: "The cat sits on the mat", translation: "แมวนั่งบนเสื่อ", id: "1" },
        ],
      }),
    });
  });

  it("renders loading state initially", () => {
    render(<PotionRushPage />);
    expect(screen.getByText(/กำลังโหลด/)).toBeInTheDocument();
  });

  it("renders game after loading", async () => {
    render(<PotionRushPage />);
    await waitFor(() => {
      expect(screen.getByTestId("potion-rush-game")).toBeInTheDocument();
    });
  });

  it("displays difficulty buttons", async () => {
    render(<PotionRushPage />);
    await waitFor(() => {
      expect(screen.getByTestId("potion-rush-game")).toBeInTheDocument();
    });
    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("hard")).toBeInTheDocument();
    expect(screen.getByText("extreme")).toBeInTheDocument();
  });

  it("switches difficulty when clicked", async () => {
    render(<PotionRushPage />);
    await waitFor(() => {
      expect(screen.getByTestId("potion-rush-game")).toBeInTheDocument();
    });
    const hardButton = screen.getByText("hard");
    fireEvent.click(hardButton);
    expect(screen.getByTestId("game-difficulty")).toHaveTextContent("hard");
  });

  it("switches to rankings tab", async () => {
    render(<PotionRushPage />);
    await waitFor(() => {
      expect(screen.getByTestId("potion-rush-game")).toBeInTheDocument();
    });
    const rankingsButton = screen.getByText(/rankings/i);
    fireEvent.click(rankingsButton);
    await waitFor(() => {
      expect(screen.getByText(/leaderboards/i)).toBeInTheDocument();
    });
  });

  it("shows warning when no sentences available", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        warning: "NO_SENTENCES",
      }),
    });
    render(<PotionRushPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /noSentences$/i })).toBeInTheDocument();
    });
  });
});
