import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AlchemistsSynthesisPage from "./page";

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "test-user",
        name: "Test User",
        email: "test@example.com",
        xp: 100,
        role: "student",
        level: 1,
      },
    },
    status: "authenticated",
  }),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
  useCurrentLocale: () => "en",
}));

jest.mock(
  "@/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame",
  () => ({
    AlchemistsSynthesisGame: ({ vocabulary }: { vocabulary: unknown[] }) => (
      <div data-testid="alchemists-synthesis-game">
        Game Component - Vocabulary count: {vocabulary.length}
      </div>
    ),
  })
);

global.fetch = jest.fn();

describe("AlchemistsSynthesisPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the page with header", () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        vocabulary: [
          { term: "Run", translation: "Correr" },
          { term: "Jump", translation: "Saltar" },
        ],
      }),
    });

    render(<AlchemistsSynthesisPage />);

    expect(screen.getByText("pages.student.gamesPage.games.alchemistsSynthesis.title")).toBeInTheDocument();
  });

  it("should fetch vocabulary on mount", async () => {
    const mockVocabulary = [
      { term: "Run", translation: "Correr" },
      { term: "Jump", translation: "Saltar" },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        vocabulary: mockVocabulary,
      }),
    });

    render(<AlchemistsSynthesisPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/games/alchemists-synthesis/vocabulary"
      );
    });
  });

  it("should use fallback vocabulary when fetch fails", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<AlchemistsSynthesisPage />);

    await waitFor(() => {
      expect(screen.getByTestId("alchemists-synthesis-game")).toBeInTheDocument();
    });
  });

  it("should render back button", () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        vocabulary: [],
      }),
    });

    render(<AlchemistsSynthesisPage />);

    expect(screen.getByText("pages.student.gamesPage.backToGames")).toBeInTheDocument();
  });
});
