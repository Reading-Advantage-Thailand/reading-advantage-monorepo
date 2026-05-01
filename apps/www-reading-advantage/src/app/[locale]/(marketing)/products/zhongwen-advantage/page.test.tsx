import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ZhongwenAdvantage from "@/app/[locale]/(marketing)/products/zhongwen-advantage/page";

afterEach(() => {
  cleanup();
});

describe("ZhongwenAdvantage", () => {
  it("renders level mapping visualization", async () => {
    const jsx = await ZhongwenAdvantage();
    render(jsx);
    const mapping = document.querySelector("[data-testid='level-mapping']");
    expect(mapping).toBeInTheDocument();
  });

  it("renders combined FAQ/waitlist section", async () => {
    const jsx = await ZhongwenAdvantage();
    render(jsx);
    const section = document.querySelector("[data-testid='combined-faq-waitlist']");
    expect(section).toBeInTheDocument();
  });

  it("renders large image break", async () => {
    const jsx = await ZhongwenAdvantage();
    render(jsx);
    const imageBreak = document.querySelector("[data-testid='image-break']");
    expect(imageBreak).toBeInTheDocument();
  });

  it("renders editorial cards", async () => {
    const jsx = await ZhongwenAdvantage();
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='editorial-card']");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
