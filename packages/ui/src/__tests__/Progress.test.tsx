import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "../components/Progress";

describe("Progress", () => {
  it("forwards the current value to the accessible progress bar", () => {
    render(<Progress value={50} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("calculates indicator width from a custom maximum", () => {
    render(<Progress value={5} max={10} />);

    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({ transform: "translateX(-50%)" });
  });

  it("uses the Radix default when the maximum is invalid", () => {
    render(<Progress value={50} max={0} />);

    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({ transform: "translateX(-50%)" });
  });
});
