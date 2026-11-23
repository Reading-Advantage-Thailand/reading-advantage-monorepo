import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogCard } from "@/components/blog/blog-card";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import type { BlogListItem } from "@/types/blog";
import { computedForElement } from "./fixtures/real-css";

/** True when a computed color is dark enough for text on a light background. */
function isDarkText(color: string): boolean {
  const oklch = color.match(/oklch\(([\d.]+)/);
  if (oklch) return Number(oklch[1]) <= 0.5;
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return Math.max(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])) <= 120;
  return false;
}

const serverWiring = vi.hoisted(() => ({
  getScopedI18n: vi.fn(async (scope: string) => {
    const translate = ((key: string) => `${scope}.${key}`) as ((
      key: string,
    ) => string) & { raw: (key: string) => unknown };
    translate.raw = (key: string) =>
      key === "subjects.rows"
        ? [
            { label: "row 1", cells: ["1 subject", "1,200 baht", "1,200 baht"] },
            { label: "row 2", cells: ["2 subjects", "+600 baht", "1,800 baht"] },
            { label: "row 3", cells: ["3 subjects", "+400 baht", "2,200 baht"] },
            { label: "row 4", cells: ["4 subjects", "+250 baht", "2,450 baht"] },
          ]
        : undefined;
    return translate;
  }),
}));

vi.mock("@/locales/server", () => ({
  getScopedI18n: serverWiring.getScopedI18n,
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

afterEach(cleanup);

const mobileRelatedPost: BlogListItem = {
  slug: "mobile-related-article",
  title: "A related article title that wraps at 390px",
  date: "2026-08-03",
  excerpt: "Related article content for a narrow mobile card.",
  author: "Reading Advantage",
  tags: [
    "an-extremely-long-related-article-tag-that-must-stay-inside-the-card",
  ],
  readingTime: 6,
  coverImage: "/images/related-article.jpg",
};

describe("Remaining Phase 4 browser regression contracts", () => {
  it("contains related article content at a 390px viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    const rendered = render(
      await BlogCard({ post: mobileRelatedPost, locale: "en" }),
    );
    const card = rendered.container.firstElementChild;
    const image = rendered.container.querySelector("img");
    const imageFrame = image?.parentElement;
    const tags = [...rendered.container.querySelectorAll("span")].filter(
      (tag) => tag.textContent === mobileRelatedPost.tags[0],
    );
    const cardStyle =
      card instanceof HTMLElement
        ? computedForElement(card, ["min-width", "max-width"])
        : {};
    const frameStyle =
      imageFrame instanceof HTMLElement
        ? computedForElement(imageFrame, ["max-width"])
        : {};
    const contained =
      cardStyle["min-width"] === "calc(var(--spacing) * 0)" &&
      cardStyle["max-width"] === "100%" &&
      frameStyle["max-width"] === "100%" &&
      tags.length === 1 &&
      tags.every(
        (tag) =>
          computedForElement(tag, ["overflow-wrap"])["overflow-wrap"] ===
          "break-word",
      );

    expect
      .soft(
        contained,
        "Remaining browser finding: related article content must stay inside a 390px card",
      )
      .toBe(true);
  });

  it("keeps pricing hero text at WCAG-AA contrast", async () => {
    const rendered = render(await PricingPage());
    const hero = rendered.container.querySelector('[data-testid="pricing-hero"]');
    const title = hero?.querySelector("h1");
    const description = hero?.querySelector("p");
    const safeText = [title, description].every(
      (element) =>
        element instanceof HTMLElement &&
        isDarkText(computedForElement(element, ["color"]).color),
    );

    expect
      .soft(
        safeText,
        "Remaining browser finding: pricing hero text must meet WCAG-AA contrast",
      )
      .toBe(true);
  });
});
