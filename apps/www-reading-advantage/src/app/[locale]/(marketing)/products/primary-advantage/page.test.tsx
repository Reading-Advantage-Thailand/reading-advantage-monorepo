import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import PrimaryAdvantage from "@/app/[locale]/(marketing)/products/primary-advantage/page";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve((key: string) => {
      if (key.endsWith(".image")) {
        return "/images/placeholder.png";
      }
      return `${scope}.${key}`;
    }),
  ),
}));

afterEach(() => {
  cleanup();
});

describe("PrimaryAdvantage", () => {
  it("renders timeline/step CEFR display", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const timeline = document.querySelector("[data-testid='cefr-timeline']");
    expect(timeline).toBeInTheDocument();
  });

  it("renders reversed 5/7 split", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const split = document.querySelector("[data-testid='reversed-split']");
    expect(split).toBeInTheDocument();
  });

  it("renders overlapping section", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const overlap = document.querySelector(
      "[data-testid='overlapping-section']",
    );
    expect(overlap).toBeInTheDocument();
  });

  it("renders staggered stats", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const stats = document.querySelectorAll("[data-testid='stat-card']");
    expect(stats.length).toBeGreaterThanOrEqual(1);
  });

  it("renders only approved results statistics", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);

    expect.soft(screen.getAllByTestId("stat-card")).toHaveLength(2);
    expect
      .soft(
        screen.queryByText(
          "pages.products.primaryAdvantage.resultsSection.stats.2.value",
        ),
      )
      .not.toBeInTheDocument();
    expect
      .soft(
        screen.queryByText(
          "pages.products.primaryAdvantage.resultsSection.stats.2.label",
        ),
      )
      .not.toBeInTheDocument();
  });

  it("links the free trial CTA to contact", async () => {
    const element = await PrimaryAdvantage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const contactLink = screen.getByRole("link", {
      name: /pages\.products\.primaryAdvantage\.cta\.buttons\.freeTrial/i,
    });
    expect(contactLink).toHaveAttribute("href", "/contact");
  });
});
