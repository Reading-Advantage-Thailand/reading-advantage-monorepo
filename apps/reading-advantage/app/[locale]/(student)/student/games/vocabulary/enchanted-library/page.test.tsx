import { render, screen, waitFor } from "@testing-library/react";
import EnchantedLibraryPage from "./page";
import React from "react";

// Mock the dynamic import
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const MockedComponent = () => (
      <div data-testid="enchanted-library-game">
        Mocked EnchantedLibraryGame
      </div>
    );
    MockedComponent.displayName = "EnchantedLibraryGame";
    return MockedComponent;
  },
}));

jest.mock("@/components/header", () => ({
  Header: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading: string;
  }) => (
    <div>
      <h1>{heading}</h1>
      {children}
    </div>
  ),
}));

// Mock useGameStore
const mockSetVocabulary = jest.fn();
jest.mock("@/store/useGameStore", () => ({
  useGameStore: () => ({
    vocabulary: [],
    setVocabulary: mockSetVocabulary,
  }),
}));

describe("EnchantedLibraryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ vocabulary: [] }),
      }),
    ) as jest.Mock;
  });

  it("renders the page title and description", async () => {
    const params = Promise.resolve({ locale: "en" });
    render(<EnchantedLibraryPage params={params} />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Enchanted Library",
    );
    expect(screen.getByText(/collect magic books/i)).toBeInTheDocument();
  });

  it("renders the game container", async () => {
    const params = Promise.resolve({ locale: "en" });
    render(<EnchantedLibraryPage params={params} />);
    expect(
      await screen.findByTestId("enchanted-library-game"),
    ).toBeInTheDocument();
  });

  it("contains a link back to games", async () => {
    const params = Promise.resolve({ locale: "en" });
    render(<EnchantedLibraryPage params={params} />);
    const link = await screen.findByRole("link", { name: /back to games/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/student/games");
  });

  it("loads vocabulary from API", async () => {
    const mockVocab = [{ term: "test", translation: "ทดสอบ" }];
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ vocabulary: mockVocab }),
      }),
    ) as jest.Mock;

    const params = Promise.resolve({ locale: "en" });
    render(<EnchantedLibraryPage params={params} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/games/enchanted-library/vocabulary"),
      );
    });
  });
});
