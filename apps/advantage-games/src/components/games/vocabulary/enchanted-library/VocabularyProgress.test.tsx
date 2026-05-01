import React from "react";
import { render, screen, within } from "@testing-library/react";
import { VocabularyProgress } from "./VocabularyProgress";
import type { VocabularyItem } from "@/store/useGameStore";

describe("VocabularyProgress", () => {
  const mockVocabulary: VocabularyItem[] = [
    { term: "cat", translation: "gato", id: "1" },
    { term: "dog", translation: "perro", id: "2" },
  ];

  const mockProgress = new Map<string, number>();
  mockProgress.set("cat", 1);
  mockProgress.set("dog", 2);

  it("renders all vocabulary words", () => {
    render(
      <VocabularyProgress
        vocabulary={mockVocabulary}
        progress={mockProgress}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText("dog")).toBeInTheDocument();
  });

  it("renders correct progress stars", () => {
    render(
      <VocabularyProgress
        vocabulary={mockVocabulary}
        progress={mockProgress}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    // "cat" has 1 progress -> 1 star filled
    const catRow = screen.getByTestId("vocab-row-cat");
    const catStars = within(catRow).getAllByTestId("star");
    expect(catStars[0]).toHaveAttribute("data-filled", "true");
    expect(catStars[1]).toHaveAttribute("data-filled", "false");

    // "dog" has 2 progress -> 2 stars filled
    const dogRow = screen.getByTestId("vocab-row-dog");
    const dogStars = within(dogRow).getAllByTestId("star");
    expect(dogStars[0]).toHaveAttribute("data-filled", "true");
    expect(dogStars[1]).toHaveAttribute("data-filled", "true");
  });

  it("does not render content when closed", () => {
    render(
      <VocabularyProgress
        vocabulary={mockVocabulary}
        progress={mockProgress}
        isOpen={false}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText("cat")).not.toBeInTheDocument();
  });
});
