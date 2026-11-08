// @vitest-environment jsdom
/**
 * Task 2.2a: the 404 link keeps the locale of the route (carried Phase 1 item N6; strategy P2.2
 * `look-not-found-locale` and P2.7; the F4 finding of the Phase 1 browser review).
 *
 * `not-found.tsx` reads `getLocale()`, and for a 404 that call falls back to the routing default
 * (`th`). So the English draft week `/en/st/2/2` links to `/th/st/2/1`, and a child who reads in
 * English lands on the Thai page. The link target must come from `parseStorytimePath`, which reads
 * the locale of the path against the known locales, and never from the `locale` prop or the path
 * text. The prop stays in the signature; the cases pass a prop that conflicts with the path.
 *
 * At the base the view builds the target from the `locale` prop, so the two cases with a
 * conflicting prop fail. The Thai path with the Thai prop and the unknown locale pass at the base
 * (named characterization: they do not separate the path from the prop).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const app = resolve(import.meta.dirname, "..");
const viewPath = resolve(app, "app/[locale]/not-found-view.tsx");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;

/** The pathname that `usePathname()` gives to the view in the current case. */
const pathnameState = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameState.value }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => english[key] ?? key,
  useLocale: () => "th",
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...rest }: { href: unknown; children?: unknown }) =>
      React.createElement("a", { href: typeof href === "string" ? href : String(href), ...rest }, children as never),
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  pathnameState.value = null;
});

/** One case of the link target. */
interface LinkCase {
  name: string;
  path: string;
  locale: string;
  openWeeks: Record<number, number | null>;
  /** The expected `href`, or `null` for no link. */
  href: string | null;
  /** Whether the case holds at the base (characterization). */
  holdsAtBase: boolean;
}

const CASES: LinkCase[] = [
  { name: "an English path with the Thai prop links to /en", path: "/en/st/2/2", locale: "th", openWeeks: { 2: 1 }, href: "/en/st/2/1", holdsAtBase: false },
  { name: "a Thai path with the English prop links to /th", path: "/th/st/2/2", locale: "en", openWeeks: { 2: 1 }, href: "/th/st/2/1", holdsAtBase: false },
  { name: "a Thai path with the Thai prop links to /th (setup)", path: "/th/st/2/2", locale: "th", openWeeks: { 2: 1 }, href: "/th/st/2/1", holdsAtBase: true },
  { name: "an unknown locale in the path shows no link", path: "/de/st/2/2", locale: "en", openWeeks: { 2: 1 }, href: null, holdsAtBase: true },
];

/**
 * Renders the 404 view and returns the hrefs of its links.
 * @param path The path that `usePathname()` gives.
 * @param locale The `locale` prop.
 * @param openWeeks The highest open week of each level.
 * @returns The link targets in the rendered view.
 */
async function renderedLinks(
  path: string,
  locale: string,
  openWeeks: Record<number, number | null>,
): Promise<string[]> {
  expect(existsSync(viewPath), "Missing apps/storytime/app/[locale]/not-found-view.tsx").toBe(true);
  pathnameState.value = path;
  const modulePath = "../app/[locale]/not-found-view";
  const { NotFoundView } = (await import(/* @vite-ignore */ modulePath)) as {
    NotFoundView: ComponentType<{ openWeeks: Record<number, number | null>; locale: string }>;
  };
  const { container } = render(<NotFoundView openWeeks={openWeeks} locale={locale} />);
  return [...container.querySelectorAll("a")].map((link) => link.getAttribute("href") ?? "");
}

describe("the 404 link keeps the locale of the route (N6)", () => {
  it.each(CASES)("$name", async ({ path, locale, openWeeks, href }) => {
    const links = await renderedLinks(path, locale, openWeeks);
    expect(`links=${links.length}`).toBe(`links=${href === null ? 0 : 1}`);
    if (href !== null) expect(links[0], `the target must come from the path ${path}`).toBe(href);
  });

  it("link_cases has a floor of 3 and the conflicting-prop cases are present", () => {
    const withLink = CASES.filter((entry) => entry.href !== null);
    expect(`link_cases=${withLink.length}`).toMatch(/^link_cases=([3-9]|[1-9][0-9]+)$/);
    const conflicting = CASES.filter((entry) => entry.href !== null && !entry.href.startsWith(`/${entry.locale}/`));
    expect(conflicting.length, "at least two cases name a prop that conflicts with the path").toBeGreaterThanOrEqual(2);
    expect(CASES.filter((entry) => entry.holdsAtBase).length, "the characterization cases are named").toBe(2);
  });
});
