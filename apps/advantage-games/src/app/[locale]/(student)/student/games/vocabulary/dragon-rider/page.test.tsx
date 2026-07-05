import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DragonRiderPage from "./page";
import { useGameStore, DEFAULT_CASTLES } from "@/store/useGameStore";
import React from "react";

/**
 * Phase 5 — Group 5D: dragon-rider page navigation contract.
 *
 * The page must drop hardcoded `/en/...` hrefs and call the host-injected
 * `onNavigate` callback instead of performing SPA navigation.
 *
 * Provenance: `phase-5-decisions.md` Decision 5.1.
 */

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: (promise: Promise<{ locale: string }> | { locale: string }) => {
    if (promise && typeof promise === "object" && "then" in promise && typeof promise.then === "function") {
      return { locale: "en" };
    }
    return promise as { locale: string };
  },
}));

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

const mockVocab = [
  { term: "test", translation: "test translation" },
  { term: "hello", translation: "hello translation" },
];

describe("DragonRiderPage — Phase 5 embeddable navigation", () => {
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

  it("has no hardcoded /en/ hrefs (D-07)", async () => {
    render(<DragonRiderPage params={Promise.resolve({ locale: "en" })} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Dragon Rider/i)).not.toBeInTheDocument();
    });

    const links = screen.queryAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href");
      expect(href).not.toMatch(/^\/en\//);
    }
  });

  it("calls onNavigate('games') when the back-to-menu control is clicked (D-09)", async () => {
    const onNavigate = jest.fn();
    render(
      <DragonRiderPage
        params={Promise.resolve({ locale: "en" })}
        {...({ onNavigate } as any)}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading Dragon Rider/i)).not.toBeInTheDocument();
    });

    const backButton = screen.getByRole("link", { name: /Back to Menu/i });
    fireEvent.click(backButton);

    // onNavigate call count: 1 (back-to-menu control)
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("games");
  });

  it("positive control: the back-to-menu control is still rendered", async () => {
    render(<DragonRiderPage params={Promise.resolve({ locale: "en" })} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Dragon Rider/i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Back to Menu/i })).toBeInTheDocument();
  });
});
