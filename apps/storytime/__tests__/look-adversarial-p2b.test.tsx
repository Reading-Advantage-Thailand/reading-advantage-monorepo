// @vitest-environment jsdom
/**
 * Adversarial cases for the brand chrome of Phase 2b (track storytime_look_20261107, spec FR-4,
 * strategy P2b.6).
 *
 * The strategy names these surfaces: the viewports 320x568, 568x320, and 1440x900 with a 200
 * percent zoom, a 60-character English and Thai title in the plaque, a missing logo file, a
 * shared rule that catches a text input or the red alert, a page with no panel, the 403 page and
 * the `/st` fallback. The remediation rounds add the fitted plaque font at extreme
 * `--title-chars` values, the `[tabindex]` part of the focus rule on the read-along words (Review
 * C nit C3-F1), and the focus ring against a control box shadow.
 *
 * jsdom paints nothing. These cases therefore read `app/look.css` as rules and match each rule
 * against the real markup of the shipped components and pages (`Element.matches`), with a small
 * cascade (media condition, specificity, source order). They prove which rule reaches which
 * element and which size the rule gives. They do not prove a painted box or a glyph width. A case
 * that needs a glyph width is a model, and the log hands the paint check to the UX browser review.
 *
 * The cases of this file:
 *   H1 the hero height of each viewport follows the media blocks, including the 200 percent zoom.
 *   H2 the fitted plaque font stays inside its floor and cap for 0, 1, 6, 13, 60, and 200 chars.
 *   H3 the frame takes hostile titles as text and always writes a finite `--title-chars`.
 *   H4 a missing logo file leaves the label, the plaque, and the text alternative in place.
 *   H5 no shared rule reaches a text input, the red alert, the draft note, or the 403 link.
 *   H6 the red alerts of the reader and of the decodable page keep out of the chrome rules.
 *   H7 the `[tabindex]` part of the focus rule reaches only the sentences and the clip words.
 *   H8 the level and week label keeps clear of the logo at 320 wide in the worst locale case.
 *   H9 the shared-rule check rejects broken copies of the style sheet (self-test).
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { parseCss, selectorParts, type CssRule } from "./helpers/css-rules";

const routeMocks = vi.hoisted(() => ({
  loadVisibleWeek: vi.fn(),
  pathname: { value: "/en/st/2/9" as string | null },
}));

vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));
vi.mock("../lib/media/sign", () => ({ signWeekMedia: async () => ({}) }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) => (key: string) => `${locale ?? "th"}:${key}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  usePathname: () => routeMocks.pathname.value,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("../lib/auth", () => ({
  SIGN_IN_USERNAME_COOKIE: "st_signin_username",
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
  getCurrentUser: async () => null,
  mayOpenPath: () => true,
}));

const app = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(app, "app/look.css"), "utf8");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const messages = {
  en: JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>,
  th: JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>,
};

/** The width cap of the page column, `max-w-xl` of the page classes, in CSS px. */
const COLUMN_PX = 576;

/** One viewport in CSS px. */
interface Viewport {
  /** The width. */
  w: number;
  /** The height. */
  h: number;
}

/** The viewports of strategy P2b.6. The last one is 200 percent zoom of 320 x 568. */
const VIEWPORTS: Record<string, Viewport> = {
  "320x568": { w: 320, h: 568 },
  "568x320": { w: 568, h: 320 },
  "1440x900": { w: 1440, h: 900 },
  "320x568@200": { w: 160, h: 284 },
};

/**
 * Tells whether one media condition holds in a viewport.
 * @param condition The normalized condition text, for example `(max-height: 500px)`.
 * @param viewport The viewport.
 * @returns `true` or `false`, or `null` for a feature this reader does not know.
 */
function mediaHolds(condition: string, viewport: Viewport): boolean | null {
  const parts = condition.split(/\sand\s/).map((part) => part.trim());
  for (const part of parts) {
    const size = /^\((min|max)-(width|height):\s*(\d+(?:\.\d+)?)px\)$/.exec(part);
    if (size) {
      const value = Number(size[3]);
      const actual = size[2] === "width" ? viewport.w : viewport.h;
      if (size[1] === "min" ? actual < value : actual > value) return false;
      continue;
    }
    const orientation = /^\(orientation:\s*(portrait|landscape)\)$/.exec(part);
    if (orientation) {
      const portrait = viewport.h >= viewport.w;
      if ((orientation[1] === "portrait") !== portrait) return false;
      continue;
    }
    return null;
  }
  return true;
}

/** A selector weight as [ids, classes and attributes, types]. */
type Weight = [number, number, number];

/**
 * Compares two selector weights.
 * @param a One weight.
 * @param b The other weight.
 * @returns A positive number when `a` is stronger, a negative number when `b` is stronger, else 0.
 */
function compareWeight(a: Weight, b: Weight): number {
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return 0;
}

/**
 * Computes the weight of one selector (no comma).
 * @param selector The selector.
 * @returns The weight. `:is()` and `:not()` take their strongest argument; `:where()` counts 0.
 */
function weightOf(selector: string): Weight {
  let text = selector.replace(/"[^"]*"|'[^']*'/g, "");
  let extra: Weight = [0, 0, 0];
  text = text.replace(/:where\([^)]*\)/g, "");
  text = text.replace(/:(?:is|not)\(([^)]*)\)/g, (_match, args: string) => {
    for (const arg of args.split(",")) {
      const weight = weightOf(arg.trim());
      if (compareWeight(weight, extra) > 0) extra = weight;
    }
    return "";
  });
  const ids = (text.match(/#[\w-]+/g) ?? []).length;
  const classes = (text.match(/\[[^\]]*\]|\.[\w-]+|(?<!:):[\w-]+/g) ?? []).length;
  const types =
    (text.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length + (text.match(/::[\w-]+/g) ?? []).length;
  return [ids + extra[0], classes + extra[1], types + extra[2]];
}

/** The pseudo-classes that name a state. A reach check drops them and keeps the structure. */
const STATE_PSEUDOS = [/:not\(:disabled\)/g, /:disabled/g, /:active/g, /:focus-visible/g, /:hover/g];

/** The count of selector parts that `Element.matches` could not read. */
const unreadable = { count: 0 };

/**
 * Tells whether one selector part matches one element, ignoring the state pseudo-classes.
 * @param element The element.
 * @param part One selector part of a rule.
 * @returns Whether the part matches. A part with a pseudo-element never matches.
 */
function partMatches(element: Element, part: string): boolean {
  if (part.includes("::")) return false;
  let structural = part;
  for (const pseudo of STATE_PSEUDOS) structural = structural.replace(pseudo, "");
  structural = structural.trim();
  if (structural === "" || structural === ">" || structural.endsWith(">")) return false;
  try {
    return element.matches(structural);
  } catch {
    unreadable.count += 1;
    return false;
  }
}

/** One declaration candidate of the cascade. */
interface Candidate {
  /** The value text. */
  value: string;
  /** Whether the declaration is `!important`. */
  important: boolean;
  /** The selector weight. */
  weight: Weight;
  /** The source order. */
  order: number;
}

/**
 * Gives the cascaded value of one property on one element in one viewport.
 * @param rules The parsed rules.
 * @param element The element.
 * @param property The lower-case property name.
 * @param viewport The viewport.
 * @returns The winning value, or `null` when no rule sets the property.
 */
function cascaded(
  rules: readonly CssRule[],
  element: Element,
  property: string,
  viewport: Viewport,
): string | null {
  let best: Candidate | null = null;
  let order = 0;
  for (const rule of rules) {
    order += 1;
    if (rule.keyframes) continue;
    if (rule.media.some((condition) => mediaHolds(condition, viewport) !== true)) continue;
    for (const part of selectorParts(rule.selector)) {
      if (!partMatches(element, part)) continue;
      for (const declaration of rule.declarations) {
        if (declaration.property !== property) continue;
        const candidate: Candidate = {
          value: declaration.value,
          important: declaration.important,
          weight: weightOf(part),
          order,
        };
        if (
          best === null ||
          (candidate.important && !best.important) ||
          (candidate.important === best.important &&
            (compareWeight(candidate.weight, best.weight) > 0 ||
              (compareWeight(candidate.weight, best.weight) === 0 && candidate.order >= best.order)))
        ) {
          best = candidate;
        }
      }
    }
  }
  return best === null ? null : best.value;
}

/** The parts of a fitted font size: the floor, the width term, the divisor factor, and the cap. */
interface FittedFont {
  floor: number;
  offset: number;
  factor: number;
  cap: number;
}

/**
 * Reads `clamp(Npx, calc((100cqi - Mpx) / (var(--title-chars) * F)), Kpx)`.
 * @param value The font-size declaration value.
 * @returns The parts, or `null` when the value is not a fitted font.
 */
function readFittedFont(value: string | null): FittedFont | null {
  if (value === null) return null;
  const match =
    /^clamp\(\s*(\d+(?:\.\d+)?)px\s*,\s*calc\(\s*\(\s*100cqi\s*-\s*(\d+(?:\.\d+)?)px\s*\)\s*\/\s*\(\s*var\(--title-chars\)\s*\*\s*(\d*\.?\d+)\s*\)\s*\)\s*,\s*(\d+(?:\.\d+)?)px\s*\)$/.exec(
      value.trim(),
    );
  if (!match) return null;
  return { floor: Number(match[1]), offset: Number(match[2]), factor: Number(match[3]), cap: Number(match[4]) };
}

/**
 * Evaluates the fitted font the way CSS does: a division by zero is infinity, and the clamp pins it.
 * @param font The parts of the fitted font.
 * @param headerWidth The width of the hero box, which is the `cqi` base.
 * @param chars The value of `--title-chars`.
 * @returns The font size in px.
 */
function fittedPx(font: FittedFont, headerWidth: number, chars: number): number {
  const raw = (headerWidth - font.offset) / (chars * font.factor);
  return Math.min(font.cap, Math.max(font.floor, raw));
}

/**
 * Gives the width of the hero box in a viewport. The header fills the column, which stops at
 * `max-w-xl`.
 * @param viewport The viewport.
 * @returns The width in px.
 */
function heroWidth(viewport: Viewport): number {
  return Math.min(viewport.w, COLUMN_PX);
}

/**
 * Loads the frame of the app.
 * @returns The frame component.
 */
async function loadFrame(): Promise<
  ComponentType<{ level: number; week: number; title: string; variant: "cover" | "band"; locale?: "en" | "th" }>
> {
  const modulePath = "../app/[locale]/frame";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as { Frame: never };
  return loaded.Frame;
}

/**
 * Renders the frame inside the `main` that the week page renders.
 * @param variant The hero variant.
 * @param title The title.
 * @param locale The locale.
 * @returns The container, the header, the plaque, and the label.
 */
async function renderFrame(variant: "cover" | "band", title: string, locale: "en" | "th" = "en") {
  const Frame = await loadFrame();
  const { container } = render(
    <main data-place="meadow" data-hero="meadow">
      <Frame level={2} week={1} title={title} variant={variant} locale={locale} />
    </main>,
  );
  return {
    container,
    header: container.querySelector<HTMLElement>("header[data-hero]")!,
    plaque: container.querySelector<HTMLElement>("header[data-hero] > h1")!,
    label: container.querySelector<HTMLElement>("[data-level-week]")!,
    logo: container.querySelector<HTMLElement>("[data-logo]")!,
  };
}

/**
 * Adds a word clip for two words of the first page (the other words stay plain) of the read-along book.
 * @param week The week, changed in place.
 * @returns The week.
 */
function withClips(week: StorytimeWeek): StorytimeWeek {
  const book = week.books.find((entry) => entry.kind === "readalong")!;
  const clips: Record<string, string> = {};
  for (const word of ["hello", "pat"]) clips[word] = `words/${word}.mp3`;
  (book.audio as unknown as { wordClips: Record<string, string> }).wordClips = clips;
  return week;
}

/** The props of the week page. */
type WeekPageProps = {
  params: Promise<{ locale: string; level: string; week: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Renders the real week page of one part.
 * @param part The `?part=` value, or `undefined` for the home view.
 * @param locale The locale.
 * @returns The container of the render.
 */
async function renderWeekPage(part: string | undefined, locale: "en" | "th" = "en"): Promise<HTMLElement> {
  routeMocks.loadVisibleWeek.mockResolvedValue(withClips(structuredClone(shipped)));
  const pagePath = "../app/[locale]/st/[level]/[week]/page";
  const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
    default: (props: WeekPageProps) => Promise<ReactElement>;
  };
  const element = await Page({
    params: Promise.resolve({ locale, level: "2", week: "1" }),
    searchParams: Promise.resolve(part ? { part } : {}),
  });
  return render(element).container;
}

/** One reach finding. */
interface Reach {
  /** The page name. */
  page: string;
  /** The element description. */
  element: string;
  /** The selector part of the rule that reaches the element. */
  part: string;
}

/** The rules that every page may legally share: the link floor and the focus ring. */
const SHARED_ALLOWED = ["main > a", ":is(a, button, [tabindex]):focus-visible"];

/**
 * Names an element for a finding.
 * @param element The element.
 * @returns A short name.
 */
function describeElement(element: Element): string {
  const role = element.getAttribute("role");
  return `${element.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${
    element.getAttribute("data-draft") ? "[data-draft]" : ""
  }`;
}

/**
 * Lists the rules of a style sheet that reach an element of a page.
 * @param styleSheet The style sheet text.
 * @param page The page name.
 * @param container The container of the page render.
 * @param pick Tells which elements count.
 * @returns The findings, and the number of elements read.
 */
function reachOf(
  styleSheet: string,
  page: string,
  container: HTMLElement,
  pick: (element: Element) => boolean,
): { findings: Reach[]; elements: number } {
  const rules = parseCss(styleSheet).filter((rule) => !rule.keyframes);
  const findings: Reach[] = [];
  const elements = [...container.querySelectorAll("*")].filter(pick);
  for (const element of elements) {
    for (const rule of rules) {
      for (const part of selectorParts(rule.selector)) {
        if (partMatches(element, part)) {
          findings.push({ page, element: describeElement(element), part });
        }
      }
    }
  }
  return { findings, elements: elements.length };
}

/** The pages without a place: they hold no `data-place`, so no chrome rule may reach them. */
async function renderPlainPage(name: string): Promise<HTMLElement> {
  if (name === "403") {
    const forbiddenPath = "../app/[locale]/teacher/forbidden";
    const { default: Forbidden } = (await import(/* @vite-ignore */ forbiddenPath)) as {
      default: ComponentType<{ heading: string; line: string; link: string; href: string }>;
    };
    return render(<Forbidden heading="No" line="Teachers only" link="Teacher sign-in" href="/en/sign-in" />)
      .container;
  }
  if (name === "fallback") {
    const pagePath = "../app/[locale]/st/page";
    const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
      default: (props: { params: Promise<{ locale: string }> }) => Promise<ReactElement>;
    };
    return render(await Page({ params: Promise.resolve({ locale: "en" }) })).container;
  }
  if (name === "sign-in") {
    const pagePath = "../app/[locale]/sign-in/page";
    const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
      default: (props: {
        params: Promise<{ locale: string }>;
        searchParams: Promise<Record<string, string | undefined>>;
      }) => Promise<ReactElement>;
    };
    return render(
      await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ error: "invalid" }) }),
    ).container;
  }
  if (name === "join") {
    const pagePath = "../app/[locale]/join/page";
    const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
      default: (props: { params: Promise<{ locale: string }> }) => Promise<ReactElement>;
    };
    const container = render(await Page({ params: Promise.resolve({ locale: "en" }) })).container;
    // The draft note shows only while the join copy is a draft. The probe keeps the case alive
    // when the copy is approved: the same classes as the page, in the same place.
    if (!container.querySelector("[data-draft]")) {
      const probe = document.createElement("p");
      probe.setAttribute("data-draft", "true");
      probe.className = "rounded-xl border border-amber-500 p-3";
      probe.textContent = "draft";
      container.querySelector("main")!.prepend(probe);
    }
    return container;
  }
  const viewPath = "../app/[locale]/not-found-view";
  const { NotFoundView } = (await import(/* @vite-ignore */ viewPath)) as {
    NotFoundView: ComponentType<{ openWeeks: Record<number, number | null>; locale: string }>;
  };
  routeMocks.pathname.value = name === "404-week" ? "/en/st/2/9" : "/en/nowhere";
  return render(<NotFoundView openWeeks={{ 2: 3 }} locale="en" />).container;
}

/** The plain pages of the reach cases. */
const PLAIN_PAGES = ["403", "fallback", "sign-in", "join", "404-week", "404-stranger"] as const;

/**
 * Collects the shared-rule violations over every plain page for one style sheet.
 * @param styleSheet The style sheet text.
 * @returns The violation texts, and the counts that guard the loop.
 */
async function sharedRuleViolations(
  styleSheet: string,
): Promise<{ violations: string[]; pages: number; elements: number; hostile: number }> {
  const violations: string[] = [];
  let pages = 0;
  let elements = 0;
  let hostile = 0;
  for (const name of PLAIN_PAGES) {
    const container = await renderPlainPage(name);
    pages += 1;
    const all = reachOf(styleSheet, name, container, () => true);
    elements += all.elements;
    for (const finding of all.findings) {
      if (!SHARED_ALLOWED.includes(finding.part)) {
        violations.push(`${name}: ${finding.element} is reached by the rule part ${finding.part}`);
      }
    }
    const inputs = reachOf(
      styleSheet,
      name,
      container,
      (element) => element.matches("input:not([type=hidden]), [role=alert], [data-draft]"),
    );
    hostile += inputs.elements;
    for (const finding of inputs.findings) {
      violations.push(`${name}: the guarded ${finding.element} is reached by ${finding.part}`);
    }
    cleanup();
  }
  return { violations, pages, elements, hostile };
}

beforeEach(() => {
  unreadable.count = 0;
  routeMocks.pathname.value = "/en/st/2/9";
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("adversarial brand chrome cases of Phase 2b", () => {
  it("H1 the hero height of each viewport follows the media blocks, including the 200 percent zoom", async () => {
    const rules = parseCss(css);
    const expected: Record<string, { cover: number; band: number }> = {
      "320x568": { cover: 280, band: 96 },
      "568x320": { cover: 64, band: 64 },
      "1440x900": { cover: 340, band: 120 },
      // 200 percent zoom of a portrait phone leaves 160 x 284 CSS px: the height block fires.
      "320x568@200": { cover: 64, band: 64 },
    };
    const cases: string[] = [];
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      for (const variant of ["cover", "band"] as const) {
        const { header } = await renderFrame(variant, "Hello!");
        const height = cascaded(rules, header, "height", viewport);
        cases.push(`${name} ${variant}=${height}`);
        expect(height, `${name} ${variant}: the hero height`).toBe(`${expected[name]![variant]}px`);
        cleanup();
      }
    }
    expect(`hero_cases=${cases.length}`, "every viewport and variant must run").toBe("hero_cases=8");
    expect(`unreadable_selectors=${unreadable.count}`, "every selector part must be readable").toBe(
      "unreadable_selectors=0",
    );
  });

  it("H2 the fitted plaque font stays inside its floor and cap for 0, 1, 6, 13, 60, and 200 characters", async () => {
    const rules = parseCss(css);
    const bounds: Record<string, [number, number]> = {
      "320x568 cover": [24, 72],
      "320x568 band": [20, 44],
      "568x320 cover": [20, 32],
      "568x320 band": [20, 32],
      "1440x900 cover": [24, 72],
      "1440x900 band": [20, 44],
      "320x568@200 cover": [20, 32],
      "320x568@200 band": [20, 32],
    };
    let cases = 0;
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      for (const variant of ["cover", "band"] as const) {
        const { plaque } = await renderFrame(variant, "Hello!");
        const declaration = cascaded(rules, plaque, "font-size", viewport);
        const font = readFittedFont(declaration);
        expect(font, `${name} ${variant}: the plaque font must be a fitted clamp, found ${declaration}`).not.toBeNull();
        const [floor, cap] = bounds[`${name} ${variant}`]!;
        expect([font!.floor, font!.cap], `${name} ${variant}: the floor and the cap`).toEqual([floor, cap]);
        const width = heroWidth(viewport);
        for (const chars of [0, 1, 6, 13, 60, 200]) {
          const px = fittedPx(font!, width, chars);
          cases += 1;
          expect(Number.isFinite(px), `${name} ${variant} chars=${chars}: the font must be finite`).toBe(true);
          expect(px, `${name} ${variant} chars=${chars}: the font must hold the floor`).toBeGreaterThanOrEqual(floor);
          expect(px, `${name} ${variant} chars=${chars}: the font must hold the cap`).toBeLessThanOrEqual(cap);
        }
        // One character takes the cap, and 200 characters take the floor, at every viewport.
        expect(fittedPx(font!, width, 1), `${name} ${variant}: one character`).toBe(cap);
        expect(fittedPx(font!, width, 200), `${name} ${variant}: 200 characters`).toBe(floor);
        // A zero length divides by zero. CSS reads infinity, so the clamp gives the cap.
        expect(fittedPx(font!, width, 0), `${name} ${variant}: zero characters`).toBe(cap);
        cleanup();
      }
    }
    expect(`font_cases=${cases}`, "the loop must run every case").toBe("font_cases=48");
    // The shipped titles (6 to 13 characters) shrink with the length and never go below the floor
    // at 320 wide: the fit is what keeps them on one line at the average glyph width.
    const { plaque } = await renderFrame("band", "Hello!");
    const band = readFittedFont(cascaded(rules, plaque, "font-size", VIEWPORTS["320x568"]!))!;
    const sizes = [6, 7, 8, 9, 10, 11, 12, 13].map((chars) => fittedPx(band, 320, chars));
    for (let index = 1; index < sizes.length; index++) {
      expect(sizes[index]!, `band font at ${index + 6} characters`).toBeLessThanOrEqual(sizes[index - 1]!);
    }
    expect(Math.min(...sizes), "the 13-character band font at 320 wide").toBeGreaterThan(20);
  });

  it("H3 the frame takes hostile titles as text and always writes a finite --title-chars", async () => {
    const titles: Record<string, string> = {
      empty: "",
      one: "A",
      english60: "A very long week title that runs past the plaque of the book",
      thai60: "สัปดาห์ที่ยาวและยาวที่สุดในโรงเรื่องของเราทั้งหมดในโลกใบนี้ๆ",
      long200: "W".repeat(200),
      combining: "ก้้้้้้้้้้",
      rtl: "مرحبا بالعالم",
      emoji: "👨‍👩‍👧‍👦 Family",
      markup: "<img src=x onerror=alert(1)><script>alert(1)</script>",
      newline: "Line one\nLine two",
      quote: '"><b>x</b>',
    };
    expect(`titles=${Object.keys(titles).length}`, "the title list must be read").toBe("titles=11");
    expect(titles.english60!.length, "the English fixture holds 60 characters").toBe(60);
    expect(titles.thai60!.length, "the Thai fixture holds 60 characters").toBe(60);
    const failures: string[] = [];
    for (const [name, title] of Object.entries(titles)) {
      for (const variant of ["cover", "band"] as const) {
        for (const locale of ["en", "th"] as const) {
          const { container, plaque, label, logo } = await renderFrame(variant, title, locale);
          if (plaque.textContent !== title) failures.push(`${name} ${variant} ${locale}: the plaque must hold the title as text`);
          if (plaque.querySelector("*") !== null) failures.push(`${name} ${variant} ${locale}: the plaque must hold no child element`);
          if (container.querySelector("script, [onerror]") !== null) {
            failures.push(`${name} ${variant} ${locale}: the title must not reach the markup`);
          }
          const style = plaque.getAttribute("style") ?? "";
          const value = /--title-chars:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? "none";
          if (!/^\d+$/.test(value) || Number(value) !== title.length) {
            failures.push(`${name} ${variant} ${locale}: --title-chars must be ${title.length}, found ${value}`);
          }
          if (container.querySelectorAll("header[data-hero] > h1").length !== 1) failures.push(`${name}: one plaque`);
          if (!label || !logo) failures.push(`${name} ${variant} ${locale}: the label and the logo must stay`);
          cleanup();
        }
      }
    }
    expect(failures.join(" | "), "the hostile titles").toBe("");
  });

  it("H4 a missing logo file leaves the label, the plaque, and the text alternative in place", async () => {
    const { container, logo, label, plaque } = await renderFrame("cover", "Hello!");
    const before = container.innerHTML;
    act(() => {
      logo.dispatchEvent(new Event("error"));
    });
    expect(container.innerHTML, "a failed logo load must not change the markup").toBe(before);
    expect(logo.getAttribute("alt"), "the logo keeps its text alternative").toBe("Storytime Advantage");
    expect(logo.getAttribute("width"), "the logo box is reserved at 48 px (no layout shift)").toBe("48");
    expect(logo.getAttribute("height"), "the logo box is reserved at 48 px (no layout shift)").toBe("48");
    expect(label.textContent, "the label stays readable").toMatch(/Level 2/);
    expect(plaque.textContent, "the plaque stays readable").toBe("Hello!");
    expect(logo.hasAttribute("onerror"), "the logo holds no inline error handler").toBe(false);
    // The rule gives the logo a fixed 48 x 48 box, so a missing file cannot move the plaque.
    const rules = parseCss(css);
    for (const viewport of Object.values(VIEWPORTS)) {
      expect(cascaded(rules, logo, "width", viewport), "the logo width").toBe("48px");
      expect(cascaded(rules, logo, "height", viewport), "the logo height").toBe("48px");
      expect(cascaded(rules, logo, "position", viewport), "the logo is out of the flow").toBe("absolute");
    }
  });

  it("H5 no shared rule reaches a text input, the red alert, the draft note, or the 403 link as chrome", async () => {
    const result = await sharedRuleViolations(css);
    expect(`pages=${result.pages}`, "every plain page must render").toBe(`pages=${PLAIN_PAGES.length}`);
    expect(result.elements, "the pages must hold elements").toBeGreaterThan(40);
    // The sign-in page holds two text inputs and an alert, and the join page holds one draft note.
    expect(`hostile=${result.hostile}`, "the guarded elements must be present").toBe("hostile=4");
    expect(`unreadable_selectors=${unreadable.count}`, "every selector part must be readable").toBe(
      "unreadable_selectors=0",
    );
    expect(result.violations.join(" | "), "the shared rules on the plain pages").toBe("");
  });

  it("H6 the red alerts of the reader and of the decodable page keep out of the chrome rules", async () => {
    const guarded: Record<string, number> = {};
    for (const part of ["book", "decodable"]) {
      const container = await renderWeekPage(part);
      const audio = container.querySelector("audio");
      expect(audio, `${part}: the page must hold an audio element`).not.toBeNull();
      act(() => {
        audio!.dispatchEvent(new Event("error"));
      });
      const alerts = container.querySelectorAll("[role=alert]");
      expect(alerts.length, `${part}: a failed sound must show the alert`).toBe(1);
      expect(alerts[0]!.className, `${part}: the alert keeps its red class`).toContain("text-red-700");
      const result = reachOf(css, part, container, (element) => element.matches("[role=alert]"));
      guarded[part] = result.elements;
      expect(
        result.findings.map((finding) => finding.part).join(" | "),
        `${part}: no look rule may reach the alert`,
      ).toBe("");
      cleanup();
    }
    expect(JSON.stringify(guarded), "both alerts must be read").toBe('{"book":1,"decodable":1}');
    expect(`unreadable_selectors=${unreadable.count}`, "every selector part must be readable").toBe(
      "unreadable_selectors=0",
    );
  });

  it("H7 the [tabindex] part of the focus rule reaches only the sentences and the clip words", async () => {
    const container = await renderWeekPage("book");
    const ring = ":is(a, button, [tabindex])";
    const tabbable = [...container.querySelectorAll<HTMLElement>("[tabindex]")];
    expect(tabbable.length, "the book page must hold tabbable read-along parts").toBeGreaterThan(0);
    const sentences = tabbable.filter((node) => node.matches("[data-sentence][role=button]"));
    const words = tabbable.filter((node) => node.matches("[data-word]"));
    expect(`sentences=${sentences.length} words=${words.length}`, "the sentences and the clip words are read").toMatch(
      /^sentences=[1-9]\d* words=[1-9]\d*$/,
    );
    const stray = tabbable.filter((node) => !node.matches("[data-sentence][role=button], [data-word]"));
    expect(
      stray.map(describeElement).join(","),
      "a tabindex outside the sentences and the words would draw the 6 px ring around a container",
    ).toBe("");
    for (const sentence of sentences) {
      expect(sentence.getAttribute("tabindex"), "a sentence is a tab stop").toBe("0");
    }
    for (const word of words) {
      expect(word.getAttribute("tabindex"), "a clip word is a programmatic stop").toBe("-1");
    }
    // The shared ring reaches every one of them.
    for (const node of tabbable) {
      expect(partMatches(node, ring), `the ring must reach ${describeElement(node)}`).toBe(true);
    }
    // A word without a clip carries no tabindex, so the ring does not reach it.
    const plain = [...container.querySelectorAll<HTMLElement>("[data-word]")].filter(
      (node) => !node.hasAttribute("tabindex"),
    );
    expect(plain.length, "the page must hold words without a clip").toBeGreaterThan(0);
    for (const node of plain) {
      expect(partMatches(node, ring), "a plain word is not reached by the ring").toBe(false);
    }
    // The ring replaces the Tailwind ring of the package: the shadow of the ring is important.
    const ringRule = parseCss(css).find((rule) =>
      selectorParts(rule.selector).includes(":is(a, button, [tabindex]):focus-visible"),
    );
    expect(ringRule, "the focus rule must exist").toBeDefined();
    const shadow = ringRule!.declarations.find((declaration) => declaration.property === "box-shadow");
    expect(shadow?.important, "the ring shadow wins over every control shadow").toBe(true);
    expect(words[0]!.className, "the package asks for its own ring on a word").toContain("focus-visible:ring-2");
  });

  it("H8 the level and week label keeps clear of the logo at 320 wide in the worst locale case", async () => {
    const rules = parseCss(css);
    const viewport = VIEWPORTS["320x568"]!;
    const results: string[] = [];
    for (const locale of ["en", "th"] as const) {
      const { label, logo } = await renderFrame("cover", "Hello!", locale);
      // The worst route: two digits for the level and for the week.
      const text = `${messages[locale].barLevel!.replace("{level}", "12")} · ${messages[locale].barWeek!.replace(
        "{week}",
        "52",
      )}`;
      // A model, not a measure: 0.6 em for each glyph that has an advance, and 0 for a Thai mark.
      const glyphs = [...text].filter((char) => !/\p{Mn}/u.test(char)).length;
      const font = Number.parseFloat(cascaded(rules, label, "font-size", viewport)!);
      const padding = (cascaded(rules, label, "padding", viewport) ?? "").trim().split(/\s+/);
      const side = Number.parseFloat(padding[1] ?? padding[0] ?? "0");
      const width = glyphs * 0.6 * font + 2 * side;
      const left = heroWidth(viewport) / 2 - width / 2;
      const logoRight =
        Number.parseFloat(cascaded(rules, logo, "left", viewport)!) +
        Number.parseFloat(cascaded(rules, logo, "width", viewport)!);
      const gap = left - logoRight;
      results.push(`${locale}: label_left=${left.toFixed(1)} logo_right=${logoRight} gap=${gap.toFixed(1)}`);
      expect(cascaded(rules, label, "white-space", viewport), "the label never wraps").toBe("nowrap");
      expect(gap, `${locale}: the model label must start right of the logo (${results.at(-1)})`).toBeGreaterThanOrEqual(0);
      cleanup();
    }
    expect(results.length, "both locales must run").toBe(2);
  });

  it("H9 the shared-rule check rejects broken copies of the style sheet (self-test)", async () => {
    const mutants: Record<string, string> = {
      "a bare button rule": `${css}\nbutton { background-color: #92400e; color: #fff; }`,
      "an input rule": `${css}\ninput { border-color: #92400e; }`,
      "an alert rule": `${css}\n[role="alert"] { color: #fff; }`,
      "a bare paragraph rule": `${css}\np { color: #3b1d0a; }`,
      "a main heading rule": `${css}\nmain > h1 { text-transform: uppercase; }`,
      "a draft note rule": `${css}\n[data-draft] { background: #fcd34d; }`,
    };
    const clean = await sharedRuleViolations(css);
    expect(clean.violations.join(" | "), "the shipped sheet is clean").toBe("");
    let rejected = 0;
    for (const [name, mutant] of Object.entries(mutants)) {
      expect(mutant, `${name}: the mutant must change the sheet`).not.toBe(css);
      const result = await sharedRuleViolations(mutant);
      expect(result.violations.length, `${name}: the check must reject it`).toBeGreaterThan(0);
      rejected += 1;
    }
    expect(`mutants_rejected=${rejected}/${Object.keys(mutants).length}`).toBe("mutants_rejected=6/6");
  });
});
