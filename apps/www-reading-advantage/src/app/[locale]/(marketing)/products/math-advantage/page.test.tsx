import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MathAdvantage from "@/app/[locale]/(marketing)/products/math-advantage/page";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn((scope: string) => Promise.resolve((key: string) => {
    if (key.endsWith(".image")) {
      return "/images/placeholder.png";
    }
    return `${scope}.${key}`;
  })),
}));

afterEach(() => {
  cleanup();
});

describe("MathAdvantage", () => {
  it("renders organic bubble cluster", async () => {
    const element = await MathAdvantage();
    render(element);
    const cluster = document.querySelector("[data-testid='bubble-cluster']");
    expect(cluster).toBeInTheDocument();
  });

  it("renders single deep-dive feature section", async () => {
    const element = await MathAdvantage();
    render(element);
    const deepDive = document.querySelector("[data-testid='deep-dive']");
    expect(deepDive).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const element = await MathAdvantage();
    render(element);
    const overlap = document.querySelector("[data-testid='overlapping-section']");
    expect(overlap).toBeInTheDocument();
  });

  it("renders floating pills", async () => {
    const element = await MathAdvantage();
    render(element);
    const pills = document.querySelectorAll("[data-testid='stat-pill']");
    expect(pills.length).toBeGreaterThanOrEqual(2);
  });
});
