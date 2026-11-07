// @vitest-environment jsdom
/**
 * Adversarial round, Phase 1 "Council fixes" (track storytime_look_20261107; test-strategy P1.6).
 *
 * The 404 view and its helpers under hostile inputs:
 * - hostile `usePathname()` values (empty, whitespace, control characters, unsafe integers,
 *   query text, missing slashes, full-width digits) must keep the current 404 text, show no
 *   link, and never throw;
 * - an empty `openWeeks` map must show the current text and no link;
 * - a hostile locale prop must never reach the link href;
 * - `STORYTIME_SHOW_DRAFT_MEDIA` opens a draft-media week only for the exact value "1", never
 *   opens an unpublished week, and never overrides a missing picture.
 *
 * Kill proofs are in the cases: a Number-coercion parser, a Boolean-coercion switch, and an
 * unvetted-locale link would each fail named assertions.
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

const app = resolve(import.meta.dirname, "..");
const viewPath = resolve(app, "app/[locale]/not-found-view.tsx");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;
const shippedPath = resolve(app, "content/l2/w01.json");

/** The pathname that `usePathname()` gives to the view in the current case. */
const pathnameState = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameState.value }));

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

/** Loads the client 404 view, with a named assertion when the file is absent. */
async function loadView() {
  expect(existsSync(viewPath), "Missing apps/storytime/app/[locale]/not-found-view.tsx").toBe(true);
  const modulePath = "../app/[locale]/not-found-view";
  return (await import(/* @vite-ignore */ modulePath)).NotFoundView as ComponentType<{
    openWeeks: Record<number, number | null>;
    locale: string;
  }>;
}

/** Renders the 404 view for one path, open-week map, and locale prop. */
async function renderView(
  pathname: string | null,
  openWeeks: Record<number, number | null>,
  locale = "th",
) {
  pathnameState.value = pathname;
  const NotFoundView = await loadView();
  return render(<NotFoundView openWeeks={openWeeks} locale={locale} />);
}

/** The current 404 text that a non-open case keeps. */
function currentText() {
  return [english.notFoundThai, english.notFoundEnglish];
}

/** The not-open text that only an open-week case shows. */
function notOpenText() {
  return [english.notOpenThai, english.notOpenEnglish];
}

/** Creates a scratch content folder with one level 2 week. */
function scratchWeek(week: Record<string, unknown>): void {
  scratch = mkdtempSync(resolve(tmpdir(), "storytime-adv-open-"));
  mkdirSync(resolve(scratch, "l2"));
  writeFileSync(resolve(scratch, "l2", "w01.json"), JSON.stringify(week));
  process.env.STORYTIME_CONTENT_DIR = scratch;
}

/** Returns a clone of the shipped week as a plain record. */
function shippedClone(): Record<string, unknown> {
  return JSON.parse(readFileSync(shippedPath, "utf8")) as Record<string, unknown>;
}

describe("Adversarial 404: hostile usePathname values", () => {
  it("keeps the current text and no link for 18 hostile paths, and never throws", async () => {
    const longWeek = "2".repeat(1000);
    const cases: Array<{ label: string; pathname: string | null }> = [
      { label: "empty string", pathname: "" },
      { label: "no leading slash", pathname: "th/st/2/2" },
      { label: "root only", pathname: "/" },
      { label: "double slash", pathname: "/th//st/2/2" },
      { label: "trailing space", pathname: "/th/st/2/2 " },
      { label: "leading space", pathname: " /th/st/2/2" },
      { label: "newline in week", pathname: "/th/st/2\n/2" },
      { label: "space in level", pathname: "/th/st/ 2/2" },
      { label: "space in week", pathname: "/th/st/2/ 2" },
      { label: "tab in week", pathname: "/th/st/2/2\t" },
      { label: "negative level", pathname: "/th/st/-2/2" },
      { label: "plus level", pathname: "/th/st/+2/2" },
      { label: "plus week", pathname: "/th/st/2/+2" },
      { label: "unsafe integer", pathname: "/th/st/2/99999999999999999999" },
      { label: "query text in path", pathname: "/th/st/2/2?x=1" },
      { label: "long week segment", pathname: `/th/st/2/${longWeek}` },
      { label: "full-width digits", pathname: "/th/st/２/２" },
      { label: "encoded newline", pathname: "/th/st/2/%0A2" },
    ];
    expect(cases.length, "hostile_path_cases must stay above 12").toBeGreaterThan(12);
    let checked = 0;
    for (const entry of cases) {
      const { container, unmount } = await renderView(entry.pathname, { 2: 1 });
      const [thaiText, englishText] = currentText();
      expect(screen.queryByText(thaiText), `${entry.label}: the current Thai text must show`).not.toBeNull();
      expect(
        screen.queryByText(englishText),
        `${entry.label}: the current English text must show`,
      ).not.toBeNull();
      expect(screen.queryAllByRole("link"), `${entry.label}: no link may show`).toHaveLength(0);
      for (const text of notOpenText()) {
        expect(container.textContent, `${entry.label}: the not-open text must stay absent`).not.toContain(text);
      }
      checked += 1;
      unmount();
    }
    expect(`hostile_path_cases=${checked}`).toBe(`hostile_path_cases=${cases.length}`);

    // Kill proof: a parser that coerces with Number() accepts three of these paths, because
    // Number() trims whitespace. The regex pin of parseCanonicalNumber is what rejects them.
    expect(Number("2\n"), "a Number-coercion parser would accept a newline week").toBe(2);
    expect(Number(" 2"), "a Number-coercion parser would accept a leading space").toBe(2);
    expect(Number("2 "), "a Number-coercion parser would accept a trailing space").toBe(2);
    const routeParse = await import("../lib/route-parse");
    const parse = (routeParse as unknown as {
      parseStorytimePath: (path: string, locales: readonly string[]) => unknown;
    }).parseStorytimePath;
    const coercion = ["/th/st/2\n/2", "/th/st/ 2/2", "/th/st/2/2 "];
    for (const path of coercion) {
      expect(parse(path, ["th", "en"]), `${path} must stay unparsable`).toBeNull();
    }
  });

  it("shows the current text and no link for an empty openWeeks map", async () => {
    const { container, unmount } = await renderView("/th/st/2/2", {});
    const [thaiText, englishText] = currentText();
    expect(screen.queryByText(thaiText), "an empty map must keep the current Thai text").not.toBeNull();
    expect(screen.queryByText(englishText), "an empty map must keep the current English text").not.toBeNull();
    expect(screen.queryAllByRole("link"), "an empty openWeeks map must offer no link").toHaveLength(0);
    for (const text of notOpenText()) {
      expect(container.textContent, "the not-open text must stay absent").not.toContain(text);
    }
    unmount();
  });

  it("never builds the link href from a hostile locale prop", async () => {
    const locales = ["de", "TH", "", "th/../en", "th?x=1"];
    expect(locales.length, "hostile_locale_cases must stay at 5").toBe(5);
    let checked = 0;
    for (const locale of locales) {
      const { container, unmount } = await renderView("/th/st/2/2", { 2: 1 }, locale);
      // The not-open text may show (the path parses and the week is open), but no link may use
      // the unvetted locale in its href.
      for (const link of screen.queryAllByRole("link")) {
        const href = link.getAttribute("href") ?? "";
        expect(href, `locale ${JSON.stringify(locale)}: the href must not use the prop`).toBe("/th/st/2/1");
      }
      expect(
        container.innerHTML,
        `locale ${JSON.stringify(locale)}: the prop must not reach the markup`,
      ).not.toContain(`/${locale}/st/`);
      checked += 1;
      unmount();
    }
    expect(`hostile_locale_cases=${checked}`).toBe(`hostile_locale_cases=${locales.length}`);
    // Kill proof: with the vetted locale the link exists, so the check is not vacuous.
    const { unmount } = await renderView("/th/st/2/2", { 2: 1 }, "th");
    const links = screen.queryAllByRole("link");
    expect(links.length, "the vetted locale must produce the link").toBe(1);
    expect(links[0]!.getAttribute("href")).toBe("/th/st/2/1");
    unmount();
  });
});

describe("Adversarial 404: STORYTIME_SHOW_DRAFT_MEDIA combinations", () => {
  it("opens a draft-media week only for the exact value 1", async () => {
    const content = await import("../lib/content");
    const highestOpenWeeks = (content as unknown as {
      highestOpenWeeks: () => Promise<Record<number, number | null>>;
    }).highestOpenWeeks;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const draftAudio = shippedClone() as { approval: { audio: { status: string } } };
    draftAudio.approval.audio.status = "draft";
    scratchWeek(draftAudio);

    const closed = [undefined, "", "0", "true", "01", " 1", "yes"];
    expect(closed.length, "draft_switch_closed_cases must stay at 7").toBe(7);
    let checked = 0;
    for (const value of closed) {
      if (value === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
      else process.env.STORYTIME_SHOW_DRAFT_MEDIA = value;
      expect(
        await highestOpenWeeks(),
        `the switch value ${JSON.stringify(value)} must keep the draft-media week closed`,
      ).toEqual({ 2: null });
      checked += 1;
    }
    expect(`draft_switch_closed_cases=${checked}`).toBe(`draft_switch_closed_cases=${closed.length}`);

    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(await highestOpenWeeks(), "the exact value 1 must open the draft-media week").toEqual({ 2: 1 });
    warn.mockRestore();

    // Kill proof: a Boolean-coercion switch opens the week for three of the closed values,
    // because non-empty strings are truthy. The exact-match pin is what keeps them closed.
    expect(Boolean("0"), "a Boolean switch would open the week for the value 0").toBe(true);
    expect(Boolean("true"), "a Boolean switch would open the week for the value true").toBe(true);
    expect(Boolean("yes"), "a Boolean switch would open the week for the value yes").toBe(true);
  });

  it("never opens an unpublished week, even with the switch", async () => {
    const content = await import("../lib/content");
    const highestOpenWeeks = (content as unknown as {
      highestOpenWeeks: () => Promise<Record<number, number | null>>;
    }).highestOpenWeeks;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const draft = shippedClone() as { meta: { status: string } };
    draft.meta.status = "draft";
    scratchWeek(draft);
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(
      await highestOpenWeeks(),
      "the draft-media switch must never open an unpublished week",
    ).toEqual({ 2: null });
    warn.mockRestore();
  });

  it("never overrides a missing picture, even with the switch", async () => {
    const content = await import("../lib/content");
    const highestOpenWeeks = (content as unknown as {
      highestOpenWeeks: () => Promise<Record<number, number | null>>;
    }).highestOpenWeeks;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const missing = shippedClone() as {
      books: Array<{ pages: Array<{ image?: unknown }> }>;
    };
    delete missing.books[0]!.pages[0]!.image;
    scratchWeek(missing);
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(
      await highestOpenWeeks(),
      "the draft-media switch must never override a missing picture",
    ).toEqual({ 2: null });
    warn.mockRestore();

    // Kill proof: without the missing page the same week opens, so the check is not vacuous.
    scratchWeek(shippedClone());
    expect(await highestOpenWeeks(), "the complete week must open with the switch").toEqual({ 2: 1 });
    rmSync(scratch!, { recursive: true, force: true });
    scratch = undefined;
  });
});
