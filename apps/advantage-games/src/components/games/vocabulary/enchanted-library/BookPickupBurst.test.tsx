import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { BookPickupBurst } from "./BookPickupBurst";

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
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return <div {...props}>{children}</div>;
    },
  },
}));

describe("BookPickupBurst", () => {
  it("renders the book burst with the correct variant and frame", () => {
    const onComplete = jest.fn();
    render(
      <BookPickupBurst
        x={50}
        y={40}
        spriteUrl="/book.png"
        frameWidth={48}
        frameHeight={48}
        frameIndex={2}
        variant="glow"
        onComplete={onComplete}
      />,
    );

    const burst = screen.getByTestId("book-pickup-burst");
    expect(burst).toHaveAttribute("data-variant", "glow");

    const sprite = screen.getByTestId("burst-sprite");
    expect(sprite).toHaveAttribute("data-frame-index", "2");

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
