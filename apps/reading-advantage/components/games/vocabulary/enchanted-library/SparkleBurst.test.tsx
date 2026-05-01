import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SparkleBurst } from "./SparkleBurst";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      onAnimationComplete,
      ...props
    }: {
      children?: ReactNode;
      onAnimationComplete?: () => void;
    }) => {
      // We wrap the onAnimationComplete call in async boundary or just execute?
      // But typically we should just mock it.
      // The original just called it.
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return <div {...props}>{children}</div>;
    },
  },
}));

describe("SparkleBurst", () => {
  it("renders sparkles and triggers completion", () => {
    const onComplete = jest.fn();
    render(<SparkleBurst x={40} y={60} onComplete={onComplete} />);

    const sparkles = screen.getAllByTestId("sparkle-particle");
    expect(sparkles).toHaveLength(10);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
