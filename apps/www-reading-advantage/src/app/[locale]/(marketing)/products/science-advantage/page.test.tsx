import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ScienceAdvantage from "@/app/[locale]/(marketing)/products/science-advantage/page";

afterEach(() => {
  cleanup();
});

describe("ScienceAdvantage", () => {
  it("renders hero section with early access badge", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const badge = document.querySelector(".bg-rose-100");
    expect(badge).toBeInTheDocument();
  });

  it("renders full-bleed image break", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("image-break")).toBeInTheDocument();
  });

  it("renders value cards", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("value-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders student feature cards", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("student-feature-card");
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it("renders teacher feature cards", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("teacher-feature-card");
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it("renders key feature cards", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    const cards = screen.getAllByTestId("key-feature-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders overlapping section", async () => {
    const ui = await ScienceAdvantage({} as never);
    render(ui);
    expect(screen.getByTestId("overlapping-section")).toBeInTheDocument();
  });
});