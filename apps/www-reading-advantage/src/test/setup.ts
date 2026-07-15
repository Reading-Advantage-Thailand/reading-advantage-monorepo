import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("@/locales/navigation", () => ({
  Link: React.forwardRef<
    HTMLAnchorElement,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
      href: string | { pathname: string };
    }
  >(function MockLocalizedLink({ href, ...props }, ref) {
    return React.createElement("a", {
      ref,
      href: typeof href === "string" ? href : href.pathname,
      ...props,
    });
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn((scope: string) => (key: string) => {
    if (key.endsWith(".image")) {
      return "/images/placeholder.png";
    }
    return `${scope}.${key}`;
  }),
  useCurrentLocale: vi.fn(() => "en"),
  useChangeLocale: vi.fn(() => vi.fn()),
}));

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve((key: string) => key)),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve((key: string) => {
      if (key.endsWith(".image")) {
        return "/images/placeholder.png";
      }
      return `${scope}.${key}`;
    }),
  ),
  getStaticParams: vi.fn(() => []),
}));
