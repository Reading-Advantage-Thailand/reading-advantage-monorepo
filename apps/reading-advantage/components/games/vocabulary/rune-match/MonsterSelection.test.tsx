import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonsterSelection } from "./MonsterSelection";
import { RUNE_MATCH_CONFIG } from "@/lib/games/runeMatchConfig";

describe("MonsterSelection", () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  it("renders all four monster options", () => {
    render(<MonsterSelection onSelect={onSelect} />);

    expect(screen.getByText(/Goblin/i)).toBeInTheDocument();
    expect(screen.getByText(/Skeleton/i)).toBeInTheDocument();
    expect(screen.getByText(/Orc/i)).toBeInTheDocument();
    expect(screen.getByText(/Dragon/i)).toBeInTheDocument();
  });

  it("displays monster stats correctly", () => {
    render(<MonsterSelection onSelect={onSelect} />);

    const goblinConfig = RUNE_MATCH_CONFIG.monsters.goblin;
    // Use a more flexible matcher for text that might be split across elements
    expect(
      screen.getByText((content) => content.includes(`${goblinConfig.hp} HP`)),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes(`1-${goblinConfig.attack}`),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes(`${goblinConfig.xp} XP`)),
    ).toBeInTheDocument();
  });

  it("calls onSelect with the correct monster type when clicked", () => {
    render(<MonsterSelection onSelect={onSelect} />);

    // There are 4 "Battle" buttons, the last one is for the Dragon
    const battleButtons = screen.getAllByRole("button", { name: /Battle/i });
    fireEvent.click(battleButtons[3]);

    expect(onSelect).toHaveBeenCalledWith("dragon");
  });
});
