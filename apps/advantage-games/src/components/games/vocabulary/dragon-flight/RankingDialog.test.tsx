import { render, screen, waitFor } from "@testing-library/react";
import { RankingDialog } from "./RankingDialog";

describe("RankingDialog", () => {
  const mockRankings = {
    easy: [
      { userId: "1", name: "Alice", image: null, xp: 1000 },
      { userId: "2", name: "Bob", image: null, xp: 800 },
      { userId: "3", name: "Charlie", image: null, xp: 600 },
    ],
    normal: [
      { userId: "1", name: "Alice", image: null, xp: 2000 },
    ],
    hard: [],
    extreme: [],
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading state when opened", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <RankingDialog open={true} onOpenChange={jest.fn()} apiEndpoint="/api/ranking" />
    );

    expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
    // Loading skeletons are divs with animate-pulse class
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders rankings after loading", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ rankings: mockRankings }),
    });

    render(
      <RankingDialog open={true} onOpenChange={jest.fn()} apiEndpoint="/api/ranking" />
    );

    const alice = await screen.findByText("Alice", {}, { timeout: 3000 });
    expect(alice).toBeInTheDocument();

    // Alice appears in both easy and normal tabs
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/XP/)).toBeInTheDocument();
  });

  it("renders empty state when no rankings", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ rankings: {} }),
    });

    render(
      <RankingDialog
        open={true}
        onOpenChange={jest.fn()}
        apiEndpoint="/api/ranking"
        emptyStateMessage="No champions yet"
        emptyStateSubMessage="Be the first"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No champions yet")).toBeInTheDocument();
    });

    expect(screen.getByText("Be the first")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(
      <RankingDialog open={true} onOpenChange={jest.fn()} apiEndpoint="/api/ranking" />
    );

    await waitFor(() => {
      expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
    });

    // After error, loading should stop (no animate-pulse elements)
    await waitFor(() => {
      expect(document.querySelectorAll(".animate-pulse").length).toBe(0);
    });
  });

  it("does not fetch when closed", () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    render(
      <RankingDialog open={false} onOpenChange={jest.fn()} apiEndpoint="/api/ranking" />
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders with custom title and role label", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ rankings: mockRankings }),
    });

    render(
      <RankingDialog
        open={true}
        onOpenChange={jest.fn()}
        apiEndpoint="/api/ranking"
        title="Custom Title"
        roleLabel="Dragon Rider"
      />
    );

    const title = await screen.findByText("Custom Title", {}, { timeout: 3000 });
    expect(title).toBeInTheDocument();

    // Alice should be visible in the rankings
    const alice = await screen.findByText("Alice", {}, { timeout: 3000 });
    expect(alice).toBeInTheDocument();
  });

  it("renders different difficulty tabs", () => {
    render(
      <RankingDialog
        open={true}
        onOpenChange={jest.fn()}
        difficulties={["easy", "hard"]}
      />
    );

    expect(screen.getByRole("tab", { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /hard/i })).toBeInTheDocument();
  });
});
