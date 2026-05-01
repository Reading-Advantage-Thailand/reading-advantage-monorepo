import { render, screen, fireEvent } from "@testing-library/react";
import { GameEndScreen } from "./GameEndScreen";

describe("GameEndScreen", () => {
  const defaultProps = {
    status: "victory" as const,
    score: 1000,
    xp: 50,
    accuracy: 0.85,
    onRestart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders victory status correctly", () => {
    render(<GameEndScreen {...defaultProps} />);
    expect(screen.getByText(/Victory!/i)).toBeInTheDocument();
  });

  it("renders defeat status correctly", () => {
    render(<GameEndScreen {...defaultProps} status="defeat" />);
    expect(screen.getByText(/Defeated/i)).toBeInTheDocument();
  });

  it("renders complete status correctly", () => {
    render(<GameEndScreen {...defaultProps} status="complete" />);
    expect(screen.getByText(/Complete!/i)).toBeInTheDocument();
  });

  it("displays score, accuracy, and XP", () => {
    render(<GameEndScreen {...defaultProps} />);
    expect(screen.getByText(/1000/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("calls onRestart when Play Again is clicked", () => {
    render(<GameEndScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Play Again/i }));
    expect(defaultProps.onRestart).toHaveBeenCalledTimes(1);
  });

  it("shows leaderboard link when showLeaderboardLink is true", () => {
    render(<GameEndScreen {...defaultProps} showLeaderboardLink gameId="test" gameName="Test" />);
    expect(screen.getByText(/View Leaderboard/i)).toBeInTheDocument();
  });

  it("does not show leaderboard link when showLeaderboardLink is false", () => {
    render(<GameEndScreen {...defaultProps} showLeaderboardLink={false} />);
    expect(screen.queryByText(/View Leaderboard/i)).not.toBeInTheDocument();
  });

  it("renders custom stats when provided", () => {
    render(
      <GameEndScreen
        {...defaultProps}
        customStats={[{ label: "Level", value: "42" }]}
      />
    );
    expect(screen.getByText(/Level/i)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});