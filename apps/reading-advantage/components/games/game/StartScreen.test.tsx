import { act, fireEvent, render, screen } from "@testing-library/react";
import { StartScreen } from "./StartScreen";

const mockVocab = [
  { term: "Apple", translation: "Manzana" },
  { term: "Banana", translation: "Plátano" },
];

describe("StartScreen", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the vocabulary list", () => {
    render(
      <StartScreen
        vocabulary={mockVocab}
        onStart={jest.fn()}
        onShowRanking={jest.fn()}
      />,
    );

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Manzana")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Plátano")).toBeInTheDocument();
  });

  it("calls onStart when start button is clicked", () => {
    jest.useFakeTimers();
    const onStart = jest.fn();
    render(
      <StartScreen
        vocabulary={mockVocab}
        onStart={onStart}
        onShowRanking={jest.fn()}
      />,
    );

    const startButton = screen.getByRole("button", {
      name: "magicDefense.startDefense",
    });
    fireEvent.click(startButton);
    act(() => jest.advanceTimersByTime(500));

    expect(onStart).toHaveBeenCalledWith("normal");
  });
});
