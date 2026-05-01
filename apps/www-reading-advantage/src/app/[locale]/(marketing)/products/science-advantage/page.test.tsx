import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ScienceAdvantage from "@/app/[locale]/(marketing)/products/science-advantage/page";

afterEach(() => {
  cleanup();
});

describe("ScienceAdvantage", () => {
  it("renders full-bleed image break", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("image-break")).toBeInTheDocument();
  });

  it("renders editorial 2-column layout", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("editorial-layout")).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("overlapping-section")).toBeInTheDocument();
  });

  it("renders large value cards", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("value-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});
