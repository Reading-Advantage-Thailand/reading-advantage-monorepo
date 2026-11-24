import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogTags } from "@/components/blog/blog-tags";
import { BlogCard } from "@/components/blog/blog-card";
import type { BlogListItem } from "@/types/blog";
import { computedForElement } from "./fixtures/real-css";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

afterEach(() => {
  cleanup();
});

const longTag =
  "an-extremely-long-blog-article-tag-that-must-stay-within-the-mobile-viewport";

interface MobileOverflowFailure {
  element: string;
  reasons: string[];
}

/** True when a computed min-width is zero or unset. */
function isZeroMinWidth(value: string): boolean {
  return value === "" || /\*\s*0\b/.test(value) || /^0(?:px)?$/.test(value);
}

/** True when a computed width is fixed or content-sized. */
function isFixedWidth(value: string): boolean {
  return (
    /^\d+(?:\.\d+)?px$/.test(value) ||
    /^(?:max|min|fit)-content$/.test(value)
  );
}

/** True when computed wrapping lets long text break. */
function hasSafeWrap(style: Record<string, string>): boolean {
  return (
    style["overflow-wrap"] === "break-word" ||
    style["word-break"] === "break-all"
  );
}

function findMobileOverflowFailures(
  root: HTMLElement,
  tagTexts: readonly string[],
): MobileOverflowFailure[] {
  const tagElements = [...root.querySelectorAll<HTMLElement>("a, span")].filter(
    (element) => tagTexts.includes(element.textContent?.trim() ?? ""),
  );

  return tagElements.flatMap((tag, index) => {
    const container = tag.parentElement;
    const reasons = new Set<string>();
    const relevantElements = [tag, container].filter(
      (element): element is HTMLElement => element !== null,
    );

    for (const element of relevantElements) {
      const style = computedForElement(element, [
        "width",
        "min-width",
        "white-space",
        "overflow-wrap",
        "word-break",
      ]);
      if (isFixedWidth(style.width) || isFixedWidth(style["min-width"])) {
        reasons.add("fixed-or-min-content-width");
      }
      if (style["white-space"] === "nowrap") {
        reasons.add("nowrap");
      }
      if (
        element === tag &&
        (element.textContent?.trim().length ?? 0) >= 24 &&
        !/\s/.test(element.textContent?.trim() ?? "") &&
        !hasSafeWrap(style)
      ) {
        reasons.add("unbreakable-content");
      }
    }

    const hasContainment = (element: HTMLElement | null): boolean => {
      if (!element) {
        return false;
      }
      const style = computedForElement(element, ["min-width", "max-width"]);
      return (
        isZeroMinWidth(style["min-width"]) && style["max-width"] === "100%"
      );
    };

    const containerStyle =
      container instanceof HTMLElement
        ? computedForElement(container, ["display", "flex-wrap"])
        : {};
    const needsWrap =
      containerStyle.display === "flex" && containerStyle["flex-wrap"] !== "wrap";

    if (
      !hasContainment(tag) ||
      !hasContainment(container) ||
      needsWrap
    ) {
      reasons.add("missing-max-width-min-width-containment");
    }

    return reasons.size > 0
      ? [{ element: `tag-${index}`, reasons: [...reasons] }]
      : [];
  });
}

describe("Final Phase 4 browser regression contracts", () => {
  it("detects overflow in the real article tag and related card structures", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    const post: BlogListItem = {
      slug: "mobile-overflow-fixture",
      title: "A related article with a long mobile tag",
      date: "2026-08-03",
      excerpt: "Related article content for a narrow mobile card.",
      author: "Reading Advantage",
      tags: [longTag],
      readingTime: 6,
      coverImage: "/images/related-article.jpg",
    };
    const card = await BlogCard({ post, locale: "en" });
    const rendered = render(
      <>
        <BlogTags tags={[longTag]} />
        {card}
      </>,
    );
    const failures = findMobileOverflowFailures(rendered.container, [longTag]);

    expect(failures).toEqual([]);
  });

  it("catches the observed 490px counterexample across all overflow classes", () => {
    const counterexample = render(
      <div className="min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-[490px] whitespace-nowrap">
            an-unbreakable-content-string-that-exceeds-the-mobile-viewport
          </span>
        </div>
      </div>,
    );
    const failures = findMobileOverflowFailures(counterexample.container, [
      "an-unbreakable-content-string-that-exceeds-the-mobile-viewport",
    ]);
    const reasons = failures.flatMap((failure) => failure.reasons);

    expect(reasons).toEqual(
      expect.arrayContaining([
        "fixed-or-min-content-width",
        "nowrap",
        "unbreakable-content",
        "missing-max-width-min-width-containment",
      ]),
    );
  });
});
