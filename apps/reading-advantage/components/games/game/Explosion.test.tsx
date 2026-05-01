import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Explosion } from "./Explosion";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      onAnimationComplete,
      "data-testid": testId,
      ...props
    }: {
      children?: ReactNode;
      onAnimationComplete?: () => void;
      "data-testid"?: string;
    }) => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return (
        <div data-testid={testId} {...props}>
          {children}
        </div>
      );
    },
  },
}));

describe("Explosion", () => {
  it("renders particles and triggers completion once", () => {
    const onComplete = jest.fn();
    render(<Explosion x={10} y={20} onComplete={onComplete} />);

    const particles = screen.getAllByTestId("explosion-particle");
    expect(particles).toHaveLength(8);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
