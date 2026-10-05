// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createElement,
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { GoToTop } from "../go-to-top";
import ArticleShowcaseCard from "../articles/article-showcase-card";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    ...props
  }: { children?: ReactNode; href?: string } & Record<string, unknown>) =>
    createElement("a", props as Record<string, unknown>, children),
  usePathname: () => "/",
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  }),
}));

/**
 * Wraps an element in the real message tree through the next-intl provider.
 * @param locale The locale to render.
 * @param tree The parsed message dictionary from messages/<locale>.json.
 * @param node The component element to wrap.
 * @returns The provider-wrapped element.
 */
function withMessages(
  locale: string,
  tree: Record<string, unknown>,
  node: ReactElement,
): ReactElement {
  type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;
  const Provider = NextIntlClientProvider as unknown as ComponentType<{
    locale: string;
    messages: ProviderProps["messages"];
  }>;
  return createElement(Provider, { locale, messages: tree }, node);
}

afterEach(() => {
  cleanup();
});

/**
 * Reads a source file relative to the app root.
 * @param rel Path relative to apps/primary-advantage.
 * @returns File contents.
 */
function read(rel: string): string {
  return readFileSync(join(appRoot, rel), "utf8");
}

/**
 * Reads and parses a locale message file.
 * @param locale Locale file basename without extension.
 * @returns Parsed message dictionary.
 */
function messages(locale: string): Record<string, unknown> {
  return JSON.parse(read(`messages/${locale}.json`)) as Record<string, unknown>;
}

describe("FR-4 clickable elements are keyboard-reachable", () => {
  // Phase 2a (primary_ux_rework_20261003): the lesson option is a second
  // real link on the card, not a toggle button.
  it("reaches the showcase story and its lesson through real links", () => {
    const en = messages("en");
    const readList = en.ReadList as Record<string, string>;
    const card = createElement(ArticleShowcaseCard, {
      article: {
        id: "article-1",
        title: "River Crossing",
        summary: "A story about a river.",
      },
    });
    render(withMessages("en", en, card));

    expect(screen.getByRole("link", { name: "River Crossing" })).toHaveAttribute(
      "href",
      "/student/read/article-1",
    );
    expect(
      screen.getByRole("link", {
        name: readList.lessonLabel.replace("{title}", "River Crossing"),
      }),
    ).toHaveAttribute("href", "/student/lesson/article-1?type=article");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // The lesson link name must follow the message tree, not a hardcoded string.
    cleanup();
    const patched = {
      ...en,
      ReadList: { ...readList, lessonLabel: "SENTINEL-LESSON {title}" },
    } as Record<string, unknown>;
    render(withMessages("en", patched, card));

    expect(
      screen.getByRole("link", { name: "SENTINEL-LESSON River Crossing" }),
    ).toBeInTheDocument();
  });

  it("names the back-to-top link", () => {
    const en = messages("en");
    const components = en.Components as Record<string, string>;

    render(
      withMessages("en", en, createElement(GoToTop)),
    );

    const link = screen.getByRole("link", { name: components.backToTop });
    expect(link).toHaveAttribute("aria-label", components.backToTop);
    cleanup();

    // The accessible name must follow the message tree, not a hardcoded string.
    const patched = {
      ...en,
      Components: { ...components, backToTop: "SENTINEL-BACK-TO-TOP" },
    } as Record<string, unknown>;
    render(withMessages("en", patched, createElement(GoToTop)));

    expect(
      screen.getByRole("link", { name: "SENTINEL-BACK-TO-TOP" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: components.backToTop }),
    ).not.toBeInTheDocument();
  });
});

describe("FR-5 APK learning-mode labels are translated", () => {
  // KEEP-WITH-JUSTIFICATION: locale data pin, not a source-structure
  // assertion. It validates message-file content used by the behavioral
  // ApkHost render tests in structural-alignment-i18n.test.tsx.
  it("defines ApkHost keys in every locale", () => {
    for (const locale of ["en", "th", "vi", "cn", "tw"]) {
      const apk = messages(locale).ApkHost as Record<string, string>;
      expect(apk.readMode).toBeTruthy();
      expect(apk.listenMode).toBeTruthy();
      expect(apk.signInToPlayChallenge).toBeTruthy();
      expect(apk.signInToPlayGame).toBeTruthy();
    }
  });
});

describe("FR-5 footer, games, licence, and school strings", () => {
  // KEEP-WITH-JUSTIFICATION: locale data pin, not a source-structure
  // assertion. It validates message-file key parity used by the behavioral
  // render tests in structural-alignment-i18n.test.tsx.
  it("keeps the new namespaces in key parity across locales", () => {
    const en = messages("en");
    for (const locale of ["th", "vi", "cn", "tw"]) {
      const other = messages(locale);
      for (const ns of ["ApkHost", "StudentGames", "Footer", "LicenseForm", "SchoolForm"]) {
        expect(Object.keys(other[ns] as object).sort()).toEqual(
          Object.keys(en[ns] as object).sort(),
        );
      }
    }
  });
});
