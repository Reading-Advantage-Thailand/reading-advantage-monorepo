// @vitest-environment jsdom
/**
 * PR's C10 run: the report charts were blank. The frame had only min-h-[350px], so the
 * ResponsiveContainer (height 100% of an auto height) measured 0 px and recharts drew nothing.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChartContainer } from "../chart";

afterEach(cleanup);

describe("ChartContainer", () => {
  it("gives the chart frame a fixed height", () => {
    const { container } = render(<ChartContainer config={{}}><div /></ChartContainer>);
    const frame = container.querySelector("[data-chart]")!;
    expect(frame.className.split(" ")).toContain("h-[350px]");
    expect(frame.className).not.toContain("min-h-[350px]");
  });
});
