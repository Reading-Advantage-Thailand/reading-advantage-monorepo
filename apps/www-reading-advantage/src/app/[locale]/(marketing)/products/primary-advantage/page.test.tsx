import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import PrimaryAdvantage from "@/app/[locale]/(marketing)/products/primary-advantage/page";

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

describe("PrimaryAdvantage", () => {
  it("renders timeline/step CEFR display", async () => {
    const element = await PrimaryAdvantage();
    render(element);
    const timeline = document.querySelector("[data-testid='cefr-timeline']");
    expect(timeline).toBeInTheDocument();
  });

  it("renders reversed 5/7 split", async () => {
    const element = await PrimaryAdvantage();
    render(element);
    const split = document.querySelector("[data-testid='reversed-split']");
    expect(split).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const element = await PrimaryAdvantage();
    render(element);
    const overlap = document.querySelector("[data-testid='overlapping-section']");
    expect(overlap).toBeInTheDocument();
  });

  it("renders staggered stats", async () => {
    const element = await PrimaryAdvantage();
    render(element);
    const stats = document.querySelectorAll("[data-testid='stat-card']");
    expect(stats.length).toBeGreaterThanOrEqual(1);
  });
});
