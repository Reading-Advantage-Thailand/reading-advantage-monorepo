// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import th from "../../../../messages/th.json";
import cn from "../../../../messages/cn.json";
import tw from "../../../../messages/tw.json";
import vi_ from "../../../../messages/vi.json";
import { withPublicFallback } from "@/i18n/public-fallback";

type Messages = Record<string, unknown>;
const MESSAGES: Record<string, Messages> = {
  en,
  th,
  cn,
  tw,
  vi: withPublicFallback(vi_ as Messages, en as Messages),
};

const state = vi.hoisted(() => ({ locale: "en", redirects: [] as unknown[] }));

vi.mock("next-intl/server", () => ({
  getLocale: async () => state.locale,
  getTranslations: async (arg: string | { locale?: string; namespace: string }) => {
    const namespace = typeof arg === "string" ? arg : arg.namespace;
    const locale = typeof arg === "string" ? state.locale : (arg.locale ?? state.locale);
    return createTranslator({ locale, messages: MESSAGES[locale], namespace } as never);
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  permanentRedirect: (args: unknown) => {
    state.redirects.push(args);
    throw new Error("NEXT_REDIRECT");
  },
}));

import Home from "../page";
import AboutPage from "../about/page";
import ContactPage from "../contact/page";
import BooksPage from "../books/page";
import AuthorsPage from "../authors/page";

afterEach(cleanup);

const PAGES: { name: string; page: () => Promise<ReactElement>; title: (m: Messages) => string }[] = [
  { name: "home", page: Home, title: (m) => (m.PublicHome as { hero: { title: string } }).hero.title },
  { name: "about", page: AboutPage, title: (m) => (m.PublicAbout as { title: string }).title },
  { name: "contact", page: ContactPage, title: (m) => (m.PublicContact as { title: string }).title },
  { name: "books", page: BooksPage, title: (m) => (m.PublicBooks as { title: string }).title },
];

describe("the public pages", () => {
  for (const locale of Object.keys(MESSAGES)) {
    it(`render every page in ${locale} with its title and no form`, async () => {
      state.locale = locale;
      for (const { page, title } of PAGES) {
        const { container, unmount } = render(await page());
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title(MESSAGES[locale]));
        expect(container.querySelector("form")).toBeNull();
        unmount();
      }
    });
  }

  it("links the free trial call to the contact links", async () => {
    state.locale = "en";
    render(await Home());
    expect(screen.getByRole("link", { name: en.PublicSite.trialCta })).toHaveAttribute("href", "#contact");
    expect(document.getElementById("contact")).not.toBeNull();
    expect(screen.getByRole("link", { name: /LINE Official Account/ })).toHaveAttribute("href", "https://line.me/ti/p/Pf7_EF98Pv");
  });

  it("links families to the Tutor Advantage page of the www site in the visitor's language", async () => {
    state.locale = "cn";
    render(await AboutPage());
    expect(screen.getByRole("link", { name: (cn as Messages as { PublicAbout: { families: { link: string } } }).PublicAbout.families.link })).toHaveAttribute(
      "href",
      "https://reading-advantage.com/zh/products/tutor-advantage",
    );
  });

  it("redirects the old Authors page to Our books for good", async () => {
    state.locale = "th";
    state.redirects = [];
    await expect(AuthorsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirects).toEqual([{ href: "/books", locale: "th" }]);
  });

  it("gives each page a complete title, so the site name is not added twice", async () => {
    const { generateMetadata } = await import("../books/page");
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.title).toEqual({ absolute: en.PublicBooks.meta.title });
  });
});
