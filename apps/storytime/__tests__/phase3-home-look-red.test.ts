// @vitest-environment jsdom
/**
 * Phase 3 task 3.3 Red: the signed-in home page `/[locale]/st` gets the Storytime look.
 *
 * PM order 2026-11-19, word for word: "the plain home page after sign-in gets the Storytime
 * look after launch (post-launch row, no 11-20 work)." Today the home page renders a bare
 * `main` on the cream body. It has no `data-place`, no hero window, and no shared frame.
 * The week pages hold all three.
 *
 * This file renders the signed-in home page in jsdom. It applies one look check to that page
 * and to a shipped week page, so the week page is the positive control. The place and hero
 * values must be selectors that `app/look.css` styles. The home page must import the same
 * frame module as the week page. No hash is used (AGENTS.md hashing policy).
 */
import "@testing-library/jest-dom/vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const app = resolve(import.meta.dirname, "..");
const homePagePath = resolve(app, "app/[locale]/st/page.tsx");
const weekPagePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const framePath = resolve(app, "app/[locale]/frame.tsx");
const lookCssPath = resolve(app, "app/look.css");

/** The route mocks shared by the two page renders. */
const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));

vi.mock("../lib/media/sign", () => ({ signWeekMedia: async () => ({}) }));
vi.mock("../lib/content", () => ({
  loadVisibleWeek: routeMocks.loadVisibleWeek,
  firstOpenWeek: async () => null,
}));
vi.mock("../lib/auth", () => ({
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));
vi.mock("../lib/teacher", () => ({ teacherRoutesEnabled: () => false }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations:
    async ({ locale }: { locale?: string }) =>
    (key: string) =>
      `${locale ?? "th"}:${key}`,
}));

import week3 from "../content/l2/w03.json";
import type { StorytimeWeek } from "../lib/contracts/week";
import StorytimeHomePage from "../app/[locale]/st/page";
import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";

/**
 * Reads a source file. The assertion names a file that is absent.
 * @param path The absolute path.
 * @returns The file text.
 */
function readSource(path: string): string {
  expect(existsSync(path), `Missing ${path.replace(`${resolve(app, "../..")}/`, "")}`).toBe(true);
  return readFileSync(path, "utf8");
}

/** Renders the signed-in home page in Thai. */
async function renderHome() {
  const element = await StorytimeHomePage({ params: Promise.resolve({ locale: "th" }) });
  return render(element);
}

/** Renders the home view of a shipped week in Thai. This is the positive control. */
async function renderWeek() {
  routeMocks.loadVisibleWeek.mockResolvedValue(JSON.parse(JSON.stringify(week3)) as StorytimeWeek);
  const element = await StorytimeWeekPage({
    params: Promise.resolve({ locale: "th", level: "2", week: "3" }),
    searchParams: Promise.resolve({}),
  });
  return render(element);
}

/**
 * Reads the place and hero values that the style sheet actually styles.
 * A4: both sets must hold at least one value before the check uses them.
 * @param css The text of look.css.
 * @returns The styled place values and the styled hero values.
 */
function lookValues(css: string): { places: Set<string>; heroes: Set<string> } {
  const places = new Set([...css.matchAll(/data-place="([a-z]+)"/g)].map((match) => match[1]!));
  const heroes = new Set([...css.matchAll(/data-hero="([a-z]+)"/g)].map((match) => match[1]!));
  expect(`look_place_values=${places.size}`).toMatch(/^look_place_values=[1-9][0-9]*$/);
  expect(`look_hero_values=${heroes.size}`).toMatch(/^look_hero_values=[1-9][0-9]*$/);
  return { places, heroes };
}

/** The outcome of one look check. */
interface LookResult {
  violations: string[];
  place: string | null;
  mainHero: string | null;
  heroWindow: string | null;
}

/**
 * Applies the task 3.3 look check to a rendered page.
 * The same check judges the home page and the week page.
 * @param container The rendered container.
 * @param css The text of look.css.
 * @returns The violations and the values that the page carries.
 */
function checkLook(container: HTMLElement, css: string): LookResult {
  const { places, heroes } = lookValues(css);
  const violations: string[] = [];
  const main = container.querySelector("main");
  if (!main) {
    violations.push("the page root is not a main");
    return { violations, place: null, mainHero: null, heroWindow: null };
  }
  const place = main.getAttribute("data-place");
  if (place === null) violations.push("main has no data-place");
  else if (!places.has(place)) violations.push(`data-place=${place} is not styled by look.css`);

  const mainHero = main.getAttribute("data-hero");
  if (mainHero !== null && !heroes.has(mainHero)) {
    violations.push(`main data-hero=${mainHero} is not styled by look.css`);
  }

  const header = container.querySelector("header[data-hero]");
  const heroWindow = header?.getAttribute("data-hero") ?? null;
  if (!header) {
    violations.push("the page has no hero window header");
  } else {
    if (heroWindow === null || !heroes.has(heroWindow)) {
      violations.push(`hero window data-hero=${heroWindow} is not styled by look.css`);
    }
    if (!header.querySelector("[data-level-week]")) {
      violations.push("the hero window has no shared-frame level and week label");
    }
    if (!header.querySelector("[data-logo]")) {
      violations.push("the hero window has no shared-frame logo");
    }
  }
  return { violations, place, mainHero, heroWindow };
}

/**
 * Checks that the original copy and the sign-out control stay on the home page.
 * @param container The rendered container.
 * @returns The violations.
 */
function checkPreservedContent(container: HTMLElement): string[] {
  const violations: string[] = [];
  const text = container.textContent ?? "";
  for (const key of ["stFallbackHeading", "stFallbackLine"]) {
    if (!text.includes(`th:${key}`)) violations.push(`the home page lost the text ${key}`);
  }
  const form = container.querySelector('form[action="/api/auth/sign-out"]');
  if (!form) violations.push("the home page lost the sign-out form");
  else if (!form.querySelector('button[type="submit"]')) {
    violations.push("the sign-out form lost its submit button");
  }
  return violations;
}

afterEach(() => {
  cleanup();
  routeMocks.loadVisibleWeek.mockReset();
});

describe("Phase 3 task 3.3: the signed-in home look", () => {
  it("the home page root is a main with a data-place that look.css styles", async () => {
    const css = readSource(lookCssPath);
    const { container } = await renderHome();
    const result = checkLook(container, css);
    expect(result.place, "the home main must carry data-place").not.toBeNull();
    expect(result.violations, result.violations.join("; ")).toEqual([]);
  });

  it("the home page renders the shared frame hero window", async () => {
    const css = readSource(lookCssPath);
    const { container } = await renderHome();
    const result = checkLook(container, css);
    const frameViolations = result.violations.filter((violation) => violation.includes("hero window"));
    expect(frameViolations, frameViolations.join("; ")).toEqual([]);
    expect(`home_hero_window=${result.heroWindow ?? "none"}`).toMatch(
      /^home_hero_window=(cover|band|meadow|oak|path)$/,
    );
  });

  it("the home page imports the same frame module as the week page", () => {
    const home = readSource(homePagePath);
    const week = readSource(weekPagePath);
    expect(existsSync(framePath), "Missing apps/storytime/app/[locale]/frame.tsx").toBe(true);
    const importsFrame = (source: string) =>
      /import\s*\{[^}]*\bFrame\b[^}]*\}\s*from\s*["'][^"']*frame["']/.test(source);
    expect(importsFrame(week), "the week page imports the shared frame (positive control)").toBe(true);
    expect(importsFrame(home), "the home page must import the shared frame").toBe(true);
  });

  it("the home page keeps its existing text and its sign-out form", async () => {
    const { container } = await renderHome();
    const violations = checkPreservedContent(container);
    expect(violations, violations.join("; ")).toEqual([]);
  });

  it("positive control: the shipped week page passes the same look check", async () => {
    const css = readSource(lookCssPath);
    const { container } = await renderWeek();
    const result = checkLook(container, css);
    expect(`week_data_place=${result.place ?? "none"}`).toMatch(
      /^week_data_place=(meadow|grove|oak|trail|path)$/,
    );
    expect(`week_hero_window=${result.heroWindow ?? "none"}`).toMatch(
      /^week_hero_window=(cover|band|meadow|oak|path)$/,
    );
    expect(result.violations, result.violations.join("; ")).toEqual([]);
  });

  it("self-test: the look check rejects a bare main (non-vacuity)", () => {
    const css = readSource(lookCssPath);
    const bare = document.createElement("div");
    bare.innerHTML =
      '<main class="mx-auto"><h1>Scan the code in the book</h1>' +
      '<form action="/api/auth/sign-out"><button type="submit">Sign out</button></form></main>';
    const result = checkLook(bare, css);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations).toContain("main has no data-place");
    expect(result.violations).toContain("the page has no hero window header");
  });
});
