import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CodeCampAdvantage from "@/app/[locale]/(marketing)/products/codecamp-advantage/page";

afterEach(() => {
  cleanup();
});

describe("CodeCampAdvantage", () => {
  it("renders dark tech track cards", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='track-card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders horizontal tech strip", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const strip = document.querySelector("[data-testid='tech-strip']");
    expect(strip).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='overlapping-section']");
    expect(section).toBeInTheDocument();
  });

  it("renders border-left accent feature cards", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='feature-card']");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
