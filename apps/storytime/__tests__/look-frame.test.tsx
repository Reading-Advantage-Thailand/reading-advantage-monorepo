// @vitest-environment jsdom
/**
 * Task 2.2: the frame, the game bar, and the place of the look (AC-2.2 frame; strategy P2.2 F1 to
 * F5; pins of Q24, Q25, and Q36).
 *
 * `Frame` (`app/[locale]/frame.tsx`) renders one hero header, the week title, and the game bar
 * with the level and the week of the route as text (the message keys `barLevel` and `barWeek`).
 * `placeFor` (`lib/look/places.ts`) is a pure function that picks one of five places for a part.
 * jsdom loads no CSS, so these are structure tests. The pixels are the work of the browser gate.
 *
 * At the base neither module exists, so every case fails with a named assertion. The
 * falsification cases (a baked bar, a map that never returns `oak`) test the checks and pass.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType, ReactElement } from "react";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";

const app = resolve(import.meta.dirname, "..");
const framePath = resolve(app, "app/[locale]/frame.tsx");
const placesPath = resolve(app, "lib/look/places.ts");
const pagePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>;

const PLACES = ["meadow", "grove", "oak", "trail", "path"];
const PARTS = [null, "book", "decodable", "song"] as const;

// The frame reads its words through next-intl. The mock reads the real message files, so the keys
// `barLevel` and `barWeek` must exist there, and the mock fills any `{name}` placeholder.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => translate(key, values),
  useLocale: () => "en",
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => translate(key, values),
  getLocale: async () => "en",
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Reads one message of the English file and fills its placeholders.
 * @param key The message key.
 * @param values The placeholder values.
 * @returns The text, or the key when the file holds no such key.
 */
function translate(key: string, values?: Record<string, unknown>): string {
  const template = english[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    values && name in values ? String(values[name]) : match,
  );
}

interface FrameProps {
  level: number;
  week: number;
  title: string;
  variant: "cover" | "band";
}

/**
 * Loads `Frame` with a named assertion when the file is absent.
 * @returns The component.
 */
async function loadFrame(): Promise<(props: FrameProps) => unknown> {
  expect(existsSync(framePath), "Missing apps/storytime/app/[locale]/frame.tsx").toBe(true);
  const modulePath = "../app/[locale]/frame";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as { Frame?: (props: FrameProps) => unknown };
  expect(typeof loaded.Frame, "frame.tsx must export Frame").toBe("function");
  return loaded.Frame!;
}

/**
 * Renders `Frame`, whether it is a sync or an async server component.
 * @param props The frame props.
 * @returns The rendered container.
 */
async function renderFrame(props: FrameProps) {
  const Frame = await loadFrame();
  if (Frame.constructor.name === "AsyncFunction") {
    const element = (await Frame(props)) as ReactElement;
    return render(element);
  }
  const Component = Frame as unknown as ComponentType<FrameProps>;
  return render(<Component {...props} />);
}

/**
 * Reads the text that a screen reader reads: the text outside every `aria-hidden` subtree.
 * @param node The root node.
 * @returns The visible text.
 */
function readableText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  if (node.getAttribute("aria-hidden") === "true") return "";
  return [...node.childNodes].map(readableText).join(" ");
}

/**
 * Loads `placeFor` with a named assertion when the file is absent.
 * @returns The function.
 */
async function loadPlaceFor(): Promise<(part: (typeof PARTS)[number]) => { place: string; hero: string }> {
  expect(existsSync(placesPath), "Missing apps/storytime/lib/look/places.ts").toBe(true);
  const modulePath = "../lib/look/places";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as { placeFor?: unknown };
  expect(typeof loaded.placeFor, "lib/look/places.ts must export placeFor").toBe("function");
  return loaded.placeFor as (part: (typeof PARTS)[number]) => { place: string; hero: string };
}

/**
 * Collects the set of place names that one picker returns for the four parts.
 * @param pick The picker.
 * @returns The names.
 */
function placesUsed(pick: (part: (typeof PARTS)[number]) => { place: string; hero: string }): Set<string> {
  const names = new Set<string>();
  for (const part of PARTS) {
    const { place, hero } = pick(part);
    names.add(place);
    names.add(hero);
  }
  return names;
}

describe("the frame of the look (AC-2.2)", () => {
  it("F1 renders one hero header from the variant, the week title, and one game bar", async () => {
    for (const variant of ["cover", "band"] as const) {
      const { container, unmount } = await renderFrame({ level: 2, week: 1, title: "Hello, I am Pip", variant });
      const headers = container.querySelectorAll("header");
      expect(headers.length, `variant ${variant} must render one header`).toBe(1);
      expect(headers[0]!.getAttribute("data-hero"), "data-hero follows the variant").toBe(variant);
      const heading = container.querySelector("h1");
      expect(heading?.textContent ?? "", "the h1 holds the week title").toContain("Hello, I am Pip");
      expect(heading?.getAttribute("lang") ?? "", "the h1 keeps its lang").not.toBe("");
      expect(`bars=${container.querySelectorAll("[data-game-bar]").length}`).toBe("bars=1");
      unmount();
    }
  });

  it("F2 the message keys barLevel and barWeek hold equal values in both files", () => {
    for (const key of ["barLevel", "barWeek"]) {
      expect(typeof english[key], `messages/en.json must hold ${key}`).toBe("string");
      expect((english[key] ?? "").length, `${key} must not be empty`).toBeGreaterThan(0);
      expect(thai[key], `messages/th.json must hold the same ${key} value`).toBe(english[key]);
    }
  });

  it("F2 the game bar shows the level and the week of the route, never a fixed pair", async () => {
    const first = await renderFrame({ level: 3, week: 5, title: "Week five", variant: "cover" });
    const numbers = (first.container.querySelector("[data-game-bar]")?.textContent ?? "").match(/\d+/g);
    expect(numbers, "the bar of level 3, week 5 shows 3 then 5").toEqual(["3", "5"]);
    first.unmount();
    const second = await renderFrame({ level: 2, week: 1, title: "Week one", variant: "band" });
    const again = (second.container.querySelector("[data-game-bar]")?.textContent ?? "").match(/\d+/g);
    expect(again, "the bar of level 2, week 1 shows 2 then 1").toEqual(["2", "1"]);
    second.unmount();
  });

  it("F3 the crest and the tips are decorative and the bar text is read once", async () => {
    const { container } = await renderFrame({ level: 2, week: 1, title: "Hello", variant: "cover" });
    const header = container.querySelector("header")!;
    for (const picture of header.querySelectorAll("img, svg")) {
      const hidden = picture.getAttribute("aria-hidden") === "true" || picture.getAttribute("alt") === "";
      expect(hidden, `${picture.tagName.toLowerCase()} in the header must be decorative`).toBe(true);
    }
    const bar = container.querySelector<HTMLElement>("[data-game-bar]");
    expect(bar, "the frame must render the game bar").not.toBeNull();
    expect(bar!.closest("[aria-hidden='true']"), "the bar must not sit inside aria-hidden").toBeNull();
    const barText = readableText(bar!).replace(/\s+/g, " ").trim();
    expect(barText.length, "the bar must hold readable text").toBeGreaterThan(0);
    const all = readableText(header).replace(/\s+/g, " ");
    expect(`bar_text_reads=${all.split(barText).length - 1}`, "the screen reader reads the bar once").toBe(
      "bar_text_reads=1",
    );
  });

  it("F4 placeFor is a pure function over the four parts and uses all five places", async () => {
    const placeFor = await loadPlaceFor();
    for (const part of PARTS) {
      const first = placeFor(part);
      expect(PLACES, `place for ${String(part)}`).toContain(first.place);
      expect(PLACES, `hero for ${String(part)}`).toContain(first.hero);
      expect(placeFor(part), `placeFor(${String(part)}) must be pure`).toEqual(first);
    }
    expect(`places_used=${placesUsed(placeFor).size}`).toBe("places_used=5");
  });

  it("F5 page.tsx renders Frame with both variants and sets data-place from placeFor", () => {
    expect(existsSync(pagePath), "Missing the week page.tsx").toBe(true);
    const text = readFileSync(pagePath, "utf8");
    const file = ts.createSourceFile("page.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let frameUses = 0;
    let withVariant = 0;
    let mainWithPlace = 0;
    const literals = new Set<string>();
    const identifiers = new Set<string>();
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteralLike(node)) literals.add(node.text);
      if (ts.isIdentifier(node)) identifiers.add(node.text);
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const name = node.tagName.getText(file);
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute).map((entry) => entry.name.getText(file));
        if (name === "Frame") {
          frameUses += 1;
          if (attributes.includes("variant")) withVariant += 1;
        }
        if (name === "main" && attributes.includes("data-place")) mainWithPlace += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    expect(`frame_uses=${frameUses}`, "page.tsx must render Frame").toMatch(/^frame_uses=[1-9][0-9]*$/);
    expect(withVariant, "every Frame use must pass a variant").toBe(frameUses);
    expect(literals.has("cover") && literals.has("band"), "the page must choose between cover and band").toBe(true);
    expect(identifiers.has("placeFor"), "page.tsx must call placeFor").toBe(true);
    expect(`main_with_place=${mainWithPlace}`, "main must carry data-place").toMatch(/^main_with_place=[1-9][0-9]*$/);
  });

  it("the place check fails a map that never returns oak (self-test)", () => {
    const noOak = (part: (typeof PARTS)[number]) => ({
      place: part === "song" ? "trail" : "meadow",
      hero: part === "book" ? "grove" : "path",
    });
    expect(placesUsed(noOak).has("oak")).toBe(false);
    expect(placesUsed(noOak).size, "four names are not five").toBe(4);
    const all = (part: (typeof PARTS)[number]) => ({
      place: part === "song" ? "trail" : part === "book" ? "grove" : "meadow",
      hero: part === "decodable" ? "oak" : "path",
    });
    expect(placesUsed(all).size).toBe(5);
  });

  it("the bar check fails a baked pair at another route (self-test)", () => {
    const baked = document.createElement("div");
    baked.innerHTML = '<div data-game-bar>Level 2 Week 1</div>';
    expect(baked.querySelector("[data-game-bar]")?.textContent?.match(/\d+/g)).not.toEqual(["3", "5"]);
  });
});
