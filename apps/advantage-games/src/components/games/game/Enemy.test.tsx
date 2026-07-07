import { render, screen } from "@testing-library/react";
import { Enemy } from "./Enemy";
import { withBasePath } from "@/lib/games/basePath";

describe("Enemy", () => {
  it("renders the term", () => {
    render(
      <Enemy
        id="1"
        x={50}
        targetX={50}
        term="Apple"
        duration={5}
        state="falling"
        onReachBottom={jest.fn()}
        onDeathComplete={jest.fn()}
      />
    );

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByTestId("enemy-sprite")).toHaveStyle({
      backgroundImage: `url(${withBasePath("/games/magic-defense/skeletons_3x3_pose_sheet.png")})`,
    });
  });
});
