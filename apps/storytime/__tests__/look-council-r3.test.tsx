// @vitest-environment jsdom
/**
 * Task 2.3g: the UI council round 3 fix batch (PM, 2026-11-08; round 3 scored 82.2 of 100, and the
 * scoring loop stopped). This is the last batch. One capture run follows the Green, with no new
 * council round.
 *
 * Six items, each with the rule where it lives in code:
 *   C1 Song: no lyric row is active or filled before playback in en and th. The cause of the
 *      filled row in the default capture is the capture path: `openScreen()` activates line 1
 *      before the screenshot in `look-phase2-browser-gate.sh`. The gate must read the default
 *      state before it activates a line, and row 1 must require that state.
 *   C2 Week: the done part card shows a 32 CSS px gold check badge (navy check on #F5B82E) in
 *      place of the chevron, with the localized Done label kept for screen readers.
 *   C3 Decodable: the "Play the sound" button shows a pressed rule that differs from the idle
 *      rule. The Tailwind `aria-pressed:` class loses to the look.css button rule on specificity,
 *      so the pressed look must be a look.css rule.
 *   C4 Decodable at 844x390: every dashed inner frame holds 12 CSS px of content padding.
 *   C5 Reader: the page counter sits on a cream pill with navy text at 4.5:1 or more.
 *   C6 Week parent panel: no native audio controls element, so no "0:00 / 0:00" text shows
 *      before the clip loads.
 *   C7 The browser gate holds the six shared verdicts and a mutant for each.
 *
 * jsdom loads no CSS, so every style rule is read from `app/look.css` as an artifact; the browser
 * gate measures the computed values.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComponentType, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import { lastCompound, lastDeclaration, lengthPx, parseCss, selectorParts } from "./helpers/css-rules";

// The media of a week comes from the signed map of the page. The mock keeps a URL for every file.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) => `https://media.example/${file}`,
}));

// The week page signs media after the session check, loads the week, and reads the messages.
const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/media/sign", () => ({ signWeekMedia: async () => ({}) }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) => (key: string) => `${locale ?? "th"}:${key}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));
vi.mock("../lib/auth", () => ({
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

const app = resolve(import.meta.dirname, "..");
const lookCssPath = resolve(app, "app/look.css");
const gatePath = resolve(app, "__tests__/look-phase2-browser-gate.sh");
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;
const week3 = JSON.parse(readFileSync(resolve(app, "content/l2/w03.json"), "utf8")) as StorytimeWeek;
const css = readFileSync(lookCssPath, "utf8");
const gate = readFileSync(gatePath, "utf8");
const messages = {
  en: JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>,
  th: JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>,
};

/** The localStorage key of the per-device completion record. */
const DONE_KEY = "storytime:done";

/** The reader labels of one locale, as the server page builds them. */
function readerLabels(locale: "en" | "th") {
  const text = messages[locale];
  return {
    readToMe: text.playerReadToMe,
    myTurn: text.playerMyTurn,
    slow: text.playerSlow,
    previousPage: text.playerPreviousPage,
    nextPage: text.playerNextPage,
    audioError: text.playerAudioError,
    finished: text.playerFinished,
    playing: text.playerPlaying,
  };
}

/** One resolved CSS colour. */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Reads a CSS colour as channels. */
function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1]!;
    const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
  if (!rgb) return null;
  const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts[3] ?? 1 };
}

/** Reads the `:root` custom properties of a style sheet. */
function cssVariables(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of parseCss(text)) {
    if (!selectorParts(rule.selector).includes(":root")) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--")) map.set(declaration.property, declaration.value);
    }
  }
  return map;
}

/** Replaces the `var()` references of a value with the custom properties it finds. */
function resolveValue(value: string, variables: Map<string, string>): string {
  let text = value.trim();
  for (let pass = 0; pass < 5; pass += 1) {
    const match = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/.exec(text);
    if (!match) break;
    text = text.replace(match[0], variables.get(match[1]!) ?? match[2] ?? "");
  }
  return text;
}

/** The relative luminance of a colour (WCAG 2.x). */
function luminance(color: Rgba): number {
  const channel = (value: number) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** The WCAG contrast ratio of two colours. */
function contrastRatio(one: Rgba, two: Rgba): number {
  const high = Math.max(luminance(one), luminance(two));
  const low = Math.min(luminance(one), luminance(two));
  return (high + 0.05) / (low + 0.05);
}

/** True when the colour reads as navy: blue dominates, and the colour is dark. */
function isNavy(color: Rgba): boolean {
  return color.b > color.r + 20 && color.b > color.g && color.b >= 40 && color.r <= 80 && color.g <= 80;
}

/** True when the colour reads as cream: light, warm, and not pure white. */
function isCream(color: Rgba): boolean {
  return color.r >= 240 && color.g >= 220 && color.b <= 240 && color.r >= color.g && color.g >= color.b && luminance(color) >= 0.7;
}

/** The parsed rules and resolved `:root` variables of `look.css`. */
const rules = parseCss(css);
const variables = cssVariables(css);

/** The declared colour of one property on a rule, resolved through `var()`. */
function colorOf(declaration: { value: string } | undefined): Rgba | null {
  return declaration ? parseColor(resolveValue(declaration.value, variables)) : null;
}

/** Splits a padding or inset shorthand into its four side values, in source order (t, r, b, l). */
function fourSides(value: string): number[] | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 4) return null;
  const pixels = parts.map((part) => lengthPx(part));
  if (pixels.some((part) => part === null)) return null;
  const [top, right = top, bottom = top, left = right] = pixels as number[];
  return [top!, right!, bottom!, left!];
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the council round 3 fix batch (task 2.3g)", () => {
  it("C1 no lyric row is active or filled before playback, and the gate measures the default song first", async () => {
    const modulePath = "../app/[locale]/st/[level]/[week]/song";
    const { StorytimeSong } = (await import(/* @vite-ignore */ modulePath)) as {
      StorytimeSong: ComponentType<Record<string, unknown>>;
    };
    for (const locale of ["en", "th"] as const) {
      const { container } = render(
        <StorytimeSong
          song={shipped.song!}
          mediaUrls={{}}
          labels={{ play: messages[locale].songPlay, pause: messages[locale].songPause }}
        />,
      );
      const rows = () => [...container.querySelectorAll<HTMLElement>("[data-line-index]")];
      expect(rows().length, `${locale}: the song must render its lyric rows`).toBe(shipped.song!.lines.length);
      const state = () => ({
        active: rows().filter((row) => row.getAttribute("aria-current") === "true").length,
        filled: rows().filter((row) => /(^|\s)bg-amber-100(\s|$)/.test(row.className)).length,
      });
      expect(state(), `${locale}: no row may be active or filled before playback`).toEqual({ active: 0, filled: 0 });
      const media = container.querySelector<HTMLMediaElement>(".song-stage video, .song-stage audio");
      expect(media, `${locale}: the song must render its media element`).not.toBeNull();
      media!.currentTime = 0;
      fireEvent.timeUpdate(media!);
      expect(state(), `${locale}: a currentTime of 0 must not fall in the first window`).toEqual({ active: 0, filled: 0 });
      cleanup();
    }
    // The cause of the filled default capture: the gate activates line 1 before it reads or
    // captures the default song view. The fix is the order, not the song component.
    const openStart = gate.indexOf("async function openScreen");
    const openEnd = gate.indexOf("async function openQuestion");
    const body = openStart >= 0 && openEnd > openStart ? gate.slice(openStart, openEnd) : "";
    const readAt = body.search(/readActiveLine\(page\)|readDefaultSong\(page\)/);
    const activateAt = body.indexOf("activateLine(page, 1)");
    expect(
      readAt,
      "openScreen() must read the default song state before it activates line 1 (the default capture shows the forced line today)",
    ).toBeGreaterThanOrEqual(0);
    expect(activateAt, "openScreen() must activate a line only after the default read").toBeGreaterThan(readAt);
    expect(gate, "the gate must print a labeled active_line_before_play value").toContain("active_line_before_play=");
    expect(gate, "row 1 must reject a filled lyric row before playback").toMatch(/filled_rows_before_play/);
  });

  it("C2 the done card shows a 32 px gold check badge with a navy check and the localized label", async () => {
    expect(`en.partDone=${messages.en.partDone}`, "messages/en.json partDone must read Done").toBe("en.partDone=Done");
    expect(`th.partDone=${messages.th.partDone}`, "messages/th.json partDone must hold the Thai draft").toBe(
      "th.partDone=เสร็จแล้ว",
    );
    const isBadge = (selector: string) =>
      selectorParts(selector).some((part) => part.includes("[data-done-badge]") && !part.includes("::"));
    const size = lastDeclaration(rules, (rule) => isBadge(rule.selector), "width");
    const height = lastDeclaration(rules, (rule) => isBadge(rule.selector), "height");
    const background = lastDeclaration(rules, (rule) => isBadge(rule.selector), "background-color")
      ?? lastDeclaration(rules, (rule) => isBadge(rule.selector), "background");
    const check = lastDeclaration(rules, (rule) => isBadge(rule.selector), "color");
    expect(size, "Missing a [data-done-badge] rule with width").toBeDefined();
    expect(height, "Missing a [data-done-badge] rule with height").toBeDefined();
    expect(`badge_w=${lengthPx(size?.value ?? "")}`, "the done badge must be 32 CSS px wide").toBe("badge_w=32");
    expect(`badge_h=${lengthPx(height?.value ?? "")}`, "the done badge must be 32 CSS px high").toBe("badge_h=32");
    const gold = colorOf(background);
    expect(gold, `the done badge background must be #F5B82E, received ${background?.value ?? "none"}`).not.toBeNull();
    expect(`badge_gold=${gold?.r},${gold?.g},${gold?.b}`, "the done badge must sit on #F5B82E").toBe(
      "badge_gold=245,184,46",
    );
    const checkColor = colorOf(check);
    expect(checkColor, `the done badge check must hold a colour, received ${check?.value ?? "none"}`).not.toBeNull();
    expect(isNavy(checkColor!), `the done badge check must be navy, received ${check?.value ?? "none"}`).toBe(true);
    const replaced = rules.some((rule) =>
      selectorParts(rule.selector).some(
        (part) =>
          part.includes("[data-done") &&
          part.endsWith("a::after") &&
          rule.declarations.some(
            (declaration) =>
              (declaration.property === "display" && declaration.value === "none") ||
              (declaration.property === "content" && declaration.value === "none"),
          ),
      ),
    );
    expect(replaced, "a rule must replace the tile chevron (a::after) of a done card").toBe(true);
    const doneMarkPath = "../app/[locale]/st/[level]/[week]/done-mark";
    const { DoneMark } = (await import(/* @vite-ignore */ doneMarkPath)) as {
      DoneMark: ComponentType<{ doneKey: string; label: string }>;
    };
    window.localStorage.setItem(DONE_KEY, JSON.stringify({ "2:3:book": true }));
    const done = render(<DoneMark doneKey="2:3:book" label={messages.th.partDone!} />);
    const badge = await waitFor(
      () => {
        const found = done.container.querySelector<HTMLElement>("[data-done-badge]");
        expect(found, "the done card must render a [data-done-badge] element").not.toBeNull();
        return found!;
      },
      { timeout: 2000 },
    );
    const name = badge.getAttribute("aria-label") ?? badge.textContent ?? "";
    expect(name, "the badge must keep the localized Done label for screen readers").toContain(messages.th.partDone!);
    expect(
      badge.querySelector("[data-done-icon], svg"),
      "the gold badge must hold the navy check",
    ).not.toBeNull();
  });

  it("C3 the decodable pressed rule differs from the idle rule", () => {
    const isSoundButton = (selector: string) =>
      selectorParts(selector).some(
        (part) =>
          part.includes('[data-part="decodable"]') &&
          part.includes("> div > section[aria-label] button") &&
          !part.includes(":last-child"),
      );
    const idle = lastDeclaration(rules, (rule) => isSoundButton(rule.selector), "background-color")
      ?? lastDeclaration(rules, (rule) => isSoundButton(rule.selector), "background");
    expect(idle, "Missing the idle [data-part=\"decodable\"] sound button rule").toBeDefined();
    const idleColor = colorOf(idle);
    expect(idleColor, `the idle decodable button background is not a colour: ${idle?.value}`).not.toBeNull();
    const isPressed = (selector: string) =>
      selectorParts(selector).some(
        (part) =>
          part.includes('[data-part="decodable"]') &&
          part.includes('button[aria-pressed="true"]'),
      );
    const pressed = lastDeclaration(rules, (rule) => isPressed(rule.selector), "background-color")
      ?? lastDeclaration(rules, (rule) => isPressed(rule.selector), "background");
    expect(
      pressed,
      "Missing a [data-part=\"decodable\"] button[aria-pressed=\"true\"] rule in look.css (the Tailwind aria-pressed class loses on specificity)",
    ).toBeDefined();
    const pressedColor = colorOf(pressed);
    expect(pressedColor, `the pressed decodable background is not a colour: ${pressed?.value}`).not.toBeNull();
    expect(
      `pressed_differs=${pressColorKey(idleColor!) !== pressColorKey(pressedColor!)}`,
      `the pressed fill must differ from the idle fill (idle=${idle?.value}, pressed=${pressed?.value})`,
    ).toBe("pressed_differs=true");
  });

  it("C4 every decodable dashed inner frame holds 12 px of content padding at 844x390", () => {
    const landscape = "max-height: 500px";
    const targets = [
      {
        name: "sound tile",
        section: '[data-part="decodable"] > div > section[aria-label]',
        frame: '[data-part="decodable"] > div > section[aria-label]::before',
      },
      {
        name: "tricky words card",
        section: '[data-part="decodable"] div > section[aria-label]:last-child',
        frame: '[data-part="decodable"] div > section[aria-label]:last-child::before',
      },
    ];
    const failures: string[] = [];
    for (const target of targets) {
      const inLandscape = (selector: string) =>
        rules.some(
          (rule) =>
            rule.media.some((media) => media.includes(landscape)) &&
            selectorParts(rule.selector).some((part) => part === target.section) &&
            rule.declarations.some((declaration) => declaration.property === "padding"),
        );
      const match = (selector: string) =>
        selectorParts(selector).some((part) => part === target.section);
      const frameMatch = (selector: string) =>
        selectorParts(selector).some((part) => part === target.frame);
      const landscapePadding = lastDeclaration(
        rules,
        (rule) => rule.media.some((media) => media.includes(landscape)) && match(rule.selector),
        "padding",
      );
      const basePadding = lastDeclaration(rules, (rule) => match(rule.selector), "padding");
      const padding = landscapePadding ?? basePadding;
      if (!padding) {
        failures.push(`${target.name}: no padding rule`);
        continue;
      }
      const sides = fourSides(padding.value);
      if (!sides) {
        failures.push(`${target.name}: the padding is not a length shorthand: ${padding.value}`);
        continue;
      }
      const insetDecl = lastDeclaration(rules, (rule) => frameMatch(rule.selector), "inset")
        ?? lastDeclaration(rules, (rule) => frameMatch(rule.selector), "top");
      const inset = insetDecl ? (fourSides(insetDecl.value)?.[0] ?? null) : null;
      if (inset === null) {
        failures.push(`${target.name}: no inset on the dashed frame`);
        continue;
      }
      const gap = Math.min(...sides) - inset;
      if (!inLandscape(target.section)) {
        failures.push(`${target.name}: no landscape padding rule`);
      }
      if (gap < 12) {
        failures.push(`${target.name}: frame_gap_px=${gap} (padding ${sides.join("/")} minus inset ${inset})`);
      }
    }
    expect(
      failures,
      "every dashed inner frame of the decodable page must hold 12 CSS px of padding at 844x390",
    ).toEqual([]);
  });

  it("C5 the reader page counter is a cream pill with navy text at 4.5:1 or more", async () => {
    const isCounter = (selector: string) =>
      selectorParts(selector).some((part) => part.includes("[data-page-count]") && !part.includes("::"));
    const background = lastDeclaration(rules, (rule) => isCounter(rule.selector), "background-color")
      ?? lastDeclaration(rules, (rule) => isCounter(rule.selector), "background");
    const label = lastDeclaration(rules, (rule) => isCounter(rule.selector), "color");
    expect(background, "Missing a [data-page-count] pill rule with a background").toBeDefined();
    expect(label, "Missing a [data-page-count] pill rule with a colour").toBeDefined();
    const bg = colorOf(background);
    const fg = colorOf(label);
    expect(bg, `the page counter pill background is not a colour: ${background?.value}`).not.toBeNull();
    expect(fg, `the page counter text is not a colour: ${label?.value}`).not.toBeNull();
    expect(isCream(bg!), `the page counter pill must be cream, received ${background?.value}`).toBe(true);
    expect(isNavy(fg!), `the page counter text must be navy, received ${label?.value}`).toBe(true);
    expect(
      contrastRatio(bg!, fg!),
      `the page counter contrast must be 4.5:1 or more (bg=${background?.value}, label=${label?.value})`,
    ).toBeGreaterThanOrEqual(4.5);
    const readerPath = "../app/[locale]/st/[level]/[week]/reader";
    const { StorytimeReader } = (await import(/* @vite-ignore */ readerPath)) as {
      StorytimeReader: ComponentType<Record<string, unknown>>;
    };
    const book = shipped.books.find((entry) => entry.kind === "readalong")!;
    const { container } = render(
      <StorytimeReader
        book={book}
        locale="en"
        labels={readerLabels("en")}
        questions={[]}
        tiles={[]}
        questionLabels={{ skip: "Skip", right: "Yes", gentle: "Try again", picture: "Picture {n}" }}
        mediaUrls={{}}
      />,
    );
    const counter = container.querySelector<HTMLElement>("[data-page-count]");
    expect(counter, "the reader must render the page counter with the [data-page-count] hook").not.toBeNull();
    expect(counter?.textContent?.trim(), "the counter must read '1 / 8' on page 1").toBe(`1 / ${book.pages.length}`);
  });

  it("C6 the week parent panel renders no native audio controls before the clip loads", async () => {
    routeMocks.loadVisibleWeek.mockResolvedValue(JSON.parse(JSON.stringify(week3)) as StorytimeWeek);
    const pagePath = "../app/[locale]/st/[level]/[week]/page";
    type WeekPageProps = {
      params: Promise<{ locale: string; level: string; week: string }>;
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    };
    const { default: Page } = (await import(/* @vite-ignore */ pagePath)) as {
      default: (props: WeekPageProps) => Promise<ReactElement>;
    };
    const element = await Page({
      params: Promise.resolve({ locale: "en", level: "2", week: "3" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(element);
    const panel = container.querySelector<HTMLElement>('section[aria-label="en:homeParentHeading"]');
    expect(panel, "the week page must render the parent panel").not.toBeNull();
    expect(panel!.querySelectorAll("audio").length, "the parent panel must hold its recorded clip").toBeGreaterThan(0);
    expect(
      panel!.querySelectorAll("audio[controls]").length,
      "the parent panel must not render a native audio controls element (its 0:00 / 0:00 text)",
    ).toBe(0);
    expect(
      (panel!.textContent ?? "").match(/0:00\s*\/\s*0:00/g) ?? [],
      "the parent panel must show no 0:00 / 0:00 text before the clip loads",
    ).toEqual([]);
  });

  it("C7 the browser gate holds the six round 3 verdicts and a mutant for each", () => {
    const verdicts = [
      "defaultSongVerdict",
      "badgeVerdict",
      "pressedVerdict",
      "framePadVerdict",
      "counterVerdict",
      "nativeDurationVerdict",
    ];
    const missing = verdicts.filter((name) => !new RegExp(`function\\s+${name}\\s*\\(`).test(gate));
    expect(missing, "the gate must hold the six shared verdicts of round 3").toEqual([]);
    const mutants = gate.slice(gate.indexOf("const mutants = ["), gate.indexOf("const controls = ["));
    const withoutMutant = verdicts.filter((name) => !mutants.includes(`${name}(`));
    expect(withoutMutant, "the gate self-test must hold a mutant for each round 3 verdict").toEqual([]);
    expect(gate, "the gate must print the row 14 results").toMatch(/row\(`?council r3/);
  });
});

/** A comparable key of one colour. */
function pressColorKey(color: Rgba): string {
  return `${color.r},${color.g},${color.b},${color.a}`;
}
