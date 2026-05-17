import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CodeCampAdvantage from "@/app/[locale]/(marketing)/products/codecamp-advantage/page";

afterEach(() => {
  cleanup();
});

describe("CodeCampAdvantage", () => {
  it("renders hero section with enrollment badge", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const badge = document.querySelector(".bg-amber-100");
    expect(badge).toBeInTheDocument();
  });

  it("renders curriculum section with phase cards", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const phaseCards = document.querySelectorAll("[data-testid='phase-card']");
    expect(phaseCards.length).toBeGreaterThanOrEqual(4);
  });

  it("renders project cards", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const projectCards = document.querySelectorAll("[data-testid='project-card']");
    expect(projectCards.length).toBeGreaterThanOrEqual(4);
  });

  it("renders feature cards", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='feature-card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders horizontal tech strip", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const strip = document.querySelector("[data-testid='tech-strip']");
    expect(strip).toBeInTheDocument();
  });

  it("renders features section", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='features-section']");
    expect(section).toBeInTheDocument();
  });

  it("renders CTA buttons", async () => {
    const jsx = await CodeCampAdvantage();
    render(jsx);
    const buttons = document.querySelectorAll("a, button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});