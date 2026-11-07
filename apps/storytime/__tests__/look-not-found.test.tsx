// @vitest-environment jsdom
/**
 * Task 1.1: the week-not-open 404 (AC-1.1, AC-1.2; plan 1.1).
 *
 * The client view receives the open weeks of each level and reads the path with `usePathname()`.
 * The link target is built from the known locale and two integers, never from the path, so a
 * hostile path cannot move the child to another host. `highestOpenWeeks()` and
 * `parseStorytimePath()` are the pinned helpers of spec FR-1.
 *
 * At the base `app/[locale]/not-found-view.tsx`, `highestOpenWeeks`, and `parseStorytimePath` do
 * not exist, so every case fails with an assertion (never a load error).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routing } from "../i18n/routing";
import { LEVEL_MAX, WEEK_MAX } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const viewPath = resolve(app, "app/[locale]/not-found-view.tsx");
const notFoundPath = resolve(app, "app/[locale]/not-found.tsx");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>;
const shippedPath = resolve(app, "content/l2/w01.json");

/** The pathname that `usePathname()` gives to the view in the current case. */
const pathnameState = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameState.value }));

// The 404 vocabulary lives in the real message files. The client view translates through
// next-intl, so the mock reads the same files that the app ships.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => translate(key, values),
  useLocale: () => "th",
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => translate(key, values),
}));

// A plain anchor, so the case proves the href and not a router mount state.
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...rest }: { href: unknown; children?: unknown }) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : String(href), ...rest },
        children as never,
      ),
  };
});

let scratch: string | undefined;
const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftSwitch = process.env.STORYTIME_SHOW_DRAFT_MEDIA;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  pathnameState.value = null;
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftSwitch === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftSwitch;
});

/**
 * Replaces the `{name}` placeholders of one message.
 * @param template The message template.
 * @param values The values of the placeholders.
 * @returns The message with its placeholders replaced.
 */
function interpolate(template: string, values?: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    values && name in values ? String(values[name]) : match,
  );
}

/**
 * Reads one message key from the real message files.
 * @param key The message key.
 * @param values The placeholder values.
 * @returns The translated text, or the key when the message file holds no such key.
 */
function translate(key: string, values?: Record<string, unknown>): string {
  return interpolate(english[key] ?? thai[key] ?? key, values);
}

/** Loads the client 404 view, with a named assertion when the file is absent. */
async function loadView() {
  expect(existsSync(viewPath), "Missing apps/storytime/app/[locale]/not-found-view.tsx").toBe(true);
  try {
    const modulePath = "../app/[locale]/not-found-view";
    return (await import(/* @vite-ignore */ modulePath)).NotFoundView as ComponentType<{
      openWeeks: Record<number, number | null>;
      locale: string;
    }>;
  } catch (error) {
    expect(error, "Storytime must provide the client 404 view").toBeUndefined();
    throw error;
  }
}

/**
 * Renders the 404 view for one path.
 * @param pathname The path that `usePathname()` gives.
 * @param openWeeks The open week of each level.
 * @param locale The page locale.
 * @returns The rendered container.
 */
async function renderView(
  pathname: string | null,
  openWeeks: Record<number, number | null>,
  locale = "th",
) {
  pathnameState.value = pathname;
  const NotFoundView = await loadView();
  return render(<NotFoundView openWeeks={openWeeks} locale={locale} />);
}

/**
 * Reads the minimum height of one class list.
 * @param className The class list of the link.
 * @returns The minimum height in pixels, or 0 when no token gives one.
 */
function minHeightPx(className: string): number {
  let best = 0;
  for (const token of className.split(/\s+/)) {
    const scale = /^min-h-(\d+)$/.exec(token) ?? /^h-(\d+)$/.exec(token);
    if (scale) best = Math.max(best, Number(scale[1]) * 4);
    const pixels = /^min-h-\[(\d+)px\]$/.exec(token);
    if (pixels) best = Math.max(best, Number(pixels[1]));
  }
  return best;
}

/** The not-open text that only an open-week link case shows. */
function notOpenText() {
  return [english.notOpenThai ?? thai.notOpenThai, english.notOpenEnglish ?? thai.notOpenEnglish];
}

/** The current 404 text that every other case keeps. */
function currentText() {
  return [english.notFoundThai, english.notFoundEnglish];
}

describe("Task 1.1 404 week-not-open view (AC-1.1, AC-1.2)", () => {
  it("shows the not-open text and one 48 px link to the highest open week", async () => {
    const { container } = await renderView("/th/st/2/2", { 2: 1 });
    const [thaiText, englishText] = notOpenText();
    const thaiLine = screen.getByText(thaiText!);
    expect(thaiLine, "the not-open Thai text must carry lang=th").toHaveAttribute("lang", "th");
    expect(screen.getByText(englishText!), "the not-open English text must carry lang=en").toHaveAttribute(
      "lang",
      "en",
    );

    const links = screen.getAllByRole("link");
    expect(links, "the not-open view must hold exactly one link").toHaveLength(1);
    const link = links[0]!;
    expect(link.getAttribute("href"), "the link must point at the highest open week").toBe("/th/st/2/1");
    expect(link.textContent, "the link must name week 1 in both languages").toContain(
      interpolate(english.openWeekThai ?? thai.openWeekThai ?? "", { week: 1 }),
    );
    expect(link.textContent).toContain(
      interpolate(english.openWeekEnglish ?? thai.openWeekEnglish ?? "", { week: 1 }),
    );

    const height = minHeightPx(link.className);
    expect(height, "the open-week link must be 48 px high or more").toBeGreaterThanOrEqual(48);
    // The parser itself must reject the token below the floor, or the height check is vacuous.
    expect(minHeightPx("min-h-11"), "min-h-11 must stay below the 48 px floor").toBeLessThan(48);
    expect(minHeightPx("min-h-12"), "min-h-12 must pass the 48 px floor").toBeGreaterThanOrEqual(48);

    // The current 404 copy must not leak into the open-week case.
    for (const text of currentText()) expect(container.textContent).not.toContain(text);
  });

  it("shows the not-open text with no link when the level has no open week", async () => {
    const { container } = await renderView("/th/st/2/2", { 2: null });
    const [thaiText, englishText] = notOpenText();
    expect(screen.getByText(thaiText!), "the not-open Thai text must show").toBeInTheDocument();
    expect(screen.getByText(englishText!), "the not-open English text must show").toBeInTheDocument();
    expect(screen.queryAllByRole("link"), "a level with no open week offers no link").toHaveLength(0);
    for (const text of currentText()) expect(container.textContent).not.toContain(text);
  });

  it("keeps the current 404 text and no link for every other 404", async () => {
    const cases: Array<{
      label: string;
      pathname: string | null;
      openWeeks: Record<number, number | null>;
    }> = [
      { label: "unknown locale", pathname: "/de/st/2/2", openWeeks: { 2: 1 } },
      { label: "unparsable segment", pathname: "/th/st/x/y", openWeeks: { 2: 1 } },
      { label: "week above WEEK_MAX", pathname: "/th/st/2/99", openWeeks: { 2: 1 } },
      { label: "level with no week file", pathname: "/th/st/4/1", openWeeks: { 2: 1 } },
      { label: "level above LEVEL_MAX", pathname: "/th/st/9/1", openWeeks: { 2: 1 } },
      { label: "teacher route", pathname: "/th/teacher/2/1", openWeeks: { 2: 1 } },
      { label: "usePathname null", pathname: null, openWeeks: { 2: 1 } },
      { label: "leading zero", pathname: "/th/st/2/01", openWeeks: { 2: 1 } },
      { label: "week zero", pathname: "/th/st/2/0", openWeeks: { 2: 1 } },
      { label: "trailing slash", pathname: "/th/st/2/1/", openWeeks: { 2: 1 } },
    ];
    expect(cases.length, "no_link_cases must stay above six").toBeGreaterThan(6);
    let checked = 0;
    for (const entry of cases) {
      const { container, unmount } = await renderView(entry.pathname, entry.openWeeks);
      const [thaiText, englishText] = currentText();
      expect(
        screen.queryByText(thaiText),
        `${entry.label}: the current Thai 404 text must show`,
      ).not.toBeNull();
      expect(
        screen.queryByText(englishText),
        `${entry.label}: the current English 404 text must show`,
      ).not.toBeNull();
      expect(
        screen.queryAllByRole("link"),
        `${entry.label}: no link may show`,
      ).toHaveLength(0);
      for (const text of notOpenText()) {
        expect(container.textContent, `${entry.label}: the not-open text must stay absent`).not.toContain(
          text,
        );
      }
      checked += 1;
      unmount();
    }
    expect(`no_link_cases=${checked}`).toBe(`no_link_cases=${cases.length}`);
  });

  it("builds the link href from the locale and two integers only", async () => {
    const probes = [
      "/th/st/2/2?next=https://evil.example",
      "//evil.example/st/2/2",
      "/th/st/2/2#x",
    ];
    expect(probes.length, "href_probe_cases must stay at three or more").toBeGreaterThanOrEqual(3);
    for (const probe of probes) {
      const { unmount } = await renderView(probe, { 2: 1 });
      for (const link of screen.queryAllByRole("link")) {
        expect(link.getAttribute("href"), `${probe}: the href must not echo the path`).toBe("/th/st/2/1");
      }
      expect(document.body.innerHTML, `${probe}: the hostile text must not reach the href`).not.toContain(
        "evil.example",
      );
      unmount();
    }
    expect(`href_probe_cases=${probes.length}`).toBe("href_probe_cases=3");
  });

  it("parses only canonical at-home paths and writes no log", async () => {
    const routeParse = await import("../lib/route-parse");
    expect(
      typeof (routeParse as { parseStorytimePath?: unknown }).parseStorytimePath,
      "lib/route-parse.ts must export parseStorytimePath",
    ).toBe("function");
    const parse = (routeParse as unknown as { parseStorytimePath: (path: string, locales: readonly string[]) =>
      { locale: string; level: number; week: number } | null }).parseStorytimePath;

    const accepted = ["/th/st/2/2", "/en/st/4/32", "/th/st/1/1"];
    const rejected = [
      "/th/st/2/01",
      "/th/st/2/0",
      "/th/st/0/1",
      "/th/st/5/1",
      "/th/st/2/33",
      "/de/st/2/2",
      "/TH/st/2/2",
      "/th/st/2",
      "/th/st/2/2/extra",
      "/th/st/2/2/",
      "",
      "/th/st/2%2F2",
      " /th/st/2/2",
    ];
    expect(accepted.length, "parse_accepted must hold three or more paths").toBeGreaterThanOrEqual(3);
    expect(rejected.length, "parse_rejected must hold twelve or more paths").toBeGreaterThanOrEqual(12);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    let acceptedSeen = 0;
    for (const path of accepted) {
      expect(parse(path, routing.locales), `${path} must parse`).not.toBeNull();
      acceptedSeen += 1;
    }
    let rejectedSeen = 0;
    for (const path of rejected) {
      expect(parse(path, routing.locales), `${path} must stay unparsable`).toBeNull();
      rejectedSeen += 1;
    }
    expect(warn, "parseStorytimePath must write no console.warn").toHaveBeenCalledTimes(0);
    expect(log, "parseStorytimePath must write no console.log").toHaveBeenCalledTimes(0);
    expect(`parse_accepted=${acceptedSeen}`).toBe(`parse_accepted=${accepted.length}`);
    expect(`parse_rejected=${rejectedSeen}`).toBe(`parse_rejected=${rejected.length}`);
  });

  it("lists the highest open week of the shipped content and agrees with loadVisibleWeek", async () => {
    const content = await import("../lib/content");
    expect(
      typeof (content as { highestOpenWeeks?: unknown }).highestOpenWeeks,
      "lib/content.ts must export highestOpenWeeks",
    ).toBe("function");
    const highestOpenWeeks = (content as unknown as { highestOpenWeeks: () => Promise<Record<number, number | null>> })
      .highestOpenWeeks;

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const open = await highestOpenWeeks();
    expect(warn, "highestOpenWeeks must write no log").toHaveBeenCalledTimes(0);
    expect(open, "the shipped content has week 1 open and week 2 draft").toEqual({ 2: 1 });
    warn.mockRestore();

    const quiet = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let pairs = 0;
    for (let level = 1; level <= LEVEL_MAX; level += 1) {
      let highestVisible: number | null = null;
      for (let week = 1; week <= WEEK_MAX; week += 1) {
        const visible = (await content.loadVisibleWeek(level, week)) !== null;
        if (visible) highestVisible = week;
        pairs += 1;
      }
      expect(
        open[level] ?? null,
        `level ${level}: highestOpenWeeks must agree with loadVisibleWeek`,
      ).toBe(highestVisible);
    }
    quiet.mockRestore();
    expect(pairs, "pairs_checked must equal LEVEL_MAX * WEEK_MAX").toBe(LEVEL_MAX * WEEK_MAX);
  });

  it("reads live content folders for the highest open week", async () => {
    const content = await import("../lib/content");
    expect(
      typeof (content as { highestOpenWeeks?: unknown }).highestOpenWeeks,
      "lib/content.ts must export highestOpenWeeks",
    ).toBe("function");
    const highestOpenWeeks = (content as unknown as { highestOpenWeeks: () => Promise<Record<number, number | null>> })
      .highestOpenWeeks;
    const shipped = JSON.parse(readFileSync(shippedPath, "utf8")) as Record<string, unknown>;

    /** Creates a scratch content folder with the given level 2 weeks. */
    function scratchFolder(weeks: Record<string, Record<string, unknown>>): void {
      scratch = mkdtempSync(resolve(tmpdir(), "storytime-open-weeks-"));
      mkdirSync(resolve(scratch, "l2"));
      for (const [name, week] of Object.entries(weeks)) {
        writeFileSync(resolve(scratch, "l2", name), JSON.stringify(week));
      }
      process.env.STORYTIME_CONTENT_DIR = scratch;
    }

    /** Returns a ready clone of the shipped week for one week number. */
    function readyClone(week: number): Record<string, unknown> {
      const copy = structuredClone(shipped) as {
        meta: { week: number; key: string };
      };
      copy.meta.week = week;
      copy.meta.key = `st2/${week}`;
      return copy as unknown as Record<string, unknown>;
    }

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // (a) A full level: week 1 and a ready week 2 give week 2.
    scratchFolder({ "w01.json": readyClone(1), "w02.json": readyClone(2) });
    expect(await highestOpenWeeks(), "a ready week 2 must be the highest open week").toEqual({ 2: 2 });
    rmSync(scratch!, { recursive: true, force: true });
    scratch = undefined;

    // (b) A gap: week 1 and week 3, no week 2, give week 3.
    scratchFolder({ "w01.json": readyClone(1), "w03.json": readyClone(3) });
    expect(await highestOpenWeeks(), "a gap must not hide a later open week").toEqual({ 2: 3 });
    rmSync(scratch!, { recursive: true, force: true });
    scratch = undefined;

    // (c) A level with only a draft week is present with a null value.
    const draft = readyClone(1) as { meta: { status: string } };
    draft.meta.status = "draft";
    scratchFolder({ "w01.json": draft as unknown as Record<string, unknown> });
    expect(await highestOpenWeeks(), "a level with only a draft week must report null").toEqual({
      2: null,
    });
    rmSync(scratch!, { recursive: true, force: true });
    scratch = undefined;

    // (d) A draft audio part follows loadVisibleWeek and the draft-media switch.
    const draftAudio = readyClone(1) as unknown as { approval: { audio: { status: string } } };
    draftAudio.approval.audio.status = "draft";
    scratchFolder({ "w01.json": draftAudio as unknown as Record<string, unknown> });
    expect(
      await highestOpenWeeks(),
      "a draft audio part must stay closed without the switch",
    ).toEqual({ 2: null });
    expect(await content.loadVisibleWeek(2, 1), "loadVisibleWeek must agree with the closed state").toBeNull();
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(await highestOpenWeeks(), "the draft-media switch must open the week").toEqual({ 2: 1 });
    expect(await content.loadVisibleWeek(2, 1), "loadVisibleWeek must agree with the open state").not.toBeNull();
    delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
    warn.mockRestore();
  });

  it("keeps the 404 split between a server page and a client view", () => {
    expect(existsSync(viewPath), "Missing apps/storytime/app/[locale]/not-found-view.tsx").toBe(true);
    const viewSource = readFileSync(viewPath, "utf8");
    expect(
      /^["']use client["']/.test(viewSource.trimStart()),
      "not-found-view.tsx must start with the use client directive",
    ).toBe(true);
    expect(viewSource, "the client view must not read node:fs").not.toMatch(/node:fs/);
    expect(viewSource, "the client view must not import lib/content").not.toMatch(/lib\/content/);

    const pageSource = readFileSync(notFoundPath, "utf8");
    expect(pageSource, "not-found.tsx must stay a server component").not.toMatch(
      /^["']use client["']/m,
    );
    expect(pageSource, "not-found.tsx must import lib/content").toMatch(/lib\/content/);
    expect(pageSource, "not-found.tsx must render the client child").toMatch(/not-found-view|NotFoundView/);
    expect(pageSource, "not-found.tsx must take no props").toMatch(/function\s+\w+\s*\(\s*\)/);
  });
});
