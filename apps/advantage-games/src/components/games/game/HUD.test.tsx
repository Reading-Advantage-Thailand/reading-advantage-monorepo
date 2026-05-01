import { render, screen } from "@testing-library/react";
import { HUD } from "./HUD";

describe("HUD", () => {
  it("renders score and accuracy", () => {
    render(
      <HUD
        score={1230}
        accuracy={0.85}
        combo={5}
        mana={100}
        timeRemaining={60}
      />,
    );

    expect(screen.getByText("1230")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
