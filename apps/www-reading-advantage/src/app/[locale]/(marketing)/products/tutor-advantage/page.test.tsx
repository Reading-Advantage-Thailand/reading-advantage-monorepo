import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

afterEach(() => {
  cleanup();
});

describe("TutorAdvantage", () => {
  it("renders horizontal process flow", async () => {
    const jsx = await TutorAdvantage();
    render(jsx);
    const flow = document.querySelector("[data-testid='process-flow']");
    expect(flow).toBeInTheDocument();
  });

  it("renders floating testimonials", async () => {
    const jsx = await TutorAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='testimonial-card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders overlapping section", async () => {
    const jsx = await TutorAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='overlapping-section']");
    expect(section).toBeInTheDocument();
  });

  it("renders combined stats/cta", async () => {
    const jsx = await TutorAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='combined-stats-cta']");
    expect(section).toBeInTheDocument();
  });
});
