import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogTags } from "@/components/blog/blog-tags";
import { BlogCard } from "@/components/blog/blog-card";
import type { BlogListItem } from "@/types/blog";

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

function getClassName(element: HTMLElement): string {
  return typeof element.className === "string" ? element.className : "";
}

function hasSafeWrap(element: HTMLElement): boolean {
  const className = getClassName(element);
  return (
    /\b(?:break-words|break-all|whitespace-normal)\b/.test(className) ||
    [element.style.overflowWrap, element.style.wordBreak].some((value) =>
      /^(?:anywhere|break-word|break-all)$/.test(value),
    )
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
      const className = getClassName(element);
      if (
        /\b(?:w-\[(?!full)|min-w-(?:max|\[)|max-w-\[(?!full))/.test(
          className,
        ) ||
        Boolean(element.style.width || element.style.minWidth)
      ) {
        reasons.add("fixed-or-min-content-width");
      }
      if (
        /\bwhitespace-nowrap\b/.test(className) ||
        element.style.whiteSpace === "nowrap"
      ) {
        reasons.add("nowrap");
      }
      if (
        element === tag &&
        (element.textContent?.trim().length ?? 0) >= 24 &&
        !/\s/.test(element.textContent?.trim() ?? "") &&
        !hasSafeWrap(element)
      ) {
        reasons.add("unbreakable-content");
      }
    }

    const hasContainment = (element: HTMLElement | null): boolean => {
      if (!element) {
        return false;
      }
      const className = getClassName(element);
      return /\bmin-w-0\b/.test(className) && /\bmax-w-full\b/.test(className);
    };

    if (
      !hasContainment(tag) ||
      !hasContainment(container) ||
      (container?.classList.contains("flex") &&
        !container.classList.contains("flex-wrap"))
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
