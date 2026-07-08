import { render, screen, waitFor } from "@testing-library/react";
import BabelArchitectPage from "./page";

jest.mock("@/store/useGameStore", () => ({
  useGameStore: <T,>(selector: (state: { setLastResult: (xp: number, accuracy: number) => void }) => T): T => {
    const state = {
      setLastResult: jest.fn(),
    };
    return selector(state);
  },
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    data: { user: { xp: 100 } },
    status: "authenticated",
  }),
}));

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
  useScopedI18n: () => (key: string) => key,
}));

jest.mock("@/components/games/sentence/babel-architect/BabelArchitectGame", () => ({
  BabelArchitectGame: () => <div data-testid="babel-architect-game">Game Component</div>,
}));

describe("BabelArchitectPage", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sentences: [{ term: "Build the tower", translation: "สร้างหอคอย" }],
          }),
      }),
    ) as jest.Mock;
  });

  it("renders the page heading after sentences load", async () => {
    render(<BabelArchitectPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Babel's Architect",
      );
    });
  });

  it("renders the game component once sentences are available", async () => {
    render(<BabelArchitectPage />);
    await waitFor(() => {
      expect(screen.getByTestId("babel-architect-game")).toBeInTheDocument();
    });
  });

  it("contains a link back to the games list", async () => {
    render(<BabelArchitectPage />);
    await waitFor(() => {
      const links = screen.getAllByRole("link");
      const backLink = links.find((l) => l.getAttribute("href") === "/student/games");
      expect(backLink).toBeInTheDocument();
    });
  });

  it("handles NO_SENTENCES warning", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ warning: "NO_SENTENCES" }),
      }),
    ) as jest.Mock;

    render(<BabelArchitectPage />);
    await waitFor(() => {
      expect(screen.getByText(/ไม่พบประโยคที่บันทึกไว้/i)).toBeInTheDocument();
    });
  });

  it("handles INSUFFICIENT_SENTENCES warning", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            warning: "INSUFFICIENT_SENTENCES",
            requiredCount: 5,
            currentCount: 2,
          }),
      }),
    ) as jest.Mock;

    render(<BabelArchitectPage />);
    await waitFor(() => {
      expect(screen.getByText(/ประโยคที่บันทึกไว้ไม่เพียงพอ/i)).toBeInTheDocument();
    });
  });
});
