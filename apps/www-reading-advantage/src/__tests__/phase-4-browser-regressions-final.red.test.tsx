import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogTags } from "@/components/blog/blog-tags";
import ReadingAdvantage from "@/app/[locale]/(marketing)/products/reading-advantage/page";
import { en as enReadingMessages } from "@/locales/pages/products/reading-advantage";
import { th as thReadingMessages } from "@/locales/pages/products/reading-advantage";
import { zh as zhReadingMessages } from "@/locales/pages/products/reading-advantage";

const serverWiring = vi.hoisted(() => ({
  messages: {} as Record<string, unknown>,
}));

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(async (scope: string) => (key: string) => {
    if (scope === "pages.products.readingAdvantage") {
      const message = key.split(".").reduce<unknown>((value, segment) => {
        if (!value || typeof value !== "object") {
          return undefined;
        }

        return (value as Record<string, unknown>)[segment];
      }, serverWiring.messages);

      return typeof message === "string" ? message : `${scope}.${key}`;
    }

    return `${scope}.${key}`;
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

afterEach(() => {
  cleanup();
  serverWiring.messages = {};
});

const longTag =
  "an-extremely-long-blog-article-tag-that-must-stay-within-the-mobile-viewport";
const readingMessageKey = "resultsSection.stats.2.value";
const readingMessagePath = `pages.products.readingAdvantage.${readingMessageKey}`;
const readingLocales = [
  enReadingMessages,
  thReadingMessages,
  zhReadingMessages,
] as const;

function getMessage(messages: object, key: string): unknown {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, messages);
}

describe("Final Phase 4 browser regression contracts", () => {
  it("keeps article tags and their content inside a 390px viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    const rendered = render(<BlogTags tags={[longTag]} />);
    const tagContainer = rendered.container.firstElementChild;
    const tag = screen.getByRole("link", { name: longTag });
    const contained =
      tagContainer?.classList.contains("min-w-0") &&
      tagContainer.classList.contains("max-w-full") &&
      tag.classList.contains("min-w-0") &&
      tag.classList.contains("max-w-full") &&
      tag.classList.contains("break-words");

    expect
      .soft(
        contained,
        "Final browser finding: blog article tags must stay within 390px",
      )
      .toBe(true);
  });

  it("renders the affected Reading Advantage message in en, th, and zh", async () => {
    const localeResults = [];

    for (const messages of readingLocales) {
      serverWiring.messages = messages as unknown as Record<string, unknown>;
      const rendered = render(await ReadingAdvantage());
      const message = getMessage(messages, readingMessageKey);
      const content = rendered.container.textContent ?? "";

      localeResults.push(
        typeof message === "string" &&
          message.length > 0 &&
          message !== readingMessagePath &&
          content.includes(message) &&
          !content.includes(readingMessagePath),
      );
      cleanup();
    }

    expect
      .soft(
        localeResults.every(Boolean),
        `${readingMessagePath} must exist in en, th, and zh and render text`,
      )
      .toBe(true);
  });
});
