import { render } from "@testing-library/react";
import { Fragment } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { BlogCard } from "@/components/blog/blog-card";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
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

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

const localeMessages = [enMessages, thMessages, zhMessages];

const relatedPosts: BlogListItem[] = [
  {
    slug: "long-story",
    title:
      "A very long related article title that must wrap inside a narrow mobile card without causing horizontal overflow",
    date: "2026-08-01",
    excerpt:
      "A long related article summary that must remain inside the card at mobile width.",
    author: "Reading Advantage",
    tags: ["reading"],
    readingTime: 5,
  },
  {
    slug: "second-story",
    title: "Another related article",
    date: "2026-08-02",
    excerpt: "A second related article summary.",
    author: "Reading Advantage",
    tags: ["learning"],
    readingTime: 4,
  },
];

describe("Phase 4 browser regression contracts", () => {
  it("keeps Storytime FAQ locale keys complete", () => {
    const complete = localeMessages.every((messages) => {
      const questions =
        messages.pages.products.storytimeAdvantage.faq.questions;
      return (
        questions.length === 5 &&
        questions.every(
          (item) => Boolean(item.question) && Boolean(item.answer),
        )
      );
    });

    expect
      .soft(
        complete,
        "UX-P4-001: Storytime FAQ needs five complete locale entries",
      )
      .toBe(true);
  });

  it("keeps related article cards safe at mobile width", async () => {
    const cards = await Promise.all(
      relatedPosts.map((post) => BlogCard({ post, locale: "en" })),
    );
    const rendered = render(
      <>
        {cards.map((card, index) => (
          <Fragment key={relatedPosts[index].slug}>{card}</Fragment>
        ))}
      </>,
    );
    const cardRoots = [...rendered.container.querySelectorAll("div")].filter(
      (element) =>
        element.classList.contains("rounded-lg") &&
        element.classList.contains("border"),
    );
    const headings = [...rendered.container.querySelectorAll("h2")];
    const safeCards =
      cardRoots.length === relatedPosts.length &&
      cardRoots.every((card) => card.classList.contains("min-w-0")) &&
      headings.length === relatedPosts.length &&
      headings.every((heading) => heading.classList.contains("break-words"));

    expect
      .soft(
        safeCards,
        "UX-P4-002: related article cards must wrap safely at mobile width",
      )
      .toBe(true);
  });

  it("uses accessible contrast tokens for pricing status text", () => {
    const rendered = render(<PricingTable />);
    const statuses = [...rendered.container.querySelectorAll(".coming-soon")];
    const contrastSafe =
      statuses.length > 0 &&
      statuses.every((status) =>
        /\btext-(?:orange|amber|slate)-(?:700|800|900)\b/.test(
          status.className,
        ),
      );

    expect
      .soft(
        contrastSafe,
        "UX-P4-004: pricing status text needs an accessible contrast token",
      )
      .toBe(true);
  });

  it("uses an accessible contrast treatment for contact eyebrows", async () => {
    const rendered = render(await ContactPage());
    const eyebrows = [
      ...rendered.container.querySelectorAll("span.uppercase.tracking-widest"),
    ];
    const contrastSafe =
      eyebrows.length === 2 &&
      eyebrows.every((eyebrow) => eyebrow.classList.contains("text-sky-700"));

    expect
      .soft(
        contrastSafe,
        "UX-P4-005: contact eyebrows need an accessible contrast treatment",
      )
      .toBe(true);
  });
});
