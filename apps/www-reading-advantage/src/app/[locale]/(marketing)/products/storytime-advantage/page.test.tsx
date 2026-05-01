import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import StorytimeAdvantage from "@/app/[locale]/(marketing)/products/storytime-advantage/page";

afterEach(() => {
  cleanup();
});

describe("StorytimeAdvantage", () => {
  it("renders staggered cards", async () => {
    const jsx = await StorytimeAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='staggered-card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders FAQ accordion", async () => {
    const jsx = await StorytimeAdvantage();
    render(jsx);
    const faq = document.querySelector("[data-testid='faq-accordion']");
    expect(faq).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const jsx = await StorytimeAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='overlapping-section']");
    expect(section).toBeInTheDocument();
  });

  it("renders decorative dashed frame", async () => {
    const jsx = await StorytimeAdvantage();
    render(jsx);
    const frame = document.querySelector("[data-testid='dashed-frame']");
    expect(frame).toBeInTheDocument();
  });
});
