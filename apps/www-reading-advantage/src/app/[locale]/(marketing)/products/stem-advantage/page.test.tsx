import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import StemAdvantage from "@/app/[locale]/(marketing)/products/stem-advantage/page";

afterEach(() => {
  cleanup();
});

describe("StemAdvantage", () => {
  it("renders horizontal timeline", async () => {
    const ui = await StemAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("grade-timeline")).toBeInTheDocument();
  });

  it("renders oversized stat callout", async () => {
    const ui = await StemAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("oversized-stat")).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const ui = await StemAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("overlapping-section")).toBeInTheDocument();
  });

  it("renders alternating border benefit cards", async () => {
    const ui = await StemAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("benefit-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});
