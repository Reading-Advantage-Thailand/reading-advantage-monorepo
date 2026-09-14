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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  it("toggles the showcase lesson option from a real button", () => {
    const en = messages("en");
    const article = en.Article as Record<string, string>;
    render(
      withMessages(
        "en",
        en,
        createElement(ArticleShowcaseCard, {
          article: {
            id: "article-1",
            title: "River Crossing",
            summary: "A story about a river.",
          },
        }),
      ),
    );

    const toggle = screen.getByRole("button", {
      name: article.showLessonOption,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    const pressed = screen.getByRole("button", {
      name: article.hideLessonOption,
    });
    expect(pressed).toHaveAttribute("aria-pressed", "true");

    // The names must follow the message tree, not a hardcoded string.
    cleanup();
    const patched = {
      ...en,
      Article: {
        ...article,
        showLessonOption: "SENTINEL-SHOW-LESSON",
        hideLessonOption: "SENTINEL-HIDE-LESSON",
      },
    } as Record<string, unknown>;
    render(
      withMessages(
        "en",
        patched,
        createElement(ArticleShowcaseCard, {
          article: {
            id: "article-1",
            title: "River Crossing",
            summary: "A story about a river.",
          },
        }),
      ),
    );

    const sentinelToggle = screen.getByRole("button", {
      name: "SENTINEL-SHOW-LESSON",
    });
    fireEvent.click(sentinelToggle);
    expect(
      screen.getByRole("button", { name: "SENTINEL-HIDE-LESSON" }),
    ).toHaveAttribute("aria-pressed", "true");
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
  it("reads both labels from messages", () => {
    const source = read("components/apk/StudentCartridgeHost.tsx");
    expect(source).toContain('useTranslations("ApkHost")');
    expect(source).toContain('{t("readMode")}');
    expect(source).toContain('{t("listenMode")}');
    expect(source).not.toContain("Read Thai");
    expect(source).not.toContain("Listen to English");
  });

  it("keeps the locale prefix on sign-in links and catalog navigation", () => {
    const source = read("components/apk/StudentCartridgeHost.tsx");
    expect(source).toContain("`/${locale}/auth/signin?redirect=");
    expect(source).toContain('router.push("/student/games")');
    expect(source).not.toContain("window.location.assign");
  });

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

describe("FR-5 locale-aware sign-in redirects, links, and logout", () => {
  it("logs out through the i18n router", () => {
    const source = read("components/nav/user-account-nav.tsx");
    expect(source).toContain("useRouter");
    expect(source).toContain('router.push("/")');
    expect(source).not.toContain("window.location.href");
  });

  it("redirects student sign-in through the i18n router", () => {
    const source = read("components/auth/student-signin-form.tsx");
    expect(source).toContain('from "@/i18n/navigation"');
    expect(source).toContain("router.push(");
    expect(source).not.toContain("window.location.href");
  });

  it("routes teacher sign-in through the i18n router", () => {
    const source = read("components/auth/teacher-signin-form.tsx");
    expect(source).toContain('useRouter } from "@/i18n/navigation"');
  });

  it("redirects anonymous users with the locale-aware redirect", () => {
    for (const file of [
      "app/[locale]/(student)/student/lesson/[id]/page.tsx",
      "app/[locale]/(student)/settings/user-profile/page.tsx",
      "app/[locale]/(student)/student/read/[articleId]/page.tsx",
    ]) {
      const source = read(file);
      expect(source).toContain('redirect } from "@/i18n/navigation"');
      expect(source).toContain('redirect({ href: "/auth/signin", locale })');
      expect(source).not.toContain('from "next/navigation"');
    }
  });

  it("links through the i18n Link", () => {
    for (const file of [
      "app/[locale]/(student)/student/games/page.tsx",
      "app/[locale]/teacher/my-classes/page.tsx",
      "app/[locale]/unauthorized/page.tsx",
      "app/[locale]/teacher/game-challenges/page.tsx",
    ]) {
      const source = read(file);
      expect(source).toMatch(/Link.*from "@\/i18n\/navigation"/);
      expect(source).not.toContain('from "next/link"');
    }
  });
});

describe("FR-5 teacher dashboard placeholder", () => {
  it("redirects to the classroom list", () => {
    const source = read("app/[locale]/teacher/dashboard/page.tsx");
    expect(source).toContain('redirect({ href: "/teacher/my-classes", locale');
    expect(source).not.toContain("currentUser");
    expect(source).not.toContain("TeacherDashboard</div>");
  });
});

describe("FR-5 marketing and auth metadata", () => {
  it("exports metadata from marketing and auth pages", () => {
    for (const file of [
      "app/[locale]/(index)/page.tsx",
      "app/[locale]/(index)/about/page.tsx",
      "app/[locale]/(index)/contact/page.tsx",
      "app/[locale]/(index)/terms/page.tsx",
      "app/[locale]/(index)/privacy-policy/page.tsx",
      "app/[locale]/auth/signin/page.tsx",
      "app/[locale]/auth/signup/page.tsx",
      "app/[locale]/auth/forgot-password/page.tsx",
      "app/[locale]/(student)/student/games/page.tsx",
    ]) {
      const source = read(file);
      expect(source).toMatch(/export (const metadata|async function generateMetadata)/);
    }
  });
});

describe("FR-5 footer, games, licence, and school strings", () => {
  it("translates the footer through messages", () => {
    const source = read("components/index/footer.tsx");
    expect(source).toContain('useTranslations("Footer")');
    expect(source).toContain('t("tagline")');
    expect(source).toContain('t("aboutUs")');
    expect(source).toContain('t("privacyPolicy")');
  });

  it("translates the games catalogue heading", () => {
    const source = read("app/[locale]/(student)/student/games/page.tsx");
    expect(source).toContain('namespace: "StudentGames"');
    expect(source).toContain('{t("title")}');
    expect(source).not.toContain(">Student games<");
  });

  it("translates licence form labels", () => {
    const source = read("components/system/edit-license-form.tsx");
    expect(source).toContain('useTranslations("LicenseForm")');
    expect(source).toContain('t("name")');
    expect(source).toContain('t("status")');
    expect(source).not.toContain("<FormLabel>License Name</FormLabel>");
    expect(source).not.toContain("<FormLabel>Status</FormLabel>");
  });

  it("translates school form labels", () => {
    const source = read("components/system/create-school-form.tsx");
    expect(source).toContain('useTranslations("SchoolForm")');
    expect(source).toContain('t("name")');
    expect(source).not.toContain("School Name");
  });

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
