import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ReadingAdvantage from "@/app/[locale]/(marketing)/products/reading-advantage/page";

afterEach(() => {
  cleanup();
});

describe("ReadingAdvantage", () => {
  it("renders main heading", () => {
    render(<ReadingAdvantage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("renders hero section with description", () => {
    render(<ReadingAdvantage />);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
  });

  it("renders horizontal game strip", () => {
    render(<ReadingAdvantage />);
    const strip = document.querySelector("[data-testid='games-strip']");
    expect(strip).toBeInTheDocument();
  });

  it("renders floating stat pills (not a grid)", () => {
    render(<ReadingAdvantage />);
    const pills = document.querySelectorAll("[data-testid='stat-pill']");
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it("renders overlapping sections", () => {
    render(<ReadingAdvantage />);
    const overlaps = document.querySelectorAll("[data-testid='overlapping-section']");
    expect(overlaps.length).toBeGreaterThanOrEqual(1);
  });

  it("renders platform features color room", () => {
    render(<ReadingAdvantage />);
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(1);
  });
});
