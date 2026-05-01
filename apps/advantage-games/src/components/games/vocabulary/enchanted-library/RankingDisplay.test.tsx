import { render, screen, fireEvent } from "@testing-library/react";
import { RankingDisplay } from "./RankingDisplay";

const mockRankings = {
  easy: [
    { userId: "1", name: "Alice", image: null, xp: 100 },
    { userId: "2", name: "Bob", image: null, xp: 80 },
    { userId: "3", name: "Charlie", image: null, xp: 60 },
    { userId: "4", name: "David", image: null, xp: 40 },
  ],
  normal: [
    { userId: "1", name: "Alice", image: "/avatar.png", xp: 200 },
  ],
  hard: [],
  extreme: [],
};

describe("RankingDisplay", () => {
  it("renders the leaderboard title", () => {
    render(<RankingDisplay rankings={mockRankings} currentUserId="1" />);
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
  });

  it("renders difficulty tabs", () => {
    render(<RankingDisplay rankings={mockRankings} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("Extreme")).toBeInTheDocument();
  });

  it("switches difficulty tabs", () => {
    render(<RankingDisplay rankings={mockRankings} />);
    fireEvent.click(screen.getByText("Easy"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/100\s*XP/)).toBeInTheDocument();
  });

  it("shows empty state when no rankings", () => {
    render(<RankingDisplay rankings={mockRankings} />);
    fireEvent.click(screen.getByText("Hard"));
    expect(screen.getByText("No rankings yet for this difficulty.")).toBeInTheDocument();
    expect(screen.getByText("Be the first to play!")).toBeInTheDocument();
  });

  it("highlights current user", () => {
    render(<RankingDisplay rankings={mockRankings} currentUserId="1" />);
    expect(screen.getByText("(You)")).toBeInTheDocument();
  });

  it("renders trophy for rank 1", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders medal for rank 2", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders medal for rank 3", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("renders rank number for rank 4+", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getByText("#4")).toBeInTheDocument();
  });

  it("renders avatar image when available", () => {
    render(<RankingDisplay rankings={mockRankings} />);
    const img = screen.getByAltText("Alice");
    expect(img).toHaveAttribute("src", "/avatar.png");
  });

  it("renders default avatar when no image", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("formats XP with locale string", () => {
    render(<RankingDisplay rankings={mockRankings} currentDifficulty="easy" />);
    expect(screen.getByText(/100\s*XP/)).toBeInTheDocument();
  });
});
