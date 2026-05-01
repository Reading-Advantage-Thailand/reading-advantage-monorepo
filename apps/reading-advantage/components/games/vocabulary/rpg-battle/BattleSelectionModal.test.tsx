import { fireEvent, render, screen } from "@testing-library/react";
import { BattleSelectionModal } from "./BattleSelectionModal";
import {
  battleEnemies,
  battleHeroes,
  battleLocations,
} from "@/lib/games/rpgBattleSelection";

const baseProps = {
  heroes: battleHeroes,
  locations: battleLocations,
  enemies: battleEnemies,
  onSelectHero: jest.fn(),
  onSelectLocation: jest.fn(),
  onSelectEnemy: jest.fn(),
};

describe("BattleSelectionModal", () => {
  it("renders hero options for the hero step", () => {
    render(<BattleSelectionModal {...baseProps} step="hero" />);

    expect(
      screen.getByRole("heading", { name: /choose your hero/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Male hero" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Female hero" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Male hero Male" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Female hero Female" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Forest Clearing")).not.toBeInTheDocument();
  });

  it("renders location options for the location step", () => {
    render(<BattleSelectionModal {...baseProps} step="location" />);

    expect(
      screen.getByRole("heading", { name: /choose a location/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Forest Clearing" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /forest clearing/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Male")).not.toBeInTheDocument();
  });

  it("renders enemy options for the enemy step and triggers selection", () => {
    const onSelectEnemy = jest.fn();

    render(
      <BattleSelectionModal
        {...baseProps}
        onSelectEnemy={onSelectEnemy}
        step="enemy"
      />
    );

    const elementalButton = screen.getByRole("button", { name: /elemental/i });
    fireEvent.click(elementalButton);

    expect(onSelectEnemy).toHaveBeenCalledWith("elemental");
    expect(
      screen.getByRole("img", { name: /elemental enemy/i })
    ).toBeInTheDocument();
    expect(screen.getByText("HP 200 | XP up to 20")).toBeInTheDocument();
  });

  it("does not render when the step is ready", () => {
    render(<BattleSelectionModal {...baseProps} step="ready" />);

    // Verify that none of the modal headings are present
    expect(
      screen.queryByRole("heading", { name: /choose your hero/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /choose a location/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /choose an enemy/i })
    ).not.toBeInTheDocument();
  });
});
