import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogCard } from "@/components/blog/blog-card";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import { PricingTable } from "@/components/pricing/pricing-table";
import type { BlogListItem } from "@/types/blog";

const serverWiring = vi.hoisted(() => ({
  getScopedI18n: vi.fn(
    async (scope: string) => (key: string) => `${scope}.${key}`,
  ),
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
    const imageFrame = rendered.container.querySelector(".relative.h-48");
    const tags = [...rendered.container.querySelectorAll("span")].filter(
      (tag) => tag.textContent === mobileRelatedPost.tags[0],
    );
    const contained =
      card?.classList.contains("min-w-0") &&
      card.classList.contains("max-w-full") &&
      imageFrame?.classList.contains("max-w-full") &&
      tags.length === 1 &&
      tags.every((tag) => tag.classList.contains("break-words"));

    expect
      .soft(
        contained,
        "Remaining browser finding: related article content must stay inside a 390px card",
      )
      .toBe(true);
  });

  it("provides keyboard access to the pricing table scrollport", () => {
    const rendered = render(<PricingTable />);
    const scrollport = rendered.container.querySelector("div.overflow-x-auto");
    const scrollportReady =
      scrollport?.getAttribute("tabindex") === "0" &&
      scrollport.getAttribute("role") === "region" &&
      Boolean(scrollport.getAttribute("aria-label"));
    const equivalentControls = [
      ...rendered.container.querySelectorAll("button"),
    ].some(
      (button) =>
        button.getAttribute("tabindex") !== "-1" &&
        Boolean(button.getAttribute("aria-label")),
    );

    expect
      .soft(
        scrollportReady || equivalentControls,
        "Remaining browser finding: pricing table needs keyboard-accessible controls",
      )
      .toBe(true);
  });

  it("keeps pricing hero text at WCAG-AA contrast", async () => {
    const rendered = render(await PricingPage());
    const hero = rendered.container.querySelector("main > section");
    const title = hero?.querySelector("h1");
    const description = hero?.querySelector("p");
    const safeText = [title, description].every(
      (element) =>
        element != null &&
        !element.classList.contains("text-white/90") &&
        !element.classList.contains("text-slate-400") &&
        (element.classList.contains("text-black") ||
          element.classList.contains("text-slate-700") ||
          element.classList.contains("text-slate-800") ||
          element.classList.contains("text-slate-900")),
    );

    expect
      .soft(
        safeText,
        "Remaining browser finding: pricing hero text must meet WCAG-AA contrast",
      )
      .toBe(true);
  });
});
