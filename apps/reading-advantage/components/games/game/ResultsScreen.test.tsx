import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsScreen } from "./ResultsScreen";

describe("ResultsScreen", () => {
  it("renders score, accuracy and XP", () => {
    render(
      <ResultsScreen
        score={100}
        accuracy={0.8}
        xp={150}
        onRestart={jest.fn()}
        missedWords={[]}
        onShowRanking={jest.fn()}
      />,
    );

    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("150 XP")).toBeInTheDocument();
  });

  it("calls onRestart when button is clicked", () => {
    const onRestart = jest.fn();
    render(
      <ResultsScreen
        score={100}
        accuracy={0.8}
        xp={150}
        onRestart={onRestart}
        missedWords={[]}
        onShowRanking={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRestart).toHaveBeenCalled();
  });
});
